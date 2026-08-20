import json, os
from sqlalchemy import create_engine, text

INSERT_SQL = """
INSERT INTO audit_logs (
    application_id, decision, credit_risk_score, fraud_risk_score,
    reason_codes, model_version, feature_schema_version, policy_version,
    request_id, evidence
) VALUES (:aid, :dec, :cs, :fs, :rc, :mv, :fsv, :pv, :rid, :ev)
"""

_FALLBACK_PATH = "ml/audit_fallback.jsonl"
_engine = None
_engine_tried = False

def _get_engine():
    global _engine, _engine_tried
    if _engine_tried:
        return _engine
    _engine_tried = True
    url = os.environ.get("DATABASE_URL")
    if url:
        try:
            _engine = create_engine(url, pool_pre_ping=True)
        except Exception:
            _engine = None
    return _engine

def write_audit_log(**kwargs):
    params = {
        "aid": kwargs["applicant_id"],
        "dec": kwargs["decision"],
        "cs": kwargs["credit_score"],
        "fs": kwargs["fraud_score"],
        "rc": json.dumps(kwargs["reason_codes"]),
        "mv": kwargs["model_version"],
        "fsv": kwargs["feature_schema_version"],
        "pv": kwargs["policy_version"],
        "rid": kwargs["request_id"],
        "ev": json.dumps(kwargs["evidence"]),
    }
    eng = _get_engine()
    if eng:
        try:
            with eng.begin() as conn:
                conn.execute(text(INSERT_SQL), params)
            return
        except Exception:
            pass
    _append_fallback(params)

def _append_fallback(params):
    os.makedirs(os.path.dirname(_FALLBACK_PATH), exist_ok=True)
    with open(_FALLBACK_PATH, "a") as fh:
        fh.write(json.dumps(params) + "\n")

def _normalize_fallback(p):
    return {
        "application_id": p.get("aid"),
        "decision": p.get("dec"),
        "credit_risk_score": p.get("cs"),
        "fraud_risk_score": p.get("fs"),
        "reason_codes": json.loads(p.get("rc") or "[]"),
        "model_version": p.get("mv"),
        "feature_schema_version": p.get("fsv"),
        "policy_version": p.get("pv"),
        "request_id": p.get("rid"),
        "evidence": json.loads(p.get("ev") or "{}"),
    }

def read_audit_log(limit: int = 50) -> list[dict]:
    eng = _get_engine()
    if eng:
        try:
            with eng.connect() as conn:
                rows = conn.execute(
                    text("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT :l"),
                    {"l": limit},
                ).mappings().all()
            return [dict(r) for r in rows]
        except Exception:
            pass
    if not os.path.exists(_FALLBACK_PATH):
        return []
    with open(_FALLBACK_PATH) as fh:
        lines = fh.readlines()
    entries = [json.loads(l) for l in lines[-limit:]]
    return [_normalize_fallback(e) for e in reversed(entries)]
