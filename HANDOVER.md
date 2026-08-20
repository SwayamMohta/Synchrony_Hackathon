# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style) for NTC/thin-file applicants: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit + JWT auth + RAG policy assistant. All Must-Have + RAG work complete and live-verified. This session did whole-website verification, fixed remaining loose ends, and committed + pushed everything to GitHub.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor + 4 final corrections (DebtRatio formula, affordability REFER before credit thresholds, high-debt 0.84 expense ratio, "Rule-based fraud risk score" label).
- Credit model recall fix: recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (IEEE-CIS, standalone demo): AUC 0.9392 / recall 0.8384. Pipeline stays rule-based.
- Security hardening: `require_role`, admin-only `GET /v1/audit/logs`, slowapi rate limiting (login 5/min, decision 30/min).
- Edge-case hardening; JWT missing-role 500 -> 401.
- RAG policy assistant (read-only): `app/rag/` (chunking, bge-small-en-v1.5, dense+FTS+RRF, cross-encoder reranker, guardrails, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, schema (policies/policy_embeddings/rag_audit), 7 RBI PDFs + `policies/underwriting-policy-v1.md`, `tests/test_rag.py`.
- "Frontend syn" React+TS+Tailwind app is the main frontend, wired end-to-end (no mock data).
- **Whole-website verification (this session)**: live smoke-tested ALL backend endpoints (health, auth, decision, applications list/detail, audit admin-gated, metrics, analyst/ask incl. guardrail refusal + audit). RAG confirmed ingested (561 chunks / 8 policies); audit trails to Postgres. No broken endpoints, no 5xx. All frontend routes render (added `src/test/pages.test.tsx`).
- **RAG "Recents" bug fix**: stale `policylens_active_session_id` (truthy but matching no session) made `handleSend` take the append branch and never create a chat. Fixed with a `hasActiveSession` guard in `PolicyAssistant.tsx::handleSend`; added vitest harness (`src/test/`, `vitest.config.ts`, `npm test` script) + 3 regression tests. Also made "New chat" clear the stale active-session key.
- **Decision contract fix**: `app/schemas.py::DecisionResult` + `app/decisioning/pipeline.py` now return `fraud_signals` and `profile` (were computed/stored but omitted from the response). Verified live.
- **`getAuditLogs` shape fix**: `underwritingApi.ts` now unwraps the backend `{logs:[...]}` envelope.
- **Build regression fix**: `src/test/pages.test.tsx` had TS errors breaking `tsc -b`; removed unused imports + cast `importOriginal`.
- **Dead component cleanup (user-confirmed)**: deleted `FraudInvestigation.tsx`, `FraudInvestigationPage.tsx`, `PendingCasesWidget.tsx`, `AuditTrail.tsx`, `ModelEvaluation.tsx`.
- **RAG starter-query loose end fix**: 2 of 4 suggested query cards referenced nonexistent policy sections (DTI under 4.2; thin-file under 5.1) causing refusals; rewrote to reference real answerable content (verified `answered` with citations live).
- **Analytics stats tab**: recharts Tooltip hover text now white (`itemStyle`/`labelStyle`); "Applicant Stats" tab shows per-applicant charts (Risk Profile / Monthly Cash-Flow / Loan vs Income) instead of portfolio aggregates; removed unused DECISION_COLORS/SEGMENT_COLORS.
- **README.md rewritten** (PRISM overview, problem, solution, architecture mermaid, decision flow, API table, setup, limitations) with NO em dashes.
- **Favicon changed** to a bee mark matching the BeeBot/PolicyLens theme (`Frontend syn/public/favicon.svg`).
- Tests: backend 83 passing; frontend 15/15 (PolicyAssistant + pages).

## What changed
- `app/schemas.py` — `DecisionResult` now returns `fraud_signals` + `profile` (optional); `ApplicantInput` identity fields; `AnalystAskRequest.application_id` optional.
- `app/decisioning/pipeline.py` — returns `fraud_signals` + `profile`; stores `profile` in audit evidence.
- `app/audit/logger.py` — `_ensure_profile` backfill; snapshots expose `profile`/`fraud_signals`/`shap_top_features`/`application_id`/`timestamp`.
- `app/api/{applications,metrics}.py`, `app/decisioning/profile.py`, `tests/test_applications.py` — new.
- `app/api/analyst.py`, `app/main.py` (CORS list), `app/rag/{llm_client,prompts}.py` — optional snapshot/application_id handling.
- `Frontend syn/src/components/assistant/PolicyAssistant.tsx` — RAG Recents fix (`hasActiveSession` guard), stale-key clear, starter-query rewording, case selector shows name-first, bee theme.
- `Frontend syn/src/components/analytics/AnalyticsWorkspace.tsx` — per-applicant stats + white tooltips.
- `Frontend syn/src/api/underwritingApi.ts` — `getAuditLogs` unwraps `{logs}`; `DecisionResponse` gains `fraud_signals`/`profile`.
- `Frontend syn/src/test/` (PolicyAssistant.test.tsx, pages.test.tsx, setup.ts), `vitest.config.ts`, `package.json` test script — new test harness.
- `Frontend syn/public/favicon.svg` — bee mark.
- Deleted: `Frontend syn/src/components/{evaluation/ModelEvaluation.tsx, fraud/FraudInvestigation.tsx, governance/AuditTrail.tsx, workspace/PendingCasesWidget.tsx}`, `Frontend syn/src/pages/FraudInvestigationPage.tsx`.
- `.gitignore` — added `Frontend syn/dist/`, `.vite/`, `node_modules/`.
- `README.md`, `TRACKER.md` — rewritten/updated.

## Current status
Done and pushed. Working tree clean at `4fd5a32` on `origin/main`. Backend 83 tests passing; frontend 15/15, build clean, lint 0 errors. Both commits `e8a63c6` and `4fd5a32` are on GitHub.

## Open issues
- None blocking. LLM configured in `.env` (Groq `groq/compound-mini`, `https://api.groq.com/openai/v1`; Gemini key also present as fallback).
- RAG needs Docker running for retrieval/ingest (verified working when up). Audit falls back to JSONL when down.
- bge-small-en-v1.5 (~130 MB) and the cross-encoder (~90 MB) download on first ingest/live use.
- Groq free-tier 429 rate limit intermittently engages the offline `FakeLLMClient` fallback (known/accepted; cannot fix without paid quota).
- Legacy `frontend/` folder still exists (superseded by `Frontend syn/`) — optional cleanup, not yet done.

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not multi-instance production.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.
- `ml/feature_metadata.json` medians changed on retrain (computed from the 80% split now) — committed to stay consistent with the retrained model.
- Free LLM tiers are rate-limited; offline `FakeLLMClient` fallback answers generically and does not refuse out-of-scope. A factually-wrong threshold in free text isn't machine-enforced (mitigated by grounding + citation guardrails).
- Legacy display profiles are backfilled at read time (not stored) — deterministic per snapshot, recomputed, no migration needed.
- Model artifacts (`app/models/artifacts/*`, `ml/data/*`) are gitignored — regenerated locally, not in version control.

## Validation completed
- `pytest tests/` -> 83 passed.
- `npm test` (Frontend syn) -> 15/15 passed (2 files).
- `npm run build` (Frontend syn) -> clean (only non-fatal chunk-size warning).
- `npm run lint` (oxlint) -> 0 errors (pre-existing warnings only, none in AnalyticsWorkspace).
- Live `/v1/decision` response includes `fraud_signals` + `profile` (HTTP-verified).
- Live RAG: corrected starter queries return `status=answered` with 6 grounded citations; guardrail correctly refuses ungroundable questions.
- Live smoke of all endpoints passed (health, login, decision, applications list/detail, audit roles, metrics, analyst/ask).
- Earlier: credit AUC 0.8673 / recall 0.816; fraud AUC 0.9392 / recall 0.8384; 20-question RAG QA; 22/22 flow check.

## Exact next steps
1. (Optional) Delete legacy `frontend/` folder (superseded by `Frontend syn/`).
2. (User) Run API (`.venv\Scripts\python -m uvicorn app.main:app --reload`) + frontend (`npm run dev` in `Frontend syn/`) and walk the full workspace (Analytics > Applicant Stats to see the new per-applicant charts).

## Recommended model path for next session
- `deepseek-v4-pro` for RAG/feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `HANDOVER.md`.
- Do first: confirm `git status` is clean (should be at `4fd5a32`); pull latest on any machine.
- Check first: `pytest tests/` (83) + `npm test` (15) + `npm run build` in `Frontend syn/`, then start Docker + run the API + frontend.
- Stay in opencode. No escalation needed.
