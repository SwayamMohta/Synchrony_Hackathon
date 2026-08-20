# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
Analytics "Applicant Stats" tab polish (uncommitted): fixed recharts Tooltip hover text being invisible (added `itemStyle`/`labelStyle` white) and replaced the 3 portfolio-wide charts with 3 per-applicant charts driven by `activeCase` (Risk Profile, Monthly Cash-Flow, Loan vs Income). Committed+ready state: everything since `2f9725d` is in commit `e8a63c6` (NOT yet pushed).

## Status
in-progress

## Completed work
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor + 4 final corrections (DebtRatio formula, affordability REFER before credit thresholds, high-debt 0.84 expense ratio, "Rule-based fraud risk score" label).
- Credit model recall fix: recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (IEEE-CIS, standalone demo): AUC 0.9392 / recall 0.8384. Pipeline stays rule-based.
- Security hardening: `require_role`, admin-only `GET /v1/audit/logs`, slowapi rate limiting (login 5/min, decision 30/min).
- Edge-case hardening (`tests/test_edge_cases.py`); JWT missing-role 500 -> 401.
- RAG policy assistant (read-only): `app/rag/` (chunking, bge-small-en-v1.5, dense+FTS+RRF, cross-encoder reranker, guardrails, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, schema (policies/policy_embeddings/rag_audit), 7 RBI PDFs + `policies/underwriting-policy-v1.md`, `tests/test_rag.py`.
- "Frontend syn" React+TS+Tailwind app is the main frontend, wired end-to-end (no mock data).
- UX/data-integrity polish (earlier session): deterministic applicant names, DB-backed display profile (`app/decisioning/profile.py::build_profile`), chat persistence fix, rotating statuses, audit button removed from Decision page.
- **Whole-website verification (this session)**: live smoke-tested ALL backend endpoints (health, auth, decision, applications list/detail, audit admin-gated, metrics, analyst/ask incl. guardrail refusal + audit). RAG confirmed ingested (561 chunks / 8 policies), audit trails to Postgres. No broken endpoints, no 5xx. All frontend routes render (added `src/test/pages.test.tsx`).
- **RAG "Recents" bug fix**: stale `policylens_active_session_id` (truthy but matching no session) made `handleSend` take the append branch and never create a chat. Fixed with a `hasActiveSession` guard in `PolicyAssistant.tsx::handleSend`; added vitest harness (`src/test/`, `vitest.config.ts`, `npm test` script) + 3 regression tests.
- **Decision contract fix**: `app/schemas.py::DecisionResult` + `app/decisioning/pipeline.py` now return `fraud_signals` and `profile` (were computed/stored but omitted from the response). Verified live.
- **`getAuditLogs` shape fix**: `underwritingApi.ts` now unwraps the backend `{logs:[...]}` envelope.
- **Build regression fix**: `src/test/pages.test.tsx` had TS errors breaking `tsc -b`; removed unused imports + cast `importOriginal`.
- **Dead component cleanup (user-confirmed)**: deleted `FraudInvestigation.tsx`, `FraudInvestigationPage.tsx`, `PendingCasesWidget.tsx`, `AuditTrail.tsx`, `ModelEvaluation.tsx`.
- **RAG starter-query loose end fix**: 2 of 4 suggested query cards referenced nonexistent policy sections (DTI under 4.2; thin-file under 5.1) causing refusals; rewrote to reference real answerable content (verified `answered` with citations live).
- **Analytics stats tab (this session, uncommitted)**: recharts Tooltip hover text now white (`itemStyle`/`labelStyle`); "Applicant Stats" tab shows per-applicant charts (Risk Profile / Monthly Cash-Flow / Loan vs Income) instead of portfolio aggregates; removed unused DECISION_COLORS/SEGMENT_COLORS.
- **README.md rewritten** (PRISM overview, problem, solution, architecture mermaid, decision flow, API table, setup, limitations) with NO em dashes.
- **Favicon changed** to a bee mark matching the BeeBot/PolicyLens theme (`Frontend syn/public/favicon.svg`).
- Tests: backend 83 passing; frontend 15/15 (PolicyAssistant + pages).

## In progress
- Analytics "Applicant Stats" tab changes in `AnalyticsWorkspace.tsx` are uncommitted.
- Commit `e8a63c6` (everything else this session) is committed but NOT yet pushed to origin/main.

## Blockers
- None. LLM configured in `.env` (Groq `groq/compound-mini`; Gemini fallback).
- Docker Desktop must be running for RAG retrieval/ingest; audit falls back to JSONL when down.
- Embedding model (bge-small-en-v1.5 ~130 MB) + cross-encoder (~90 MB) download on first use.
- Groq free-tier 429 rate limit intermittently engages the offline `FakeLLMClient` fallback (known/accepted; cannot fix without paid quota).

## Validation and checks
- `pytest tests/` -> 83 passed.
- `npm test` (Frontend syn) -> 15/15 passed (2 files).
- `npm run build` (Frontend syn) -> clean (only non-fatal chunk-size warning).
- `npm run lint` (oxlint) -> 0 errors (pre-existing warnings only, none in AnalyticsWorkspace).
- Live `/v1/decision` response includes `fraud_signals` + `profile` (HTTP-verified).
- Live RAG: corrected starter queries return `status=answered` with 6 grounded citations; guardrail correctly refuses ungroundable questions.
- Live smoke of all endpoints (health, login, decision, applications list/detail, audit roles, metrics, analyst/ask) passed.
- Earlier: credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384.

## Risks or open questions
- Rate limits are in-memory (reset on restart) — fine for demo, not multi-instance production.
- IEEE-CIS fraud model is transaction fraud (standalone demo); pipeline uses rule-based application fraud.
- Free LLM tiers are rate-limited; offline `FakeLLMClient` fallback answers generically. Factually-wrong thresholds in free text are not machine-enforced (mitigated by grounding + citation guardrails).
- Legacy rows display derived profiles via read-time backfill (recomputed, not stored) — deterministic per snapshot, no migration needed.
- Legacy `frontend/` folder still exists (superseded by `Frontend syn/`) — optional cleanup.

## Next steps
1. Commit the `AnalyticsWorkspace.tsx` changes (Analytics stats tab).
2. Push commit `e8a63c6` + the analytics commit to GitHub.
3. (User) Run API (`.venv\Scripts\python -m uvicorn app.main:app --reload`) + frontend (`npm run dev` in `Frontend syn/`) and walk the full workspace.

## Recommended model path
- `deepseek-v4-pro` for feature work (RAG); `deepseek-v4-flash` for mechanical edits/tests.
