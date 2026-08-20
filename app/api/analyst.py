from fastapi import APIRouter, Depends, HTTPException, Request

from app.audit.logger import get_decision_snapshot, write_rag_audit
from app.auth.roles import analyst
from app.rag.guardrails import refusal_message, validate_answer
from app.rag.llm_client import get_llm_client
from app.rag.retrieval import RetrievalUnavailable, retrieve
from app.rate_limit import limiter
from app.schemas import AnalystAskRequest, AnalystAskResponse

router = APIRouter()


def _build_retrieval_query(question, snapshot):
    reasons = snapshot.get("reason_codes") or []
    if reasons:
        return f"{question}\nExplain outcome {snapshot.get('decision')} for reason codes: {', '.join(reasons)}"
    return question


@router.post("/v1/analyst/ask", response_model=AnalystAskResponse)
@limiter.limit("30/minute")
async def ask(request: Request, body: AnalystAskRequest, user: dict = Depends(analyst)):
    snapshot = get_decision_snapshot(body.application_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Decision not found for application")

    query = _build_retrieval_query(body.question, snapshot)
    try:
        chunks = retrieve(query, policy_version=snapshot.get("policy_version"))
    except RetrievalUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    decision = snapshot.get("decision")

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
    raw = client.generate(snapshot, chunks, body.question)
    ok, violations = validate_answer(raw, chunks, snapshot)

    cited = [b.get("chunk_id") for b in (raw.get("policy_basis") or [])]
    write_rag_audit(body.application_id, body.question, decision, raw.get("status", "answered"), cited, ok)

    if not ok:
        return AnalystAskResponse(
            status="refused",
            decision_outcome=decision,
            explanation=refusal_message(),
            policy_basis=[],
            limitations=violations,
        )

    return AnalystAskResponse(
        status="answered",
        decision_outcome=raw.get("decision_outcome"),
        explanation=raw.get("explanation"),
        policy_basis=raw.get("policy_basis") or [],
        limitations=raw.get("limitations") or [],
    )
