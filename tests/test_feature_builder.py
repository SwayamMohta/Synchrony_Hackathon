from app.features.builder import build_credit_inference_vector, CREDIT_FEATURES
from app.schemas import ApplicantInput, BureauFeatures

def _applicant():
    return ApplicantInput(applicant_id="a1", age=30, annual_income=60000, requested_amount=1000, employment_length_years=2, device_id="d1", ip_address="0.0.0.0")

def _bureau():
    return BureauFeatures(bureau_score=650, num_tradelines=5, utilization_ratio=0.3, delinquencies_24mo=1, credit_history_months=36)

def test_credit_vector_order_and_names():
    v, names, ver = build_credit_inference_vector(_applicant(), _bureau(), None)
    assert names == CREDIT_FEATURES
    assert len(v) == len(CREDIT_FEATURES) == 10
    assert ver == "v1"

def test_credit_vector_deterministic():
    v1, _, _ = build_credit_inference_vector(_applicant(), _bureau(), None)
    v2, _, _ = build_credit_inference_vector(_applicant(), _bureau(), None)
    assert v1 == v2

def test_income_mapped_to_monthly():
    v, names, _ = build_credit_inference_vector(_applicant(), _bureau(), None)
    assert v[names.index("MonthlyIncome")] == 5000.0
