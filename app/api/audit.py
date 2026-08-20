from fastapi import APIRouter, Depends, Query
from app.auth.roles import admin
from app.audit.logger import read_audit_log

router = APIRouter()

@router.get("/v1/audit/logs")
async def list_audit_logs(limit: int = Query(50, ge=1, le=500), user: dict = Depends(admin)):
    return {"logs": read_audit_log(limit)}
