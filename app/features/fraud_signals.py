from datetime import datetime, timedelta

_HISTORY = []

def record_application(device_id, ip_address):
    _HISTORY.append({"device_id": device_id, "ip_address": ip_address, "ts": datetime.utcnow()})
    _prune()

def _prune():
    cutoff = datetime.utcnow() - timedelta(hours=24)
    while _HISTORY and _HISTORY[0]["ts"] < cutoff:
        _HISTORY.pop(0)

def recent_history():
    _prune()
    return list(_HISTORY)

def compute_fraud_signals(applicant, application_history) -> dict:
    device = getattr(applicant, "device_id", None)
    ip = getattr(applicant, "ip_address", None)
    window = list(application_history) if application_history else []
    apps_per_device = sum(1 for a in window if a["device_id"] == device)
    apps_per_ip = sum(1 for a in window if a["ip_address"] == ip)
    distinct_devices = len({a["device_id"] for a in window})
    identity_consistency = 1.0 if distinct_devices <= 2 else 0.0
    return {
        "apps_per_device_24h": float(apps_per_device),
        "apps_per_ip_24h": float(apps_per_ip),
        "device_identity_consistency": float(identity_consistency),
    }
