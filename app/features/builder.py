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

# INFERENCE PATH: map bureau + applicant mocks onto the exact same 10 columns.
def build_credit_inference_vector(applicant, bureau, cashflow) -> tuple[list[float], list[str], str]:
    medians = load_metadata().get("medians", {})
    def g(key, val):
        return float(val) if val is not None else medians.get(key, 0.0)

    age = g("age", getattr(applicant, "age", None))
    income = g("MonthlyIncome", (applicant.annual_income / 12.0) if getattr(applicant, "annual_income", None) else None)

    vector = [
        g("RevolvingUtilizationOfUnsecuredLines", getattr(bureau, "utilization_ratio", None)),
        age,
        g("NumberOfTime30-59DaysPastDueNotWorse", getattr(bureau, "delinquencies_24mo", None)),
        g("DebtRatio", _dti(bureau, cashflow)),
        income,
        g("NumberOfOpenCreditLinesAndLoans", getattr(bureau, "num_tradelines", None)),
        g("NumberOfTimes90DaysLate", (1.0 if bureau and bureau.delinquencies_24mo >= 4 else 0.0)),
        g("NumberRealEstateLoansOrLines", 0.0),
        g("NumberOfTime60-89DaysPastDueNotWorse", 0.0),
        g("NumberOfDependents", 0.0),
    ]
    return vector, list(CREDIT_FEATURES), CREDIT_FEATURE_VERSION

def _dti(bureau, cashflow):
    if cashflow and getattr(cashflow, "avg_monthly_income", 0):
        return cashflow.avg_monthly_expenses / max(cashflow.avg_monthly_income, 1.0)
    return None
