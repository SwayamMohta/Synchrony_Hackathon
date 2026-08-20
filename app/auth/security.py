import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRES_MIN = int(os.environ.get("JWT_EXPIRES_MIN", "120"))
bearer = HTTPBearer(auto_error=False)

def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def _verify(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

_USERS = {
    "analyst": {"password": _hash("analyst123"), "role": "analyst"},
    "admin": {"password": _hash("admin123"), "role": "admin"},
}

def verify_user(username: str, password: str):
    u = _USERS.get(username)
    if u and _verify(password, u["password"]):
        return {"sub": username, "role": u["role"]}
    return None

def create_access_token(sub: str, role: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRES_MIN)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing credentials")
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    sub = payload.get("sub")
    role = payload.get("role")
    if not sub or not role:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return {"sub": sub, "role": role}

def require_role(*roles: str):
    def dep(user: dict = Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user
    return dep
