import pytest
from fastapi.testclient import TestClient

import app.audit.logger as audit_mod
from app.main import app
from app.auth.security import create_access_token

APPLICANT = {
    "applicant_id": "appl-integration-1",
    "age": 30, "dependents": 0,
    "annual_income": 60000.0, "requested_amount": 5000.0,
    "credit_utilization": 0.2, "num_open_credit_lines": 4,
    "delinquencies_30_59": 0, "delinquencies_60_89": 0, "delinquencies_90_plus": 0,
    "num_real_estate_loans": 0, "monthly_debt_payments": 500.0,
    "avg_monthly_income": 5000.0, "avg_monthly_expenses": 2000.0,
    "overdraft_count_90d": 0, "device_id": "dev-integration", "ip_address": "10.0.0.1",
}


@pytest.fixture
def client():
    return TestClient(app)


def _audit_isolation(monkeypatch, tmp_path):
    monkeypatch.setattr(audit_mod, "_get_engine", lambda: None)
    monkeypatch.setattr(audit_mod, "_FALLBACK_PATH", str(tmp_path / "audit.jsonl"))
    monkeypatch.setattr(audit_mod, "_RAG_FALLBACK_PATH", str(tmp_path / "rag_audit.jsonl"))
    for key in ("LLM_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "DATABASE_URL"):
        monkeypatch.delenv(key, raising=False)


def _analyst_headers():
    return {"Authorization": f"Bearer {create_access_token('analyst', 'analyst')}"}


def _admin_headers():
    return {"Authorization": f"Bearer {create_access_token('admin', 'admin')}"}


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_login_analyst(client):
    resp = client.post("/auth/login", json={"username": "analyst", "password": "analyst123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["role"] == "analyst"


def test_login_admin(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["role"] == "admin"


def test_login_bad_password(client):
    resp = client.post("/auth/login", json={"username": "analyst", "password": "wrong"})
    assert resp.status_code == 401


def test_decision_authorized(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    resp = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] in {"approve", "refer", "decline"}
    assert data["application_id"]
    assert data["request_id"]
    assert isinstance(data["credit_risk_score"], float)
    assert isinstance(data["fraud_risk_score"], float)
    assert isinstance(data["reason_codes"], list)
    assert data["policy_version"]


def test_decision_requires_token(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    resp = client.post("/v1/decision", json=APPLICANT)
    assert resp.status_code == 401


def test_rag_ask_full_flow(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)

    import app.api.analyst as analyst_mod

    decision_resp = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers())
    assert decision_resp.status_code == 200
    decision = decision_resp.json()["decision"]
    request_id = decision_resp.json()["request_id"]

    snapshot = {
        "decision": decision,
        "reason_codes": ["High fraud score — manual review"],
        "policy_version": "v1",
        "credit_risk_score": 0.3,
        "fraud_risk_score": 0.1,
    }
    monkeypatch.setattr(analyst_mod, "get_decision_snapshot", lambda i: snapshot)
    monkeypatch.setattr(
        analyst_mod,
        "retrieve",
        lambda q, policy_version=None: [
            {"chunk_id": "p:0000", "chunk_text": "Fraud above 0.70 is referred.", "rule_id": "5.2"}
        ],
    )

    resp = client.post(
        "/v1/analyst/ask",
        json={"question": "why was this decided this way?", "application_id": request_id},
        headers=_analyst_headers(),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "answered"
    assert data["decision_outcome"] == decision


def test_audit_role_enforcement(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)

    analyst_resp = client.get("/v1/audit/logs", headers=_analyst_headers())
    assert analyst_resp.status_code == 403

    admin_resp = client.get("/v1/audit/logs", headers=_admin_headers())
    assert admin_resp.status_code == 200
    assert "logs" in admin_resp.json()
    assert isinstance(admin_resp.json()["logs"], list)
