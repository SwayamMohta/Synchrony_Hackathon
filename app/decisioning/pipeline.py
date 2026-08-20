from app.features.builder import build_credit_inference_vector, CREDIT_FEATURE_VERSION
from app.features.fraud_signals import compute_fraud_signals, recent_history, record_application
from app.models.credit_risk import score_credit_risk
from app.models.fraud import score_fraud_risk
from app.rules.policy_engine import apply_policy, has_affordability_concern, policy_reason_codes, POLICY_VERSION
from app.explain.shap_explainer import explain_decision
from app.audit.logger import write_audit_log
from app.schemas import DecisionResult
from app.decisioning.profile import build_profile

def _decide(policy, credit_score: float, fraud_score: float, affordability_concern: bool) -> str:
    if not policy.passed:
        return "decline"
    if fraud_score > 0.7:
        return "refer"
    if affordability_concern:
        return "refer"
    if credit_score >= 0.60:
        return "decline"
    if credit_score >= 0.35:
        return "refer"
    return "approve"

def _build_reason_codes(policy, fraud_score, credit_score, affordability_concern) -> list[str]:
    codes = []
    if not policy.passed:
        codes += policy_reason_codes(policy.violated_rules)
    if fraud_score > 0.7:
        codes.append("High fraud score — manual review")
    if affordability_concern:
        codes.append("Requested amount is large relative to income")
    if credit_score >= 0.60:
        codes.append("High predicted credit risk")
    elif credit_score >= 0.35:
        codes.append("Moderate credit risk — manual review")
    return codes

def run_decision_pipeline(applicant, request_id) -> DecisionResult:
    vector, names, schema_version = build_credit_inference_vector(applicant)

    fraud_signals = compute_fraud_signals(applicant.device_id, applicant.ip_address, recent_history())
    fraud_score = score_fraud_risk(fraud_signals)

    credit_score = score_credit_risk(vector)

    policy = apply_policy(applicant)
    affordability_concern = has_affordability_concern(applicant)

    decision = _decide(policy, credit_score, fraud_score, affordability_concern)

    explanation = explain_decision(vector)  # SHAP explains the MODEL (kept separate)
    reason_codes = _build_reason_codes(policy, fraud_score, credit_score, affordability_concern)

    profile = build_profile(applicant.model_dump(), credit_score, fraud_score, fraud_signals)

    write_audit_log(
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_score=credit_score,
        fraud_score=fraud_score,
        reason_codes=reason_codes,
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        evidence={
            "shap_top_features": explanation["top_features"],
            "fraud_signals": fraud_signals,
            "feature_vector": dict(zip(names, vector)),
            "inputs": applicant.model_dump(),
            "profile": profile,
        },
    )
    record_application(applicant.device_id, applicant.ip_address)

    return DecisionResult(
        application_id=request_id,
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_risk_score=credit_score,
        fraud_risk_score=fraud_score,
        reason_codes=reason_codes,
        shap_top_features=explanation["top_features"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        latency_ms=0.0,
        fraud_signals=fraud_signals,
        profile=profile,
    )