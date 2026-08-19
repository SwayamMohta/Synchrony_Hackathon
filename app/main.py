import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.decision import router as decision_router
from app.api.auth import router as auth_router

app = FastAPI(title="Underwriting Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decision_router)
app.include_router(auth_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
