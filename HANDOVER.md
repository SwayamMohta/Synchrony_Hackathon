# HANDOVER

## Current objective
Credit underwriting engine (PRISM-style). All Must-Have + RAG work complete and live-verified. "Frontend syn" React app is the main frontend, fully wired to the backend/RAG (no mock data). This session added final data-integrity/UX polish: deterministic applicant names, DB-backed display profile (fabricated frontend fields removed), chat persistence fix, rotating loading statuses, audit button removed. 83 tests passing, build clean. Only commit + push + user walkthrough remain.

## What was completed
- Full Must-Have: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + audit (JSONL fallback) + JWT auth.
- Decisioning refactor (explicit controlled inputs, no hidden generation; bureau/cashflow mocks deleted).
- 4 final decisioning corrections: DebtRatio = `(monthly_debt_payments + avg_monthly_expenses) / (annual_income/12)`; affordability REFER before credit thresholds; high-debt scenario 0.84 expense ratio; fraud label "Rule-based fraud risk score".
- Credit model recall fix (`ml/train_credit.py`): scale_pos_weight + balanced LR + Youden threshold. Recall 0.199 -> 0.816; AUC 0.8673.
- Fraud ML model (`ml/train_fraud.py`, IEEE-CIS, standalone demo): XGBoost AUC 0.9392, recall 0.8384. Pipeline stays rule-based.
- Security hardening: role enforcement (`require_role(*roles)`, admin-only `GET /v1/audit/logs`) + slowapi rate limiting (login 5/min, decision 30/min). `app/rate_limit.py`, `app/api/audit.py`.
- Edge-case hardening (`tests/test_edge_cases.py`, 27 tests); JWT missing-role 500 -> 401; empty-string device/IP skipped.
- RAG policy assistant (read-only) complete: `app/rag/` (chunking, bge-small-en-v1.5 embeddings, dense+FTS+RRF retrieval, cross-encoder reranker, guardrails, prompts, provider-agnostic llm_client, ingest), `POST /v1/analyst/ask`, `get_decision_snapshot`/`write_rag_audit`, schema migration, 7 RBI PDFs + `policies/underwriting-policy-v1.md`, `PolicyAssistant.jsx`, `tests/test_rag.py`. Live verified + 20-question QA pass.
- Polish pass: reranker, scaled LR baselines (convergence warning cleared), offline integration tests, cache-friendly prompt docs, test env-isolation. Suite at 74.
- "Frontend syn" integration: new `Frontend syn/` React+TS+Tailwind app became main frontend, wired end-to-end (backend `GET /v1/applications`, `GET /v1/applications/{id}`, `GET /v1/metrics/model-eval`; extended `ApplicantInput`; snapshot exposes `fraud_signals` + `shap_top_features` + `application_id`; optional `application_id` on `/v1/analyst/ask`). Frontend `services/api.ts` mapper + real loaders; `src/mock/` deleted; PolicyAssistant seed stripped.
- UI polish: deterministic applicant names, compact affordability, Full Underwriting Inspection 70/30 + context rail, SHAP separated from reason codes, CORS comma-separated origins.
- UX/data-integrity polish (THIS SESSION, all uncommitted):
  1. **Deterministic applicant names** — `mapSnapshotToApplicationCase` falls back to a 10-name fictional Indian list hashed on `application_id`/`request_id`/`applicant_id` when `inputs.name` is absent. Kills old test labels (`live2`, `e-refer`, `eval-approve`, `app-rag-demo2`) that surfaced from legacy `applicant_id`s.
  2. **DB single source of truth for display fields** — new `app/decisioning/profile.py::build_profile()` computes only real derived fields (segment, risk_band, fraud_level, dti, income_stability, expense_profile, behavioral_signals, bank_cashflow_surplus); stored in `evidence["profile"]` at decision time; exposed + read-time backfilled for legacy rows (`_ensure_profile`). Frontend `DecisionSnapshot.profile` typed; mapper reads `s.profile`. **Removed fabricated fields**: per-case `baselineScore` (credit*1.1), `avgAccountBalance` (income*1.2), `upiTransactionConsistency` placeholder; ThinFilePanel now a 3-tile strip.
  3. **Chat persistence fix** — `handleSend` saves the user message + session optimistically BEFORE the API call, so chats always land in Recents and survive new-chat/reload even when the backend/Docker/LLM is down (previously saved only after a successful response; failures lost the chat). Assistant error bubble appended on failure.
  4. **Rotating status messages** — new `Frontend syn/src/hooks/useRotatingStatus.ts`; Decision run button cycles "Pondering…/Musing…/Crunching the numbers…/Consulting the policy manual…/Weighing the risk…"; PolicyAssistant bubble cycles its own phrases.
  5. **Audit button removed** — Admin Audit Log button + `AuditLogTable.tsx` deleted from Decision Engine page; audit stays reachable via Analytics → Audit tab + admin-only `GET /v1/audit/logs`.
- Tests: `tests/test_applications.py` +4 (profile present/correct, THIN-FILE vs ESTABLISHED, legacy backfill). 83 total.

## What changed
- New: `app/decisioning/profile.py`, `Frontend syn/src/hooks/useRotatingStatus.ts`, `app/api/applications.py`, `app/api/metrics.py`, `tests/test_applications.py` (all untracked).
- `app/decisioning/pipeline.py` — stores `profile` in audit evidence.
- `app/audit/logger.py` — `_ensure_profile` backfill; snapshots expose `profile`.
- `Frontend syn/src/services/api.ts` — FALLBACK_NAMES + hash; reads `s.profile`; removed baseline/avg-balance/UPI.
- `Frontend syn/src/api/underwritingApi.ts` — `DecisionSnapshot.profile` type.
- `Frontend syn/src/types/underwriting.ts` — dropped `baselineVersion/baselineType/baselineScore` from `CreditRisk`, `avgAccountBalance/upiTransactionConsistency` from supplementary signals.
- `Frontend syn/src/components/assistant/PolicyAssistant.tsx` — optimistic session save + error bubble + rotating status.
- `Frontend syn/src/components/decision/DecisionEngineView.tsx` — rotating status; audit button/state/import removed.
- `Frontend syn/src/components/underwriting/ThinFilePanel.tsx` — 3-tile strip (Bureau History / Income Stability / Cash Surplus).
- Deleted: `Frontend syn/src/components/decision/AuditLogTable.tsx`.
- Earlier session (still uncommitted): `app/api/analyst.py`, `app/main.py` (CORS list), `app/schemas.py`, `app/rag/{llm_client,prompts}.py`, `.env.example`, `README.md`.

## Current status
Done (core + polish + frontend integration + data-integrity polish). 83 tests passing; `npm run build` clean. Commits `c0b383e`..`0f35ba1` plus this session's work are LOCAL ONLY (not pushed); last pushed commit is `85745c9`. `Frontend syn/` is still entirely untracked.

## Open issues
- None blocking. LLM configured in `.env` (Groq `groq/compound-mini`, `https://api.groq.com/openai/v1`; Gemini key also present as fallback).
- RAG needs Docker running for retrieval/ingest (verified working when up). Audit falls back to JSONL when down.
- bge-small-en-v1.5 (~130 MB) and the cross-encoder (~90 MB) download on first ingest/live use.
- Dead frontend code to optionally remove: legacy `frontend/` folder, `Frontend syn/src/components/fraud/FraudInvestigation.tsx` and `workspace/PendingCasesWidget.tsx` (not routed/imported).
- `Frontend syn/` untracked — first commit of it needs a secrets scan (none expected).

## Risks and caveats
- Rate limits are in-memory (reset on restart) — fine for demo, not multi-instance production.
- IEEE-CIS fraud model is transaction fraud, not application fraud — intentionally kept as standalone demo.
- `ml/feature_metadata.json` medians changed on retrain (computed from the 80% split now) — committed to stay consistent with the retrained model.
- Free LLM tiers are rate-limited; offline `FakeLLMClient` fallback answers generically and does not refuse out-of-scope. A factually-wrong threshold in free text isn't machine-enforced (mitigated by grounding + citation guardrails).
- Legacy display profiles are backfilled at read time (not stored) — deterministic per snapshot, recomputed, no migration needed.
- Model artifacts (`app/models/artifacts/*`, `ml/data/*`) are gitignored — regenerated locally, not in version control.

## Validation completed
- `pytest tests/` -> 83 passed (incl. profile tests, reranker, integration, applications).
- `npm run build` (Frontend syn) clean; bundle ~5KB lighter after AuditLogTable removal.
- Deterministic names verified: `live2`->Rohan Kapoor, `e-refer`->Rohan Kapoor, `eval-approve`->Aarav Mehta, `app-rag-demo2`->Dev Patel.
- Legacy profile backfill verified by unit test (`_normalize_db_row` on evidence without `profile`).
- Earlier: RAG live end-to-end (Groq), 20-question QA, HTTP smoke, credit AUC 0.8673 / recall 0.816, fraud AUC 0.9392 / recall 0.8384, 22/22 flow check.

## Exact next steps
1. Commit this session's work (new `Frontend syn/` + profile/chat/UI changes) and push all local commits since `85745c9` to GitHub.
2. (User) Run API (`.venv\Scripts\python -m uvicorn app.main:app --reload`) + frontend (`npm run dev` in `Frontend syn/`) and walk the full workspace.
3. Optional: delete legacy `frontend/` folder + dead `FraudInvestigation.tsx`/`PendingCasesWidget.tsx`.

## Recommended model path for next session
- `deepseek-v4-pro` for RAG/feature work; `deepseek-v4-flash` for mechanical edits/tests.

## Restart instructions
- Open first: `TRACKER.md` + `HANDOVER.md`.
- Do first: commit + `git push` (all local commits incl. this session; `Frontend syn/` first add).
- Check first: `pytest tests/` (83) + `npm run build` in `Frontend syn/`, then start Docker + run the API + frontend.
- Stay in opencode. No escalation needed.