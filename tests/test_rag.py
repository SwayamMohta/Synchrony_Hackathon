from fastapi.testclient import TestClient

from app.rag.chunking import chunk_markdown
from app.rag.guardrails import validate_answer
from app.rag.llm_client import FakeLLMClient, get_llm_client
from app.rag.retrieval import reciprocal_rank_fusion
from app.rag import reranker

SAMPLE = """# Policy
**Version:** v1

## 1. Eligibility
### 1.1 Minimum age
An applicant must be at least 18 years old.

## 2. Affordability
### 2.1 Expense ratio
If the expense-to-income ratio is 65% or higher, the application is declined.
"""


def test_chunk_markdown_sections():
    chunks = chunk_markdown(SAMPLE, "p.md", "p", "v1")
    assert chunks
    ids = [c["chunk_id"] for c in chunks]
    assert len(ids) == len(set(ids))
    for c in chunks:
        assert c["chunk_text"].startswith("Document: p.md")
        assert c["chunk_id"].startswith("p:")


def test_chunk_rule_id_extraction():
    chunks = chunk_markdown(SAMPLE, "p.md", "p", "v1")
    rule_ids = [c["rule_id"] for c in chunks]
    assert "1.1 Minimum age" in rule_ids
    assert "2.1 Expense ratio" in rule_ids


def test_long_block_split():
    big = "## 3. Long section\n\n" + ("Long sentence that goes on and on. " * 200)
    chunks = chunk_markdown("# P\n" + big, "p.md", "p", "v1")
    assert len(chunks) > 1
    for c in chunks:
        assert c["chunk_text"].startswith("Document: p.md")


def test_rerank_fallback_no_model(monkeypatch):
    monkeypatch.setattr(reranker, "_load_model", lambda: None)
    chunks = [
        {"chunk_id": "p:0000", "chunk_text": "one"},
        {"chunk_id": "p:0001", "chunk_text": "two"},
        {"chunk_id": "p:0002", "chunk_text": "three"},
    ]
    out = reranker.rerank("question", chunks, top_k=2)
    assert [c["chunk_id"] for c in out] == ["p:0000", "p:0001"]
    assert all(c["chunk_id"] in {"p:0000", "p:0001"} for c in out)


def test_rerank_reorders_with_stub(monkeypatch):
    class Stub:
        def predict(self, pairs):
            return [9.0 if "fraud" in q[1] else 1.0 for q in pairs]

    monkeypatch.setattr(reranker, "_load_model", lambda: Stub())
    chunks = [
        {"chunk_id": "p:0000", "chunk_text": "minimum age is 18"},
        {"chunk_id": "p:0001", "chunk_text": "fraud above 0.70 is referred"},
        {"chunk_id": "p:0002", "chunk_text": "expense ratio threshold"},
    ]
    out = reranker.rerank("why referred?", chunks, top_k=2)
    assert out[0]["chunk_id"] == "p:0001"


def test_rerank_never_loads_on_import():
    assert reranker._model is None
    assert reranker._load_attempted is False


def test_rrf_fusion_prefers_both():
    dense = [{"chunk_id": "a"}, {"chunk_id": "b"}]
    lex = [{"chunk_id": "b"}, {"chunk_id": "c"}]
    out = reciprocal_rank_fusion(dense, lex, k=60, top=3)
    assert out[0]["chunk_id"] == "b"
    assert {c["chunk_id"] for c in out} == {"a", "b", "c"}


def test_validate_answer_ok():
    chunks = [{"chunk_id": "p:0000"}]
    snap = {"decision": "refer"}
    ans = {
        "status": "answered",
        "decision_outcome": "refer",
        "explanation": "The application was referred because of high fraud risk.",
        "policy_basis": [{"chunk_id": "p:0000", "claim": "rule"}],
    }
    ok, v = validate_answer(ans, chunks, snap)
    assert ok, v


def test_validate_answer_wrong_outcome():
    chunks = [{"chunk_id": "p:0000"}]
    snap = {"decision": "refer"}
    ans = {
        "status": "answered",
        "decision_outcome": "decline",
        "explanation": "x",
        "policy_basis": [{"chunk_id": "p:0000", "claim": "y"}],
    }
    ok, _ = validate_answer(ans, chunks, snap)
    assert not ok


def test_validate_answer_unknown_citation():
    chunks = [{"chunk_id": "p:0000"}]
    snap = {"decision": "refer"}
    ans = {
        "status": "answered",
        "decision_outcome": "refer",
        "explanation": "x",
        "policy_basis": [{"chunk_id": "p:9999", "claim": "y"}],
    }
    ok, _ = validate_answer(ans, chunks, snap)
    assert not ok


def test_validate_answer_banned_word():
    chunks = [{"chunk_id": "p:0000"}]
    snap = {"decision": "refer"}
    ans = {
        "status": "answered",
        "decision_outcome": "refer",
        "explanation": "you should override this decision",
        "policy_basis": [{"chunk_id": "p:0000", "claim": "y"}],
    }
    ok, v = validate_answer(ans, chunks, snap)
    assert not ok
    assert any("override" in x for x in v)


def test_validate_answer_refused_is_valid():
    chunks = []
    snap = {"decision": "refer"}
    ans = {"status": "refused", "explanation": "no basis"}
    ok, _ = validate_answer(ans, chunks, snap)
    assert ok


def test_fake_llm_grounded():
    snap = {"decision": "refer", "reason_codes": ["High fraud score — manual review"]}
    chunks = [{"chunk_id": "p:0000", "rule_id": "5.2 Decision threshold", "chunk_text": "Fraud above 0.70 is referred."}]
    ans = FakeLLMClient().generate(snap, chunks, "why referred?")
    assert ans["decision_outcome"] == "refer"
    assert ans["policy_basis"][0]["chunk_id"] == "p:0000"


def test_get_llm_client_defaults_to_fake(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    assert get_llm_client().name == "fake"


def test_get_llm_client_prefers_gemini(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL_ID", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    monkeypatch.setenv("GEMINI_MODEL_ID", "gemini-3.6-flash")
    client = get_llm_client()
    assert client.base_url == "https://generativelanguage.googleapis.com/v1beta/openai/"
    assert client.model == "gemini-3.6-flash"


def test_get_llm_client_generic_provider(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("LLM_MODEL_ID", "llama-3.3-70b-versatile")
    client = get_llm_client()
    assert client.base_url == "https://api.groq.com/openai/v1"
    assert client.model == "llama-3.3-70b-versatile"


def test_decision_snapshot_fallback(monkeypatch, tmp_path):
    import app.audit.logger as mod

    f = tmp_path / "audit.jsonl"
    monkeypatch.setattr(mod, "_FALLBACK_PATH", str(f))
    monkeypatch.setattr(mod, "_get_engine", lambda: None)
    mod.write_audit_log(
        applicant_id="appl-1",
        decision="refer",
        credit_score=0.4,
        fraud_score=0.8,
        reason_codes=["High fraud score — manual review"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version="v1",
        policy_version="v1",
        request_id="req-123",
        evidence={},
    )
    snap = mod.get_decision_snapshot("req-123")
    assert snap is not None
    assert snap["decision"] == "refer"
    assert snap["applicant_id"] == "appl-1"
    assert "High fraud score — manual review" in snap["reason_codes"]
    assert mod.get_decision_snapshot("missing") is None


def test_ask_endpoint(monkeypatch):
    from app.auth.security import create_access_token
    from app.main import app
    import app.api.analyst as analyst_mod

    snapshot = {
        "decision": "refer",
        "reason_codes": ["High fraud score — manual review"],
        "policy_version": "v1",
        "credit_risk_score": 0.4,
        "fraud_risk_score": 0.8,
    }
    monkeypatch.setattr(analyst_mod, "get_decision_snapshot", lambda i: snapshot)
    monkeypatch.setattr(
        analyst_mod,
        "retrieve",
        lambda q, policy_version=None: [
            {"chunk_id": "p:0000", "chunk_text": "Fraud above 0.70 is referred.", "rule_id": "5.2"}
        ],
    )
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    token = create_access_token("analyst", "analyst")
    client = TestClient(app)
    resp = client.post(
        "/v1/analyst/ask",
        json={"question": "why was this referred?", "application_id": "req-1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "answered"
    assert data["decision_outcome"] == "refer"
    assert data["policy_basis"][0]["chunk_id"] == "p:0000"


def test_ask_endpoint_requires_auth():
    from app.main import app

    client = TestClient(app)
    resp = client.post(
        "/v1/analyst/ask",
        json={"question": "why?", "application_id": "req-1"},
    )
    assert resp.status_code == 401


def test_build_retrieval_query_reasons():
    from app.api.analyst import _build_retrieval_query

    snap = {"decision": "refer", "reason_codes": ["High fraud score — manual review"]}
    q = _build_retrieval_query("why referred?", snap)
    assert "High fraud score — manual review" in q


def test_build_retrieval_query_approve():
    from app.api.analyst import _build_retrieval_query

    snap = {"decision": "approve", "reason_codes": []}
    q = _build_retrieval_query("why approved?", snap)
    assert "decision rules, thresholds, and limits" in q


def test_extract_version():
    from app.rag.ingest import _extract_version

    assert _extract_version("**Version:** v1\nbody") == "v1"
    assert _extract_version("**Policy Version ID:** v3\nbody") == "v3"
    assert _extract_version("no version here") == "v1"


def test_is_decision_request():
    from app.rag.guardrails import is_decision_request

    assert is_decision_request("should I approve this application?")
    assert is_decision_request("override this decision")
    assert is_decision_request("can you recalculate the decision?")
    assert is_decision_request("what do you recommend?")
    assert not is_decision_request("why was this application referred?")
    assert not is_decision_request("what is the minimum age?")
    assert not is_decision_request("what is the maximum this person can borrow?")
