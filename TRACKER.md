# TRACKER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail).

## Current active task
Must-Have path complete and verified end-to-end (backend + frontend + training + tests). Remaining: RAG (blocked on OpenAI key), Docker/Postgres bring-up, git init, Should-have polish.

## Status
in-progress (Must-Have done; RAG deferred; infra/git pending)

## Completed work
- Problem statement drafted: `problem_Statement.md`
- Implementation plan + code snippets authored and revised: `Plan.md`
  - Revised for ≤30-hour realistic scope (Must Have / Should Have / Only If Time Remains)
  - Architecture: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model + rule-based fraud + SHAP + deterministic policy + small RAG (local embeddings + pgvector + OpenAI)
  - Credit model trains on the REAL Give Me Some Credit `cs-training.csv` (10 actual columns). Cash-flow/behavioral/fraud are separate synthetic/mock inputs — NOT part of credit training data.
  - Removed from scope: Feast, Redis, ChromaDB, Optuna, MLflow, LangGraph/LangChain, autonomous agents, complex AWS infra, cloud deployment (Only If Time).
- Real dataset downloaded and verified locally in `dataset/`:
  - `cs-training.csv` (150k rows, 12 cols incl. target + index; 10 real features)
  - `cs-test.csv` (101k rows, same columns; used for held-out eval)
  - `sampleEntry.csv`, `Data Dictionary.xls`, `dataset.zip`
- Environment verified: Python 3.10, Node 22, npm 11, Git, uv, Docker 29 (Desktop installed; daemon NOT running).
- Core config scaffolded: `requirements.txt`, `.env.example`, `db/schema.sql`, `docker-compose.yml`
- `app/features/builder.py` + `ml/train_credit.py` created; `.venv` created with training deps installed
- Credit model trained: **XGBoost AUC 0.8688**, **LR baseline AUC 0.7120**; artifacts + `ml/feature_metadata.json` + `ml/data/holdout_predictions.pkl` saved
- Full FastAPI backend built (`app/`): schemas, db, bureau/cash-flow mocks, fraud signals+score, policy engine, SHAP explainer, decision pipeline, audit logger (graceful JSONL fallback), JWT auth, `/health`, `/auth/login`, `/v1/decision`
- Backend verified end-to-end over HTTP: `/health` OK, login issues JWT, `/v1/decision` returns full DecisionResult (decision + scores + reason codes + SHAP), auth-gated (401 without token), latency ~12ms
- React frontend built (`frontend/`): login → application form → decision card with SHAP (recharts) bar chart; `npm run build` succeeds
- README, unit tests (10 passing), and `ml/evaluate.py` (AUC uplift +0.1568) added

## In progress
- Nothing actively in progress — Must-Have implementation complete. Waiting on user for Docker/git decisions.

## Blockers
- Docker Desktop daemon not currently running — needed for PostgreSQL + pgvector. Audit currently falls back to `ml/audit_fallback.jsonl`. Start Docker Desktop, then `docker compose up -d`.
- OpenAI API key not available — RAG policy assistant deferred.
- No git repo initialized — user has not confirmed `git init` / GitHub remote.

## Validation and checks
- Verified `cs-training.csv` columns match the plan's 10-feature credit schema.
- Confirmed missing values only in `MonthlyIncome` (29,731) and `NumberOfDependents` (3,924) — handled by training medians.
- Credit model metrics (stratified 20% holdout): XGBoost AUC 0.8688 vs LR baseline AUC 0.7120.
- **Plan defect corrected**: `dataset/cs-test.csv` has an EMPTY `SeriousDlqin2yrs` column (Kaggle withheld labels) — cannot be scored. Evaluation now uses a stratified holdout of `cs-training.csv` (updated in `ml/train_credit.py`). Plan §9/§2.3 referenced cs-test.csv as held-out eval.
- HTTP end-to-end verified: `/health`, `/auth/login` (JWT), `/v1/decision` (401 without token; full result with auth, ~12ms latency <2s target).
- `ml/evaluate.py`: Baseline AUC 0.7120, XGBoost AUC 0.8688, uplift +0.1568.
- `pytest tests/ -v`: 10 passed.
- Frontend `npm run build`: success.

## Risks or open questions
- OpenAI API key not yet available — RAG assistant deferred until a key is provided; all other components build without it.
- Rulings made: inference loads `xgb.Booster` (sklearn-wrapper `load_model` does not restore fitted state); auth uses `bcrypt` directly (avoids passlib 1.7.4 vs bcrypt 4.x friction); audit logger degrades to `ml/audit_fallback.jsonl` when Postgres is down; cash-flow always uses synthetic mock; fraud velocity uses in-memory history (no DB yet); slowapi rate limiting deferred to Should phase.
- IEEE-CIS fraud dataset not downloaded — fraud detection uses rule-based signals by default (no training needed).
- Docker uncertainty for user — local-only is the target; cloud deployment is optional and can be skipped.

## Next steps
1. (User) Start Docker Desktop, then `docker compose up -d` → Postgres + pgvector live; audit moves from JSONL to DB.
2. (User) Decide on `git init` + GitHub remote; then commit the work.
3. (When OpenAI key available) build the minimal RAG policy assistant (`app/rag/*`, `/v1/analyst/ask`, policy ingestion, assistant panel).
4. (Should) Wire role-based route enforcement + rate limiting; add fraud gauge/decision queue in the dashboard.

## Recommended model path
- General-purpose coding agent for scaffolding and component implementation
- Follow the priority-tiered phases and build order checklist in `Plan.md`
