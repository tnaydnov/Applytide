"""
Admin System Health Monitoring Endpoints

Provides comprehensive system health monitoring and resource usage tracking.
This module contains endpoints for:
- Database health metrics (size, connections, table counts)
- Storage usage tracking (documents, uploads, avatars)
- API health monitoring (uptime, request rates, error rates)

All endpoints require admin authentication via get_admin_user dependency.

System health includes:
- Database: PostgreSQL metrics, connection pool status, record counts
- Storage: Document storage, file counts, user uploads
- API: Uptime, request/error rates, response time performance

Use cases:
- Infrastructure monitoring and capacity planning
- Performance optimization and bottleneck identification
- Alerting and incident response
- Compliance reporting (resource usage, uptime SLAs)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import time

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter(prefix="/system", tags=["admin-system"])
logger = get_logger(__name__)

# Track startup time for uptime calculation
_startup_time = time.time()


@router.get("/database", response_model=dto.DatabaseHealthDTO)
def get_database_health(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve comprehensive database health metrics and statistics.
    
    Provides detailed database metrics including size, connection pool
    status, and record counts for all major tables. Essential for
    capacity planning and database performance monitoring.
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        DatabaseHealthDTO: Database metrics containing:
            - total_size_mb: Total database size in megabytes
            - table_count: Number of tables in public schema
            - connection_pool_size: Configured connection pool size
            - active_connections: Current active connections (simplified)
            - users_count: Total registered users
            - applications_count: Total job applications
            - jobs_count: Total job postings
            - logs_count: Total application logs
            - sessions_count: Total refresh tokens (active + expired)
            
    Raises:
        HTTPException: 500 if health metrics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Database size query is PostgreSQL-specific
        - Falls back to 0.0 if size query fails (non-PostgreSQL)
        - Table count includes only public schema tables
        - Record counts query all major application tables
        - Connection pool metrics are simplified (hardcoded from config)
        - Use for: capacity planning, growth tracking, database monitoring
        
    Example:
        GET /api/admin/system/database
        Returns comprehensive database health metrics
    """
    try:
        logger.debug(
            "Admin fetching database health",
            extra={"admin_id": str(admin_user.id)}
        )
        
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
        except Exception as e:
            logger.warning(
                "Failed to fetch database size",
                extra={"error": str(e)}
            )
            total_size_mb = 0.0
        
        # Try to get table count
        try:
            table_count_result = db.execute(
                text("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'")
            ).first()
            table_count = table_count_result.count if table_count_result else 0
        except Exception as e:
            logger.warning(
                "Failed to fetch table count",
                extra={"error": str(e)}
            )
            table_count = 0
        
        health = dto.DatabaseHealthDTO(
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
        
        logger.info(
            "Database health retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "users_count": users_count,
                "applications_count": applications_count
            }
        )
        
        return health
        
    except Exception as e:
        logger.error(
            "Error fetching database health",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch database health metrics"
        )


@router.get("/storage", response_model=dto.StorageUsageDTO)
def get_storage_usage(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve storage usage statistics and document counts.
    
    Provides breakdown of storage consumption across different
    file types (documents, avatars). Essential for storage capacity
    planning and cost management.
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        StorageUsageDTO: Storage metrics containing:
            - total_documents: Count of uploaded documents (resumes)
            - total_size_mb: Total storage size in megabytes
                (currently 0.0 - file size not tracked in Resume model)
            - documents_by_user: Count of unique users with documents
            - avatars_count: Count of users with avatar uploads
            
    Raises:
        HTTPException: 500 if storage metrics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - total_size_mb is currently 0.0 (Resume model doesn't track file size)
        - total_documents counts Resume table records
        - documents_by_user uses distinct user_id count
        - avatars_count checks for non-null avatar_url in User table
        - Consider adding file size tracking for accurate storage metrics
        - Use for: storage capacity planning, user upload analysis
        
    Example:
        GET /api/admin/system/storage
        Returns storage usage breakdown
    """
    try:
        logger.debug(
            "Admin fetching storage usage",
            extra={"admin_id": str(admin_user.id)}
        )
        
        # Count resumes (documents)
        total_documents = db.scalar(select(func.count(models.Resume.id))) or 0
        
        # File size not available in Resume model, set to 0
        total_size_mb = 0.0
        
        # Count users with resumes
        documents_by_user = db.scalar(
            select(func.count(func.distinct(models.Resume.user_id)))
        ) or 0
        
        # Count users with avatars
        avatars_count = db.scalar(
            select(func.count(models.User.id))
            .where(models.User.avatar_url.isnot(None))
        ) or 0
        
        storage = dto.StorageUsageDTO(
            total_documents=total_documents,
            total_size_mb=round(total_size_mb, 2),
            documents_by_user=documents_by_user,
            avatars_count=avatars_count
        )
        
        logger.info(
            "Storage usage retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_documents": total_documents,
                "avatars_count": avatars_count
            }
        )
        
        return storage
        
    except Exception as e:
        logger.error(
            "Error fetching storage usage",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch storage usage metrics"
        )


@router.get("/api", response_model=dto.APIHealthDTO)
def get_api_health(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve API health status and performance metrics.
    
    Provides real-time API health monitoring including uptime,
    request/error rates, and performance metrics. Essential for
    incident detection and performance optimization.
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        APIHealthDTO: API health metrics containing:
            - status: Overall health status
                - "healthy": < 10 errors/hour
                - "degraded": 10-50 errors/hour
                - "down": > 50 errors/hour
            - uptime_seconds: Time since service startup
            - requests_last_hour: Total logged requests in last 60 minutes
            - errors_last_hour: Count of ERROR/CRITICAL logs in last 60 minutes
            - avg_response_time_ms: Average response time in milliseconds
                (calculated from logs with duration_ms field)
                
    Raises:
        HTTPException: 500 if health metrics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Uptime is tracked since service startup (_startup_time global)
        - Request/error counts are derived from ApplicationLog table
        - Only logs with level ERROR or CRITICAL count as errors
        - Response time averages logs with non-null duration_ms
        - Status thresholds: healthy (<10), degraded (10-50), down (>50 errors/hr)
        - Falls back to 0.0 for avg_response_time_ms if calculation fails
        - Use for: real-time health monitoring, alerting, SLA tracking
        
    Example:
        GET /api/admin/system/api
        Returns current API health status and metrics
    """
    try:
        logger.debug(
            "Admin fetching API health",
            extra={"admin_id": str(admin_user.id)}
        )
        
        now = datetime.now(timezone.utc)
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
        except Exception as e:
            logger.warning(
                "Failed to calculate average response time",
                extra={"error": str(e)}
            )
            avg_response_time_ms = 0.0
        
        # Determine status
        if errors_last_hour > 50:
            status_value = "down"
        elif errors_last_hour > 10:
            status_value = "degraded"
        else:
            status_value = "healthy"
        
        health = dto.APIHealthDTO(
            status=status_value,
            uptime_seconds=round(uptime_seconds, 2),
            requests_last_hour=requests_last_hour,
            errors_last_hour=errors_last_hour,
            avg_response_time_ms=avg_response_time_ms
        )
        
        logger.info(
            "API health retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "status": status_value,
                "errors_last_hour": errors_last_hour
            }
        )
        
        return health
        
    except Exception as e:
        logger.error(
            "Error fetching API health",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch API health metrics"
        )
