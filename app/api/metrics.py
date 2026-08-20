import json
import os

from fastapi import APIRouter, Depends

from app.auth.roles import analyst

router = APIRouter()

_CREDIT_METRICS_PATH = "ml/data/credit_metrics.json"
_FRAUD_METRICS_PATH = "ml/data/fraud_metrics.json"


def _load_metrics(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path) as fh:
        return json.load(fh)


@router.get("/v1/metrics/model-eval")
async def model_eval(user: dict = Depends(analyst)):
    return {
        "credit": _load_metrics(_CREDIT_METRICS_PATH),
        "fraud": _load_metrics(_FRAUD_METRICS_PATH),
    }
