def score_fraud_risk(fraud_signals: dict) -> float:
    apps_per_ip = fraud_signals.get("apps_per_ip_24h", 0)
    apps_per_device = fraud_signals.get("apps_per_device_24h", 0)
    identity_consistency = fraud_signals.get("device_identity_consistency", 1.0)

    score = 0.0
    if apps_per_ip >= 5:
        score += 0.5
    if apps_per_device >= 4:
        score += 0.3
    if identity_consistency < 0.5:
        score += 0.4
    return float(min(1.0, score))
