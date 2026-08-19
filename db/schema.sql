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
