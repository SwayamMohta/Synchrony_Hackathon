import os
from sqlalchemy import create_engine
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://uw:uw@localhost:5432/underwriting")

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return _engine

@contextmanager
def get_connection():
    conn = get_engine().connect()
    try:
        yield conn
    finally:
        conn.close()
