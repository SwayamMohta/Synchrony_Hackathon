# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Backend image for the underwriting engine (FastAPI + XGBoost + RAG).
# The credit model artifact (gitignored) is trained here at build time
# from the committed training dataset, so a fresh clone can run.
# ------------------------------------------------------------------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps needed to install/build the compiled wheels below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better layer caching).
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application + training sources.
COPY app ./app
COPY ml ./ml
COPY policies ./policies
COPY db ./db
COPY dataset ./dataset

# Train the credit model (and baseline) so the artifacts the backend
# loads at import time exist in the image. Reproducible from the
# committed dataset; deterministic random_state=42.
RUN mkdir -p app/models/artifacts ml/data \
    && python ml/train_credit.py

# A small entrypoint that waits for the database, ingests the RAG policy
# corpus (idempotent), then starts the API.
COPY scripts/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

ENTRYPOINT ["backend-entrypoint.sh"]
