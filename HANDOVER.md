# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style). Core Must-Have is complete and verified; remaining work is commit/push, the RAG assistant (blocked), and optional polish.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (explicit controlled inputs, no hidden generation).
- 4 final decisioning corrections: DebtRatio = `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`; affordability REFER before credit thresholds; high-debt scenario 0.84 expense ratio; fraud label "Rule-based fraud risk score".
- Credit model recall fix (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (`ml/train_fraud.py`, IEEE-CIS, standalone demo): XGBoost AUC 0.9392, recall 0.8384. Artifact `app/models/artifacts/fraud_risk_v1.json`. Pipeline stays rule-based.
- Security hardening: role enforcement (`require_role(*roles)`, admin-only `GET /v1/audit/logs`) + slowapi rate limiting (login 5/min, decision 30/min). New files `app/rate_limit.py`, `app/api/audit.py`.

## What changed
- `ml/train_credit.py`, `ml/train_fraud.py` — training scripts now save `ml/data/credit_metrics.json` / `fraud_metrics.json` and use class-weight + Youden threshold.
- `app/auth/security.py` (multi-role), `app/auth/roles.py`, `app/api/decision.py` (analyst dep + rate limit), `app/api/auth.py` (rate limit), `app/main.py` (slowapi + audit router), `app/audit/logger.py` (read_audit_log), `app/schemas.py` (protected_namespaces fix).
- `tests/test_security.py` — 3 new role tests (16 total).
- `.gitignore` — added `ieee-fraud-detection/`.

## Current status
Done + verified. Nothing committed since the initial commit.

## Open issues
- RAG assistant not built (needs OpenAI API key).
- Docker daemon not running -> audit falls back to `ml/audit_fallback.jsonl`.
- All current work uncommitted/unpushed.

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not production.
- LR baselines log a convergence warning (max_iter=1000); scale features to clear it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.

## Validation completed
- `pytest tests/` -> 16 passed.
- HTTP smoke: health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384.
- Demo scenarios: low-risk -> approve, high-debt -> decline, suspicious -> refer.

## Exact next steps
1. Commit + push (highest priority): `git add -A; git commit; git push`.
2. RAG assistant when an OpenAI key is available.
3. (User) Start Docker Desktop -> `docker compose up -d` for live Postgres.
4. Optional: frontend polish to match backend (role-based audit view, error handling for 401/403/429).

## Recommended model path for next session
- `deepseek-v4-pro` for feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `docs/ModelPlan.md`.
- Do first: `git status` then commit/push (work is uncommitted).
- Check first: `pytest tests/`, then HTTP smoke (login, decision, audit 403/429).
- Stay in opencode. No escalation needed.
