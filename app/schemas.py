from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ApplicantInput(BaseModel):
    applicant_id: str
    age: int = Field(ge=18, le=120)
    annual_income: float = Field(ge=0)
    requested_amount: float = Field(ge=0, le=1_000_000)
    employment_length_years: float = Field(ge=0)
    device_id: str
    ip_address: str
    plaid_access_token: Optional[str] = None

class BureauFeatures(BaseModel):
    bureau_score: Optional[int]
    num_tradelines: int
    utilization_ratio: float
    delinquencies_24mo: int
    credit_history_months: int

class CashFlowFeatures(BaseModel):
    avg_monthly_income: float
    avg_monthly_expenses: float
    overdraft_count_90d: int
    income_stability_score: float

class DecisionResult(BaseModel):
    application_id: str
    applicant_id: str
    decision: str
    credit_risk_score: float
    fraud_risk_score: float
    reason_codes: list[str]
    shap_top_features: dict
    model_version: str
    feature_schema_version: str
    policy_version: str
    request_id: str
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
