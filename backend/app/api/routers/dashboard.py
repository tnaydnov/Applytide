"""
User Dashboard Metrics Router

This module provides quick dashboard metrics for the main user dashboard.
Returns high-level counts and status breakdowns for jobs, resumes, and applications.

Key Features:
- Quick dashboard metrics aggregation
- Multi-entity counts (jobs, resumes, applications)
- Application status breakdown
- Optimized for dashboard overview display

Use Cases:
- Main dashboard overview cards
- Quick stats display
- User progress tracking

Dependencies:
- SQLAlchemy for database aggregations
- User authentication for data isolation

Router: /api/dashboard
Note: Different from admin dashboard (/api/admin/dashboard)
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ...db.session import get_db
from ...db import models
from ...api.deps import get_current_user
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = get_logger(__name__)

@router.get("/metrics", response_model=dict)
def metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get dashboard overview metrics.
    
    Retrieves quick summary metrics for user dashboard including counts of jobs,
    resumes, applications, and application status breakdown.
    
    Args:
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Dashboard metrics with:
            - total_jobs: Count of saved jobs
            - total_resumes: Count of uploaded resumes/documents
            - total_applications: Count of all applications
            - applications_by_status: Dict mapping status to count
    
    Raises:
        Exception: Re-raises any database errors for global handler
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own metrics
        - Automatic filtering by user_id
    
    Notes:
        - Optimized aggregation queries for performance
        - All counts calculated in database layer
        - applications_by_status groups by status field
        - Used by main dashboard cards
        - Fast response for quick overview
    
    Example:
        GET /api/dashboard/metrics
        Response:
        {
            "total_jobs": 42,
            "total_resumes": 3,
            "total_applications": 28,
            "applications_by_status": {
                "Applied": 15,
                "Interview": 5,
                "Offer": 2,
                "Rejected": 6
            }
        }
    """
    try:
        logger.debug("Getting dashboard metrics", extra={"user_id": current_user.id})

        total_jobs = (
            db.scalar(
                select(func.count(models.Job.id)).where(
                    models.Job.user_id == current_user.id
                )
            )
            or 0
        )
        total_resumes = (
            db.scalar(
                select(func.count(models.Resume.id)).where(
                    models.Resume.user_id == current_user.id
                )
            )
            or 0
        )
        total_apps = (
            db.scalar(
                select(func.count(models.Application.id)).where(
                    models.Application.user_id == current_user.id
                )
            )
            or 0
        )
        by_status = dict(
            db.execute(
                select(
                    models.Application.status, func.count(models.Application.id)
                )
                .where(models.Application.user_id == current_user.id)
                .group_by(models.Application.status)
            ).all()
        )

        logger.debug(
            "Dashboard metrics retrieved",
            extra={
                "user_id": current_user.id,
                "total_jobs": total_jobs,
                "total_resumes": total_resumes,
                "total_applications": total_apps,
            },
        )

        return {
            "total_jobs": total_jobs,
            "total_resumes": total_resumes,
            "total_applications": total_apps,
            "applications_by_status": by_status,
        }
    except Exception as e:
        logger.error(
            "Failed to retrieve dashboard metrics",
            extra={"user_id": current_user.id, "error": str(e)},
            exc_info=True,
        )
        raise
