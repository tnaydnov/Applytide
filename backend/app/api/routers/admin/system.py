"""
Admin system health endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import time

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin import dto

router = APIRouter(prefix="/system", tags=["admin-system"])

# Track startup time for uptime calculation
_startup_time = time.time()


@router.get("/database", response_model=dto.DatabaseHealthDTO)
def get_database_health(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get database health metrics and table counts.
    """
    # Count records in main tables
    users_count = db.scalar(select(func.count(models.User.id))) or 0
    applications_count = db.scalar(select(func.count(models.Application.id))) or 0
    jobs_count = db.scalar(select(func.count(models.Job.id))) or 0
    logs_count = db.scalar(select(func.count(models.ApplicationLog.id))) or 0
    sessions_count = db.scalar(select(func.count(models.RefreshToken.id))) or 0
    
    # Try to get database size (PostgreSQL specific)
    try:
        size_result = db.execute(
            text("SELECT pg_database_size(current_database()) as size")
        ).first()
        total_size_mb = (size_result.size / (1024 * 1024)) if size_result else 0.0
    except:
        total_size_mb = 0.0
    
    # Try to get table count
    try:
        table_count_result = db.execute(
            text("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'")
        ).first()
        table_count = table_count_result.count if table_count_result else 0
    except:
        table_count = 0
    
    return dto.DatabaseHealthDTO(
        total_size_mb=round(total_size_mb, 2),
        table_count=table_count,
        connection_pool_size=10,  # From your pool settings
        active_connections=1,  # Simplified
        users_count=users_count,
        applications_count=applications_count,
        jobs_count=jobs_count,
        logs_count=logs_count,
        sessions_count=sessions_count
    )


@router.get("/storage", response_model=dto.StorageUsageDTO)
def get_storage_usage(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get storage usage breakdown.
    """
    # Count documents
    total_documents = db.scalar(select(func.count(models.Document.id))) or 0
    
    # Try to get total file sizes
    try:
        size_result = db.execute(
            select(func.sum(models.Document.file_size))
        ).scalar()
        total_size_mb = (size_result / (1024 * 1024)) if size_result else 0.0
    except:
        total_size_mb = 0.0
    
    # Count users with documents
    documents_by_user = db.scalar(
        select(func.count(func.distinct(models.Document.user_id)))
    ) or 0
    
    # Count users with avatars
    avatars_count = db.scalar(
        select(func.count(models.User.id))
        .where(models.User.avatar_url.isnot(None))
    ) or 0
    
    return dto.StorageUsageDTO(
        total_documents=total_documents,
        total_size_mb=round(total_size_mb, 2),
        documents_by_user=documents_by_user,
        avatars_count=avatars_count
    )


@router.get("/api", response_model=dto.APIHealthDTO)
def get_api_health(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get API health metrics.
    """
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    
    # Uptime since startup
    uptime_seconds = time.time() - _startup_time
    
    # Count requests in last hour (from logs)
    requests_last_hour = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(models.ApplicationLog.timestamp >= one_hour_ago)
    ) or 0
    
    # Count errors in last hour
    errors_last_hour = db.scalar(
        select(func.count(models.ApplicationLog.id))
        .where(
            models.ApplicationLog.timestamp >= one_hour_ago,
            models.ApplicationLog.level.in_(["ERROR", "CRITICAL"])
        )
    ) or 0
    
    # Calculate average response time (from logs with duration)
    try:
        avg_duration = db.scalar(
            select(func.avg(models.ApplicationLog.duration_ms))
            .where(
                models.ApplicationLog.timestamp >= one_hour_ago,
                models.ApplicationLog.duration_ms.isnot(None)
            )
        )
        avg_response_time_ms = round(avg_duration, 2) if avg_duration else 0.0
    except:
        avg_response_time_ms = 0.0
    
    # Determine status
    if errors_last_hour > 50:
        status_value = "down"
    elif errors_last_hour > 10:
        status_value = "degraded"
    else:
        status_value = "healthy"
    
    return dto.APIHealthDTO(
        status=status_value,
        uptime_seconds=round(uptime_seconds, 2),
        requests_last_hour=requests_last_hour,
        errors_last_hour=errors_last_hour,
        avg_response_time_ms=avg_response_time_ms
    )
