# SESSION_implementation-kickoff.md

## Session objective
Move from planning to a working scaffold: start PostgreSQL, create config files, set up the venv, and run the first credit-model training on the real dataset.

## Session scope
- Only the **Must Have** path (Plan.md §17 Phases 1–7).
- No RAG (no OpenAI key), no cloud, no Plaid, no MLflow, no optional fraud training.

## Current active task
Scaffold core config + bring up infra + train the credit model. No app code yet.

## Exact next steps (bounded)
1. User starts Docker Desktop; verify: `docker info --format '{{.ServerVersion}}'`
2. Create `requirements.txt` (Plan.md §0 — NO mlflow/langchain/plaid-python by default)
3. Create `.env.example` (placeholders: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `CORS_ORIGIN`)
4. Create `db/schema.sql` (Plan.md §12; `model_versions` WITHOUT `mlflow_run_id`)
5. Create `docker-compose.yml` (Postgres + pgvector image `pgvector/pgvector:pg16`)
6. `docker compose up -d`
7. `python -m venv .venv`; activate; `pip install -r requirements.txt`
8. Run `ml/train_credit.py` → `app/models/artifacts/credit_risk_v1.json` + `credit_baseline_v1.pkl` + `ml/feature_metadata.json` + `ml/data/holdout_predictions.pkl`
9. Verify training output (AUC printed) before writing backend code.

## Recommended model path for next session
- **deepseek-v4-pro**, effort **thinking high**, thinking **on**.
- Start with a **planner** subagent to lay out the backend module order from Plan.md §17, then implement. Use an **explorer** subagent only if the folder structure needs re-verification.

## Session-specific constraints / decisions
- Credit model trains ONLY on the 10 real `cs-training.csv` columns (`CREDIT_FEATURES` in Plan.md §7 snippet).
- Cash-flow/fraud are separate mock inputs; NEVER merge into a 15-feature credit vector.
- Fraud score is rule-based by default (`app/models/fraud.py` takes fraud signals dict).
- Use `dataset/` (not `ml/data/`) for the raw CSVs.
- No OpenAI key → skip RAG; everything else must work without it.

## Files / modules to open first
- `docs/Plan.md` (§0, §7, §12, §17, §18; Implementation Snippets §7–§14)
- `TRACKER.md`
- `dataset/cs-training.csv`
- `.gitignore`

## Intended next-session setup
- Model family: deepseek-v4-pro
- Effort: thinking high
- Thinking: on
- Start with subagent: **planner** (map backend build order) — yes
