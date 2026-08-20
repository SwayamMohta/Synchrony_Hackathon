# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
Security hardening complete (role enforcement + rate limiting). Remaining: RAG assistant (blocked on OpenAI key), commit/push, optional Postgres live.

## Status
in-progress

## Completed work
- Problem statement + implementation plan: `docs/problem_Statement.md`, `docs/Plan.md`.
- Full Must-Have build: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (all financial data explicit/controlled): `app/schemas.py` (16-field `ApplicantInput`), `app/features/builder.py`, `app/features/fraud_signals.py`, `app/rules/policy_engine.py`, `app/decisioning/pipeline.py`, `app/api/decision.py`. Deleted `app/data/bureau_mock.py` / `cashflow_mock.py`.
- 4 final decisioning corrections applied:
  1. `DebtRatio` matches GMSC Data Dictionary: `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`.
  2. Affordability REFER check moved before credit thresholds in `pipeline.py::_decide`.
  3. High-debt demo scenario confirmed >65% expense-to-income (0.84) -> deterministic DECLINE.
  4. Fraud output relabeled "Rule-based fraud risk score" (`DecisionCard.jsx`, `docs/ModelPlan.md`).
- Credit model improved (`ml/train_credit.py`): `scale_pos_weight` + `class_weight="balanced"` + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673 vs LR baseline 0.8006. Artifacts + `ml/data/credit_metrics.json`.
- Fraud ML model trained (standalone demo) `ml/train_fraud.py` on IEEE-CIS: XGBoost AUC 0.9392 vs LR 0.78, PR-AUC 0.6361, recall 0.8384. Artifacts: `app/models/artifacts/fraud_risk_v1.json`, `ml/data/fraud_holdout_predictions.pkl`, `ml/data/fraud_metrics.json`. Pipeline stays rule-based.
- Security hardening:
  - Role enforcement: `require_role(*roles)`; `analyst` = analyst+admin, `admin` = admin only. `/v1/decision` -> `Depends(analyst)`; new admin-only `GET /v1/audit/logs` (`app/api/audit.py`, `read_audit_log` in `app/audit/logger.py`).
  - Rate limiting: `slowapi==0.1.9` wired in `app/main.py` via `app/rate_limit.py`; `/auth/login` 5/min, `/v1/decision` 30/min.
  - Pydantic `model_` namespace warning fixed (`ConfigDict(protected_namespaces=())` in `DecisionResult`).
- Frontend: full input form + 3 demo scenarios + decision card (SHAP chart) in `frontend/src/components/`.

## In progress
- None actively.

## Blockers
- OpenAI API key unavailable -> RAG policy assistant deferred.
- Docker Desktop daemon not running -> audit uses `ml/audit_fallback.jsonl`; Postgres+pgvector not live.
- All work since the initial commit is uncommitted/unpushed.

## Validation and checks
- `pytest tests/` -> 16 passed (policy, feature builder, fraud, security/roles).
- HTTP smoke (TestClient): health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200 (50 logs); login 6th/7th attempt -> 429.
- Credit model: AUC 0.8673, recall 0.816 (Youden 0.44). Fraud model: AUC 0.9392, recall 0.8384 (Youden 0.475).
- Demo scenarios end-to-end: low-risk -> approve (credit 0.294), high-debt -> decline (policy), suspicious -> refer (fraud 0.8).
- `npm run build` success (last run before security changes; frontend unchanged since).

## Risks or open questions
- Rate limits use in-memory storage (reset on restart) — fine for demo, not multi-instance production.
- LR baselines log a convergence warning (max_iter=1000) — acceptable for a baseline; scaling would fix it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — kept as standalone demo; pipeline uses rule-based application fraud (deliberate, per user decision).

## Next steps
1. Commit + push (highest priority — all current work is uncommitted).
2. RAG assistant when OpenAI key is available (`app/rag/`, `/v1/analyst/ask`, pgvector).
3. (User) Start Docker Desktop -> `docker compose up -d` for live Postgres audit.
4. Optional: wire Plaid Sandbox; add integration tests; scale LR features to clear convergence warning.

## Recommended model path
- `deepseek-v4-pro` for any remaining feature work; `deepseek-v4-flash` for mechanical edits/tests.
