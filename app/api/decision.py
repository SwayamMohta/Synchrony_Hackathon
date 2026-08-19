import time, uuid
from fastapi import APIRouter, Depends
from app.schemas import ApplicantInput, DecisionResult
from app.decisioning.pipeline import run_decision_pipeline
from app.data.bureau_mock import get_bureau_features
from app.data.cashflow_mock import get_cash_flow_features
from app.auth.security import current_user

router = APIRouter()

@router.post("/v1/decision", response_model=DecisionResult)
async def get_decision(applicant: ApplicantInput, user: dict = Depends(current_user)):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    bureau = get_bureau_features(applicant.applicant_id)
    cashflow = get_cash_flow_features(applicant.applicant_id, applicant.annual_income)
    result = run_decision_pipeline(applicant, bureau, cashflow, request_id)
    result.request_id = request_id
    result.latency_ms = (time.perf_counter() - start) * 1000
    return result
