"""
Error tracking utility for logging application errors to database
"""
import traceback
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from ...db import models
from ..logging import get_logger

logger = get_logger(__name__)


def log_error(
    db: Session,
    error: Exception,
    user_id: Optional[uuid.UUID] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    service: Optional[str] = None,
    severity: str = "error"
) -> Optional[models.ErrorLog]:
    """
    Log an error to the database
    
    Args:
        db: Database session
        error: The exception that occurred
        user_id: Optional user UUID
        endpoint: API endpoint where error occurred
        method: HTTP method (GET, POST, etc.)
        status_code: HTTP status code
        ip_address: Client IP address
        user_agent: Client user agent
        service: Service/module name (e.g., 'auth', 'documents')
        severity: Error severity ('critical', 'error', 'warning')
    
    Returns:
        ErrorLog instance or None on failure
    """
    try:
        error_log = models.ErrorLog(
            id=uuid.uuid4(),
            created_at=datetime.now(timezone.utc),
            user_id=user_id,
            error_type=type(error).__name__,
            error_message=str(error)[:5000],  # Limit message length
            stack_trace=traceback.format_exc()[:10000],  # Limit stack trace
            endpoint=endpoint[:500] if endpoint else None,
            method=method,
            status_code=status_code,
            ip_address=ip_address[:50] if ip_address else None,
            user_agent=user_agent[:500] if user_agent else None,
            service=service[:100] if service else None,
            severity=severity,
            resolved=False
        )
        
        db.add(error_log)
        db.commit()
        db.refresh(error_log)
        
        logger.info("Error logged to database", extra={
            "error_id": str(error_log.id),
            "error_type": error_log.error_type,
            "severity": severity,
            "endpoint": endpoint,
            "user_id": str(user_id) if user_id else None
        })
        
        return error_log
    
    except Exception as e:
        logger.error("Failed to log error to database", extra={
            "error": str(e),
            "original_error": str(error)
        })
        db.rollback()
        return None


def get_recent_errors(
    db: Session,
    limit: int = 100,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    service: Optional[str] = None
) -> list[models.ErrorLog]:
    """
    Get recent errors from database
    
    Args:
        db: Database session
        limit: Maximum number of errors to return
        severity: Filter by severity
        resolved: Filter by resolution status
        service: Filter by service name
    
    Returns:
        List of ErrorLog instances
    """
    try:
        query = db.query(models.ErrorLog)
        
        if severity:
            query = query.filter(models.ErrorLog.severity == severity)
        
        if resolved is not None:
            query = query.filter(models.ErrorLog.resolved == resolved)
        
        if service:
            query = query.filter(models.ErrorLog.service == service)
        
        errors = query.order_by(
            models.ErrorLog.created_at.desc()
        ).limit(limit).all()
        
        return errors
    
    except Exception as e:
        logger.error("Failed to get recent errors", extra={"error": str(e)})
        return []


def get_error_stats(db: Session, hours: int = 24) -> dict:
    """
    Get error statistics for the specified time period
    
    Args:
        db: Database session
        hours: Number of hours to look back
    
    Returns:
        Dict with error statistics
    """
    try:
        from datetime import timedelta
        from sqlalchemy import func
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Total errors
        total_errors = db.query(models.ErrorLog).filter(
            models.ErrorLog.created_at >= cutoff
        ).count()
        
        # By severity
        by_severity = {}
        severity_results = db.query(
            models.ErrorLog.severity,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff
        ).group_by(models.ErrorLog.severity).all()
        
        for severity, count in severity_results:
            by_severity[severity] = count
        
        # By service
        by_service = {}
        service_results = db.query(
            models.ErrorLog.service,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.service.isnot(None)
        ).group_by(models.ErrorLog.service).all()
        
        for service, count in service_results:
            by_service[service or 'unknown'] = count
        
        # By endpoint (top 10)
        by_endpoint = {}
        endpoint_results = db.query(
            models.ErrorLog.endpoint,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.endpoint.isnot(None)
        ).group_by(models.ErrorLog.endpoint).order_by(
            func.count(models.ErrorLog.id).desc()
        ).limit(10).all()
        
        for endpoint, count in endpoint_results:
            by_endpoint[endpoint or 'unknown'] = count
        
        # Unresolved count
        unresolved = db.query(models.ErrorLog).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.resolved == False
        ).count()
        
        return {
            "total_errors": total_errors,
            "unresolved": unresolved,
            "by_severity": by_severity,
            "by_service": by_service,
            "by_endpoint": by_endpoint,
            "time_period_hours": hours
        }
    
    except Exception as e:
        logger.error("Failed to get error stats", extra={"error": str(e)})
        return {
            "total_errors": 0,
            "unresolved": 0,
            "by_severity": {},
            "by_service": {},
            "by_endpoint": {},
            "time_period_hours": hours
        }


def mark_error_resolved(
    db: Session,
    error_id: uuid.UUID,
    resolved_by: uuid.UUID,
    resolution_notes: Optional[str] = None
) -> bool:
    """
    Mark an error as resolved
    
    Args:
        db: Database session
        error_id: Error log UUID
        resolved_by: Admin user UUID who resolved it
        resolution_notes: Optional notes about the resolution
    
    Returns:
        True if successful, False otherwise
    """
    try:
        error_log = db.query(models.ErrorLog).filter(
            models.ErrorLog.id == error_id
        ).first()
        
        if not error_log:
            return False
        
        error_log.resolved = True
        error_log.resolved_at = datetime.now(timezone.utc)
        error_log.resolved_by = resolved_by
        error_log.resolution_notes = resolution_notes
        
        db.commit()
        
        logger.info("Error marked as resolved", extra={
            "error_id": str(error_id),
            "resolved_by": str(resolved_by)
        })
        
        return True
    
    except Exception as e:
        logger.error("Failed to mark error as resolved", extra={
            "error_id": str(error_id),
            "error": str(e)
        })
        db.rollback()
        return False
