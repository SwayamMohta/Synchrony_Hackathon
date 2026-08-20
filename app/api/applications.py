from fastapi import APIRouter, Depends, HTTPException, Query

from app.audit.logger import get_decision_snapshot, list_decision_snapshots
from app.auth.roles import analyst

router = APIRouter()


@router.get("/v1/applications")
async def list_applications(
    limit: int = Query(100, ge=1, le=500), user: dict = Depends(analyst)
):
    return {"applications": list_decision_snapshots(limit)}


@router.get("/v1/applications/{application_id}")
async def get_application(application_id: str, user: dict = Depends(analyst)):
    snapshot = get_decision_snapshot(application_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Decision not found for application")
    return snapshot
