import os
import shap
import xgboost as xgb
import numpy as np
from app.features.builder import CREDIT_FEATURES

_MODEL_PATH = os.environ.get("CREDIT_MODEL_PATH", "app/models/artifacts/credit_risk_v1.json")

REASON_CODE_MAP = {
    "RevolvingUtilizationOfUnsecuredLines": "High revolving credit utilization",
    "DebtRatio": "High debt-to-income ratio",
    "NumberOfTimes90DaysLate": "History of severe late payments",
    "MonthlyIncome": "Insufficient verified income",
    "NumberOfOpenCreditLinesAndLoans": "Limited credit history/tradelines",
    "NumberOfTime30-59DaysPastDueNotWorse": "Recent delinquency",
    "NumberRealEstateLoansOrLines": "High number of real-estate loans",
    "NumberOfDependents": "High number of dependents",
    "age": "Age considered in risk assessment",
    "NumberOfTime60-89DaysPastDueNotWorse": "Recent 60-89 day delinquency",
}

_booster = xgb.Booster()
_booster.load_model(_MODEL_PATH)
_explainer = shap.TreeExplainer(_booster)

def explain_decision(feature_vector, top_n: int = 3) -> dict:
    X = np.array([feature_vector], dtype=float)
    try:
        arr = np.asarray(_explainer.shap_values(X))
    except Exception:
        arr = np.zeros((1, len(CREDIT_FEATURES)))
    if arr.ndim == 3:
        arr = arr[0, :, -1]
    elif arr.ndim == 2:
        arr = arr[0]
    vals = arr.reshape(-1)
    ranked = sorted(zip(CREDIT_FEATURES, vals), key=lambda x: abs(x[1]), reverse=True)[:top_n]
    return {
        "top_features": {name: round(float(val), 4) for name, val in ranked},
        "reason_codes": [REASON_CODE_MAP.get(name, name) for name, val in ranked if val > 0],
    }
