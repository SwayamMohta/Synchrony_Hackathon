from datetime import datetime, timedelta

# Demo application history, seeded so the "suspicious" scenario shows high
# velocity deterministically (no prior submissions needed). Clearly identified
# demo values, not real applicant data.
_SEED = [
    ("suspicious-device", "10.0.0.99"),
    ("suspicious-device", "10.0.0.99"),
    ("suspicious-device", "10.0.0.99"),
    ("suspicious-device", "10.0.0.99"),
    ("suspicious-device", "10.0.0.99"),
    ("suspicious-device", "10.0.0.99"),
    ("other-device", "10.0.0.98"),
]

def _now():
    return datetime.utcnow()

_HISTORY = [{"device_id": d, "ip_address": ip, "ts": _now()} for d, ip in _SEED]

def record_application(device_id, ip_address):
    if not device_id and not ip_address:
        return
    _HISTORY.append({"device_id": device_id, "ip_address": ip_address, "ts": _now()})
    _prune()

def _prune():
    cutoff = _now() - timedelta(hours=24)
    while _HISTORY and _HISTORY[0]["ts"] < cutoff:
        _HISTORY.pop(0)

def recent_history():
    _prune()
    return list(_HISTORY)

def compute_fraud_signals(device_id, ip_address, application_history) -> dict:
    window = list(application_history) if application_history else []
    apps_per_device = sum(1 for a in window if device_id and a["device_id"] == device_id)
    apps_per_ip = sum(1 for a in window if ip_address and a["ip_address"] == ip_address)
    distinct_devices = len({a["device_id"] for a in window if ip_address and a["ip_address"] == ip_address})
    identity_consistency = 1.0 if distinct_devices <= 2 else 0.0
    return {
        "apps_per_device_24h": float(apps_per_device),
        "apps_per_ip_24h": float(apps_per_ip),
        "device_identity_consistency": float(identity_consistency),
    }