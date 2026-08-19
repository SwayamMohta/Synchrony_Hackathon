import random
from app.schemas import CashFlowFeatures

def get_cash_flow_features(applicant_id: str, annual_income=None) -> CashFlowFeatures:
    rng = random.Random(f"cashflow:{applicant_id}")
    annual = annual_income if annual_income else 50000.0
    monthly_income = annual / 12.0
    income = monthly_income * rng.uniform(0.8, 1.2)
    expenses = income * rng.uniform(0.4, 0.9)
    overdrafts = rng.randint(0, 3)
    stability = round(1.0 - min(1.0, overdrafts * 0.2), 2)
    return CashFlowFeatures(
        avg_monthly_income=round(income, 2),
        avg_monthly_expenses=round(expenses, 2),
        overdraft_count_90d=overdrafts,
        income_stability_score=stability,
    )
