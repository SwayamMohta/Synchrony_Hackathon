# HANDOVER

## Current objective
Build a real-time, multi-modal credit underwriting engine (PRISM-style) that expands credit access to NTC/thin-file customers using alternative data and behavioral signals, with inline fraud detection and regulatory transparency (explainable decisions, audit trail). Constrained to a **≤30-hour build by someone with limited backend experience**.

## What was completed
- `problem_Statement.md` — problem statement (unchanged).
- `Plan.md` — full implementation plan + code snippets, revised multiple times:
  - De-scoped to a 30-hour realistic, priority-tiered build (**Must Have / Should Have / Only If Time Remains**).
  - **Credit model trains on the REAL Give Me Some Credit `cs-training.csv`** — 10 actual columns. Cash-flow/behavioral/fraud are **separate synthetic/mock inputs** that feed the fraud score and policy engine — never injected into credit training data.
  - Removed from scope: Feast, Redis, ChromaDB, Optuna, MLflow, LangGraph/LangChain, autonomous agents, complex AWS infra, cloud deployment (now "Only If Time").
  - Architecture: React + FastAPI + PostgreSQL(+pgvector) + XGBoost credit model (+ Logistic Regression baseline) + rule-based fraud + SHAP/reason codes + deterministic policy + small RAG (local embeddings + pgvector + OpenAI).
- `TRACKER.md` — rewritten to reflect current real state (planning → pre-implementation; dataset verified; scope de-scoped).
- Real dataset verified locally in `dataset/`: `cs-training.csv` (150k rows, 12 cols = index + target + 10 features), `cs-test.csv` (101k rows), `sampleEntry.csv`, `Data Dictionary.xls`, `dataset.zip`.
- Environment verified: Python 3.10.11, Node 22, npm 11, Git 2.54, uv, Docker 29 + Docker Desktop installed (**daemon NOT running**). No local PostgreSQL (Docker is the Postgres path).
- Repo folders scaffolded under `app/` (api, audit, auth, data, decisioning, explain, features, models, rag, rules) plus `db/`, `docs/`, `frontend/`, `ml/`, `tests/`.
- `.gitignore` written.

## What changed (this session)
- No application code written yet — planning/planning-docs only.
- `Plan.md` feature design corrected so the **credit model uses the real 10 GMSC columns** and cash-flow/fraud stay as separate mock inputs (were previously incorrectly combined into a single 15-feature training schema).
- Baseline-vs-proposed evaluation reframed to be honest given the real data (model-level: LR vs XGBoost on the 10 features; system-level: credit-only vs full pipeline with fraud+policy).
- Rule-based fraud is now the **default** (no IEEE-CIS training required); XGBoost fraud model is optional.
- RAG assistant deferred (no OpenAI key yet).
- `TRACKER.md` fully updated.

## Current status
in-progress — **planning complete, pre-implementation**. Repo folders + `.gitignore` exist. Core config files NOT yet created. No code, no git repo, no venv, no infra running.

## Open issues
- **Docker daemon not running** — Docker Desktop app installed but not started. Must start it to bring up PostgreSQL + pgvector via `docker compose up -d`. (If Docker cannot be used, need a fallback decision for Postgres.)
- **OpenAI API key not available** — RAG assistant deferred; everything else builds without it. User chose to skip RAG for now.
- **IEEE-CIS fraud dataset not downloaded** — not needed (rule-based fraud is default). Optional only.
- **No Git repo initialized yet** — user hasn't confirmed whether to `git init` + create GitHub remote.

## Risks and caveats
- User has limited backend experience — keep setup minimal, avoid extra installs/services.
- Docker uncertainty from user — local-only is the target; cloud deploy is optional/skippable.
- Credit training uses `dataset/cs-training.csv` path (not `ml/data/gmsc.csv`). Missing values only in `MonthlyIncome` + `NumberOfDependents` (median-fill via `feature_metadata.json`).
- Fraud score inputs come from fraud signals only; credit vector is 10 real features only. Do not reintroduce a combined schema.

## Validation completed
- Confirmed `cs-training.csv` columns match `CREDIT_FEATURES` in `Plan.md` (10 features + target + index).
- Confirmed missing-value columns and class imbalance (6.7% positive).
- Grep-verified no stale references to the old `build_inference_vector`/`FEATURE_NAMES`/`FEATURE_SCHEMA_VERSION`/`gmsc.csv` remain in `Plan.md`.

## Exact next steps
1. **Start Docker Desktop** (user action), then confirm daemon: `docker info --format '{{.ServerVersion}}'`.
2. Scaffold core config files:
   - `requirements.txt` (from `Plan.md` §0 — no mlflow/langchain/plaid-python by default)
   - `.env.example` (placeholders: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`)
   - `db/schema.sql` (PostgreSQL + pgvector schema from `Plan.md` §12 — note `model_versions` has NO mlflow_run_id)
   - `docker-compose.yml` (Postgres + pgvector service)
3. `docker compose up -d`
4. Create Python venv + install deps (`python -m venv .venv`; activate; `pip install -r requirements.txt`)
5. Run `ml/train_credit.py` → artifacts + `ml/feature_metadata.json` + `ml/data/holdout_predictions.pkl`
6. Build backend per priority phases (Must first): `app/features/builder.py`, `app/data/bureau_mock.py` + `cashflow_mock.py`, `app/models/credit_risk.py` + `app/models/fraud.py`, `app/rules/policy_engine.py`, `app/explain/shap_explainer.py`, `app/decisioning/pipeline.py`, `app/audit/logger.py`, `app/auth/security.py`, FastAPI routes in `app/main.py` / `app/api/decision.py`.
7. Build minimal React app (`frontend/`): form → decision display + SHAP chart.
8. (When OpenAI key available) minimal RAG assistant.
9. (Should) `ml/evaluate.py`, roles, rate limiting, tests, README.

## Recommended model path for next session
- **deepseek-v4-pro** (or `deepseek-v4-pro thinking high`) — implementation of multi-file backend requires stronger reasoning than flash; thinking high helps with the FastAPI + XGBoost + pgvector wiring.
- Not flash for the coding-heavy next session.

## Restart instructions
- **Open first:** `Plan.md` (esp. §4.3 credit feature schema, §17 phased build, §18 project structure, and the Implementation Snippets §7–§14) and `TRACKER.md`.
- **Do first:** complete the core config scaffold (step 2 above) and start Docker (step 1), then run `train_credit.py`.
- **Check first:** `docker info` (daemon running); that `dataset/cs-training.csv` exists; that `ml/feature_metadata.json` exists after training.
- **Stay in Claude Code / opencode** (this agent) — no escalation needed. If Docker is a blocker and can't be started, escalate to the user for a Postgres fallback decision (e.g., local install vs skipping DB and using in-memory for the demo).
