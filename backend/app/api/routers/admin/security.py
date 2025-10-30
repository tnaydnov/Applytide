"""
Admin Security Monitoring Endpoints

Provides comprehensive security event tracking and threat monitoring.
This module contains endpoints for:
- Security statistics (failed logins, rate limits, suspicious activity)
- Security event timeline with detailed context
- Threat detection and pattern analysis

All endpoints require admin authentication via get_admin_user dependency.

Security events tracked include:
- Failed login attempts (potential brute force)
- Rate limit violations (potential DoS)
- Token revocations (compromised sessions)
- Suspicious activity patterns (anomaly detection)
- Account lockouts and security policy violations
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

# Router configuration
router = APIRouter(prefix="/security", tags=["admin-security"])
logger = get_logger(__name__)


@router.get("/stats", response_model=dto.SecurityStatsDTO)
async def get_security_stats(
    hours: int = Query(24, description="Time window in hours"),
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve security statistics for threat monitoring.
    
    Provides aggregated counts of security events within the specified
    time window. Essential for identifying attack patterns and security
    incidents.
    
    Query Parameters:
        hours (int): Time window in hours (default: 24)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        SecurityStatsDTO: Statistics object containing:
            - failed_logins: Count of failed authentication attempts
            - rate_limit_violations: Count of rate limit hits
            - token_revocations: Count of manually revoked sessions
            - suspicious_activity: Count of detected anomalies
            - blocked_ips: Count of IP addresses blocked
            - account_lockouts: Count of accounts temporarily locked
            
    Raises:
        HTTPException: 500 if statistics cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - High failed_logins may indicate brute force attacks
        - Rate limit violations suggest potential DoS attempts
        - Use for real-time security monitoring dashboard
        - Correlate with error logs for incident investigation
    """
    try:
        # Log the request
        logger.debug(
            "Admin fetching security stats",
            extra={"admin_id": str(admin_user.id), "hours": hours}
        )
        
        # Fetch statistics from service
        admin_service = AdminService(db)
        stats = admin_service.get_security_stats(hours=hours)
        
        # Log successful retrieval with key security metrics
        logger.info(
            "Security stats retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "failed_logins": stats.failed_logins,
                "rate_limit_violations": stats.rate_limit_violations
            }
        )
        
        return stats
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error fetching security stats",
            extra={"admin_id": str(admin_user.id), "hours": hours, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch security statistics"
        )


@router.get("/events")
async def get_security_events(
    hours: Optional[int] = Query(24, description="Time window in hours"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated list of security events with filtering.
    
    Returns detailed security event records for investigation and
    compliance auditing. Each event includes full context (user, IP,
    timestamp, details).
    
    Query Parameters:
        hours (int): Time window in hours (default: 24, null for all)
        event_type (str): Filter by specific event type:
            - 'failed_login': Failed authentication attempts
            - 'rate_limit_exceeded': Rate limit violations
            - 'token_revoked': Manual session terminations
            - 'suspicious_activity': Detected suspicious patterns
        page (int): Page number, starting from 1 (default: 1)
        page_size (int): Items per page, range 1-100 (default: 50)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict or PaginatedSecurityEventsDTO: Paginated list containing:
            - items: List of security event records
            - total: Total count of matching events
            - page: Current page number
            - page_size: Items per page
            - total_pages: Total pages available
            
    Raises:
        HTTPException: 500 if events cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Events are sorted by timestamp (newest first)
        - Includes IP address and user agent for forensics
        - Use for compliance reporting and incident response
        - Correlate with application logs for full context
        
    Example:
        GET /api/admin/security/events?event_type=failed_login&hours=1
        Returns failed login attempts from the last hour
    """
    try:
        # Log the request with filters
        logger.debug(
            "Admin fetching security events",
            extra={
                "admin_id": str(admin_user.id),
                "hours": hours,
                "event_type": event_type,
                "page": page,
                "page_size": page_size
            }
        )
        
        # Fetch events from service
        admin_service = AdminService(db)
        events = admin_service.get_security_events(
            hours=hours,
            event_type=event_type,
            page=page,
            page_size=page_size
        )
        
        # Log successful retrieval
        logger.info(
            "Security events retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "event_count": len(events) if isinstance(events, list) else events.get('total', 0)
            }
        )
        
        return events
        
    except Exception as e:
        # Log error with full context
        logger.error(
            "Error fetching security events",
            extra={
                "admin_id": str(admin_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch security events"
        )
