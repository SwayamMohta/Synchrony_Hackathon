# Underwriting Policy

**Document:** Retail Underwriting Policy
**Version:** v1
**Policy Version ID:** v1
**Effective date:** 2026-01-01
**Owner:** Credit Policy & Governance
**Classification:** Internal — approved policy corpus for analyst explanation only

> This document is the authoritative internal statement of the rules the underwriting
> engine applies. It is the corpus the policy assistant retrieves from. It describes
> policy rules and reason codes. It does not, and must not, contain any mechanism to
> approve, decline, refer, override, or modify an application — decisions are produced
> solely by the deterministic decision pipeline.

---

## Purpose and scope

This policy defines the eligibility, affordability, delinquency, credit-risk, and fraud
criteria applied to a retail credit application, and the reason codes used to explain an
adverse action to the applicant.

The decision pipeline produces exactly one of three outcomes: **approve**, **refer**, or
**decline**. Every outcome other than approve must be accompanied by at least one reason
code drawn from the reason-code schedule in this policy.

All numeric thresholds in this policy are prototype/demo values used to demonstrate the
decision mechanics. They are not statistically optimised or production-approved and are
subject to versioned change.

---

## 1. Applicant eligibility

### 1.1 Minimum age

An applicant must be at least 18 years of age.

- If the applicant is below the minimum age, the application is **declined**.

**Reason code:** "Applicant below minimum age"

---

## 2. Affordability and income adequacy

### 2.1 Expense-to-income ratio

The expense-to-income ratio is the applicant's average monthly expenses divided by
average monthly income, derived from the stated cash-flow inputs. It measures whether the
applicant's ongoing spending is sustainable relative to income.

- If the expense-to-income ratio is **65% (0.65) or higher**, the application is
  **declined**.
- The 65% cap is a hard rule. A favourable credit-risk score cannot override it.

**Reason code:** "Expense-to-income ratio exceeds limit"

### 2.2 Loan amount relative to income (affordability)

Affordability is the requested loan amount divided by average monthly income. A request
that is large relative to income signals repayment stress and is routed for manual
review.

- If the requested amount is more than **6 times** monthly income, the application is
  **referred** for human review.

**Reason code:** "Requested amount is large relative to income"

---

## 3. Delinquency

### 3.1 Severe (90+ day) delinquency

Severe delinquency is the count of payments 90 or more days past due.

- If the applicant has **4 or more** payments 90+ days late, the application is
  **declined**.

**Reason code:** "Repeated severe (90+ day) delinquency"

---

## 4. Credit-risk score

The credit-risk score is a predicted risk value in the range 0 to 1 produced by the
credit-risk model, where higher values indicate higher predicted risk. It is a model
output, not a calibrated probability of default.

### 4.1 Decision thresholds

- Credit-risk score of **0.60 or higher** → **decline**.
- Credit-risk score of **0.35 or higher (and below 0.60)** → **refer** (uncertainty).
- Credit-risk score **below 0.35** → eligible to **approve** subject to all other rules.

**Reason codes:**
- "High predicted credit risk" (score 0.60 or higher)
- "Moderate credit risk — manual review" (score 0.35 to 0.59)

---

## 5. Fraud risk (rule-based)

The fraud risk score is a deterministic, rule-based score in the range 0 to 1, computed
from application-velocity and identity-consistency signals. It is a rule-based fraud risk
score, not a calibrated probability. It is capped at 1.0.

### 5.1 Scoring rules

- 5 or more applications from the same IP address in 24 hours → add **0.5**.
- 4 or more applications from the same device in 24 hours → add **0.3**.
- Identity switching across devices on the same IP (consistency below 0.5) → add **0.4**.

### 5.2 Decision threshold

- Fraud risk score **above 0.70** → **refer** for manual review.

**Reason code:** "High fraud score — manual review"

---

## 6. Decision rules and order of precedence

The decision pipeline evaluates rules in a fixed order. The first rule that fires
determines the outcome.

1. Any hard policy rule broken (minimum age, expense-to-income ratio, severe
   delinquency) → **decline**.
2. Fraud risk score above 0.70 → **refer**.
3. Requested amount more than 6 times monthly income → **refer**.
4. Credit-risk score 0.60 or higher → **decline**.
5. Credit-risk score 0.35 or higher → **refer**.
6. Otherwise → **approve**.

---

## 7. Reason codes (adverse-action schedule)

Reason codes are the plain-English explanations attached to a non-approve decision.
They are selected by the policy engine and the decision pipeline, never by the
explanation model.

| Reason code | Trigger |
|---|---|
| "Applicant below minimum age" | age below 18 |
| "Expense-to-income ratio exceeds limit" | expense-to-income ratio 65% or higher |
| "Repeated severe (90+ day) delinquency" | 4 or more payments 90+ days late |
| "Requested amount is large relative to income" | requested amount more than 6x monthly income |
| "High fraud score — manual review" | rule-based fraud score above 0.70 |
| "High predicted credit risk" | credit-risk score 0.60 or higher |
| "Moderate credit risk — manual review" | credit-risk score 0.35 to 0.59 |

---

## 8. Explanation and transparency

The system provides two distinct explanations, which must not be conflated:

1. **SHAP feature attribution** explains what influenced the credit-risk model's
   prediction (for example, "High revolving credit utilization", "High debt-to-income
   ratio", "History of severe late payments", "Insufficient verified income").
2. **Policy and fraud reason codes** explain why the final outcome is approve, refer, or
   decline, using the reason-code schedule in section 7.

When a hard policy rule declines an application, the reason shown is the policy reason
code, not the SHAP attribution. SHAP is never used to explain a policy-rule decline.

---

## 9. Regulatory basis (India)

This policy is drafted to be consistent with the following regulatory and supervisory
frameworks:

- **Reserve Bank of India — Credit Facilities Directions, 2025**, including the Fair
  Practices Code, which requires a regulated entity to convey in writing the specific
  principal reason or reasons for rejecting a loan application.
- **Reserve Bank of India — Credit Information Reporting Directions, 2025** and the
  **Credit Information Companies (Regulation) Act, 2005**, governing the use, reporting,
  and dispute of credit information.
- **Reserve Bank of India — Credit Risk Management Directions, 2025**, governing
  credit-risk governance and underwriting standards.
- **Reserve Bank of India — Responsible Business Conduct Directions, 2025**, governing
  fair and non-discriminatory treatment of applicants.
- **Reserve Bank of India — Guidelines on Digital Lending (2022)**, governing
  transparency, data privacy, and grievance redressal in digital credit.

---

## 10. Audit and reproducibility

Every decision records the full input snapshot, the derived features, the credit-risk
score, the rule-based fraud risk score, the reason codes, the model version, the feature
schema version, and the policy version. A decision can be reconstructed exactly from
this audit record, including the policy version active at the time.

**Policy version:** v1
