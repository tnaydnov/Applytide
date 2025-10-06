# backend/app/api/routers/admin/logs.py
"""Admin logs management endpoints"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
import io
import csv

from ._deps import limiter, get_admin_service, get_client_info
from ._schemas import AdminLogsListResponse, AdminLogResponse
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db import models
from ....domain.admin.service import AdminService
from ....infra.logging import get_logger


router = APIRouter(tags=["admin-logs"])
logger = get_logger(__name__)


@router.get("/logs", response_model=AdminLogsListResponse)
@limiter.limit("100/minute")
async def get_admin_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """Get admin action logs"""
    logs, total = service.get_admin_logs(
        page=page,
        page_size=page_size,
        admin_id=admin_id,
        action=action
    )
    
    return AdminLogsListResponse(
        logs=[
            AdminLogResponse(
                id=str(log.id),
                admin_id=str(log.admin_id),
                admin_email=log.admin_email,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at
            )
            for log in logs
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/logs/export")
@limiter.limit("10/minute")  # Strict limit for export operations
async def export_admin_logs_csv(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of days of logs to export"),
    admin_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Export admin logs as CSV file (last N days).
    
    Rate limited to 10 requests per minute due to resource intensity.
    Returns a downloadable CSV file with all audit logs matching the criteria.
    """
    # Get all logs matching criteria (no pagination for export)
    logs, _ = service.get_admin_logs(
        page=1,
        page_size=10000,  # Large limit for export
        admin_id=admin_id,
        action=action
    )
    
    # Filter by date
    cutoff = datetime.utcnow() - timedelta(days=days)
    filtered_logs = [log for log in logs if log.created_at >= cutoff]
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Timestamp", "Admin Email", "Admin ID", "Action", 
        "Target Type", "Target ID", "Details", "IP Address", "User Agent"
    ])
    
    # Write data
    for log in filtered_logs:
        writer.writerow([
            log.created_at.isoformat(),
            log.admin_email,
            str(log.admin_id) if log.admin_id else "N/A",
            log.action,
            log.target_type or "",
            log.target_id or "",
            str(log.details) if log.details else "",
            log.ip_address or "",
            log.user_agent or ""
        ])
    
    # Prepare response
    output.seek(0)
    filename = f"admin_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.delete("/logs/purge")
@limiter.limit("5/hour")  # Very strict - only 5 purges per hour
async def purge_old_logs(
    request: Request,
    days: int = Query(365, ge=30, le=3650, description="Delete logs older than N days (min 30, max 3650)"),
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service)
):
    """
    Purge admin logs older than specified days (GDPR compliance).
    
    WARNING: This permanently deletes audit logs. Use with caution.
    Minimum retention period is 30 days. Default is 365 days (1 year).
    Rate limited to 5 requests per hour.
    
    SECURITY: This endpoint requires step-up authentication.
    Admins must call POST /admin/verify-password within the last 5 minutes.
    
    The purge action itself is logged before deletion occurs.
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.critical("Admin log purge initiated", extra={
            "admin_id": current_admin.id,
            "admin_email": current_admin.email,
            "days": days,
            "ip_address": ip_address
        })
        
        # Log the purge action BEFORE purging
        service.log_action(
            admin_id=current_admin.id,
            action="purge_audit_logs",
            details={"days": days, "reason": "GDPR compliance / retention policy"},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Perform purge
        cutoff = datetime.utcnow() - timedelta(days=days)
        deleted_count = service.repo.db.query(models.AdminLog).filter(
            models.AdminLog.created_at < cutoff
        ).delete()
        
        service.repo.db.commit()
        
        logger.critical("Admin log purge completed", extra={
            "admin_id": current_admin.id,
            "deleted_count": deleted_count,
            "days": days,
            "cutoff_date": cutoff.isoformat()
        })
        
        return {
            "success": True,
            "message": f"Purged {deleted_count} log entries older than {days} days",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff.isoformat()
        }
    except Exception as e:
        logger.error("Failed to purge admin logs", extra={
            "admin_id": current_admin.id,
            "days": days,
            "error": str(e)
        }, exc_info=True)
        raise
