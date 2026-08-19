from fastapi import APIRouter, HTTPException, status
from app.schemas import LoginRequest, TokenResponse
from app.auth.security import verify_user, create_access_token

router = APIRouter()

@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = verify_user(body.username, body.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token(user["sub"], user["role"])
    return TokenResponse(access_token=token, role=user["role"])
