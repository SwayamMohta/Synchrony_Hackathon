from app.features.builder import build_credit_inference_vector, CREDIT_FEATURE_VERSION
from app.features.fraud_signals import compute_fraud_signals, recent_history, record_application
from app.models.credit_risk import score_credit_risk
from app.models.fraud import score_fraud_risk
from app.rules.policy_engine import apply_policy, POLICY_VERSION
from app.explain.shap_explainer import explain_decision
from app.audit.logger import write_audit_log
from app.schemas import DecisionResult

def history_for(applicant):
    return recent_history()

def _decide(policy, credit_score: float, fraud_score: float) -> str:
    if not policy.passed:
        return "decline"
    if fraud_score > 0.7:
        return "refer"
    if credit_score < 0.35:
        return "approve"
    if credit_score < 0.6:
        return "refer"
    return "decline"

def run_decision_pipeline(applicant, bureau, cashflow, request_id) -> DecisionResult:
    vector, names, schema_version = build_credit_inference_vector(applicant, bureau, cashflow)
    fraud_signals = compute_fraud_signals(applicant, history_for(applicant))
    credit_score = score_credit_risk(vector)
    fraud_score = score_fraud_risk(fraud_signals)
    policy = apply_policy(applicant, bureau, cashflow, fraud_signals)
    decision = _decide(policy, credit_score, fraud_score)
    explanation = explain_decision(vector)
    write_audit_log(
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_score=credit_score,
        fraud_score=fraud_score,
        reason_codes=explanation["reason_codes"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        evidence={"top_features": explanation["top_features"], "fraud_signals": fraud_signals},
    )
    record_application(applicant.device_id, applicant.ip_address)
    return DecisionResult(
        application_id=request_id,
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_risk_score=credit_score,
        fraud_risk_score=fraud_score,
        reason_codes=explanation["reason_codes"],
        shap_top_features=explanation["top_features"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        latency_ms=0.0,
    )
