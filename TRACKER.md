# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
RAG policy assistant built (architecture finalized, code + tests done). Remaining: run ingest against live Postgres + optional OpenAI key + frontend assistant panel.

## Status
in-progress

## Completed work
- Problem statement + implementation plan: `docs/problem_Statement.md`, `docs/Plan.md`.
- Full Must-Have build: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (all financial data explicit/controlled): `app/schemas.py` (16-field `ApplicantInput`), `app/features/builder.py`, `app/features/fraud_signals.py`, `app/rules/policy_engine.py`, `app/decisioning/pipeline.py`, `app/api/decision.py`. Deleted `app/data/bureau_mock.py` / `cashflow_mock.py`.
- 4 final decisioning corrections:
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
- Edge-case hardening (`tests/test_edge_cases.py`, 27 new tests):
  - Policy boundaries (expense ratio at/below 65%, delinquency 3 vs 4, affordability exactly 6x), builder zero-income / DebtRatio>1 / utilization>1, fraud None/empty identity, `_decide` ordering, JWT expired/missing-role, schema negatives, audit read.
  - 2 bugs fixed: (1) JWT missing `role` claim -> 500 KeyError, now 401 (`app/auth/security.py`); (2) empty-string device/IP recorded into fraud history, now skipped (`app/features/fraud_signals.py`).
- Frontend: full input form + 3 demo scenarios + decision card (SHAP chart) in `frontend/src/components/`.
- RAG policy assistant built (read-only explanation service):
  - Architecture (from Perplexity plan, adapted to India): PostgreSQL + pgvector, BAAI/bge-small-en-v1.5 embeddings, section-aware chunking, hybrid retrieval (dense cosine + Postgres FTS via `websearch_to_tsquery`) fused with Reciprocal Rank Fusion, cloud LLM (gpt-4o-mini) with deterministic server-side guardrails.
  - `app/rag/` modules: `chunking.py`, `embeddings.py`, `retrieval.py`, `guardrails.py`, `prompts.py`, `llm_client.py`, `ingest.py`.
  - `FakeLLMClient` offline fallback (no key needed) + `OpenAILLMClient` (used when `OPENAI_API_KEY` set).
  - `POST /v1/analyst/ask` (`app/api/analyst.py`, analyst-only, 30/min) — reads immutable decision snapshot by `application_id`, retrieves policy filtered by `policy_version`, gates (refusal when no basis), validates citations/outcome/banned words server-side, persists `rag_audit`.
  - `audit/logger.py`: `get_decision_snapshot()` (Postgres + JSONL fallback, resolves request_id/applicant_id) and `write_rag_audit()`.
  - Schema: `db/schema.sql` extended (`policy_embeddings` + chunk_id/section_path/rule_id/embedding_model/chunker_version/policy_version/content_tsv + GIN index; `policies` + content_hash; new `rag_audit` table). Ingest runs idempotent `_ensure_schema` so it works on pre-existing volumes.
  - Policy corpus: 7 RBI PDFs downloaded to `policies/` (Credit Facilities, Credit Information Reporting, Credit Risk Management, Responsible Business Conduct, Credit Information Companies, + NBFC variants) and authored `policies/underwriting-policy-v1.md` mapping every engine reason code/threshold.
  - `tests/test_rag.py` (14 tests). Total suite now 57 passing.
- Committed + pushed to GitHub (`github.com/SwayamMohta/Synchrony_Hackathon`, `main`): commit `10a891d`.

## In progress
- None actively.

## Blockers
- OpenAI API key still not set -> `/v1/analyst/ask` uses the offline `FakeLLMClient` (deterministic grounded answers). Set `OPENAI_API_KEY` in `.env` to switch to gpt-4o-mini.
- Docker Desktop daemon not running -> RAG retrieval (pgvector + FTS) needs live Postgres; ingest and `/v1/analyst/ask` retrieval return 503 until `docker compose up -d`. Audit still falls back to JSONL.
- Embedding model (`bge-small-en-v1.5`, ~130 MB) downloads on first ingest; needs `sentence-transformers` + internet.

## Validation and checks
- `pytest tests/` -> 57 passed (policy, feature builder, fraud, security/roles, edge cases, RAG).
- RAG unit tests: chunking (section/rule-id/split), RRF fusion, guardrails (outcome/citation/banned-word/refusal), FakeLLM groundedness, decision-snapshot JSONL fallback, `/v1/analyst/ask` (auth + happy path, mocked retrieval).
- HTTP smoke (TestClient): health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit model: AUC 0.8673, recall 0.816 (Youden 0.44). Fraud model: AUC 0.9392, recall 0.8384 (Youden 0.475).
- Demo scenarios end-to-end: low-risk -> approve (credit 0.294), high-debt -> decline (policy), suspicious -> refer (fraud 0.8).
- `npm run build` success.
- `git status` clean after push (`main...origin/main`).

## Risks or open questions
- Rate limits use in-memory storage (reset on restart) — fine for demo, not multi-instance production.
- LR baselines log a convergence warning (max_iter=1000) — acceptable; scaling features would clear it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — kept as standalone demo; pipeline uses rule-based application fraud (deliberate, per user decision).
- RAG architecture not yet chosen (embedding model, chunking, retrieval, local vs cloud LLM) — see Perplexity research prompt.

## Next steps
1. (User) Start Docker Desktop -> `docker compose down -v` (to apply the new schema) then `docker compose up -d`.
2. Ingest policies: `.venv\Scripts\python -m app.rag.ingest` (downloads bge-small, embeds, inserts into pgvector + FTS).
3. Test RAG end-to-end: run a decision, then `POST /v1/analyst/ask` with that `application_id` (works offline via FakeLLM; set `OPENAI_API_KEY` for gpt-4o-mini).
4. Optional: frontend `PolicyAssistant` panel + `askAnalyst()` in `frontend/src/api/client.js`.
5. Optional: Plaid Sandbox; scale LR features; integration tests.

## Recommended model path
- `deepseek-v4-pro` for feature work (RAG); `deepseek-v4-flash` for mechanical edits/tests.
