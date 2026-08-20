# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style). Core Must-Have + model improvements + security hardening + edge-case hardening are complete. The RAG policy assistant is now built (read-only explanation service) and unit-tested. Remaining: run ingest + live end-to-end once Docker is up, optional OpenAI key, optional frontend assistant panel.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (explicit controlled inputs, no hidden generation; bureau/cashflow mocks deleted).
- 4 final decisioning corrections: DebtRatio = `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`; affordability REFER before credit thresholds; high-debt scenario 0.84 expense ratio; fraud label "Rule-based fraud risk score".
- Credit model recall fix (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (`ml/train_fraud.py`, IEEE-CIS, standalone demo): XGBoost AUC 0.9392, recall 0.8384. Artifact `app/models/artifacts/fraud_risk_v1.json`. Pipeline stays rule-based.
- Security hardening: role enforcement (`require_role(*roles)`, admin-only `GET /v1/audit/logs`) + slowapi rate limiting (login 5/min, decision 30/min). New files `app/rate_limit.py`, `app/api/audit.py`.
- Edge-case hardening (`tests/test_edge_cases.py`): 27 new tests; fixed JWT missing-role 500 -> 401 and empty-string device/IP recording.
- RAG policy assistant (read-only) built: `app/rag/` (chunking, embeddings bge-small-en-v1.5, retrieval dense+FTS+RRF, guardrails, prompts, llm_client Fake+OpenAI, ingest), `POST /v1/analyst/ask`, `get_decision_snapshot`/`write_rag_audit` in the audit logger, schema migration (chunk metadata + tsvector + GIN + `rag_audit`), 7 RBI PDFs + authored `policies/underwriting-policy-v1.md`, `tests/test_rag.py` (14 tests). Suite 57 passing.
- Committed + pushed: `10a891d` on `main`. (RAG build is committed but not yet pushed — see Current status.)

## What changed
- `ml/train_credit.py`, `ml/train_fraud.py` — save `ml/data/*_metrics.json`, use class-weight + Youden threshold.
- `app/auth/security.py` (multi-role + robust `current_user`), `app/auth/roles.py`, `app/api/decision.py`, `app/api/auth.py`, `app/main.py` (slowapi + audit router), `app/audit/logger.py` (read_audit_log), `app/schemas.py` (protected_namespaces fix).
- RAG: new `app/rag/{chunking,embeddings,retrieval,guardrails,prompts,llm_client,ingest}.py`, `app/api/analyst.py`, `policies/` (7 RBI PDFs + `underwriting-policy-v1.md`), `db/schema.sql` (chunk metadata + tsvector/GIN + `rag_audit`), `requirements.txt` (+`pypdf`), `.env.example` (+`EMBEDDING_MODEL`, `POLICIES_DIR`), `tests/test_rag.py`.
- `tests/test_security.py` (3 role tests), `tests/test_edge_cases.py` (27 edge tests). 57 total.
- `.gitignore` — added `ieee-fraud-detection/`.
- Docs moved to `docs/` (`Plan.md`, `problem_Statement.md`, `ModelPlan.md`, session notes).

## Current status
RAG built + 57 tests passing. Not yet committed/pushed (this session's work is uncommitted); previous work is `10a891d` on `main`.

## Open issues
- RAG needs live Postgres for retrieval/ingest: Docker daemon not running -> `/v1/analyst/ask` retrieval returns 503. Ingest + end-to-end untested against a live DB.
- OpenAI API key not set -> uses offline `FakeLLMClient` (works, deterministic). Set `OPENAI_API_KEY` for gpt-4o-mini.
- bge-small-en-v1.5 downloads (~130 MB) on first ingest.
- Frontend is in a separate folder (being built by Antigravity against a standalone prompt); backend CORS origin is `http://localhost:5173`. No assistant panel wired yet.

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not production.
- LR baselines log a convergence warning (max_iter=1000); scale features to clear it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.
- `ml/feature_metadata.json` medians changed on retrain (computed from the 80% split now) — committed to stay consistent with the retrained model.

## Validation completed
- `pytest tests/` -> 43 passed.
- HTTP smoke: health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384.
- Demo scenarios: low-risk -> approve, high-debt -> decline, suspicious -> refer.
- `npm run build` success; `git push` -> `407068e..10a891d`, tree clean.

## Exact next steps
1. (User) Start Docker Desktop -> `docker compose down -v` (applies new schema) -> `docker compose up -d`.
2. Ingest policies: `.venv\Scripts\python -m app.rag.ingest`.
3. Run a decision, then `POST /v1/analyst/ask` with that `application_id` to verify end-to-end (FakeLLM offline, or set `OPENAI_API_KEY`).
4. Commit + push this session's RAG work.
5. Optional: frontend `PolicyAssistant` panel + `askAnalyst()`; Plaid Sandbox; scale LR features.

## Recommended model path for next session
- `deepseek-v4-pro` for RAG/feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `docs/ModelPlan.md`.
- Do first: RAG architecture decision (see Perplexity prompt), then scaffold `app/rag/`.
- Check first: `pytest tests/`, then HTTP smoke (login, decision, audit 403/429).
- Stay in opencode. No escalation needed.
