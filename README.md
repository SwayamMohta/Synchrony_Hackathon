# Credit Underwriting Engine (PRISM-style)

A real-time, multi-modal credit underwriting engine that expands credit access to new-to-credit (NTC) and thin-file customers using alternative data and behavioral signals, with inline fraud detection and explainable, auditable decisions.

## How it works

1. A credit application is submitted with applicant info plus device/IP behavioral signals.
2. The engine assembles bureau-style features (mock), synthetic cash-flow, and deterministic fraud signals (velocity / identity consistency).
3. A canonical feature builder maps bureau + applicant data onto the **10 real Give Me Some Credit features** (the exact training columns).
4. An **XGBoost** credit model (with a Logistic Regression baseline) scores probability of default.
5. A **rule-based fraud score** and a **deterministic policy engine** (hard guardrails) contribute to the final decision — ML cannot override policy.
6. **SHAP** produces per-decision feature attribution mapped to adverse-action **reason codes**.
7. Every decision is written to an **append-only audit log** (PostgreSQL, with a JSONL fallback when the DB is down).

The decision is deterministic and explainable; there is no LLM in the decision path. (A policy Q&A assistant over pgvector + OpenAI is planned but deferred pending an API key.)

## Architecture

- **Backend**: FastAPI + Pydantic v2, JWT auth, SQLAlchemy
- **Models**: XGBoost (credit) + rule-based fraud; SHAP for explainability
- **Storage**: PostgreSQL + pgvector
- **Frontend**: React + Vite + Recharts
- **Data**: Give Me Some Credit `cs-training.csv` (real, 150k rows)

## Prerequisites

- Python 3.10+
- Node 18+ / npm
- Docker Desktop (for PostgreSQL + pgvector)

## Setup

### 1. Database (optional for the demo; audit falls back to a local JSONL file)

```
docker compose up -d
```

### 2. Backend

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Train the credit model

```
.venv\Scripts\python.exe ml\train_credit.py
```

Produces `app/models/artifacts/credit_risk_v1.json`, `app/models/artifacts/credit_baseline_v1.pkl`, `ml/feature_metadata.json`, `ml/data/holdout_predictions.pkl`.

### 4. Run the API

```
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Interactive docs at http://localhost:8000/docs.

### 5. Frontend

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Demo users: `analyst` / `analyst123`, `admin` / `admin123`.

## Model evaluation

```
.venv\Scripts\python.exe ml\evaluate.py
```

## Tests

```
.venv\Scripts\python.exe -m pytest tests/ -v
```

## Known limitations

- Bureau, cash-flow, and fraud signals are synthetic/mocked (deterministic by applicant ID).
- `cs-test.csv` has no labels (Kaggle withheld them), so held-out evaluation uses a stratified split of `cs-training.csv`.
- Audit logging falls back to `ml/audit_fallback.jsonl` when PostgreSQL is unavailable.
- RAG policy assistant is deferred (requires an OpenAI API key).
- Rate limiting, role-based route enforcement, and Plaid Sandbox are planned but not yet wired.
- Demo only — not production lending infrastructure.
