# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style). Core Must-Have + model improvements + security hardening + edge-case hardening are complete. The RAG policy assistant is complete: built, live end-to-end verified against Postgres, QA-evaluated, provider-agnostic LLM, and wired into the frontend. Remaining: user pastes a free LLM key into `.env`.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (explicit controlled inputs, no hidden generation; bureau/cashflow mocks deleted).
- 4 final decisioning corrections: DebtRatio = `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`; affordability REFER before credit thresholds; high-debt scenario 0.84 expense ratio; fraud label "Rule-based fraud risk score".
- Credit model recall fix (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (`ml/train_fraud.py`, IEEE-CIS, standalone demo): XGBoost AUC 0.9392, recall 0.8384. Artifact `app/models/artifacts/fraud_risk_v1.json`. Pipeline stays rule-based.
- Security hardening: role enforcement (`require_role(*roles)`, admin-only `GET /v1/audit/logs`) + slowapi rate limiting (login 5/min, decision 30/min). New files `app/rate_limit.py`, `app/api/audit.py`.
- Edge-case hardening (`tests/test_edge_cases.py`): 27 new tests; fixed JWT missing-role 500 -> 401 and empty-string device/IP recording.
- RAG policy assistant (read-only) complete: `app/rag/` (chunking, bge-small-en-v1.5 embeddings, dense+FTS+RRF retrieval, guardrails, prompts, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, `get_decision_snapshot`/`write_rag_audit`, schema migration, 7 RBI PDFs + authored `policies/underwriting-policy-v1.md`, frontend `PolicyAssistant.jsx` panel, `tests/test_rag.py`. Live end-to-end verified + 20-question QA pass. Suite 63 passing.

## What changed
- `ml/train_credit.py`, `ml/train_fraud.py` — save `ml/data/*_metrics.json`, use class-weight + Youden threshold.
- `app/auth/security.py` (multi-role + robust `current_user`), `app/auth/roles.py`, `app/api/decision.py`, `app/api/auth.py`, `app/main.py` (slowapi + audit router), `app/audit/logger.py` (read_audit_log, get_decision_snapshot, write_rag_audit), `app/schemas.py` (protected_namespaces fix, analyst-ask models).
- RAG: new `app/rag/{chunking,embeddings,retrieval,guardrails,prompts,llm_client,ingest}.py`, `app/api/analyst.py`, `policies/` (7 RBI PDFs + `underwriting-policy-v1.md`), `db/schema.sql` (chunk metadata + tsvector/GIN + `rag_audit`), `requirements.txt` (+`pypdf`, `python-dotenv`), `.env.example`/`.env` (generic `LLM_*` + `GEMINI_*`), `frontend/src/components/PolicyAssistant.jsx` + `client.js` + `ApplicationForm.jsx` + `index.css`, `tests/test_rag.py`.
- `tests/test_security.py`, `tests/test_edge_cases.py`. 63 total.
- `.gitignore` — added `ieee-fraud-detection/`, `ml/rag_audit_fallback.jsonl`, `policies/*.pdf`.
- Docs moved to `docs/` (`Plan.md`, `problem_Statement.md`, `ModelPlan.md`, session notes).

## Current status
RAG complete + verified + 63 tests passing. This session's improvements are uncommitted (previous work is `66a6826` on `main`).

## Open issues
- No LLM key in `.env` -> uses offline `FakeLLMClient`. Paste `GEMINI_API_KEY` (free 20 req/day) or `LLM_API_KEY`+`LLM_BASE_URL`+`LLM_MODEL_ID` (Groq/Cerebras/OpenRouter, higher free limits) to use a real LLM.
- RAG needs Docker running for retrieval/ingest (verified working when up). Audit falls back to JSONL when down.
- bge-small-en-v1.5 downloads (~130 MB) on first ingest.

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not production.
- LR baselines log a convergence warning (max_iter=1000); scale features to clear it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.
- `ml/feature_metadata.json` medians changed on retrain (computed from the 80% split now) — committed to stay consistent with the retrained model.

## Validation completed
- `pytest tests/` -> 63 passed.
- RAG live end-to-end (Docker Postgres, 560 chunks): login -> decision -> ask returns grounded, cited, outcome-matching answers for approve/refer/decline + "max borrow" + "debt ratio".
- RAG QA (20 questions): decision-request questions deterministically refused; all factual/threshold questions retrieve the correct chunk.
- HTTP smoke: health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384.
- Demo scenarios: low-risk -> approve, high-debt -> decline, suspicious -> refer.
- `npm run build` success.

## Exact next steps
1. (User) Paste a free LLM key into `.env` (`GEMINI_API_KEY`, or `LLM_API_KEY`+`LLM_BASE_URL`+`LLM_MODEL_ID` for Groq/Cerebras/OpenRouter).
2. (User) Start Docker Desktop -> `docker compose up -d`; `.venv\Scripts\python -m app.rag.ingest`.
3. Run API + frontend; ask the assistant under a decision card.
4. Commit + push this session's work.

## Recommended model path for next session
- `deepseek-v4-pro` for RAG/feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `docs/ModelPlan.md`.
- Do first: RAG architecture decision (see Perplexity prompt), then scaffold `app/rag/`.
- Check first: `pytest tests/`, then HTTP smoke (login, decision, audit 403/429).
- Stay in opencode. No escalation needed.
