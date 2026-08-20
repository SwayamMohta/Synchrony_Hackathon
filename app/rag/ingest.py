import hashlib
import os
import re

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text

from app.db import get_engine
from app.rag.chunking import CHUNKER_VERSION, chunk_markdown
from app.rag.embeddings import EMBEDDING_MODEL, embed_texts

POLICIES_DIR = os.environ.get("POLICIES_DIR", "policies")


def _slug(name):
    s = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()
    return s or "policy"


def _read_document(path):
    if path.lower().endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def _ensure_schema(conn):
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    for col, typ in [
        ("chunk_id", "TEXT"),
        ("section_path", "TEXT"),
        ("rule_id", "TEXT"),
        ("embedding_model", "TEXT"),
        ("chunker_version", "TEXT"),
        ("policy_version", "TEXT"),
        ("content_tsv", "tsvector"),
    ]:
        conn.execute(text(f"ALTER TABLE policy_embeddings ADD COLUMN IF NOT EXISTS {col} {typ}"))
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_embeddings_chunk_id ON policy_embeddings (chunk_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_policy_embeddings_tsv ON policy_embeddings USING gin (content_tsv)"))


def _vector_literal(vec):
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def ingest(conn):
    _ensure_schema(conn)
    if not os.path.isdir(POLICIES_DIR):
        raise RuntimeError(f"Policies directory not found: {POLICIES_DIR}")

    files = [f for f in sorted(os.listdir(POLICIES_DIR)) if f.lower().endswith((".md", ".txt", ".pdf"))]
    if not files:
        raise RuntimeError(f"No policy files found in {POLICIES_DIR}")

    total = 0
    for fname in files:
        path = os.path.join(POLICIES_DIR, fname)
        content = _read_document(path)
        policy_id = _slug(os.path.splitext(fname)[0])
        policy_version = "v1"
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

        conn.execute(
            text(
                "INSERT INTO policies (policy_id, title, source_path, policy_version, content, content_hash) "
                "VALUES (:id, :t, :sp, :pv, :c, :h) "
                "ON CONFLICT (policy_id) DO UPDATE SET title=EXCLUDED.title, source_path=EXCLUDED.source_path, "
                "policy_version=EXCLUDED.policy_version, content=EXCLUDED.content, content_hash=EXCLUDED.content_hash"
            ),
            {"id": policy_id, "t": fname, "sp": path, "pv": policy_version, "c": content, "h": content_hash},
        )

        conn.execute(text("DELETE FROM policy_embeddings WHERE policy_id = :pid"), {"pid": policy_id})

        chunks = chunk_markdown(content, source_name=fname, policy_id=policy_id, policy_version=policy_version)
        vectors = embed_texts([c["chunk_text"] for c in chunks])
        for c, vec in zip(chunks, vectors):
            conn.execute(
                text(
                    "INSERT INTO policy_embeddings (policy_id, chunk_id, chunk_index, section_path, rule_id, "
                    "chunk_text, embedding, embedding_model, chunker_version, policy_version, content_tsv) "
                    "VALUES (:pid, :cid, :ci, :sp, :rid, :ct, '" + _vector_literal(vec) + "'::vector, :em, :cv, :pv, to_tsvector('english', :ct))"
                ),
                {
                    "pid": policy_id,
                    "cid": c["chunk_id"],
                    "ci": c["chunk_index"],
                    "sp": c["section_path"],
                    "rid": c["rule_id"],
                    "ct": c["chunk_text"],
                    "em": EMBEDDING_MODEL,
                    "cv": CHUNKER_VERSION,
                    "pv": policy_version,
                },
            )
        total += len(chunks)
        print(f"ingested {fname}: {len(chunks)} chunks (policy_id={policy_id})")

    conn.commit()
    return total


def main():
    eng = get_engine()
    try:
        with eng.begin() as conn:
            n = ingest(conn)
    except Exception as exc:
        raise SystemExit(f"Ingest failed: {exc}")
    print(f"Done. Ingested {n} chunks total.")


if __name__ == "__main__":
    main()
