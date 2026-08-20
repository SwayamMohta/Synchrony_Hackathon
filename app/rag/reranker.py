import os

RERANK_MODEL = os.environ.get("RERANK_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

_model = None
_load_attempted = False


def _load_model():
    global _model, _load_attempted
    if _model is None and not _load_attempted:
        _load_attempted = True
        try:
            from sentence_transformers import CrossEncoder

            _model = CrossEncoder(RERANK_MODEL)
        except Exception:
            _model = None
    return _model


def rerank(question, chunks, top_k):
    m = _load_model()
    if m is None:
        return chunks[:top_k]
    pairs = [(question, c["chunk_text"]) for c in chunks]
    scores = m.predict(pairs)
    ordered = sorted(zip(chunks, scores), key=lambda cs: cs[1], reverse=True)
    return [c for c, _ in ordered[:top_k]]
