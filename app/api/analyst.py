from fastapi import APIRouter, Depends, HTTPException, Request

from app.audit.logger import get_decision_snapshot, write_rag_audit
from app.auth.roles import analyst
from app.rag.guardrails import is_decision_request, refusal_message, validate_answer
from app.rag.llm_client import get_llm_client
from app.rag.retrieval import RetrievalUnavailable, retrieve
from app.rate_limit import limiter
from app.schemas import AnalystAskRequest, AnalystAskResponse

router = APIRouter()


def _build_retrieval_query(question, snapshot):
    if not snapshot:
        return question
    decision = snapshot.get("decision")
    reasons = snapshot.get("reason_codes") or []
    if reasons:
        return f"{question}\nExplain outcome {decision} for reason codes: {', '.join(reasons)}"
    return f"{question}\nExplain outcome {decision}: decision rules, thresholds, and limits"


@router.post("/v1/analyst/ask", response_model=AnalystAskResponse)
@limiter.limit("30/minute")
async def ask(request: Request, body: AnalystAskRequest, user: dict = Depends(analyst)):
    snapshot = get_decision_snapshot(body.application_id) if body.application_id else None
    if body.application_id and snapshot is None:
        raise HTTPException(status_code=404, detail="Decision not found for application")

    decision = snapshot.get("decision") if snapshot else None

    if is_decision_request(body.question):
        write_rag_audit(body.application_id or "", body.question, decision or "", "refused", [], True)
        return AnalystAskResponse(
            status="refused",
            decision_outcome=decision,
            explanation=refusal_message(),
            policy_basis=[],
            limitations=["the assistant does not make, recommend, or change credit decisions"],
        )

    query = _build_retrieval_query(body.question, snapshot)
    try:
        chunks = retrieve(query, policy_version=snapshot.get("policy_version") if snapshot else None)
    except RetrievalUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if not chunks:
        write_rag_audit(body.application_id, body.question, decision, "refused", [], True)
        return AnalystAskResponse(
            status="refused",
            decision_outcome=decision,
            explanation=refusal_message(),
            policy_basis=[],
            limitations=["no relevant policy retrieved"],
        )

    client = get_llm_client()
    try:
        raw = client.generate(snapshot, chunks, body.question)
    except Exception:
        from app.rag.llm_client import FakeLLMClient

        raw = FakeLLMClient().generate(snapshot, chunks, body.question)
        raw["limitations"] = list(raw.get("limitations") or []) + [
            "LLM unavailable (rate-limited or error); answered with the offline fallback."
        ]
    ok, violations = validate_answer(raw, chunks, snapshot)

    cited = [b.get("chunk_id") for b in (raw.get("policy_basis") or [])]
    write_rag_audit(body.application_id or "", body.question, decision or "", raw.get("status", "answered"), cited, ok)

    raw_status = raw.get("status", "answered")
    if raw_status == "refused" or not ok:
        return AnalystAskResponse(
            status="refused",
            decision_outcome=decision,
            explanation=raw.get("explanation") or refusal_message(),
            policy_basis=[],
            limitations=violations or raw.get("limitations") or [],
        )

    return AnalystAskResponse(
        status="answered",
        decision_outcome=raw.get("decision_outcome"),
        explanation=raw.get("explanation"),
        policy_basis=raw.get("policy_basis") or [],
        limitations=raw.get("limitations") or [],
    )
