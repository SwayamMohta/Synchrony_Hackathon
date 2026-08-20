import json, os
import pandas as pd

# Exact column names from the real Give Me Some Credit cs-training.csv
CREDIT_FEATURES = [
    "RevolvingUtilizationOfUnsecuredLines",
    "age",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "DebtRatio",
    "MonthlyIncome",
    "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate",
    "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfDependents",
]
CREDIT_FEATURE_VERSION = "v1"
_METADATA_PATH = os.environ.get("FEATURE_METADATA", "ml/feature_metadata.json")

def load_metadata():
    if not os.path.exists(_METADATA_PATH):
        return {}
    with open(_METADATA_PATH) as fh:
        return json.load(fh)

# TRAINING PATH: select the 10 real columns, fill missing values with training
# medians, persist those medians so inference matches exactly.
def build_credit_training_matrix(df: pd.DataFrame) -> pd.DataFrame:
    df = df[CREDIT_FEATURES].copy()
    medians = {c: float(df[c].median()) for c in CREDIT_FEATURES}
    for c in CREDIT_FEATURES:
        df[c] = df[c].fillna(medians[c]).astype(float)
    with open(_METADATA_PATH, "w") as fh:
        json.dump({"medians": medians, "version": CREDIT_FEATURE_VERSION}, fh, indent=2)
    return df

# INFERENCE PATH: map the explicitly-entered applicant inputs onto the exact
# same 10 columns. Cash-flow and fraud signals are NOT part of the credit vector.
def build_credit_inference_vector(applicant) -> tuple[list[float], list[str], str]:
    medians = load_metadata().get("medians", {})
    def g(key, val):
        return float(val) if val is not None else medians.get(key, 0.0)

    monthly_gross = (applicant.annual_income / 12.0) if applicant.annual_income else 0.0
    # GMSC DebtRatio = (monthly debt payments + alimony + living costs) / monthly gross income.
    # Alimony is not collected -> 0; "living costs" maps to avg_monthly_expenses.
    debt_ratio = ((applicant.monthly_debt_payments + applicant.avg_monthly_expenses) / monthly_gross) if monthly_gross > 0 else 0.0

    vector = [
        g("RevolvingUtilizationOfUnsecuredLines", applicant.credit_utilization),
        g("age", applicant.age),
        g("NumberOfTime30-59DaysPastDueNotWorse", applicant.delinquencies_30_59),
        g("DebtRatio", debt_ratio),
        g("MonthlyIncome", monthly_gross),
        g("NumberOfOpenCreditLinesAndLoans", applicant.num_open_credit_lines),
        g("NumberOfTimes90DaysLate", applicant.delinquencies_90_plus),
        g("NumberRealEstateLoansOrLines", applicant.num_real_estate_loans),
        g("NumberOfTime60-89DaysPastDueNotWorse", applicant.delinquencies_60_89),
        g("NumberOfDependents", applicant.dependents),
    ]
    return vector, list(CREDIT_FEATURES), CREDIT_FEATURE_VERSION