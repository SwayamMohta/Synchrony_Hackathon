# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style). All Must-Have + RAG work complete and live-verified with a real free LLM (Groq `groq/compound-mini`). Polish pass done (reranker, scaled LR, integration tests); only live verification + push remain.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (explicit controlled inputs, no hidden generation; bureau/cashflow mocks deleted).
- 4 final decisioning corrections: DebtRatio = `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`; affordability REFER before credit thresholds; high-debt scenario 0.84 expense ratio; fraud label "Rule-based fraud risk score".
- Credit model recall fix (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (`ml/train_fraud.py`, IEEE-CIS, standalone demo): XGBoost AUC 0.9392, recall 0.8384. Artifact `app/models/artifacts/fraud_risk_v1.json`. Pipeline stays rule-based.
- Security hardening: role enforcement (`require_role(*roles)`, admin-only `GET /v1/audit/logs`) + slowapi rate limiting (login 5/min, decision 30/min). New files `app/rate_limit.py`, `app/api/audit.py`.
- Edge-case hardening (`tests/test_edge_cases.py`): 27 new tests; fixed JWT missing-role 500 -> 401 and empty-string device/IP recording.
- RAG policy assistant (read-only) complete: `app/rag/` (chunking, bge-small-en-v1.5 embeddings, dense+FTS+RRF retrieval, guardrails, prompts, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, `get_decision_snapshot`/`write_rag_audit`, schema migration, 7 RBI PDFs + authored `policies/underwriting-policy-v1.md`, frontend `PolicyAssistant.jsx` panel, `tests/test_rag.py`. Live end-to-end verified + 20-question QA pass.
- Polish pass (this session): cross-encoder reranker, scaled LR baselines (convergence warning cleared), offline integration tests, cache-friendly prompt docs, test env-isolation fix. Suite now 74 passing.

## What changed
- `ml/train_credit.py`, `ml/train_fraud.py` — save `ml/data/*_metrics.json`, use class-weight + Youden threshold; LR baseline now `StandardScaler` + `Pipeline`.
- `app/auth/security.py` (multi-role + robust `current_user`), `app/auth/roles.py`, `app/api/decision.py`, `app/api/auth.py`, `app/main.py` (slowapi + audit router), `app/audit/logger.py` (read_audit_log, get_decision_snapshot, write_rag_audit), `app/schemas.py` (protected_namespaces fix, analyst-ask models).
- RAG: `app/rag/{chunking,embeddings,retrieval,guardrails,prompts,llm_client,ingest,reranker}.py`, `app/api/analyst.py`, `policies/` (7 RBI PDFs + `underwriting-policy-v1.md`), `db/schema.sql` (chunk metadata + tsvector/GIN + `rag_audit`), `requirements.txt` (+`pypdf`, `python-dotenv`), `.env.example`/`.env` (generic `LLM_*` + `GEMINI_*`, `RERANK_MODEL`), `frontend/src/components/PolicyAssistant.jsx` + `client.js` + `ApplicationForm.jsx` + `index.css`, `tests/test_rag.py`.
- `tests/test_security.py`, `tests/test_edge_cases.py`, `tests/test_integration.py`. 74 total.
- `.gitignore` — added `ieee-fraud-detection/`, `ml/rag_audit_fallback.jsonl`, `policies/*.pdf`.
- Docs moved to `docs/` (`Plan.md`, `problem_Statement.md`, `ModelPlan.md`, session notes).

## Current status
Done (core + polish). 74 tests passing. Commits `c0b383e`..`0f35ba1` are LOCAL ONLY (not pushed); last pushed commit is `85745c9`.

## Open issues
- None blocking. LLM configured in `.env` (Groq `groq/compound-mini`, `https://api.groq.com/openai/v1`; Gemini key also present as fallback).
- RAG needs Docker running for retrieval/ingest (verified working when up). Audit falls back to JSONL when down.
- bge-small-en-v1.5 (~130 MB) and the cross-encoder (~90 MB) download on first ingest/live use.
- Cross-encoder reranker NOT live-verified (unit-tested with a stub only).

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not multi-instance production.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.
- `ml/feature_metadata.json` medians changed on retrain (computed from the 80% split now) — committed to stay consistent with the retrained model.
- Free LLM tiers are rate-limited; offline `FakeLLMClient` fallback answers generically and does not refuse out-of-scope. A factually-wrong threshold in free text isn't machine-enforced (mitigated by grounding + citation guardrails).
- Model artifacts (`app/models/artifacts/*`, `ml/data/*`) are gitignored — regenerated locally, not in version control.

## Validation completed
- `pytest tests/` -> 74 passed (incl. reranker + integration).
- RAG live end-to-end with real Groq LLM (`groq/compound-mini`): "why referred?" -> cited fraud 0.80 > 0.70 rule; "max borrow?" -> 6x monthly income affordability; "why approved?" -> thresholds; "should I approve?" -> refused (decision-request guard).
- RAG QA (20 questions): decision-request questions deterministically refused; all factual/threshold questions retrieve the correct chunk.
- HTTP smoke: health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384. LR baselines: credit 0.8021, fraud 0.8202 (post-scaling).
- Demo scenarios: low-risk -> approve, high-debt -> decline, suspicious -> refer.
- `npm run build` success.

## Exact next steps
1. Push commits `c0b383e`..`0f35ba1` to GitHub (`git push`).
2. Live-verify the cross-encoder reranker: `docker compose up -d`, `.venv\Scripts\python -m app.rag.ingest`, then ask under a decision card and confirm ranking improves.
3. (User) Run API + frontend and ask the assistant under a decision card (Groq is already configured in `.env`).

## Recommended model path for next session
- `deepseek-v4-pro` for RAG/feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `HANDOVER.md`.
- Do first: `git push` (6 local commits), then live-verify the reranker if desired.
- Check first: `pytest tests/` (74), then start Docker + run the API/frontend.
- Stay in opencode. No escalation needed.
