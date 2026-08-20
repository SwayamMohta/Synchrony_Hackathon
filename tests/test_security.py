from app.auth.security import create_access_token, SECRET_KEY, verify_user, require_role
from jose import jwt
import pytest
from fastapi import HTTPException

def test_token_role_roundtrip():
    token = create_access_token("alice", "analyst")
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    assert payload["sub"] == "alice"
    assert payload["role"] == "analyst"

def test_verify_user_valid():
    u = verify_user("analyst", "analyst123")
    assert u is not None and u["role"] == "analyst"

def test_verify_user_invalid():
    assert verify_user("analyst", "wrong") is None

def test_require_role_allows_match():
    dep = require_role("admin")
    assert dep(user={"sub": "a", "role": "admin"})["role"] == "admin"

def test_require_role_denies_mismatch():
    dep = require_role("admin")
    with pytest.raises(HTTPException) as e:
        dep(user={"sub": "a", "role": "analyst"})
    assert e.value.status_code == 403

def test_require_role_multiple_allows_any():
    dep = require_role("analyst", "admin")
    assert dep(user={"sub": "a", "role": "analyst"})["role"] == "analyst"
    assert dep(user={"sub": "a", "role": "admin"})["role"] == "admin"
