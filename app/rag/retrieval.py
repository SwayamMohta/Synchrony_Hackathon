from sqlalchemy import text

from app.db import get_engine

DENSE_TOP = 8
LEX_TOP = 8
RRF_K = 60
FINAL_TOP = 4


class RetrievalUnavailable(RuntimeError):
    pass


def reciprocal_rank_fusion(dense_ranked, lex_ranked, k=RRF_K, top=FINAL_TOP):
    """Merge dense and lexical rankings with Reciprocal Rank Fusion."""
    scores = {}
    meta = {}
    for rank, item in enumerate(dense_ranked):
        cid = item["chunk_id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        meta.setdefault(cid, item)
    for rank, item in enumerate(lex_ranked):
        cid = item["chunk_id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        meta.setdefault(cid, item)
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top]
    out = []
    for cid, score in ranked:
        item = dict(meta[cid])
        item["rrf_score"] = round(score, 5)
        out.append(item)
    return out


def _dense(conn, qvec, policy_version, limit):
    qstr = "[" + ",".join(f"{x:.8f}" for x in qvec) + "]"
    sql = (
        "SELECT chunk_id, chunk_text, section_path, rule_id, policy_version, policy_id, "
        "embedding <=> '" + qstr + "'::vector AS distance "
        "FROM policy_embeddings "
        "WHERE (:pv IS NULL OR policy_version = :pv) "
        "ORDER BY distance ASC LIMIT :n"
    )
    rows = conn.execute(text(sql), {"pv": policy_version, "n": limit}).mappings().all()
    return [dict(r) for r in rows]


def _lexical(conn, question, policy_version, limit):
    sql = (
        "SELECT chunk_id, chunk_text, section_path, rule_id, policy_version, policy_id, "
        "ts_rank(content_tsv, websearch_to_tsquery('english', :q)) AS rank "
        "FROM policy_embeddings "
        "WHERE (:pv IS NULL OR policy_version = :pv) "
        "AND content_tsv @@ websearch_to_tsquery('english', :q) "
        "ORDER BY rank DESC LIMIT :n"
    )
    rows = conn.execute(
        text(sql), {"q": question, "pv": policy_version, "n": limit}
    ).mappings().all()
    return [dict(r) for r in rows]


def retrieve(question, policy_version=None):
    """Hybrid retrieval: dense (pgvector cosine) + lexical (Postgres FTS) fused via RRF."""
    from app.rag.embeddings import embed_query

    qvec = embed_query(question)
    eng = get_engine()
    try:
        with eng.connect() as conn:
            dense = _dense(conn, qvec, policy_version, DENSE_TOP)
            lex = _lexical(conn, question, policy_version, LEX_TOP)
    except Exception as exc:
        raise RetrievalUnavailable(f"policy store not reachable: {exc}") from exc
    return reciprocal_rank_fusion(dense, lex)
