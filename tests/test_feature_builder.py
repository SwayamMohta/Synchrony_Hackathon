from app.features.builder import build_credit_inference_vector, CREDIT_FEATURES
from app.schemas import ApplicantInput

def _applicant():
    return ApplicantInput(
        applicant_id="a1", age=30, dependents=1, annual_income=60000,
        requested_amount=1000, credit_utilization=0.3, num_open_credit_lines=5,
        delinquencies_30_59=1, delinquencies_60_89=2, delinquencies_90_plus=3,
        num_real_estate_loans=1, monthly_debt_payments=500,
        avg_monthly_income=5000, avg_monthly_expenses=2000, overdraft_count_90d=0,
        device_id="d1", ip_address="1.2.3.4",
    )

def test_credit_vector_order_and_names():
    v, names, ver = build_credit_inference_vector(_applicant())
    assert names == CREDIT_FEATURES
    assert len(v) == 10
    assert ver == "v1"

def test_feature_mapping_from_inputs():
    d = dict(zip(CREDIT_FEATURES, build_credit_inference_vector(_applicant())[0]))
    assert d["age"] == 30.0
    assert d["RevolvingUtilizationOfUnsecuredLines"] == 0.3
    assert d["NumberOfTime30-59DaysPastDueNotWorse"] == 1.0
    assert d["NumberOfTime60-89DaysPastDueNotWorse"] == 2.0
    assert d["NumberOfTimes90DaysLate"] == 3.0
    assert d["NumberRealEstateLoansOrLines"] == 1.0
    assert d["NumberOfOpenCreditLinesAndLoans"] == 5.0
    assert d["NumberOfDependents"] == 1.0
    assert d["MonthlyIncome"] == 5000.0
    assert d["DebtRatio"] == 0.5

def test_credit_vector_deterministic():
    v1, _, _ = build_credit_inference_vector(_applicant())
    v2, _, _ = build_credit_inference_vector(_applicant())
    assert v1 == v2