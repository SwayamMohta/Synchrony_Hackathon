#!/usr/bin/env sh
set -e

echo "[entrypoint] Waiting for database at ${DATABASE_URL} ..."

# Wait until the database is reachable before running migrations/ingest.
python - <<'PY'
import os, sys, time
from sqlalchemy import create_engine, text

url = os.environ.get("DATABASE_URL", "postgresql+psycopg2://uw:uw@localhost:5432/underwriting")
engine = create_engine(url, pool_pre_ping=True)
deadline = time.time() + 120
while True:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[entrypoint] Database is ready.")
        break
    except Exception as exc:
        if time.time() > deadline:
            print(f"[entrypoint] Database did not become ready: {exc}", file=sys.stderr)
            sys.exit(1)
        time.sleep(2)
PY

# Ingest the policy corpus (idempotent). Best-effort: embeddings download
# on first run; if it fails, the API still starts (RAG falls back to a
# grounded, offline answer).
echo "[entrypoint] Running RAG policy ingest ..."
python -m app.rag.ingest || echo "[entrypoint] RAG ingest skipped/failed (non-fatal)."

echo "[entrypoint] Starting uvicorn ..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
