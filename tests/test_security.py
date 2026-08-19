from app.auth.security import create_access_token, SECRET_KEY, verify_user
from jose import jwt

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
