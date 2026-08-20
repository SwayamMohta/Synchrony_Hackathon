import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.rate_limit import limiter
from app.api.decision import router as decision_router
from app.api.auth import router as auth_router
from app.api.audit import router as audit_router
from app.api.analyst import router as analyst_router

app = FastAPI(title="Underwriting Engine")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decision_router)
app.include_router(auth_router)
app.include_router(audit_router)
app.include_router(analyst_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
