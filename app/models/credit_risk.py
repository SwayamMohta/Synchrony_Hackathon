import os
import xgboost as xgb
import numpy as np

_MODEL_PATH = os.environ.get("CREDIT_MODEL_PATH", "app/models/artifacts/credit_risk_v1.json")
_model = xgb.Booster()
_model.load_model(_MODEL_PATH)

def score_credit_risk(feature_vector) -> float:
    dmatrix = xgb.DMatrix(np.array([feature_vector], dtype=float), feature_names=_model.feature_names)
    proba = _model.predict(dmatrix)[0]
    return float(proba)
