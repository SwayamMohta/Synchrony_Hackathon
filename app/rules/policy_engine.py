from dataclasses import dataclass

POLICY_VERSION = "v1"

@dataclass
class PolicyResult:
    passed: bool
    violated_rules: list[str]

POLICY_RULES = [
    ("min_age", lambda a: a.age >= 18),
    ("max_dti", lambda a, cf: (cf.avg_monthly_expenses / max(cf.avg_monthly_income, 1)) < 0.65),
    ("no_severe_delinquency", lambda a, bf: bf.delinquencies_24mo < 4),
    ("max_velocity", lambda a, fs: fs["apps_per_ip_24h"] <= 5),
]

def apply_policy(applicant, bureau, cashflow, fraud_signals) -> PolicyResult:
    violated = []
    if applicant.age < 18:
        violated.append("min_age")
    if cashflow and (cashflow.avg_monthly_expenses / max(cashflow.avg_monthly_income, 1)) >= 0.65:
        violated.append("max_dti")
    if bureau.delinquencies_24mo >= 4:
        violated.append("no_severe_delinquency")
    if fraud_signals.get("apps_per_ip_24h", 0) > 5:
        violated.append("max_velocity")
    return PolicyResult(passed=len(violated) == 0, violated_rules=violated)
