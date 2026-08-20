"""Compute the real, derived display profile for a decision.

Every value here is derived from fields the applicant actually supplied
(stored inputs) or from model/policy scores the engine already produced.
Nothing is invented client-side.
"""


def build_profile(applicant: dict, credit_score: float, fraud_score: float, fraud_signals: dict) -> dict:
    monthly_income = float(applicant.get("avg_monthly_income") or 0.0)
    if monthly_income <= 0:
        monthly_income = (float(applicant.get("annual_income") or 0.0)) / 12.0

    monthly_debt = float(applicant.get("monthly_debt_payments") or 0.0)
    monthly_expenses = float(applicant.get("avg_monthly_expenses") or 0.0)
    dti = (monthly_debt + monthly_expenses) / monthly_income if monthly_income > 0 else 0.0

    credit_history_months = int(applicant.get("credit_history_months") or 0)
    tradelines = int(applicant.get("num_open_credit_lines") or 0)
    segment = "THIN-FILE" if credit_history_months < 12 or tradelines < 3 else "ESTABLISHED"

    if credit_score < 0.25:
        risk_band = "Low"
    elif credit_score < 0.5:
        risk_band = "Moderate"
    elif credit_score < 0.7:
        risk_band = "High"
    else:
        risk_band = "Severe"

    if fraud_score < 0.25:
        fraud_level = "Low"
    elif fraud_score < 0.5:
        fraud_level = "Elevated"
    else:
        fraud_level = "High"

    employment_years = float(applicant.get("employment_length_years") or 0.0)
    if employment_years >= 2:
        income_stability = "Strong"
    elif employment_years > 0:
        income_stability = "Moderate"
    else:
        income_stability = "Weak"

    if dti <= 0.5:
        expense_profile = "Conservative"
    elif dti <= 0.65:
        expense_profile = "Moderate"
    else:
        expense_profile = "Elevated"

    apps_per_device = float(fraud_signals.get("apps_per_device_24h") or 0.0)
    behavioral_signals = "Normal" if apps_per_device <= 3 else "High Velocity"

    bank_cashflow_surplus = max(monthly_income - monthly_debt - monthly_expenses, 0.0)

    return {
        "segment": segment,
        "risk_band": risk_band,
        "fraud_level": fraud_level,
        "dti": round(dti, 4),
        "income_stability": income_stability,
        "expense_profile": expense_profile,
        "behavioral_signals": behavioral_signals,
        "bank_cashflow_surplus": round(bank_cashflow_surplus, 2),
    }