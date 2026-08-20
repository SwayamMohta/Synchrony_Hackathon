# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
RAG policy assistant complete (build + live end-to-end verified + evaluation/QA pass + provider-agnostic LLM). Remaining: user pastes a free LLM key (Gemini or Groq) into `.env`.

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
  - Architecture (Perplexity plan, adapted to India): PostgreSQL + pgvector, BAAI/bge-small-en-v1.5 embeddings, section-aware chunking, hybrid retrieval (dense cosine + Postgres FTS via `websearch_to_tsquery`) fused with Reciprocal Rank Fusion, free cloud LLM with deterministic server-side guardrails.
  - `app/rag/` modules: `chunking.py`, `embeddings.py`, `retrieval.py`, `guardrails.py`, `prompts.py`, `llm_client.py`, `ingest.py`.
  - Provider-agnostic `get_llm_client()`: any OpenAI-compatible free LLM via `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL_ID` (or `GEMINI_*`). OpenAI removed. Offline `FakeLLMClient` fallback when no key / on LLM error.
  - `POST /v1/analyst/ask` (`app/api/analyst.py`, analyst-only, 30/min) — reads immutable decision snapshot (incl. recorded inputs), deterministic decision-request refusal (`should I approve`/`override`/`recommend`), retrieval filtered by `policy_version`, grounding gate, server-side validation (outcome==snapshot, citations in retrieved set, banned words), persists `rag_audit`.
  - `audit/logger.py`: `get_decision_snapshot()` (Postgres + JSONL fallback, resolves request_id/applicant_id, returns `inputs`) and `write_rag_audit()`.
  - Schema: `db/schema.sql` extended (`policy_embeddings` + chunk_id/section_path/rule_id/embedding_model/chunker_version/policy_version/content_tsv + GIN index; `policies` + content_hash; `rag_audit`). Ingest runs idempotent `_ensure_schema`.
  - Policy corpus: 7 RBI PDFs (tagged `rbi-2025`, regulatory reference) + authored `policies/underwriting-policy-v1.md` (tagged `v1`, maps every engine reason code/threshold; includes debt-ratio formula + affordability wording).
  - Frontend: `PolicyAssistant.jsx` panel + `askAnalyst()` in `client.js`, shown under the decision card.
  - QA pass: 20-question evaluation across approve/refer/decline; fixed LLM-error 500, "max borrow" refusal, debt-ratio gap, decision-request answers; retrieval now surfaces the right chunk for every question type.
  - `tests/test_rag.py`. Total suite now 63 passing.
- Committed + pushed to GitHub (`github.com/SwayamMohta/Synchrony_Hackathon`, `main`).

## In progress
- None actively.

## Blockers
- No LLM key set in `.env` -> `/v1/analyst/ask` uses the offline `FakeLLMClient` (deterministic grounded answers). Set `GEMINI_API_KEY` (free tier: 20 req/day) or the generic `LLM_API_KEY`+`LLM_BASE_URL`+`LLM_MODEL_ID` (e.g. Groq, higher free limits) to use a real LLM.
- Docker Desktop must be running for RAG retrieval/ingest (pgvector + FTS); audit falls back to JSONL when down. (Verified working when up.)
- Embedding model (`bge-small-en-v1.5`, ~130 MB) downloads on first ingest.

## Validation and checks
- `pytest tests/` -> 63 passed (policy, feature builder, fraud, security/roles, edge cases, RAG).
- RAG live end-to-end verified (Docker Postgres up, 560 chunks ingested): login -> decision -> ask returns grounded, cited, outcome-matching answers for approve/refer/decline + "max borrow" + "debt ratio".
- RAG QA evaluation (20 questions): decision-request questions (`should I approve`/`override`/`recommend`) deterministically refused; all factual/threshold questions retrieve the correct chunk; out-of-scope + input-data answers depend on the LLM (Gemini free-tier quota was exhausted during testing).
- HTTP smoke (TestClient): health 200; login analyst/admin 200; decision no-token 401; decision analyst 200; audit analyst 403; audit admin 200; login 6th/7th -> 429.
- Credit model: AUC 0.8673, recall 0.816 (Youden 0.44). Fraud model: AUC 0.9392, recall 0.8384 (Youden 0.475).
- Demo scenarios end-to-end: low-risk -> approve (credit 0.294), high-debt -> decline (policy), suspicious -> refer (fraud 0.8).
- `npm run build` success.

## Risks or open questions
- Rate limits use in-memory storage (reset on restart) — fine for demo, not multi-instance production.
- LR baselines log a convergence warning (max_iter=1000) — acceptable; scaling features would clear it.
- IEEE-CIS fraud model is transaction fraud, not application fraud — kept as standalone demo; pipeline uses rule-based application fraud (deliberate, per user decision).
- Free LLM tiers are rate-limited (Gemini 20 req/day); offline `FakeLLMClient` fallback answers generically and does not refuse out-of-scope questions. A factually-wrong threshold in free text is not machine-enforced (mitigated by low temp + grounding + citation guardrails); a cross-encoder reranker is the phase-2 upgrade if retrieval misranks.

## Next steps
1. (User) Paste a free LLM key into `.env` (`GEMINI_API_KEY`, or `LLM_API_KEY`+`LLM_BASE_URL`+`LLM_MODEL_ID` for Groq/Cerebras/OpenRouter).
2. (User) Start Docker Desktop -> `docker compose up -d`; `.venv\Scripts\python -m app.rag.ingest`.
3. Run the API (`.venv\Scripts\python -m uvicorn app.main:app --reload`) + frontend (`npm run dev` in `frontend/`) and ask the assistant under a decision card.
4. Optional: cross-encoder reranker; Plaid Sandbox; scale LR features; integration tests.

## Recommended model path
- `deepseek-v4-pro` for feature work (RAG); `deepseek-v4-flash` for mechanical edits/tests.
