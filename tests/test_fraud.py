from app.models.fraud import score_fraud_risk

def test_normal_signals_low_fraud():
    assert score_fraud_risk({"apps_per_device_24h": 0, "apps_per_ip_24h": 0, "device_identity_consistency": 1.0}) == 0.0

def test_suspicious_signals_high_fraud():
    s = score_fraud_risk({"apps_per_device_24h": 6, "apps_per_ip_24h": 6, "device_identity_consistency": 1.0})
    assert s >= 0.7