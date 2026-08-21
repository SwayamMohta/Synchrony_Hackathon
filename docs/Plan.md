# Implementation Plan: Next-Gen Credit Intelligence Engine (FinLens Underwriting System)

## 1. Problem Statement & Project Scope

### 1.1 The Challenge
Traditional credit models rely on static, historical bureau data, which creates a barrier for millions of potentially creditworthy "New-to-Credit" (NTC) and "thin-file" customers who lack a formal banking footprint. In a fast-evolving BFSI landscape, the goal is to shift from reactive scoring to proactive, contextual credit decisioning — expanding access to credit while mitigating fraud and ensuring regulatory transparency.

### 1.2 What We Will Build
A real-time, multi-modal credit underwriting engine that:
- Ingests bureau, cash-flow/bank, behavioral, and partner-transaction data
- Scores NTC/thin-file applicants using ML, not just a single credit score
- Detects fraud inline during the same decision flow
- Returns an explainable decision in <2 seconds (demo-scale)
- Exposes an audit trail for regulatory transparency
- Provides an **OpenAI API**-powered GenAI/RAG assistant that explains decisions and policies to analysts — without ever making the credit decision

Target demo: end-to-end pipeline from a mock loan/credit application → risk score → fraud flag → deterministic decision → explanation → audit record, wrapped in a dashboard, plus an analyst-facing policy assistant grounded in the organisation's underwriting policies.

### 1.3 Key Architectural Principle
**The ML models and the deterministic policy engine are the source of truth for credit decisions. The cloud LLM (OpenAI) operates strictly as a separate GenAI assistance/explanation layer.** It explains, retrieves, and supports — it never approves, declines, or overrides the decisioning pipeline.

### 1.4 Priority at a Glance (30-Hour Budget)
This is a **≤30-hour build by someone with limited backend experience**. Work strictly in the order below and **stop expanding scope once the Must Haves are done**. Every tier is independently runnable, so a partial build still produces a working submission.

**Must Have (~20h) — without these the submission fails the stated requirements**
- Repo + Git, Docker Compose (PostgreSQL + pgvector), FastAPI skeleton, Pydantic schemas
- Mock bureau data + synthetic cash-flow data (no external signups required)
- Canonical feature builder (one schema for training AND inference)
- Credit model: XGBoost + logistic regression baseline, saved as local artifacts
- Simple fraud: XGBoost + deterministic fraud signals (velocity / identity consistency)
- Deterministic policy/rules engine (ML cannot override)
- Decision pipeline → approve / refer / decline
- SHAP explainability + reason codes
- Audit logging (core metadata)
- Simple JWT authentication (login + bearer check on protected routes)
- `/v1/decision` working end-to-end
- Minimal React app: submit application → show decision, reason codes, SHAP chart
- **RAG assistant (minimal)**: a few policy docs → chunk → local embeddings → pgvector → retrieval → OpenAI → analyst endpoint + assistant panel

**Should Have (~7h) — improves quality, does not block submission**
- Admin vs Analyst role separation
- Rate limiting and request-size limits on APIs
- Fraud score gauge + decision queue in the dashboard
- Baseline vs proposed evaluation comparison (`ml/evaluate.py`)
- Guardrail polish on RAG (citations + refusal)
- Unit tests for the policy engine and feature builder

**Only If Time Remains (~3h) — safe to skip**
- Plaid Sandbox cash-flow integration (default is a synthetic mock)
- Broader integration tests
- Lightweight cloud deployment (single FastAPI service + managed Postgres)
- Architecture diagram, extended policy corpus, extra audit evidence

**Can be skipped without failing the requirements:** Plaid Sandbox, MLflow, LangChain/LangGraph, autonomous agents, cloud/AWS deployment, Kubernetes, advanced fraud/anomaly models, hyperparameter tuning, integration tests, admin-only audit UI, monitoring/alerting tooling.

---

## 2. Solution Overview: Baseline vs Proposed

### 2.1 Baseline (traditional decisioning)
```
Limited / traditional credit information (e.g., bureau score only)
        ↓
Baseline model (e.g., score-only / bureau-only logistic regression)
        ↓
Decision
```

### 2.2 Proposed (multi-modal decisioning)
```
Bureau-style features      (mock bureau → the 10 credit features from cs-training)
        +
Cash-flow features        (synthetic mock: income stability, expense ratio, overdrafts)
        +
Behavioral / fraud signals (device consistency, IP/application velocity, identity consistency)
        ↓
Canonical Feature Builder  (credit features — same schema for training AND inference)
        +
Fraud signals             (separate inputs to the fraud score and policy engine)
        ↓
Credit Risk Model (XGBoost, with Logistic Regression baseline)  ← trained on the 10 real columns
        +
Fraud detection (rule-based signals, or optional XGBoost)
        +
Deterministic Policy / Rules Engine  (uses cash-flow + fraud signals)
        ↓
Approve / Refer / Decline
        ↓
SHAP + Reason Codes + Audit Log
```

> **Important:** The credit model is trained on the **10 real columns of `cs-training.csv`**. Cash-flow and fraud signals do **not** exist in the training data; they are **separate inputs** that strengthen the pipeline through the fraud score and the deterministic policy engine — they are never injected into the credit model's training vector.

### 2.3 How the Prototype Demonstrates Improvement
The prototype demonstrates the value of the multi-modal pipeline in two honest, measurable ways:
1. **Model-level**: train two credit models on the same 10 real features — a **Logistic Regression baseline** vs **XGBoost** — and compare ROC-AUC on the held-out `cs-test.csv`. This shows the model choice adds value.
2. **System-level**: compare a **credit-score-only decision** (baseline) against the **full pipeline** (credit score + fraud signals + policy rules). This shows that adding cash-flow/fraud signals to the decisioning (not to the credit training data) improves decision quality — e.g., approval-rate on a thin-file proxy segment and fraud-flag catch rate.

No results are pre-invented — metrics are computed only after actual experiments are run. This demonstrates improvement through measured outcomes rather than the number of technologies used.

---

## 3. System Architecture (High Level)

### 3.1 Decision Pipeline — Deterministic, Explainable (source of truth)
```
[Client / Application Form]
        │
        ▼
[API Gateway - FastAPI]  (auth, validation, rate limiting)
        │
        ▼
[Data Aggregation Layer]
        ├── Bureau data connector (mock)        → 10 credit features
        ├── Cash-flow data connector (synthetic mock)
        ├── Device/behavioral signal capture (frontend)
        └── Fraud signals (velocity / identity)
        │
        ▼
[Canonical Credit Feature Builder]   (10 real cs-training columns, same for training AND inference)
        │
        ▼
[Decision Pipeline — modular backend functions]
        ├── Credit Risk Model (XGBoost) — Logistic Regression baseline   (uses 10 credit features)
        ├── Fraud detection (rule-based signals, or optional XGBoost)     (uses fraud signals)
        └── Deterministic Policy / Rules Engine                            (uses cash-flow + fraud signals)
        │
        ▼
[Approve / Refer / Decline]
        │
        ▼
[SHAP + Reason Codes]
        │
        ▼
[Audit Log (PostgreSQL)]
        │
        ▼
[Response to Dashboard - React]
```

### 3.2 GenAI Layer — RAG with Cloud LLM (OpenAI) (assistance only, never decides)
```
Underwriting policy documents
        ↓
Document chunking
        ↓
Embedding generation (local sentence-transformers; 384-dim)
        ↓
PostgreSQL + pgvector
        ↓
Semantic retrieval (cosine similarity)
        ↓
Relevant policy / decision context
        ↓
Prompt template
        ↓
OpenAI LLM (e.g., GPT-4o-mini)
        ↓
Guardrails / output validation (grounding, citations, refusal)
        ↓
Grounded analyst response
```

**Model decision vs GenAI explanation is strictly separated:**
- `MODEL DECISION` — produced by the deterministic ML + policy pipeline in §3.1.
- `GENAI EXPLANATION` — produced by the RAG layer in §3.2, always labelled as an explanation and grounded in retrieved, approved policy content.

---

## 4. Backend Components & Tools

### 4.1 API Layer
- **FastAPI** — typed, async API service (the chosen equivalent to the organisation's Spring Boot requirement), fast to build OpenAPI docs for demo/interview walkthrough
- **Pydantic v2** — schema validation for applicant data, decision payloads, and analyst queries (input validation is a security requirement)
- **Uvicorn** — ASGI server

### 4.2 Data Aggregation Layer
- **Bureau data**: mock service returning synthetic bureau-style attributes (score band, tradelines, utilization, delinquency history) — a FastAPI service with a seeded dataset. Uses deterministic pseudo-random generation keyed by applicant ID so the demo is reproducible.
- **Cash-flow data**: **synthetic cash-flow mock by default** (deterministic, no signups, runs offline). **Plaid Sandbox API** is a "Should Have / Only If Time Remains" swap-in that mirrors the organisation's actual Plaid/Prism-style data partnership — it shares the same feature interface (`CashFlowFeatures`), so switching later is a drop-in replacement. Sandbox credentials, if used, live in environment variables only.
- **Partner/transaction data**: synthetic merchant transaction dataset (Kaggle credit/lending datasets: "Give Me Some Credit", "Lending Club", "IEEE-CIS Fraud Detection") loaded into PostgreSQL.
- **Behavioral/device signals**: captured on the frontend (session time, device fingerprint) and passed as features, not just claims.

### 4.3 Canonical Feature Pipeline (train/serve consistency)

There are **two distinct feature surfaces**. They must not be conflated:

**(a) Credit-model feature schema (10 features — matches the real `cs-training.csv`)**
The credit model is trained on the **actual columns of the Give Me Some Credit `cs-training.csv`** (150k rows, 10 features + target). The exact training columns are:

`RevolvingUtilizationOfUnsecuredLines, age, NumberOfTime30-59DaysPastDueNotWorse, DebtRatio, MonthlyIncome, NumberOfOpenCreditLinesAndLoans, NumberOfTimes90DaysLate, NumberRealEstateLoansOrLines, NumberOfTime60-89DaysPastDueNotWorse, NumberOfDependents`

Only `MonthlyIncome` and `NumberOfDependents` have missing values (filled with training medians). The training schema is **not** extended with cash-flow or fraud features — those do not exist in the dataset.

**(b) Inference input surface (credit + cash-flow + behavioral/fraud)**
At inference, the application combines:
- **Bureau mock** → produces the 10 credit features (mapped onto the exact training names/order/units)
- **Cash-flow mock** → cash-flow signals (income stability, DTI, overdrafts) — **used by the policy engine, not part of the credit model's training vector**
- **Behavioral/fraud signals** → velocity/identity signals — **used by the fraud score and policy engine, not part of the credit model's training vector**

**Consistency rule:** the credit features at inference must be produced by the same builder used at training — fixed names, order, units, and median-fill values (from `feature_metadata.json`). Inference never constructs a different credit-feature representation. Cash-flow and fraud signals are separate, supplementary inputs that feed the deterministic policy engine and the fraud model — they are not pretending to be credit-training features. The schema is versioned (`feature_schema_version`) and recorded in every audit record.

### 4.4 Decision Engine — Credit Risk Model
- **XGBoost** — industry-standard for tabular credit risk, fast inference, strong on structured bureau/cash-flow features. This is the main model.
- **Logistic Regression** — baseline model for comparison/interpretability benchmarking (also used as the "baseline vs proposed" comparison model in §2.3).
- Trained on the **Give Me Some Credit `cs-training.csv`** (real public dataset, already downloaded to `dataset/cs-training.csv`, 150k rows, 10 features — see §4.3a). The `cs-test.csv` is used for held-out evaluation.
- Hyperparameters are fixed, sensible defaults chosen once and recorded for reproducibility — **no extensive hyperparameter optimization**, **no MLflow**. Priority: reliable model, reproducible training, explainability, consistent feature schema, measurable evaluation.
- Model artifacts are saved directly to `app/models/artifacts/` and registered in the `model_versions` table (version + artifact path + active flag) — enough versioning for the audit trail without extra tooling.

### 4.5 Decision Engine — Fraud Risk Model
- **Primary model**: an **XGBoost classifier** (supervised fraud scoring), trained on the **IEEE-CIS Fraud Detection** dataset (Kaggle).
- **Deterministic fraud signals** (rule-based, computed in `features/fraud_signals.py`):
  - transaction/application **velocity** (applications per device/IP in a time window)
  - **device consistency** (device reused across many applications)
  - **IP/application frequency**
  - **identity consistency** (identity attributes that keep changing across applications)
  - relevant transaction anomalies
- An **Isolation Forest** anomaly model is **optional** — only added if the core fraud model is stable and there is remaining hackathon time. It is **not** a promised deliverable. No other complex anomaly models are planned.

### 4.6 Rules/Policy Layer (deterministic, ML cannot override)
- Lightweight rules engine in Python (rule objects or the `durable-rules` library) for hard guardrails (e.g., min age, max DTI, severe-delinquency limits, blocklist).
- Configurable via JSON/YAML so it reads as "policy-driven", which matters for the regulatory-transparency angle.
- Policy content is **versioned** (`policy_version`) so decisions can be reproduced against the rules that were active at the time.

### 4.7 Explainability Layer
- **SHAP (SHapley Additive exPlanations)** — generates per-decision feature attribution ("declined primarily due to X, Y, Z"). This is a named requirement in the problem statement ("regulatory transparency") and is kept as a first-class component.
- SHAP outputs are mapped to **adverse action reason codes** (mimics ECOA/Reg B-style reasoning).
- Explanation objects are stored with each decision so the "why" is available to the analyst and to the LLM assistant.

### 4.8 Audit & Governance
- Append-only audit log table (PostgreSQL) — every decision records its inputs, scores, reason codes, and metadata (see §9). This directly satisfies the "regulatory transparency" requirement.
- Every decision is reproducible and traceable: re-running a logged application with the recorded versions must reproduce the same decision.

### 4.9 Data Storage
- **PostgreSQL** — all structured data: applicant records, applications, features, decisions, audit logs, model/policy versions.
- **PostgreSQL + pgvector** — semantic storage for policy document embeddings, reason-code documentation, and internal guidelines (no separate vector database).

---

## 5. GenAI Architecture — RAG with Cloud LLM (OpenAI)

The organisation allows **AWS Bedrock or an equivalent LLM service**. This plan uses **OpenAI API** as the equivalent cloud LLM to keep the build focused and realistic within the 30-hour hackathon window.

### 5.1 Flow
1. **Policy ingestion**: underwriting policy documents, reason-code documentation, and relevant internal guidelines are chunked (recursive chunking by heading/section).
2. **Embeddings**: chunk embeddings are generated locally using **sentence-transformers** (384-dim, `all-MiniLM-L6-v2`), so offline development stays runnable without cloud credentials.
3. **Storage**: embeddings are stored in **PostgreSQL + pgvector** (`policy_embeddings` table), keeping structured data and semantic search in one database.
4. **Retrieval**: an analyst question (or a decision context) is embedded and matched against policy chunks via pgvector cosine similarity, returning the top-K relevant passages.
5. **Prompt template**: a grounded prompt is assembled from the retrieved passages + decision context + instructions that forbid the model from inventing policy or making credit decisions.
6. **OpenAI LLM**: the prompt is sent to an OpenAI-hosted model (e.g., GPT-4o-mini) via the OpenAI SDK.
7. **Guardrails / output validation**: the response is validated to only reference retrieved passages (citations included), refuses to answer when no relevant policy exists, and is clearly labelled as an AI-generated explanation.

### 5.2 Example analyst questions
- "Why was this application referred?"
- "Which policy rules are relevant to this decision?"
- "Explain the reason codes for this applicant."
- "What additional information would help an analyst review this case?"
- "What does the applicable debt-to-income policy require?"

### 5.3 Boundaries
- The cloud LLM (OpenAI) can: explain an existing decision, retrieve relevant policies, explain reason codes, answer analyst questions, and provide grounded policy context.
- The cloud LLM (OpenAI) must NOT: approve, decline, override the policy engine, modify model scores, override the ML models, or make the final lending decision.

### 5.4 Agent framework (out of scope for 30 hours)
No agent framework (LangChain/LangGraph, autonomous agents) is used in the build. The RAG flow is a simple, linear `retrieve → prompt → generate → guardrails` chain. An agentic wrapper is a possible future enhancement only, and it would never orchestrate the deterministic credit decision pipeline.

---

## 6. Frontend

- **React + Vite** (React JS per organisation requirement)
- **Applicant-facing**: simple credit application form (captures device/session signals).
- **Internal/analyst-facing dashboard**, built Must-have-first:
  - **Must**: submit application → show decision, credit/fraud scores, reason codes, SHAP chart
  - **Must**: **policy assistant panel** — analyst asks questions; the RAG layer (OpenAI) returns grounded, cited answers
  - **Should**: decision queue (approve/decline/refer) + fraud score gauge
  - **Should**: model performance metrics (approval rate, false positive rate)
  - **Only if time**: audit view (Admin) with decision traces and versions
- **Recharts** for score distributions and feature-importance charts.
- IBM Plex Sans/Mono + dark theme.

---

## 7. Security

A dedicated security posture is planned from Phase 1, not bolted on at the end.

### 7.1 Authentication
- **JWT-based authentication** for all API and dashboard access.
- Login endpoints issue tokens; credentials are stored as hashed secrets (bcrypt-style hashing), never in plaintext.

### 7.2 Authorization (role-based)
- **Must**: single authenticated role (any logged-in user) can submit/view applications, view decisions/explanations, and use the policy assistant.
- **Should (phase 8)**: split into **Analyst** and **Admin** roles:
  - **Analyst role**:
    - submit and view applications
    - view decisions
    - view explanations and reason codes
    - use the policy assistant (RAG)
  - **Admin role**:
    - manage policy documents (ingest/re-ingest into pgvector)
    - inspect audit logs
    - manage model/policy metadata (versions, activation)

### 7.3 API security
- **Pydantic input validation** on every request body/query (request schemas are the single validation gate) — **Must**
- **CORS restrictions** — only the React frontend origin is allowed — **Must**
- **Safe error responses** — no stack traces, no internal details leaked to clients; errors logged server-side — **Must**
- Secure API usage patterns throughout (parameterised SQL, no string-concatenated queries) — **Must**
- **Request-size limits** and payload caps — **Should**
- **Rate limiting** on auth, decision, and assistant endpoints — **Should**

### 7.4 Secrets & credentials
- **No hardcoded secrets**: no API keys, database passwords, or credentials in code or in Git — **Must**
- **Environment variables** for local development — **Must**
- **.env.example** committed with placeholders only; the real `.env` is git-ignored — **Must**
- A **gitignore** covering `.env`, model artifacts, and local data files — **Must**
- **Cloud secret management** (secret manager or environment-injected secrets) when deployed — **Only if time**

---

## 8. Responsible AI

- **The cloud LLM (OpenAI) does not make credit decisions** — the deterministic ML + policy pipeline is the source of truth.
- **SHAP and reason codes provide transparency** for every decision.
- **Uncertain/high-risk cases are referred for human review** (the "refer" outcome), rather than auto-approved/declined without scrutiny.
- **Unnecessary sensitive attributes are not used** — the feature schema deliberately avoids attributes not needed for the decision.
- **Applicant data is handled responsibly** — minimal data collection, no unnecessary sensitive data stored, access controlled by role.
- **Generated explanations are clearly distinguished from model outputs** — the UI and API label GenAI content as such.
- **Synthetic/public dataset limitations are disclosed** — the demo uses synthetic and public datasets; results are illustrative, not production-validated.
- **Retrieved policy context is shown/cited** in GenAI responses where appropriate.
- **GenAI responses are grounded in approved sources** — the assistant only cites ingested, approved policy documents and refuses to answer from memory when no relevant policy exists.

---

## 9. Model Governance & Auditability

Every decision records (PostgreSQL `audit_logs`):

- application ID
- decision (approve / refer / decline)
- credit risk score
- fraud risk score
- reason codes
- model version(s) (credit + fraud)
- feature schema version
- policy version
- timestamp
- request ID
- relevant evidence/coverage (feature values summary, retrieved policy passages, GenAI explanation reference)

This audit trail lets an analyst reconstruct exactly how a decision was produced. Only the minimum necessary information is stored — no unnecessary sensitive data. The decision pipeline, model artifacts, and feature metadata are all versioned so results can be reproduced.

---

## 10. ML Ops / Supporting Tools

- **scikit-learn** — preprocessing, train/test splits, evaluation metrics, logistic regression baseline.
- **Model artifacts** saved directly to `app/models/artifacts/` and registered in the `model_versions` table — no MLflow, no experiment server.
- **Docker + docker-compose** — containerize FastAPI and PostgreSQL+pgvector for reproducible local deployment.
- **pytest** — unit tests for the decision pipeline, feature builder, and policy engine (Must); integration tests optional.
- **Hyperparameters**: fixed, reproducible defaults — no Optuna, no MLflow, no extensive tuning.

---

## 11. Data Sets to Use (all public, no compliance issues)

| Purpose | Source |
|---|---|
| Credit risk model (training) | **Give Me Some Credit — `dataset/cs-training.csv`** (already downloaded; 150k rows, 10 real features + target). `cs-test.csv` for held-out evaluation. |
| Credit model | Trained on the **10 real GMSC columns only** — cash-flow/fraud/behavioral features are NOT part of the training data (see §4.3) |
| Cash-flow features | Synthetic mock (`cashflow_mock.py`); Plaid Sandbox optional. Not part of credit training — feeds policy engine only |
| Behavioral / fraud signals | Synthetic mock (`fraud_signals.py`); device/velocity/identity signals. Not part of credit training — feeds fraud score + policy engine |
| Fraud detection (optional) | IEEE-CIS Fraud Detection (Kaggle) for an XGBoost fraud model, or rule-based fallback from fraud signals |
| Synthetic applicant identities | Faker (Python library) to generate realistic PII-free applicants |
| Underwriting policies | Curated public policy/guideline text + reason-code documentation (ingested into pgvector) |

---

## 12. Database Design (PostgreSQL + pgvector)

Simple, coherent schema:

- **applicants** — applicant identity attributes (minimal, no unnecessary sensitive data)
- **applications** — one row per application, raw inputs, request ID
- **applicant_features** — canonical feature values per application (schema versioned)
- **decisions** — final decision, scores, reason codes, model versions, policy version
- **audit_logs** — append-only trace (see §9)
- **model_versions** — registered model metadata (name, version, artifact path, active flag)
- **policies** — ingested policy documents (title, source path, version, text)
- **policy_embeddings** — chunk text + `vector` column (pgvector) for semantic retrieval

Example:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE applicants (
    applicant_id TEXT PRIMARY KEY,
    age INT,
    annual_income FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applications (
    application_id TEXT PRIMARY KEY,
    applicant_id TEXT REFERENCES applicants(applicant_id),
    requested_amount FLOAT,
    device_id TEXT,
    ip_address TEXT,
    request_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applicant_features (
    application_id TEXT PRIMARY KEY REFERENCES applications(application_id),
    feature_schema_version TEXT NOT NULL,
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE decisions (
    decision_id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(application_id),
    decision TEXT NOT NULL,
    credit_risk_score FLOAT,
    fraud_risk_score FLOAT,
    reason_codes JSONB,
    model_version TEXT,
    policy_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    application_id TEXT,
    decision TEXT,
    credit_risk_score FLOAT,
    fraud_risk_score FLOAT,
    reason_codes JSONB,
    model_version TEXT,
    feature_schema_version TEXT,
    policy_version TEXT,
    request_id TEXT,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE model_versions (
    model_name TEXT,
    model_version TEXT,
    artifact_path TEXT,
    is_active BOOLEAN DEFAULT false,
    PRIMARY KEY (model_name, model_version)
);

CREATE TABLE policies (
    policy_id TEXT PRIMARY KEY,
    title TEXT,
    source_path TEXT,
    policy_version TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE policy_embeddings (
    id BIGSERIAL PRIMARY KEY,
    policy_id TEXT REFERENCES policies(policy_id),
    chunk_index INT,
    chunk_text TEXT,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON policy_embeddings USING hnsw (embedding vector_cosine_ops);
```

---

## 13. Cloud / Deployment (Only If Time Remains)

**Local-only is the target and is fully acceptable.** Docker Compose (PostgreSQL + pgvector, FastAPI) is the primary and only required run path.

- Cloud deployment is **Only If Time Remains** and intentionally minimal: a single FastAPI service + managed PostgreSQL (e.g., RDS) with pgvector; OpenAI API key via environment or a secret manager.
- **No complex AWS infrastructure**: no Kubernetes, no microservices, no Lambda workflows, no service sprawl.
- **Secure storage/access**: secrets via environment variables; never in code or Git.
- **Monitoring/logging**: basic request logging in the API is enough; no external monitoring required.

---

## 14. Engineering Practices

- **Git/GitHub** repository from day one with meaningful, granular commits
- **Modular code** with meaningful naming
- **API-first design** — all functionality exposed through the FastAPI API; the React app consumes the API
- **README** with setup/run instructions and known limitations
- **API documentation** — auto-generated OpenAPI docs shipped with the service
- **Architecture diagram** — committed to the repo
- **Unit tests** and **basic integration tests** where practical
- **.env.example** committed with placeholders; **no secrets in Git**
- Known limitations documented (synthetic data, demo scope, local embeddings fallback, etc.)

---

## 15. Out of Scope (hackathon realism)

This is a polished end-to-end **prototype**, not production lending infrastructure. Explicitly out of scope:

- real production credit bureau integrations
- real customer PII
- production lending approval systems
- Kubernetes
- complex microservice architecture (a focused FastAPI service, not a mesh of services)
- distributed feature stores
- production-scale fraud infrastructure
- excessive model experimentation / heavy hyperparameter tuning
- complex autonomous agents
- full regulatory compliance implementation
- LLM-driven credit decisions

**Also safe to skip for this hackathon:** MLflow experiment tracking, LangChain/LangGraph, autonomous agents, Plaid Sandbox (the synthetic mock suffices), cloud/AWS deployment, integration-test suites, admin-only audit UI, monitoring/alerting tooling.

---

## 16. Evaluation

### 16.1 Credit model metrics (Must)
- **ROC-AUC (proposed vs baseline)** — the headline metric
- **Baseline vs proposed**: performance comparison on held-out data (see §2.3)
- Precision / recall / F1 where helpful (Should)

### 16.2 Fraud model metrics (Should)
- precision, recall, F1, PR-AUC, false-positive rate where appropriate

### 16.3 System-level evaluation
- **Explainability coverage** (Must): % of decisions with a complete SHAP + reason-code explanation
- **Audit completeness** (Must): % of decisions with complete audit traces (target 100%)
- **End-to-end decision latency** (Must): target sub-2s at demo scale
- **RAG retrieval quality** (Should): retrieval precision/recall on a small labelled query set
- **Groundedness of LLM responses** (Only if time): manual/rule-based check that responses cite retrieved passages only

**No results are invented.** Metrics are reported only after actual experiments are run, using the scripts in `ml/evaluate.py`.

---

## 17. Development Phases (prioritized for ≤30 hours)

Work in order. **Must Have phases first; stop when the submission is complete.** Each phase is self-contained and runnable.

### MUST HAVE

**Phase 1 — Foundation (~4h)**
- Repo, Git/GitHub, `.gitignore`, `.env.example`
- Docker Compose (PostgreSQL + pgvector), `db/schema.sql`
- FastAPI skeleton, Pydantic schemas, `/health`
- CORS (frontend origin only), safe error responses, no secrets in code
- Load/clean the public credit dataset for training later

**Phase 2 — Core Decisioning (~6h)**
- **Canonical feature builder** (`features/builder.py`, `feature_metadata.json`) shared by training and inference
- Train credit model: XGBoost + logistic regression baseline → save to `app/models/artifacts/`
- Train fraud model: XGBoost (or simple rule-based fallback) → save artifact
- Deterministic fraud signals (`features/fraud_signals.py`)
- Deterministic policy/rules engine (`rules/policy_engine.py`)
- Modular decision pipeline (`decisioning/pipeline.py`) → approve / refer / decline

**Phase 3 — Explainability & Audit (~3h)**
- SHAP explanation + reason-code mapping (`explain/shap_explainer.py`)
- Audit logging with core metadata (`audit/logger.py`)

**Phase 4 — Simple Auth (~2h)**
- JWT login + bearer dependency on protected routes
- Seed analyst/admin users (bcrypt-hashed)

**Phase 5 — API wiring (~2h)**
- `/v1/decision` (auth-protected) returning `DecisionResult`
- Wire bureau + cash-flow (synthetic mock) + feature builder + pipeline + audit
- Verify with curl/Postman end-to-end

**Phase 6 — Minimal RAG assistant (~3h)**
- 3–5 policy/reason-code documents
- Chunking, local embeddings (sentence-transformers), pgvector ingestion
- Retrieval, prompt template, OpenAI call, basic grounding/refusal
- `/v1/analyst/ask` (auth-protected)

**Phase 7 — Minimal React app (~3h)**
- Application form → POST `/v1/decision`
- Display decision, scores, reason codes, SHAP chart
- Policy assistant panel (chat with the RAG endpoint)

### SHOULD HAVE

**Phase 8 — Polish (~5h)**
- Admin vs Analyst role enforcement
- Rate limiting + request-size limits
- Fraud score gauge + decision queue in dashboard
- Baseline vs proposed evaluation (`ml/evaluate.py`)
- RAG guardrail polish (citations + refusal)
- Unit tests for policy engine + feature builder
- README with setup/run instructions

### ONLY IF TIME REMAINS

**Phase 9 — Extras (~3h)**
- Plaid Sandbox cash-flow swap-in
- Broader integration tests
- Lightweight cloud deployment (single FastAPI + managed Postgres)
- Architecture diagram, larger policy corpus, richer audit evidence

---

## 18. Project Structure

```
underwriting-engine/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── docs/
│   └── architecture.md            # architecture diagram
├── app/
│   ├── main.py                    # FastAPI entry point
│   ├── schemas.py                 # Pydantic schemas
│   ├── db.py                      # SQLAlchemy engine
│   ├── auth/
│   │   ├── security.py            # JWT issuance/verification
│   │   └── roles.py               # Analyst/Admin dependencies
│   ├── api/
│   │   ├── decision.py            # /v1/decision endpoint
│   │   └── analyst.py             # /v1/analyst/ask endpoint
│   ├── data/
│   │   ├── bureau_mock.py         # synthetic bureau features
│   │   ├── cashflow_mock.py       # synthetic cash-flow features (default)
│   │   └── plaid_client.py        # Plaid Sandbox cash-flow (Only If Time Remains)
│   ├── features/
│   │   ├── builder.py             # canonical feature schema (train + inference)
│   │   └── fraud_signals.py       # deterministic fraud signals
│   ├── models/
│   │   ├── credit_risk.py         # XGBoost inference wrapper
│   │   ├── fraud.py               # XGBoost inference wrapper
│   │   └── artifacts/             # trained model files (git-ignored)
│   ├── decisioning/
│   │   └── pipeline.py            # modular deterministic decision pipeline
│   ├── rules/
│   │   └── policy_engine.py       # policy/rules engine (versioned)
│   ├── explain/
│   │   └── shap_explainer.py      # SHAP → reason codes
│   ├── rag/
│   │   ├── chunking.py
│   │   ├── embeddings.py
│   │   ├── retrieval.py           # pgvector semantic search
│   │   ├── prompts.py             # prompt templates
│   │   ├── llm_client.py          # OpenAI LLM client
│   │   └── guardrails.py          # grounding/citation/refusal checks
│   └── audit/
│       └── logger.py              # append-only audit writer
├── dataset/                        # real Give Me Some Credit files (cs-training.csv, cs-test.csv)
├── ml/
│   ├── feature_metadata.json       # fitted medians (from cs-training), credit schema version
│   ├── train_credit.py             # XGBoost + logistic regression baseline (uses dataset/cs-training.csv)
│   ├── train_fraud.py              # optional XGBoost fraud model (rule-based is default)
│   ├── ingest_policies.py          # chunk → embed → pgvector
│   └── evaluate.py                 # baseline vs proposed + system metrics
├── db/
│   └── schema.sql                 # PostgreSQL + pgvector schema
└── frontend/                      # React/Vite
    ├── src/
    │   ├── components/            # DecisionCard, ShapChart, FraudGauge, PolicyAssistant, Login
    │   └── api/client.js
```

---

## 19. Key Metrics to Report at the End

- Approval-rate uplift for thin-file/low-score segment vs bureau-score-only baseline (computed, not invented)
- Credit model ROC-AUC (proposed vs baseline)
- Fraud model precision/recall, false-positive rate
- Average decision latency (target: sub-2s)
- % of decisions with a clear, human-readable reason code (target: 100%)
- % of decisions with complete audit traces
- RAG retrieval quality and groundedness of LLM responses

---

# Implementation Snippets

Companion to the plan. Code per component, in build order. Libraries pinned where it matters so an agent doesn't guess versions.

## 0. requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
pgvector==0.3.6
xgboost==2.1.1
scikit-learn==1.5.2
shap==0.46.0
openai==1.54.3
sentence-transformers==3.1.1
faker==29.0.0
pandas==2.2.3
numpy==1.26.4
pytest==8.3.3
slowapi==0.1.9
```

Note: no Feast, no Redis, no ChromaDB, no Optuna, no boto3, no MLflow, no LangChain — all features and vector search live in PostgreSQL + pgvector. Models are saved as local artifacts. `plaid-python` and `langchain` are omitted by default; add `plaid-python` only if the Plaid Sandbox swap-in is attempted.

## 1. Docker Compose (PostgreSQL + pgvector)

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-uw}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-uw}   # override via .env
      POSTGRES_DB: ${POSTGRES_DB:-underwriting}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  pgdata:
```

## 2. Pydantic Schemas

```python
# app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ApplicantInput(BaseModel):
    applicant_id: str
    age: int = Field(ge=18, le=120)
    annual_income: float = Field(ge=0)
    requested_amount: float = Field(ge=0, le=1_000_000)
    employment_length_years: float = Field(ge=0)
    device_id: str
    ip_address: str
    plaid_access_token: Optional[str] = None  # sandbox token if cash-flow consent given

class BureauFeatures(BaseModel):
    bureau_score: Optional[int]  # None if credit-invisible
    num_tradelines: int
    utilization_ratio: float
    delinquencies_24mo: int
    credit_history_months: int

class CashFlowFeatures(BaseModel):
    avg_monthly_income: float
    avg_monthly_expenses: float
    overdraft_count_90d: int
    income_stability_score: float  # 0-1, derived

class DecisionResult(BaseModel):
    application_id: str
    applicant_id: str
    decision: str  # "approve" | "decline" | "refer"
    credit_risk_score: float
    fraud_risk_score: float
    reason_codes: list[str]
    shap_top_features: dict
    model_version: str
    feature_schema_version: str
    policy_version: str
    request_id: str
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

## 3. Authentication & Roles

```python
# app/auth/security.py
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.environ["JWT_SECRET"]          # from .env / AWS Secrets Manager
ALGORITHM = "HS256"
TOKEN_EXPIRES_MIN = int(os.environ.get("JWT_EXPIRES_MIN", "120"))
bearer = HTTPBearer(auto_error=False)

def create_access_token(sub: str, role: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRES_MIN)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing credentials")
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"sub": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

def require_role(role: str):
    def dep(user: dict = Depends(current_user)):
        if user["role"] != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user
    return dep
```

```python
# app/auth/roles.py
from app.auth.security import require_role

analyst = require_role("analyst")
admin = require_role("admin")
```

## 4. FastAPI Entry Point

```python
# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.schemas import ApplicantInput, DecisionResult
from app.decisioning.pipeline import run_decision_pipeline
from app.auth.security import analyst, admin
from app.data.bureau_mock import get_bureau_features
from app.data.plaid_client import get_cash_flow_features
import os, time, uuid

app = FastAPI(title="Underwriting Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)

@app.post("/v1/decision", response_model=DecisionResult, dependencies=[Depends(analyst)])
@limiter.limit("30/minute")
async def get_decision(request, applicant: ApplicantInput):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    bureau = get_bureau_features(applicant.applicant_id)
    cashflow = get_cash_flow_features(applicant.plaid_access_token) if applicant.plaid_access_token else None
    result = run_decision_pipeline(applicant, bureau, cashflow, request_id)
    result.request_id = request_id
    result.latency_ms = (time.perf_counter() - start) * 1000
    return result

@app.get("/health")
async def health():
    return {"status": "ok"}
```

Note: for an app with multiple routes, prefer a request object (e.g., `fastapi.Request`) to `get_remote_address`; shown simplified for brevity.

## 5. Mock Bureau Data Service

```python
# app/data/bureau_mock.py
import random
from app.schemas import BureauFeatures

def get_bureau_features(applicant_id: str) -> BureauFeatures:
    # deterministic pseudo-random by applicant_id so demo is reproducible
    rng = random.Random(applicant_id)
    is_thin_file = rng.random() < 0.35  # simulate ~35% thin-file population
    if is_thin_file:
        return BureauFeatures(
            bureau_score=None,
            num_tradelines=rng.randint(0, 2),
            utilization_ratio=rng.uniform(0, 0.3),
            delinquencies_24mo=0,
            credit_history_months=rng.randint(0, 6),
        )
    return BureauFeatures(
        bureau_score=rng.randint(580, 800),
        num_tradelines=rng.randint(3, 12),
        utilization_ratio=rng.uniform(0.1, 0.9),
        delinquencies_24mo=rng.randint(0, 3),
        credit_history_months=rng.randint(24, 200),
    )
```

## 6. Plaid Sandbox Integration (Cash-Flow Data)

```python
# app/data/plaid_client.py
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid import Configuration, ApiClient
from datetime import date, timedelta
from app.schemas import CashFlowFeatures
import os

configuration = Configuration(
    host="https://sandbox.plaid.com",
    api_key={
        "clientId": os.environ["PLAID_CLIENT_ID"],       # env only — never hardcoded
        "secret": os.environ["PLAID_SANDBOX_SECRET"],
    },
)
client = plaid_api.PlaidApi(ApiClient(configuration))

def get_cash_flow_features(access_token: str) -> CashFlowFeatures:
    req = TransactionsGetRequest(
        access_token=access_token,
        start_date=date.today() - timedelta(days=90),
        end_date=date.today(),
    )
    resp = client.transactions_get(req)
    txns = resp["transactions"]

    incomes = [t["amount"] for t in txns if t["amount"] < 0]  # Plaid: negative = credit
    expenses = [t["amount"] for t in txns if t["amount"] > 0]
    overdrafts = [t for t in txns if "overdraft" in (t["name"] or "").lower()]

    avg_income = abs(sum(incomes) / 3) if incomes else 0.0
    avg_expenses = sum(expenses) / 3 if expenses else 0.0
    stability = 1.0 - min(1.0, (max(expenses, default=0) / (avg_income + 1)))

    return CashFlowFeatures(
        avg_monthly_income=avg_income,
        avg_monthly_expenses=avg_expenses,
        overdraft_count_90d=len(overdrafts),
        income_stability_score=round(stability, 2),
    )
```

Setup note: `PLAID_CLIENT_ID` / `PLAID_SANDBOX_SECRET` come free from a Plaid developer account (sandbox tier, no approval needed). Use Plaid's `user_good`/`user_transactions_dynamic` sandbox test users.

## 7. Canonical Feature Builder (credit features shared by training AND inference)

The **credit model** is trained on exactly the 10 real columns of `cs-training.csv`. The builder exposes one function for training and one for inference that produce the **same ordered vector**. Cash-flow and fraud signals are separate inputs (fed to the policy engine / fraud score), never injected into the credit training vector.

```python
# app/features/builder.py
import json, os
import pandas as pd

# Exact column names from the real Give Me Some Credit cs-training.csv
CREDIT_FEATURES = [
    "RevolvingUtilizationOfUnsecuredLines",
    "age",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "DebtRatio",
    "MonthlyIncome",
    "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate",
    "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfDependents",
]
CREDIT_FEATURE_VERSION = "v1"
_METADATA_PATH = os.environ.get("FEATURE_METADATA", "ml/feature_metadata.json")

def load_metadata():
    if not os.path.exists(_METADATA_PATH):
        return {}
    with open(_METADATA_PATH) as fh:
        return json.load(fh)

# TRAINING PATH: select the 10 real columns, fill missing values with training
# medians, persist those medians so inference matches exactly.
def build_credit_training_matrix(df: pd.DataFrame) -> pd.DataFrame:
    df = df[CREDIT_FEATURES].copy()
    medians = {c: float(df[c].median()) for c in CREDIT_FEATURES}
    for c in CREDIT_FEATURES:
        df[c] = df[c].fillna(medians[c]).astype(float)
    with open(_METADATA_PATH, "w") as fh:
        json.dump({"medians": medians, "version": CREDIT_FEATURE_VERSION}, fh, indent=2)
    return df

# INFERENCE PATH: map bureau + applicant mocks onto the exact same 10 columns.
# Only MonthlyIncome/age come from the applicant; the rest come from the bureau
# mock. Missing inputs fall back to the stored training medians.
def build_credit_inference_vector(applicant, bureau, cashflow) -> tuple[list[float], list[str], str]:
    medians = load_metadata().get("medians", {})
    def g(key, val):
        return float(val) if val is not None else medians.get(key, 0.0)

    age = g("age", getattr(applicant, "age", None))
    income = g("MonthlyIncome", (applicant.annual_income / 12.0) if getattr(applicant, "annual_income", None) else None)

    vector = [
        g("RevolvingUtilizationOfUnsecuredLines", getattr(bureau, "utilization_ratio", None)),
        age,
        g("NumberOfTime30-59DaysPastDueNotWorse", getattr(bureau, "delinquencies_24mo", None)),
        g("DebtRatio", _dti(bureau, cashflow)),
        income,
        g("NumberOfOpenCreditLinesAndLoans", getattr(bureau, "num_tradelines", None)),
        g("NumberOfTimes90DaysLate", (1.0 if bureau and bureau.delinquencies_24mo >= 4 else 0.0)),
        g("NumberRealEstateLoansOrLines", 0.0),
        g("NumberOfTime60-89DaysPastDueNotWorse", 0.0),
        g("NumberOfDependents", 0.0),
    ]
    return vector, list(CREDIT_FEATURES), CREDIT_FEATURE_VERSION

def _dti(bureau, cashflow):
    if cashflow and getattr(cashflow, "avg_monthly_income", 0):
        return cashflow.avg_monthly_expenses / max(cashflow.avg_monthly_income, 1.0)
    return None
```

Inference never re-implements credit-feature construction — it calls `build_credit_inference_vector`, guaranteeing the same names, order, units, and median-fill handling as training. Cash-flow and fraud signals are passed separately to the policy engine and fraud score (they are not credit-training features).

## 8. Deterministic Fraud Signals

```python
# app/features/fraud_signals.py
# Deterministic, rule-based fraud signals computed from stored application history.
# These are FEATURES of the fraud model and inputs to the policy engine — not a separate model.
def compute_fraud_signals(applicant, application_history) -> dict:
    device = applicant.device_id
    ip = applicant.ip_address
    window = [a for a in application_history if a.created_within_24h()]
    apps_per_device = sum(1 for a in window if a.device_id == device)
    apps_per_ip = sum(1 for a in window if a.ip_address == ip)
    distinct_devices = len({a.device_id for a in window})
    identity_consistency = 1.0 if len(distinct_devices) <= 2 else 0.0
    return {
        "apps_per_device_24h": float(apps_per_device),
        "apps_per_ip_24h": float(apps_per_ip),
        "device_identity_consistency": float(identity_consistency),
    }
```

## 9. Training the Credit Risk Model (XGBoost + Logistic Regression baseline)

```python
# ml/train_credit.py
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
import joblib
from app.features.builder import build_credit_training_matrix, CREDIT_FEATURES

TARGET = "SeriousDlqin2yrs"

# Real public dataset (already downloaded)
train = pd.read_csv("dataset/cs-training.csv")
test = pd.read_csv("dataset/cs-test.csv")

X_train = build_credit_training_matrix(train)   # 10 real columns + persists medians
y_train = train[TARGET]

# Held-out: cs-test.csv, filled with the SAME training medians
medians = __import__("json").load(open("ml/feature_metadata.json"))["medians"]
X_test = test[CREDIT_FEATURES].copy()
for c in CREDIT_FEATURES:
    X_test[c] = X_test[c].fillna(medians[c]).astype(float)
y_test = test[TARGET]

# Fixed, reproducible defaults — no tuning
model = xgb.XGBClassifier(
    n_estimators=300, max_depth=5, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, eval_metric="auc", random_state=42,
)
model.fit(X_train, y_train)
auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
model.save_model("app/models/artifacts/credit_risk_v1.json")
print(f"XGBoost AUC: {auc:.4f}")

# Baseline for comparison
bl = LogisticRegression(max_iter=1000, random_state=42)
bl.fit(X_train, y_train)
bl_auc = roc_auc_score(y_test, bl.predict_proba(X_test)[:, 1])
joblib.dump(bl, "app/models/artifacts/credit_baseline_v1.pkl")
print(f"Baseline AUC: {bl_auc:.4f}")

# Save test predictions for the baseline-vs-proposed comparison
joblib.dump(
    {"y_test": y_test, "baseline_proba": bl.predict_proba(X_test)[:, 1],
     "proposed_proba": model.predict_proba(X_test)[:, 1]},
    "ml/data/holdout_predictions.pkl",
)
```

## 10. Training the Fraud Model (XGBoost)

```python
# ml/train_fraud.py
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

# Dataset: IEEE-CIS Fraud Detection (Kaggle) — merge train_transaction + train_identity
df = pd.read_csv("ml/data/ieee_fraud_merged.csv")

drop_cols = ["TransactionID", "isFraud"]
FEATURES = [c for c in df.columns if c not in drop_cols]
X = df[FEATURES].fillna(-999)
y = df["isFraud"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf = xgb.XGBClassifier(
    n_estimators=400, max_depth=6, learning_rate=0.05,
    scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),  # class imbalance
    eval_metric="aucpr", random_state=42,
)
clf.fit(X_train, y_train)
auc = roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])
clf.save_model("app/models/artifacts/fraud_xgb_v1.json")
print(f"Fraud model AUC: {auc:.4f}")
```

Simplification (default): fraud detection uses the **rule-based score** over deterministic fraud signals (see `app/models/fraud.py`) — no training needed. The XGBoost fraud model below is **optional**, only if time allows, to replace the rule-based score with a trained model on IEEE-CIS. The rule-based version fully satisfies the simple-fraud requirement.

## 11. Inference Wrappers

Credit model wrapper (consumes the 10-feature credit vector); fraud scoring is rule-based over fraud signals (see `app/models/fraud.py`).

```python
# app/models/credit_risk.py
import xgboost as xgb
import numpy as np

_model = xgb.XGBClassifier()
_model.load_model("app/models/artifacts/credit_risk_v1.json")

def score_credit_risk(feature_vector: list[float]) -> float:
    proba = _model.predict_proba(np.array([feature_vector]))[0][1]
    return float(proba)  # probability of default; lower = better
```

```python
# app/models/fraud.py
# Rule-based fraud score from deterministic fraud signals (default, no training needed).
# Keeps fraud detection simple and honest for the 30-hour scope.

def score_fraud_risk(fraud_signals: dict) -> float:
    apps_per_ip = fraud_signals.get("apps_per_ip_24h", 0)
    apps_per_device = fraud_signals.get("apps_per_device_24h", 0)
    identity_consistency = fraud_signals.get("device_identity_consistency", 1.0)

    score = 0.0
    if apps_per_ip >= 5:
        score += 0.5
    if apps_per_device >= 4:
        score += 0.3
    if identity_consistency < 0.5:
        score += 0.4
    return float(min(1.0, score))
```

Optional (only if time): replace `score_fraud_risk` with an XGBoost classifier (trained on IEEE-CIS) that takes the same fraud-signal features. The rule-based version above is the default and fully sufficient for the demo.

## 12. Rules / Policy Guardrail Layer

```python
# app/rules/policy_engine.py
from dataclasses import dataclass

@dataclass
class PolicyResult:
    passed: bool
    violated_rules: list[str]

# Hard guardrails — ML score cannot override these
POLICY_RULES = [
    ("min_age", lambda a: a.age >= 18),
    ("max_dti", lambda a, cf: (cf.avg_monthly_expenses / max(cf.avg_monthly_income, 1)) < 0.65),
    ("no_severe_delinquency", lambda a, bf: bf.delinquencies_24mo < 4),
    ("max_velocity", lambda a, fs: fs["apps_per_ip_24h"] <= 5),
]

def apply_policy(applicant, bureau, cashflow, fraud_signals) -> PolicyResult:
    violated = []
    if applicant.age < 18:
        violated.append("min_age")
    if cashflow and (cashflow.avg_monthly_expenses / max(cashflow.avg_monthly_income, 1)) >= 0.65:
        violated.append("max_dti")
    if bureau.delinquencies_24mo >= 4:
        violated.append("no_severe_delinquency")
    if fraud_signals.get("apps_per_ip_24h", 0) > 5:
        violated.append("max_velocity")
    return PolicyResult(passed=len(violated) == 0, violated_rules=violated)
```

Policy content is versioned (`policy_version`) and stored as JSON/YAML so it reads as policy-driven and is auditable.

## 13. Explainability (SHAP → Reason Codes)

```python
# app/explain/shap_explainer.py
import shap
import xgboost as xgb
import numpy as np
from app.features.builder import CREDIT_FEATURES

_model = xgb.XGBClassifier()
_model.load_model("app/models/artifacts/credit_risk_v1.json")
_explainer = shap.TreeExplainer(_model)

# Maps the 10 real credit features to human-readable reason codes
REASON_CODE_MAP = {
    "RevolvingUtilizationOfUnsecuredLines": "High revolving credit utilization",
    "DebtRatio": "High debt-to-income ratio",
    "NumberOfTimes90DaysLate": "History of severe late payments",
    "MonthlyIncome": "Insufficient verified income",
    "NumberOfOpenCreditLinesAndLoans": "Limited credit history/tradelines",
    "NumberOfTime30-59DaysPastDueNotWorse": "Recent delinquency",
    "NumberRealEstateLoansOrLines": "High number of real-estate loans",
    "NumberOfDependents": "High number of dependents",
    "age": "Age considered in risk assessment",
    "NumberOfTime60-89DaysPastDueNotWorse": "Recent 60-89 day delinquency",
}

def explain_decision(feature_vector: list[float], top_n: int = 3) -> dict:
    shap_values = _explainer.shap_values(np.array([feature_vector]))[0]
    ranked = sorted(
        zip(CREDIT_FEATURES, shap_values), key=lambda x: abs(x[1]), reverse=True
    )[:top_n]
    return {
        "top_features": {name: round(float(val), 4) for name, val in ranked},
        "reason_codes": [
            REASON_CODE_MAP.get(name, name) for name, val in ranked if val > 0
        ],
    }
```

## 14. Modular Decision Pipeline (deterministic — no LangGraph, no LLM)

```python
# app/decisioning/pipeline.py
from app.features.builder import build_credit_inference_vector, CREDIT_FEATURE_VERSION
from app.features.fraud_signals import compute_fraud_signals
from app.models.credit_risk import score_credit_risk
from app.models.fraud import score_fraud_risk
from app.rules.policy_engine import apply_policy, POLICY_VERSION
from app.explain.shap_explainer import explain_decision
from app.audit.logger import write_audit_log
from app.schemas import ApplicantInput, BureauFeatures, CashFlowFeatures, DecisionResult

def _decide(policy, credit_score: float, fraud_score: float) -> str:
    # Deterministic, explainable decision function — the ONLY place a decision is made.
    if not policy.passed:
        return "decline"
    if fraud_score > 0.7:
        return "refer"            # manual fraud review
    if credit_score < 0.35:
        return "approve"
    if credit_score < 0.6:
        return "refer"
    return "decline"

def run_decision_pipeline(applicant, bureau, cashflow, request_id) -> DecisionResult:
    # 1. Credit features — 10 real columns, same builder as training
    vector, names, schema_version = build_credit_inference_vector(applicant, bureau, cashflow)

    # 2. Fraud signals — separate from credit features (velocity / identity)
    fraud_signals = compute_fraud_signals(applicant, history_for(applicant))

    # 3. Scores
    credit_score = score_credit_risk(vector)
    fraud_score = score_fraud_risk(fraud_signals)   # rule-based or fraud-model score

    # 4. Deterministic policy (uses cash-flow + fraud signals)
    policy = apply_policy(applicant, bureau, cashflow, fraud_signals)

    # 5. Decision
    decision = _decide(policy, credit_score, fraud_score)

    # 6. Explain (SHAP on the 10 credit features)
    explanation = explain_decision(vector)

    # 7. Audit
    write_audit_log(
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_score=credit_score,
        fraud_score=fraud_score,
        reason_codes=explanation["reason_codes"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        evidence={"top_features": explanation["top_features"], "fraud_signals": fraud_signals},
    )

    return DecisionResult(
        application_id=request_id,
        applicant_id=applicant.applicant_id,
        decision=decision,
        credit_risk_score=credit_score,
        fraud_risk_score=fraud_score,
        reason_codes=explanation["reason_codes"],
        shap_top_features=explanation["top_features"],
        model_version="credit_v1/fraud_v1",
        feature_schema_version=schema_version,
        policy_version=POLICY_VERSION,
        request_id=request_id,
        latency_ms=0.0,  # set by caller
    )
```

`history_for(applicant)` reads recent applications from PostgreSQL for velocity/consistency signals. The credit score and fraud score are computed from **different inputs** — the credit vector (10 real features) and the fraud signals respectively — never conflated.

## 15. Audit Logging (append-only, full trace)

```python
# app/audit/logger.py
from sqlalchemy import create_engine, text
import json, os

engine = create_engine(os.environ["DATABASE_URL"])   # env only — never hardcoded

INSERT_SQL = """
INSERT INTO audit_logs (
    application_id, decision, credit_risk_score, fraud_risk_score,
    reason_codes, model_version, feature_schema_version, policy_version,
    request_id, evidence
) VALUES (:aid, :dec, :cs, :fs, :rc, :mv, :fsv, :pv, :rid, :ev)
"""

def write_audit_log(**kwargs):
    with engine.begin() as conn:
        conn.execute(
            text(INSERT_SQL),
            {
                "aid": kwargs["applicant_id"],
                "dec": kwargs["decision"],
                "cs": kwargs["credit_score"],
                "fs": kwargs["fraud_score"],
                "rc": json.dumps(kwargs["reason_codes"]),
                "mv": kwargs["model_version"],
                "fsv": kwargs["feature_schema_version"],
                "pv": kwargs["policy_version"],
                "rid": kwargs["request_id"],
                "ev": json.dumps(kwargs["evidence"]),
            },
        )
```

## 16. Cloud LLM (OpenAI) + RAG

### 16.1 OpenAI LLM client

```python
# app/rag/llm_client.py
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])   # env only — never hardcoded
MODEL_ID = os.environ.get("OPENAI_MODEL_ID", "gpt-4o-mini")

def invoke_openai(prompt: str, max_tokens: int = 512) -> str:
    resp = client.chat.completions.create(
        model=MODEL_ID,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.0,
    )
    return resp.choices[0].message.content
```

### 16.2 Embeddings (local, pgvector)

```python
# app/rag/embeddings.py
from sentence_transformers import SentenceTransformer

_model = SentenceTransformer("all-MiniLM-L6-v2")   # 384-dim, local-only

def embed(text: str) -> list[float]:
    return _model.encode([text], normalize_embeddings=True)[0].tolist()
```

### 16.3 Retrieval (pgvector)

```python
# app/rag/retrieval.py
from app.db import get_connection
from app.rag.embeddings import embed

def retrieve(query: str, top_k: int = 4) -> list[dict]:
    vec = embed(query)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT p.title, p.policy_version, pe.chunk_text, pe.chunk_index
            FROM policy_embeddings pe
            JOIN policies p ON p.policy_id = pe.policy_id
            ORDER BY pe.embedding <=> %(vec)s::vector
            LIMIT %(top_k)s
            """,
            {"vec": vec, "top_k": top_k},
        ).fetchall()
    return [dict(r) for r in rows]
```

### 16.4 Prompt template

```python
# app/rag/prompts.py
ANALYST_SYSTEM_PROMPT = """You are a credit underwriting policy assistant.
You explain decisions made by the deterministic underwriting system. You NEVER make or change a credit decision.
Only use the retrieved policy passages below. If the passages do not answer the question, say so clearly.
Cite passages by title and policy version. Do not invent policy.
"""

def build_analyst_prompt(question: str, passages: list[dict], decision_context: dict | None) -> str:
    context = "\n\n".join(
        f"[{p['title']} v{p['policy_version']} §{p['chunk_index']}]\n{p['chunk_text']}"
        for p in passages
    )
    decision = ""
    if decision_context:
        decision = (
            f"\nDecision context: application {decision_context['application_id']} was "
            f"decided '{decision_context['decision']}' with reason codes {decision_context['reason_codes']}."
        )
    return f"{ANALYST_SYSTEM_PROMPT}\n\nRetrieved policy passages:\n{context}\n{decision}\n\nAnalyst question: {question}"
```

### 16.5 Guardrails

```python
# app/rag/guardrails.py
def apply_guardrails(raw: str, passages: list[dict]) -> str:
    # 1. Refuse when nothing relevant was retrieved
    if not passages:
        return "I could not find a relevant policy passage to answer from."
    # 2. Require at least one citation token from retrieved passages
    titles = {p["title"] for p in passages}
    if not any(t in raw for t in titles):
        return "I could not ground this answer in the retrieved policies. Refusing to answer."
    # 3. Ensure answer does not sound like a credit decision
    return raw + "\n\n(Generated explanation — not a credit decision.)"
```

### 16.6 RAG pipeline

```python
# app/rag/pipeline.py
from app.rag.retrieval import retrieve
from app.rag.prompts import build_analyst_prompt
from app.rag.llm_client import invoke_openai
from app.rag.guardrails import apply_guardrails

def answer_analyst_question(question: str, decision_context: dict | None = None) -> str:
    passages = retrieve(question, top_k=4)
    prompt = build_analyst_prompt(question, passages, decision_context)
    raw = invoke_openai(prompt)
    return apply_guardrails(raw, passages)
```

Analyst endpoint (Admin/analyst-only, rate-limited) — `app/api/analyst.py` wraps `answer_analyst_question`.

## 17. Frontend Snippet (React — decision + SHAP chart + policy assistant)

```jsx
// frontend/src/components/DecisionCard.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DecisionCard({ result }) {
  const featureData = Object.entries(result.shap_top_features).map(([name, value]) => ({
    name, value,
  }));

  return (
    <div className="decision-card">
      <h2>{result.decision.toUpperCase()}</h2>
      <p>Credit risk score: {result.credit_risk_score.toFixed(3)}</p>
      <p>Fraud risk score: {result.fraud_risk_score.toFixed(3)}</p>
      <p>Model: {result.model_version} | Features: {result.feature_schema_version} | Policy: {result.policy_version}</p>
      <ul>
        {result.reason_codes.map((rc) => <li key={rc}>{rc}</li>)}
      </ul>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={featureData} layout="vertical">
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={180} />
          <Tooltip />
          <Bar dataKey="value" fill="#f0a500" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

```jsx
// frontend/src/api/client.js
export async function submitApplication(payload, token) {
  const res = await fetch("http://localhost:8000/v1/decision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function askAnalyst(question, decisionContext, token) {
  const res = await fetch("http://localhost:8000/v1/analyst/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ question, decision_context: decisionContext }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

## 18. Tests

```python
# tests/test_policy_engine.py
from app.rules.policy_engine import apply_policy
from app.schemas import ApplicantInput, BureauFeatures, CashFlowFeatures

def test_declines_severe_delinquency():
    applicant = ApplicantInput(
        applicant_id="a1", age=30, annual_income=50000, requested_amount=1000,
        employment_length_years=2, device_id="d1", ip_address="0.0.0.0",
    )
    bureau = BureauFeatures(
        bureau_score=550, num_tradelines=3, utilization_ratio=0.5,
        delinquencies_24mo=5, credit_history_months=36,
    )
    result = apply_policy(applicant, bureau, None, {"apps_per_ip_24h": 1.0})
    assert not result.passed
    assert "no_severe_delinquency" in result.violated_rules
```

```python
# tests/test_feature_builder.py
# The credit builder must produce identical vectors for the same inputs,
# using the exact 10 real cs-training columns in order.
from app.features.builder import build_credit_inference_vector, CREDIT_FEATURES

def test_credit_vector_order_matches_schema():
    v1, names1, ver = build_credit_inference_vector(a, b, cf)
    v2, names2, _ = build_credit_inference_vector(a, b, cf)
    assert names1 == names2 == CREDIT_FEATURES
    assert v1 == v2
```

```python
# tests/test_security.py
from app.auth.security import create_access_token, current_user

def test_token_role_roundtrip():
    token = create_access_token("alice", "analyst")
    assert current_user_claims(token)["role"] == "analyst"
```

## 19. Metric Reporting Script

```python
# ml/evaluate.py
from sklearn.metrics import roc_auc_score, precision_recall_curve, confusion_matrix
import pandas as pd

def approval_uplift_thin_file(df: pd.DataFrame) -> float:
    """df needs: is_thin_file (bool), approved_baseline (bool), approved_model (bool)"""
    thin = df[df.is_thin_file]
    baseline_rate = thin.approved_baseline.mean()
    model_rate = thin.approved_model.mean()
    return round((model_rate - baseline_rate) / baseline_rate * 100, 1)  # % uplift

def compare_models(y_test, baseline_proba, proposed_proba):
    return {
        "baseline_auc": roc_auc_score(y_test, baseline_proba),
        "proposed_auc": roc_auc_score(y_test, proposed_proba),
    }
```

---

## Build Order Checklist (Must-Have first)

1. `docker-compose up` → PostgreSQL + pgvector running, schema applied
2. (Already done) GMSC `cs-training.csv` / `cs-test.csv` are in `dataset/` — no download needed
3. Run `ml/train_credit.py` (XGBoost + baseline) → artifacts + `feature_metadata.json` + `holdout_predictions.pkl`
4. (Default) Rule-based fraud in `app/models/fraud.py` — no training. Optional: `ml/train_fraud.py` if time
5. Wire `app/models/*` inference wrappers to loaded artifacts
6. Build `bureau_mock.py`, `cashflow_mock.py`
7. Build `features/builder.py` (credit, 10 real cols), `features/fraud_signals.py`
8. Build `rules/policy_engine.py`, `explain/shap_explainer.py`
9. Build modular `decisioning/pipeline.py`; confirm `/v1/decision` works via curl/Postman
10. Add `audit/logger.py`; confirm audit rows capture core metadata
11. Add JWT auth + login; protect `/v1/decision`
12. Ingest 3–5 policy docs → `ml/ingest_policies.py`; verify pgvector retrieval returns relevant chunks
13. Build minimal RAG pipeline (retrieval → prompt → OpenAI → basic guardrails); test analyst questions
14. Build React form + `DecisionCard` + policy assistant panel
15. (Should) Run `ml/evaluate.py` for baseline-vs-proposed; add roles, rate limiting, tests, README
16. (Only if time) Plaid swap-in, integration tests, cloud deploy, architecture diagram

Once steps 1–14 work end-to-end, the submission meets the stated requirements.
