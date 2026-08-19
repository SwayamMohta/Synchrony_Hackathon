from app.rules.policy_engine import apply_policy
from app.schemas import ApplicantInput, BureauFeatures, CashFlowFeatures

def _applicant():
    return ApplicantInput(applicant_id="a1", age=30, annual_income=50000, requested_amount=1000, employment_length_years=2, device_id="d1", ip_address="0.0.0.0")

def _bureau(delinq=0):
    return BureauFeatures(bureau_score=550, num_tradelines=3, utilization_ratio=0.5, delinquencies_24mo=delinq, credit_history_months=36)

def test_declines_severe_delinquency():
    r = apply_policy(_applicant(), _bureau(delinq=5), None, {"apps_per_ip_24h": 1.0})
    assert not r.passed
    assert "no_severe_delinquency" in r.violated_rules

def test_declines_max_velocity():
    r = apply_policy(_applicant(), _bureau(), None, {"apps_per_ip_24h": 6.0})
    assert not r.passed
    assert "max_velocity" in r.violated_rules

def test_declines_high_dti():
    cf = CashFlowFeatures(avg_monthly_income=4000, avg_monthly_expenses=3800, overdraft_count_90d=0, income_stability_score=0.8)
    r = apply_policy(_applicant(), _bureau(), cf, {"apps_per_ip_24h": 1.0})
    assert not r.passed
    assert "max_dti" in r.violated_rules

def test_passes_clean_application():
    cf = CashFlowFeatures(avg_monthly_income=5000, avg_monthly_expenses=2000, overdraft_count_90d=0, income_stability_score=0.9)
    r = apply_policy(_applicant(), _bureau(), cf, {"apps_per_ip_24h": 1.0})
    assert r.passed
    assert r.violated_rules == []
