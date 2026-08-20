from app.rules.policy_engine import apply_policy, has_affordability_concern, policy_reason_codes
from app.schemas import ApplicantInput

def _applicant(**overrides):
    base = dict(
        applicant_id="a1", age=30, dependents=0, annual_income=60000,
        requested_amount=1000, credit_utilization=0.3, num_open_credit_lines=5,
        delinquencies_30_59=0, delinquencies_60_89=0, delinquencies_90_plus=0,
        num_real_estate_loans=0, monthly_debt_payments=500,
        avg_monthly_income=5000, avg_monthly_expenses=2000, overdraft_count_90d=0,
        device_id="d1", ip_address="1.2.3.4",
    )
    base.update(overrides)
    return ApplicantInput(**base)

def test_declines_severe_delinquency():
    r = apply_policy(_applicant(delinquencies_90_plus=4))
    assert not r.passed
    assert "severe_delinquency" in r.violated_rules

def test_no_decline_for_single_90_day_late():
    r = apply_policy(_applicant(delinquencies_90_plus=1))
    assert r.passed

def test_declines_high_expense_ratio():
    r = apply_policy(_applicant(avg_monthly_income=4000, avg_monthly_expenses=3800))
    assert not r.passed
    assert "expense_ratio" in r.violated_rules

def test_affordability_concern_threshold():
    assert has_affordability_concern(_applicant(requested_amount=50000)) is True
    assert has_affordability_concern(_applicant(requested_amount=1000)) is False

def test_policy_reason_codes():
    assert policy_reason_codes(["expense_ratio"]) == ["Expense-to-income ratio exceeds limit"]
    assert policy_reason_codes(["severe_delinquency"]) == ["Repeated severe (90+ day) delinquency"]
