import time, uuid
from fastapi import APIRouter, Depends, Request
from app.schemas import ApplicantInput, DecisionResult
from app.decisioning.pipeline import run_decision_pipeline
from app.auth.roles import analyst
from app.rate_limit import limiter

router = APIRouter()

@router.post("/v1/decision", response_model=DecisionResult)
@limiter.limit("30/minute")
async def get_decision(request: Request, applicant: ApplicantInput, user: dict = Depends(analyst)):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    result = run_decision_pipeline(applicant, request_id)
    result.request_id = request_id
    result.latency_ms = (time.perf_counter() - start) * 1000
    return result