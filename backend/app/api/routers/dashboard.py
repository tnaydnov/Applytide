from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ...db.session import get_db
from ...db import models
from ...api.deps_auth import get_current_user
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = get_logger(__name__)

@router.get("/metrics", response_model=dict)
def metrics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        logger.debug("Getting dashboard metrics", extra={"user_id": current_user.id})
        
        total_jobs = db.scalar(select(func.count(models.Job.id)).where(models.Job.user_id == current_user.id)) or 0
        total_resumes = db.scalar(select(func.count(models.Resume.id)).where(models.Resume.user_id == current_user.id)) or 0
        total_apps = db.scalar(select(func.count(models.Application.id)).where(models.Application.user_id == current_user.id)) or 0
        by_status = dict(
            db.execute(
                select(models.Application.status, func.count(models.Application.id))
                .where(models.Application.user_id == current_user.id)
                .group_by(models.Application.status)
            ).all()
        )
        
        logger.debug("Dashboard metrics retrieved", extra={
            "user_id": current_user.id,
            "total_jobs": total_jobs,
            "total_resumes": total_resumes,
            "total_applications": total_apps
        })
        
        return {
            "total_jobs": total_jobs,
            "total_resumes": total_resumes,
            "total_applications": total_apps,
            "applications_by_status": by_status,
        }
    except Exception as e:
        logger.error("Failed to retrieve dashboard metrics", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise
