from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ApplicantInput(BaseModel):
    # Identity (audit + fraud-history key only — does NOT generate any profile)
    applicant_id: str
    # About the person
    age: int = Field(ge=18, le=120)
    dependents: int = Field(ge=0, default=0)
    annual_income: float = Field(ge=0)
    # Loan request
    requested_amount: float = Field(ge=0)
    # Credit history (demo/simulated — NOT verified bureau data)
    credit_utilization: float = Field(ge=0)
    num_open_credit_lines: int = Field(ge=0)
    delinquencies_30_59: int = Field(ge=0)
    delinquencies_60_89: int = Field(ge=0)
    delinquencies_90_plus: int = Field(ge=0)
    num_real_estate_loans: int = Field(ge=0)
    monthly_debt_payments: float = Field(ge=0)
    # Cash-flow / bank (demo/simulated)
    avg_monthly_income: float = Field(ge=0)
    avg_monthly_expenses: float = Field(ge=0)
    overdraft_count_90d: int = Field(ge=0)
    # Fraud context (system-observed in production; provided here for demo control)
    device_id: Optional[str] = None
    ip_address: Optional[str] = None

class DecisionResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

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