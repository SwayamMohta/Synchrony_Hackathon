# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
Final UX/data-integrity polish pass (all LOCAL ONLY, nothing pushed since `85745c9`): deterministic applicant names, DB-backed display profile (no fabricated frontend fields), chat persistence fix, rotating loading statuses, audit button removed from Decision page. 83 backend tests passing, `npm run build` clean.

## Status
in-progress

## Completed work
- Problem statement + implementation plan: `docs/problem_Statement.md`, `docs/Plan.md`.
- Full Must-Have build: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (all financial data explicit/controlled): `app/schemas.py` (16-field `ApplicantInput`), `app/features/builder.py`, `app/features/fraud_signals.py`, `app/rules/policy_engine.py`, `app/decisioning/pipeline.py`, `app/api/decision.py`. Deleted `app/data/bureau_mock.py` / `cashflow_mock.py`.
- 4 final decisioning corrections (DebtRatio formula, affordability REFER before credit thresholds, high-debt 0.84 expense ratio, "Rule-based fraud risk score" label).
- Credit model improved (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model trained (standalone demo) `ml/train_fraud.py` on IEEE-CIS: XGBoost AUC 0.9392, recall 0.8384. Pipeline stays rule-based.
- Security hardening: `require_role(*roles)`, admin-only `GET /v1/audit/logs`, slowapi rate limiting (login 5/min, decision 30/min). `app/rate_limit.py`, `app/api/audit.py`.
- Edge-case hardening (`tests/test_edge_cases.py`, 27 tests): JWT missing-role 500 -> 401, empty-string device/IP skipped.
- RAG policy assistant (read-only): `app/rag/` (chunking, bge-small-en-v1.5 embeddings, dense+FTS+RRF retrieval, cross-encoder reranker, guardrails, prompts, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, `get_decision_snapshot`/`write_rag_audit`, schema migration, 7 RBI PDFs + authored `policies/underwriting-policy-v1.md`, `PolicyAssistant.jsx` panel, `tests/test_rag.py`. Live verified + 20-question QA pass.
- Polish pass: cache-friendly prompt ordering, scaled LR baselines (convergence warning cleared), offline integration tests, env-isolation fix. Suite at 74.
- "Frontend syn" React+TS+Tailwind app became main frontend, wired end-to-end (no mock data): `GET /v1/applications`, `GET /v1/applications/{id}`, `GET /v1/metrics/model-eval`; `ApplicantInput` extended (name/city/occupation/employment_length_years/credit_history_months); audit snapshot exposes `fraud_signals` + `shap_top_features` + `application_id`; `/v1/analyst/ask` optional `application_id`. `Frontend syn/src/services/api.ts` mapper + real loaders; `src/mock/` deleted; PolicyAssistant seed stripped.
- UI polish: deterministic applicant names, compact affordability section, Full Underwriting Inspection 70/30 layout + context rail, SHAP separated from reason codes, CORS comma-separated origins.
- UX/data-integrity polish (THIS SESSION, all uncommitted):
  - Deterministic applicant names: `mapSnapshotToApplicationCase` (`Frontend syn/src/services/api.ts`) falls back to a 10-name fictional Indian list hashed on `application_id`/`request_id`/`applicant_id` when `inputs.name` is absent — replaces old test labels (`live2`, `e-refer`, `eval-approve`, `app-rag-demo2`) surfaced from legacy `applicant_id` values.
  - DB single-source-of-truth for display fields: new `app/decisioning/profile.py::build_profile()` computes only REAL derived fields (segment, risk_band, fraud_level, dti, income_stability, expense_profile, behavioral_signals, bank_cashflow_surplus); stored in audit `evidence["profile"]` at decision time (`pipeline.py`); exposed + backfilled for legacy rows in `app/audit/logger.py` (`_ensure_profile`). Frontend `DecisionSnapshot.profile` typed; mapper reads `s.profile`. REMOVED fabricated fields: per-case `baselineScore` (was credit*1.1), `avgAccountBalance` (income*1.2), `upiTransactionConsistency` placeholder. ThinFilePanel now a 3-tile strip.
  - Chat persistence fix (`PolicyAssistant.tsx::handleSend`): user message + session are saved optimistically BEFORE the API call, so chats always appear in Recents and survive new-chat/reload even when backend/Docker/LLM is down (previously only saved after a successful response, so failures lost the chat); assistant error bubble appended on failure.
  - Rotating status messages: new `Frontend syn/src/hooks/useRotatingStatus.ts`; Decision run button (`DecisionEngineView.tsx`) cycles "Pondering…/Musing…/Crunching the numbers…/Consulting the policy manual…/Weighing the risk…"; PolicyAssistant bubble cycles its own phrases.
  - Admin Audit Log button + `AuditLogTable.tsx` removed from Decision Engine page (kept reachable via Analytics → Audit tab and admin-only `GET /v1/audit/logs`).
- Tests: `tests/test_applications.py` +4 (profile present/correct, THIN-FILE vs ESTABLISHED, legacy-row backfill). 83 passing.

## In progress
- None actively (work is local-only; push pending).

## Blockers
- None. LLM configured in `.env` (Groq `groq/compound-mini`; Gemini key fallback).
- Docker Desktop must be running for RAG retrieval/ingest (pgvector + FTS); audit falls back to JSONL when down.
- Embedding model (`bge-small-en-v1.5`, ~130 MB) and cross-encoder reranker (~90 MB) download on first use.
- ENTIRE `Frontend syn/` folder is untracked + this session's backend changes are uncommitted — everything since `85745c9` is LOCAL ONLY.

## Validation and checks
- `pytest tests/` -> 83 passed (policy, feature builder, fraud, security/roles, edge cases, RAG + reranker, integration, applications incl. profile tests).
- `npm run build` (Frontend syn) clean (only chunk-size warning); bundle dropped ~5KB after AuditLogTable removal.
- Deterministic-name mapping verified: `live2`->Rohan Kapoor, `e-refer`->Rohan Kapoor, `eval-approve`->Aarav Mehta, `app-rag-demo2`->Dev Patel (stable hash).
- Legacy-row backfill verified by test (`_normalize_db_row` on a row without `evidence.profile` recomputes a correct profile).
- Earlier validations still hold: RAG live end-to-end (Groq), 20-question QA, HTTP smoke, credit AUC 0.8673 / recall 0.816, fraud AUC 0.9392 / recall 0.8384, 22/22 flow check.

## Risks or open questions
- Rate limits are in-memory (reset on restart) — fine for demo, not multi-instance production.
- IEEE-CIS fraud model is transaction fraud, not application fraud — kept as standalone demo; pipeline uses rule-based application fraud.
- Free LLM tiers are rate-limited; offline `FakeLLMClient` fallback answers generically. Factually-wrong thresholds in free text not machine-enforced (mitigated by grounding + citation guardrails).
- Legacy rows display derived profiles via read-time backfill (no DB migration needed) — deterministic per snapshot, but recomputed not stored.
- `Frontend syn/` is still entirely untracked; committing it is a large add (needs review of any secrets — none expected).

## Next steps
1. Commit this session's work (new `Frontend syn/` + profile/chat/UI changes) and push all local commits since `85745c9`.
2. (User) Run API (`.venv\Scripts\python -m uvicorn app.main:app --reload`) + frontend (`npm run dev` in `Frontend syn/`) and walk the full workspace.
3. Optional: delete legacy `frontend/` folder + dead `FraudInvestigation.tsx`/`PendingCasesWidget.tsx`.
4. Optional (dropped per user): Plaid Sandbox integration.

## Recommended model path
- `deepseek-v4-pro` for feature work (RAG); `deepseek-v4-flash` for mechanical edits/tests.