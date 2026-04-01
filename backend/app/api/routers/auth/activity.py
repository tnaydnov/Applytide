"""
User Activity Log

Provides an endpoint to retrieve the authenticated user's recent activity
(login, profile changes, application events, etc.) from ApplicationLog.

Endpoints:
- GET /activity - List recent activity for the current user
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User, ApplicationLog
from ....infra.logging import get_logger
from ...schemas.common import ActivityLogResponse

router = APIRouter()
logger = get_logger(__name__)


@router.get("/activity", response_model=ActivityLogResponse)
def get_activity_log(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve recent activity/audit log for the authenticated user.

    Queries ApplicationLog table for entries associated with the user,
    ordered by most recent first.

    Query Parameters:
        page: Page number (default 1)
        limit: Items per page (default 20, max 100)

    Returns:
        dict with:
        - activities: list of activity objects
        - total: total count of activities
        - page: current page
        - limit: items per page
    """
    offset = (page - 1) * limit

    query = (
        db.query(ApplicationLog)
        .filter(ApplicationLog.user_id == current_user.id)
        .order_by(ApplicationLog.timestamp.desc())
    )

    total = query.count()
    logs = query.offset(offset).limit(limit).all()

    activities = []
    for log in logs:
        # Map log level + endpoint to a user-friendly type
        activity_type = _infer_type(log)

        activities.append({
            "id": str(log.id),
            "type": activity_type,
            "description": log.message,
            "metadata": {
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "ip_address": log.ip_address,
            },
            "created_at": log.timestamp.isoformat() if log.timestamp else None,
        })

    return {
        "activities": activities,
        "total": total,
        "page": page,
        "limit": limit,
    }


def _infer_type(log: ApplicationLog) -> str:
    """Infer a user-friendly activity type from log metadata."""
    endpoint = (log.endpoint or "").lower()
    method = (log.method or "").upper()

    if "login" in endpoint or "auth" in endpoint:
        return "auth"
    if "profile" in endpoint:
        return "profile_update" if method in ("PUT", "POST", "DELETE") else "profile_view"
    if "job" in endpoint:
        return "job_action"
    if "application" in endpoint:
        return "application_action"
    if "document" in endpoint or "resume" in endpoint:
        return "document_action"
    if "reminder" in endpoint or "calendar" in endpoint:
        return "reminder_action"
    if log.level in ("ERROR", "CRITICAL"):
        return "error"
    return "other"
