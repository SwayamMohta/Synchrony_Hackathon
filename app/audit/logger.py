import json, os
from sqlalchemy import create_engine, text

from app.decisioning.profile import build_profile

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

def _ensure_profile(snapshot: dict) -> dict:
    """Return a snapshot that always carries a computed ``profile``.

    ``profile`` is stored in ``evidence`` for new decisions; for legacy rows
    (written before profiles existed) it is recomputed from the stored inputs
    so the frontend never has to derive display fields itself.
    """
    if snapshot.get("profile"):
        return snapshot
    inputs = snapshot.get("inputs") or {}
    if not inputs:
        snapshot["profile"] = {}
        return snapshot
    try:
        snapshot["profile"] = build_profile(
            inputs,
            float(snapshot.get("credit_risk_score") or 0.0),
            float(snapshot.get("fraud_risk_score") or 0.0),
            snapshot.get("fraud_signals") or {},
        )
    except Exception:
        snapshot["profile"] = {}
    return snapshot


def _normalize_db_row(r: dict) -> dict:
    rc = r.get("reason_codes") or []
    if isinstance(rc, str):
        rc = json.loads(rc)
    evidence = r.get("evidence") or {}
    if isinstance(evidence, str):
        evidence = json.loads(evidence)
    created_at = r.get("created_at")
    timestamp = created_at.isoformat() if created_at is not None else None
    return _ensure_profile({
        "decision": r.get("decision"),
        "credit_risk_score": r.get("credit_risk_score"),
        "fraud_risk_score": r.get("fraud_risk_score"),
        "reason_codes": rc,
        "policy_version": r.get("policy_version"),
        "model_version": r.get("model_version"),
        "feature_schema_version": r.get("feature_schema_version"),
        "request_id": r.get("request_id"),
        "application_id": r.get("request_id"),
        "applicant_id": r.get("application_id"),
        "inputs": evidence.get("inputs") or {},
        "fraud_signals": evidence.get("fraud_signals") or {},
        "shap_top_features": evidence.get("shap_top_features") or {},
        "profile": evidence.get("profile") or {},
        "timestamp": timestamp,
    })

def _snapshot_from_fallback(e: dict) -> dict:
    evidence = json.loads(e.get("ev") or "{}")
    return _ensure_profile({
        "decision": e.get("dec"),
        "credit_risk_score": e.get("cs"),
        "fraud_risk_score": e.get("fs"),
        "reason_codes": json.loads(e.get("rc") or "[]"),
        "policy_version": e.get("pv"),
        "model_version": e.get("mv"),
        "feature_schema_version": e.get("fsv"),
        "request_id": e.get("rid"),
        "application_id": e.get("rid"),
        "applicant_id": e.get("aid"),
        "inputs": evidence.get("inputs") or {},
        "fraud_signals": evidence.get("fraud_signals") or {},
        "shap_top_features": evidence.get("shap_top_features") or {},
        "profile": evidence.get("profile") or {},
        "timestamp": None,
    })

def get_decision_snapshot(identifier: str):
    """Return the immutable decision snapshot for an application.

    ``identifier`` is the value the frontend holds as ``application_id``, which
    the decision pipeline sets equal to the request UUID. It is matched against
    both ``request_id`` and ``application_id`` (which stores the applicant id).
    """
    eng = _get_engine()
    if eng:
        try:
            with eng.connect() as conn:
                row = conn.execute(
                    text(
                        "SELECT * FROM audit_logs "
                        "WHERE request_id = :id OR application_id = :id "
                        "ORDER BY created_at DESC LIMIT 1"
                    ),
                    {"id": identifier},
                ).mappings().first()
            if row:
                return _normalize_db_row(dict(row))
        except Exception:
            pass
    if not os.path.exists(_FALLBACK_PATH):
        return None
    with open(_FALLBACK_PATH) as fh:
        for line in reversed(fh.readlines()):
            e = json.loads(line)
            if e.get("rid") == identifier or e.get("aid") == identifier:
                return _snapshot_from_fallback(e)
    return None

def list_decision_snapshots(limit: int = 100) -> list[dict]:
    """Return normalized decision snapshots for all applications, newest first."""
    eng = _get_engine()
    if eng:
        try:
            with eng.connect() as conn:
                rows = conn.execute(
                    text("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT :l"),
                    {"l": limit},
                ).mappings().all()
            return [_normalize_db_row(dict(r)) for r in rows]
        except Exception:
            pass
    if not os.path.exists(_FALLBACK_PATH):
        return []
    with open(_FALLBACK_PATH) as fh:
        lines = fh.readlines()
    entries = [json.loads(l) for l in lines[-limit:]]
    return [_snapshot_from_fallback(e) for e in reversed(entries)]

_RAG_FALLBACK_PATH = "ml/rag_audit_fallback.jsonl"

_RAG_INSERT_SQL = """
INSERT INTO rag_audit (application_id, question, decision, status, cited_chunk_ids, validation_ok)
VALUES (:aid, :q, :dec, :status, :cids, :ok)
"""

def write_rag_audit(application_id, question, decision, status, cited_chunk_ids, validation_ok):
    params = {
        "aid": application_id,
        "q": question,
        "dec": decision,
        "status": status,
        "cids": json.dumps(cited_chunk_ids),
        "ok": bool(validation_ok),
    }
    eng = _get_engine()
    if eng:
        try:
            with eng.begin() as conn:
                conn.execute(text(_RAG_INSERT_SQL), params)
            return
        except Exception:
            pass
    os.makedirs(os.path.dirname(_RAG_FALLBACK_PATH), exist_ok=True)
    with open(_RAG_FALLBACK_PATH, "a") as fh:
        fh.write(json.dumps(params) + "\n")
