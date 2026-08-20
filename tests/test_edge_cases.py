import json
from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt as jose_jwt

from app.schemas import ApplicantInput
from app.features.builder import build_credit_inference_vector
from app.features.fraud_signals import compute_fraud_signals, record_application, recent_history
from app.models.fraud import score_fraud_risk
from app.rules.policy_engine import apply_policy, has_affordability_concern, PolicyResult
from app.decisioning.pipeline import _decide, _build_reason_codes
from app.auth.security import current_user, SECRET_KEY, ALGORITHM


def _applicant(**overrides):
    base = dict(
        applicant_id="a", age=30, dependents=0, annual_income=60000,
        requested_amount=1000, credit_utilization=0.3, num_open_credit_lines=5,
        delinquencies_30_59=0, delinquencies_60_89=0, delinquencies_90_plus=0,
        num_real_estate_loans=0, monthly_debt_payments=500,
        avg_monthly_income=5000, avg_monthly_expenses=2000, overdraft_count_90d=0,
    )
    base.update(overrides)
    return ApplicantInput(**base)


# ---------------------------------------------------------------------------
# Policy engine boundaries
# ---------------------------------------------------------------------------

def test_expense_ratio_exactly_at_limit_declines():
    r = apply_policy(_applicant(avg_monthly_income=1000, avg_monthly_expenses=650))
    assert not r.passed
    assert "expense_ratio" in r.violated_rules


def test_expense_ratio_just_below_limit_passes():
    r = apply_policy(_applicant(avg_monthly_income=1000, avg_monthly_expenses=649))
    assert r.passed


def test_severe_delinquency_boundary_three_passes():
    assert apply_policy(_applicant(delinquencies_90_plus=3)).passed


def test_affordability_exact_six_times_not_a_concern():
    assert has_affordability_concern(_applicant(avg_monthly_income=5000, requested_amount=30000)) is False


def test_affordability_just_above_six_times_is_a_concern():
    assert has_affordability_concern(_applicant(avg_monthly_income=5000, requested_amount=30001)) is True


def test_zero_income_with_request_referred_by_affordability():
    # avg_monthly_income=0 -> denominator max(income,1)=1 -> requested/1 is huge -> refer
    assert has_affordability_concern(_applicant(avg_monthly_income=0, requested_amount=1000)) is True


# ---------------------------------------------------------------------------
# Feature builder (DebtRatio / zero income)
# ---------------------------------------------------------------------------

def test_debt_ratio_zero_income_no_crash():
    v, names, _ = build_credit_inference_vector(_applicant(annual_income=0))
    d = dict(zip(names, v))
    assert d["DebtRatio"] == 0.0
    assert d["MonthlyIncome"] == 0.0


def test_debt_ratio_can_exceed_one():
    # (3000 + 2000) / (12000/12 = 1000) = 5.0
    v, names, _ = build_credit_inference_vector(
        _applicant(annual_income=12000, monthly_debt_payments=3000, avg_monthly_expenses=2000)
    )
    d = dict(zip(names, v))
    assert d["DebtRatio"] == 5.0


def test_credit_utilization_above_one_no_crash():
    v, names, _ = build_credit_inference_vector(_applicant(credit_utilization=1.5))
    d = dict(zip(names, v))
    assert d["RevolvingUtilizationOfUnsecuredLines"] == 1.5


# ---------------------------------------------------------------------------
# Fraud signals (None / empty identity)
# ---------------------------------------------------------------------------

def test_fraud_none_device_and_ip_is_zero():
    sig = compute_fraud_signals(None, None, [])
    assert score_fraud_risk(sig) == 0.0


def test_record_application_skips_empty_strings():
    before = len(recent_history())
    record_application("", "")
    assert len(recent_history()) == before


# ---------------------------------------------------------------------------
# Decision pipeline ordering (pure functions)
# ---------------------------------------------------------------------------

def test_decide_policy_wins_over_fraud():
    assert _decide(PolicyResult(False, ["expense_ratio"]), 0.1, 0.9, False) == "decline"


def test_decide_fraud_refers():
    assert _decide(PolicyResult(True, []), 0.1, 0.8, False) == "refer"


def test_decide_affordability_before_credit():
    # high credit risk AND unaffordable -> REFER (affordability), not DECLINE
    assert _decide(PolicyResult(True, []), 0.9, 0.1, True) == "refer"


def test_decide_high_credit_declines():
    assert _decide(PolicyResult(True, []), 0.7, 0.1, False) == "decline"


def test_decide_moderate_credit_refers():
    assert _decide(PolicyResult(True, []), 0.4, 0.1, False) == "refer"


def test_decide_approves():
    assert _decide(PolicyResult(True, []), 0.1, 0.1, False) == "approve"


def test_reason_codes_affordability_before_credit():
    codes = _build_reason_codes(PolicyResult(True, []), 0.1, 0.9, True)
    assert codes.index("Requested amount is large relative to income") < codes.index("High predicted credit risk")


# ---------------------------------------------------------------------------
# Security (JWT edge cases)
# ---------------------------------------------------------------------------

def _cred(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_current_user_missing_role_rejected():
    token = jose_jwt.encode(
        {"sub": "x", "exp": datetime.utcnow() + timedelta(minutes=5)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        current_user(cred=_cred(token))
    assert e.value.status_code == 401


def test_current_user_expired_token_rejected():
    token = jose_jwt.encode(
        {"sub": "x", "role": "analyst", "exp": datetime.utcnow() - timedelta(minutes=5)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        current_user(cred=_cred(token))
    assert e.value.status_code == 401


# ---------------------------------------------------------------------------
# Schema validation (input gate)
# ---------------------------------------------------------------------------

def test_age_below_18_rejected():
    with pytest.raises(ValidationError):
        _applicant(age=17)


def test_age_above_120_rejected():
    with pytest.raises(ValidationError):
        _applicant(age=121)


def test_negative_annual_income_rejected():
    with pytest.raises(ValidationError):
        _applicant(annual_income=-1)


def test_negative_requested_amount_rejected():
    with pytest.raises(ValidationError):
        _applicant(requested_amount=-1)


def test_negative_dependents_rejected():
    with pytest.raises(ValidationError):
        _applicant(dependents=-1)


# ---------------------------------------------------------------------------
# Audit log read (fallback file)
# ---------------------------------------------------------------------------

def test_read_audit_log_returns_entries(tmp_path, monkeypatch):
    from app.audit import logger
    p = tmp_path / "audit.jsonl"
    p.write_text(json.dumps({
        "aid": "a1", "dec": "approve", "cs": 0.1, "fs": 0.0,
        "rc": "[]", "mv": "v", "fsv": "v1", "pv": "v1", "rid": "r1", "ev": "{}",
    }) + "\n")
    monkeypatch.setattr(logger, "_FALLBACK_PATH", str(p))
    monkeypatch.setattr(logger, "_engine", None)
    monkeypatch.setattr(logger, "_engine_tried", True)
    logs = logger.read_audit_log(10)
    assert len(logs) == 1
    assert logs[0]["decision"] == "approve"
    assert logs[0]["application_id"] == "a1"


def test_read_audit_log_empty(tmp_path, monkeypatch):
    from app.audit import logger
    monkeypatch.setattr(logger, "_FALLBACK_PATH", str(tmp_path / "missing.jsonl"))
    monkeypatch.setattr(logger, "_engine", None)
    monkeypatch.setattr(logger, "_engine_tried", True)
    assert logger.read_audit_log(10) == []
