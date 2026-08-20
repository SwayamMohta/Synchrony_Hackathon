from dataclasses import dataclass

POLICY_VERSION = "v1"

# Prototype/demo thresholds (NOT production-approved)
EXPENSE_RATIO_LIMIT = 0.65
SEVERE_DELINQUENCY_LIMIT = 4
AFFORDABILITY_MULTIPLE = 6

POLICY_REASON_MAP = {
    "min_age": "Applicant below minimum age",
    "expense_ratio": "Expense-to-income ratio exceeds limit",
    "severe_delinquency": "Repeated severe (90+ day) delinquency",
    "affordability": "Requested amount is large relative to income",
}

@dataclass
class PolicyResult:
    passed: bool
    violated_rules: list[str]

def compute_cashflow_ratios(applicant):
    monthly_income = max(applicant.avg_monthly_income, 1.0)
    expense_to_income = applicant.avg_monthly_expenses / monthly_income
    affordability = applicant.requested_amount / monthly_income
    return expense_to_income, affordability

def apply_policy(applicant) -> PolicyResult:
    violated = []
    expense_to_income, _ = compute_cashflow_ratios(applicant)
    if applicant.age < 18:
        violated.append("min_age")
    if expense_to_income >= EXPENSE_RATIO_LIMIT:
        violated.append("expense_ratio")
    if applicant.delinquencies_90_plus >= SEVERE_DELINQUENCY_LIMIT:
        violated.append("severe_delinquency")
    return PolicyResult(passed=len(violated) == 0, violated_rules=violated)

def has_affordability_concern(applicant) -> bool:
    _, affordability = compute_cashflow_ratios(applicant)
    return affordability > AFFORDABILITY_MULTIPLE

def policy_reason_codes(violated_rules):
    return [POLICY_REASON_MAP.get(r, r) for r in violated_rules]