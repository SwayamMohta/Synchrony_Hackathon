import json
import pytest
from fastapi.testclient import TestClient

import app.audit.logger as audit_mod
from app.main import app
from app.auth.security import create_access_token

APPLICANT = {
    "applicant_id": "appl-applications-1",
    "name": "Test Applicant",
    "credit_history_months": 36,
    "employment_length_years": 4,
    "age": 30, "dependents": 0,
    "annual_income": 60000.0, "requested_amount": 5000.0,
    "credit_utilization": 0.2, "num_open_credit_lines": 4,
    "delinquencies_30_59": 0, "delinquencies_60_89": 0, "delinquencies_90_plus": 0,
    "num_real_estate_loans": 0, "monthly_debt_payments": 500.0,
    "avg_monthly_income": 5000.0, "avg_monthly_expenses": 2000.0,
    "overdraft_count_90d": 0, "device_id": "dev-applications", "ip_address": "10.0.0.1",
}


@pytest.fixture
def client():
    return TestClient(app)


def _audit_isolation(monkeypatch, tmp_path):
    monkeypatch.setattr(audit_mod, "_get_engine", lambda: None)
    monkeypatch.setattr(audit_mod, "_FALLBACK_PATH", str(tmp_path / "audit.jsonl"))
    for key in ("LLM_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "DATABASE_URL"):
        monkeypatch.delenv(key, raising=False)


def _analyst_headers():
    return {"Authorization": f"Bearer {create_access_token('analyst', 'analyst')}"}


def test_applications_requires_auth(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    resp = client.get("/v1/applications")
    assert resp.status_code == 401


def test_applications_lists_decision_snapshots(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    dec = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers())
    assert dec.status_code == 200
    request_id = dec.json()["request_id"]

    resp = client.get("/v1/applications", headers=_analyst_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert "applications" in data
    assert isinstance(data["applications"], list)
    assert any(a["request_id"] == request_id for a in data["applications"])


def test_applications_limits_newest_first(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    first = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers()).json()
    second = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers()).json()

    resp = client.get("/v1/applications?limit=1", headers=_analyst_headers())
    assert resp.status_code == 200
    apps = resp.json()["applications"]
    assert len(apps) == 1
    assert apps[0]["request_id"] == second["request_id"]


def test_application_detail_known_id(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    dec = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers())
    assert dec.status_code == 200
    request_id = dec.json()["request_id"]

    resp = client.get(f"/v1/applications/{request_id}", headers=_analyst_headers())
    assert resp.status_code == 200
    snap = resp.json()
    assert snap["request_id"] == request_id
    assert snap["decision"] in {"approve", "refer", "decline"}
    assert isinstance(snap.get("fraud_signals"), dict)
    assert isinstance(snap.get("shap_top_features"), dict)


def test_application_detail_has_profile(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    dec = client.post("/v1/decision", json=APPLICANT, headers=_analyst_headers())
    assert dec.status_code == 200
    request_id = dec.json()["request_id"]

    resp = client.get(f"/v1/applications/{request_id}", headers=_analyst_headers())
    assert resp.status_code == 200
    profile = resp.json().get("profile")
    assert profile is not None
    assert profile["segment"] in {"THIN-FILE", "ESTABLISHED"}
    assert profile["risk_band"] in {"Low", "Moderate", "High", "Severe"}
    assert profile["fraud_level"] in {"Low", "Elevated", "High"}
    assert profile["income_stability"] in {"Strong", "Moderate", "Weak"}
    assert profile["expense_profile"] in {"Conservative", "Moderate", "Elevated"}
    assert profile["behavioral_signals"] in {"Normal", "High Velocity"}
    assert profile["bank_cashflow_surplus"] >= 0
    # APPLICANT: income 5000, expenses 2000, debt 500, 4 tradelines -> ESTABLISHED, dti 0.5
    assert profile["segment"] == "ESTABLISHED"
    assert profile["dti"] == pytest.approx(0.5)


def test_application_profile_segment_thin_file(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    payload = dict(APPLICANT)
    payload["num_open_credit_lines"] = 1
    payload["credit_history_months"] = 6
    dec = client.post("/v1/decision", json=payload, headers=_analyst_headers())
    assert dec.status_code == 200
    request_id = dec.json()["request_id"]

    resp = client.get(f"/v1/applications/{request_id}", headers=_analyst_headers())
    assert resp.status_code == 200
    assert resp.json()["profile"]["segment"] == "THIN-FILE"


def test_application_profile_backfilled_for_legacy_row(monkeypatch, tmp_path):
    import app.audit.logger as audit_mod

    _audit_isolation(monkeypatch, tmp_path)
    row = {
        "decision": "approve",
        "credit_risk_score": 0.2,
        "fraud_risk_score": 0.1,
        "reason_codes": "[]",
        "policy_version": "v1",
        "model_version": "credit_v1/fraud_v1",
        "feature_schema_version": "v1",
        "request_id": "legacy-1",
        "application_id": "legacy-appl-1",
        "evidence": {
            "inputs": dict(APPLICANT),
            "fraud_signals": {"apps_per_device_24h": 1},
            "shap_top_features": {},
        },
        "created_at": None,
    }
    snap = audit_mod._normalize_db_row(row)
    assert snap["profile"]["segment"] == "ESTABLISHED"
    assert snap["profile"]["dti"] == pytest.approx(0.5)


def test_application_detail_unknown_id(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    resp = client.get("/v1/applications/does-not-exist", headers=_analyst_headers())
    assert resp.status_code == 404


def test_model_eval_metrics(client, monkeypatch, tmp_path):
    _audit_isolation(monkeypatch, tmp_path)
    resp = client.get("/v1/metrics/model-eval", headers=_analyst_headers())
    assert resp.status_code == 200
    body = resp.json()
    assert "credit" in body
    assert "fraud" in body
    assert body["credit"]["xgb_auc"] == 0.8673
    assert body["fraud"]["xgb_auc"] == 0.9392
