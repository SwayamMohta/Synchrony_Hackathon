from fastapi import APIRouter, HTTPException, status, Request
from app.schemas import LoginRequest, TokenResponse
from app.auth.security import verify_user, create_access_token
from app.rate_limit import limiter

router = APIRouter()

@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    user = verify_user(body.username, body.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token(user["sub"], user["role"])
    return TokenResponse(access_token=token, role=user["role"])
