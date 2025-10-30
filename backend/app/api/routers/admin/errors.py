"""
Admin Error Monitoring Endpoints

Provides comprehensive error tracking and analysis for the admin panel.
This module contains endpoints for:
- Paginated error log listing with advanced filtering
- Error summary statistics and trends
- Detailed error inspection with full metadata

All endpoints require admin authentication via get_admin_user dependency.

Error logs are sourced from the ApplicationLog table and include:
- Error level (ERROR, CRITICAL, WARNING)
- Timestamp, endpoint, and HTTP status code
- User context (if authenticated request)
- Full stack traces and metadata
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin import dto
from app.infra.logging import get_logger

# Router configuration
router = APIRouter(prefix="/errors", tags=["admin-errors"])
logger = get_logger(__name__)


@router.get("", response_model=dto.PaginatedErrorsDTO)
def list_errors(
    page: int = 1,
    page_size: int = 20,
    level: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    endpoint: Optional[str] = None,
    hours: Optional[int] = None,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List error logs with advanced filtering and pagination.
    
    Provides comprehensive error monitoring with multiple filter options.
    Only returns logs with level ERROR, CRITICAL, or WARNING.
    
    Query Parameters:
        page (int): Page number, starting from 1 (default: 1)
        page_size (int): Items per page, range 1-100 (default: 20)
        level (str): Filter by severity - 'ERROR', 'CRITICAL', or 'WARNING'
        user_id (UUID): Filter errors by specific user ID
        endpoint (str): Filter by API endpoint (partial match, case-insensitive)
        hours (int): Only show errors from last N hours
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        PaginatedErrorsDTO: Paginated list of error logs with metadata:
            - items: List of error records with user info
            - total: Total count of matching errors
            - page: Current page number
            - page_size: Items per page
            - total_pages: Total pages available
            
    Raises:
        HTTPException: 500 if error logs cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Example:
        GET /api/admin/errors?level=CRITICAL&hours=24
        Returns all critical errors from the last 24 hours
    """
    try:
        # Validate and normalize pagination parameters
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100  # Cap at 100 for performance
        
        # Log the request with all filters for audit trail
        logger.debug(
            "Admin listing errors",
            extra={
                "admin_id": str(admin_user.id),
                "page": page,
                "page_size": page_size,
                "filters": {
                    "level": level,
                    "user_id": str(user_id) if user_id else None,
                    "endpoint": endpoint,
                    "hours": hours
                }
            }
        )
    
        # Build base query - only error-level logs
        stmt = select(models.ApplicationLog).where(
            models.ApplicationLog.level.in_(["ERROR", "CRITICAL", "WARNING"])
        )
        
        # Apply optional filters dynamically
        if level:
            stmt = stmt.where(models.ApplicationLog.level == level.upper())
        
        if user_id:
            stmt = stmt.where(models.ApplicationLog.user_id == user_id)
        
        if endpoint:
            # Case-insensitive partial match for endpoint
            stmt = stmt.where(models.ApplicationLog.endpoint.ilike(f"%{endpoint}%"))
        
        if hours:
            # Time-based filter - last N hours
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            stmt = stmt.where(models.ApplicationLog.timestamp >= cutoff)
        
        # Get total count for pagination metadata
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0
        
        # Apply ordering (newest first) and pagination
        stmt = stmt.order_by(desc(models.ApplicationLog.timestamp))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        # Execute query
        logs = db.scalars(stmt).all()
        
        # Build response DTOs with user email enrichment
        items = []
        for log in logs:
            # Enrich with user email if available
            user_email = None
            if log.user_id:
                user = db.get(models.User, log.user_id)
                user_email = user.email if user else None
            
            items.append(dto.ErrorLogDTO(
                id=log.id,
                timestamp=log.timestamp,
                level=log.level,
                message=log.message,
                user_id=log.user_id,
                user_email=user_email,
                endpoint=log.endpoint,
                status_code=log.status_code
            ))
        
        # Log successful retrieval with metrics
        logger.info(
            "Error logs retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_errors": total,
                "returned_count": len(items)
            }
        )
        
        return dto.PaginatedErrorsDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        )
        
    except Exception as e:
        # Log error with full context
        logger.error(
            "Error retrieving error logs",
            extra={
                "admin_id": str(admin_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error logs"
        )


@router.get("/summary", response_model=dto.ErrorSummaryDTO)
def get_error_summary(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve error summary statistics across all severity levels.
    
    Provides aggregated counts of errors for system health monitoring:
    - Total errors (all time)
    - Breakdown by severity (CRITICAL, ERROR, WARNING)
    - Time-based trends (today and this week)
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        ErrorSummaryDTO: Statistics object containing:
            - total_errors: Total ERROR + CRITICAL count (all time)
            - critical_count: Count of CRITICAL level errors
            - error_count: Count of ERROR level errors  
            - warning_count: Count of WARNING level errors
            - errors_today: Errors since midnight today
            - errors_this_week: Errors in last 7 days
            
    Raises:
        HTTPException: 500 if summary cannot be calculated
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Useful for health dashboard KPIs
        - WARNING level is tracked separately from ERROR/CRITICAL
    """
    try:
        # Log the request
        logger.debug(
            "Admin fetching error summary",
            extra={"admin_id": str(admin_user.id)}
        )
        
        # Calculate time boundaries
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        # Count total errors (ERROR + CRITICAL only)
        total_errors = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]))
        ) or 0
        
        # Count by severity level
        critical_count = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(models.ApplicationLog.level == "CRITICAL")
        ) or 0
        
        error_count = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(models.ApplicationLog.level == "ERROR")
        ) or 0
        
        warning_count = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(models.ApplicationLog.level == "WARNING")
        ) or 0
        
        # Count errors in time windows
        errors_today = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(
                and_(
                    models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                    models.ApplicationLog.timestamp >= today_start
                )
            )
        ) or 0
        
        errors_this_week = db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(
                and_(
                    models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                    models.ApplicationLog.timestamp >= week_start
                )
            )
        ) or 0
        
        # Build summary DTO
        summary = dto.ErrorSummaryDTO(
            total_errors=total_errors,
            critical_count=critical_count,
            error_count=error_count,
            warning_count=warning_count,
            errors_today=errors_today,
            errors_this_week=errors_this_week
        )
        
        # Log successful retrieval with key metrics
        logger.info(
            "Error summary retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_errors": total_errors,
                "critical_count": critical_count
            }
        )
        
        return summary
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error fetching error summary",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch error summary"
        )


@router.get("/{log_id}")
def get_error_detail(
    log_id: uuid.UUID,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve detailed error log with complete metadata.
    
    Fetches a single error log entry with all associated information
    including user context, request details, and full error metadata.
    Useful for deep-dive error investigation.
    
    Path Parameters:
        log_id (UUID): Unique identifier of the error log entry
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Complete error log details including:
            - id: Log entry UUID
            - timestamp: When the error occurred
            - level: Severity level (ERROR/CRITICAL/WARNING)
            - message: Error message text
            - endpoint: API endpoint where error occurred
            - method: HTTP method (GET/POST/etc)
            - status_code: HTTP status code returned
            - user_id: User ID if authenticated request
            - user: User object with email and role (if available)
            - ip_address: Client IP address
            - user_agent: Client user agent string
            - duration_ms: Request duration in milliseconds
            - metadata: Full JSON metadata with stack traces
            
    Raises:
        HTTPException: 404 if log entry not found
        HTTPException: 500 if error details cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - User info enrichment is best-effort (fails gracefully)
        - Metadata field contains full stack traces for debugging
        - Useful for investigating production incidents
    """
    try:
        # Log the request for audit trail
        logger.debug(
            "Admin fetching error detail",
            extra={"admin_id": str(admin_user.id), "log_id": str(log_id)}
        )
        
        # Fetch log entry
        log = db.get(models.ApplicationLog, log_id)
        if not log:
            logger.warning(
                "Error log not found",
                extra={"admin_id": str(admin_user.id), "log_id": str(log_id)}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        # Enrich with user information (best-effort)
        user_info = None
        if log.user_id:
            try:
                user = db.get(models.User, log.user_id)
                if user:
                    user_info = {
                        "id": user.id,
                        "email": user.email,
                        "role": user.role
                    }
            except Exception as e:
                # Log warning but continue (user info is supplementary)
                logger.warning(
                    "Failed to fetch user info for error log",
                    extra={"log_id": str(log_id), "user_id": str(log.user_id), "error": str(e)}
                )
        
        # Log successful retrieval
        logger.info(
            "Error detail retrieved",
            extra={"admin_id": str(admin_user.id), "log_id": str(log_id)}
        )
        
        # Return complete error details
        return {
            "id": log.id,
            "timestamp": log.timestamp,
            "level": log.level,
            "message": log.message,
            "endpoint": log.endpoint,
            "method": log.method,
            "status_code": log.status_code,
            "user_id": log.user_id,
            "user": user_info,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "duration_ms": log.duration_ms,
            "metadata": log.metadata  # Full JSON metadata with stack traces
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (404) without modification
        raise
    except Exception as e:
        # Log unexpected errors with full context
        logger.error(
            "Error fetching error detail",
            extra={
                "admin_id": str(admin_user.id),
                "log_id": str(log_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch error detail"
        )
    except Exception as e:
        logger.error(
            "Error fetching error detail",
            extra={
                "admin_id": str(admin_user.id),
                "log_id": str(log_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch error detail"
        )
