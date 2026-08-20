import os

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
EMBEDDING_DIM = 384

_model = None
_load_attempted = False


def _load_model():
    global _model, _load_attempted
    if _model is None and not _load_attempted:
        _load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(EMBEDDING_MODEL)
        except Exception:
            _model = None
    return _model


def embed_texts(texts):
    m = _load_model()
    if m is None:
        raise RuntimeError(
            f"Embedding model '{EMBEDDING_MODEL}' is unavailable. "
            "Install sentence-transformers and allow the model to download."
        )
    vecs = m.encode(list(texts), normalize_embeddings=True, batch_size=8)
    return [v.tolist() for v in vecs]


def embed_query(text):
    return embed_texts([text])[0]
