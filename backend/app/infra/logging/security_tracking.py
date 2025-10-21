"""
Security event tracking for database-backed monitoring.
Integrates with existing security_logging.py for dual-layer security monitoring:
- File logging (operational): security.log for real-time monitoring
- Database tracking (admin dashboard): security_events table for historical analysis
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from uuid import UUID, uuid4

from ...db.models import SecurityEvent
from .security_logging import log_security_event


def log_security_event_db(
    db: Session,
    event_type: str,
    severity: str,
    ip_address: str,
    user_id: Optional[UUID] = None,
    email: Optional[str] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    action_taken: Optional[str] = None,
    request = None
) -> SecurityEvent:
    """
    Log a security event to the database.
    Also logs to file via existing security_logging.py
    
    Args:
        db: Database session
        event_type: Type of security event (e.g., 'failed_login', 'rate_limit_exceeded')
        severity: Severity level ('low', 'medium', 'high', 'critical')
        ip_address: IP address of the client
        user_id: User ID if authenticated
        email: Email address (useful for failed login attempts)
        endpoint: API endpoint
        method: HTTP method
        user_agent: User agent string
        details: Additional event-specific details (stored as JSON)
        action_taken: Action taken in response (e.g., 'blocked', 'throttled')
        request: Optional FastAPI request object for automatic context extraction
    
    Returns:
        SecurityEvent: The created security event record
    """
    try:
        # If request object provided, extract context
        if request:
            if not ip_address:
                ip_address = getattr(request.client, 'host', None) if hasattr(request, 'client') else None
            if not user_agent:
                user_agent = request.headers.get('user-agent') if hasattr(request, 'headers') else None
            if not endpoint:
                endpoint = str(request.url.path) if hasattr(request, 'url') else None
            if not method:
                method = request.method if hasattr(request, 'method') else None
        
        # Create security event record
        event = SecurityEvent(
            id=uuid4(),
            created_at=datetime.utcnow(),
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            email=email,
            endpoint=endpoint,
            method=method,
            ip_address=ip_address or 'unknown',
            user_agent=user_agent,
            details=details,
            action_taken=action_taken,
            resolved=False
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        # Also log to file via existing security logging
        log_security_event(
            event_type=event_type,
            details={
                'severity': severity,
                'user_id': str(user_id) if user_id else None,
                'email': email,
                'action_taken': action_taken,
                **(details or {})
            },
            request=request
        )
        
        return event
    except Exception as e:
        db.rollback()
        # Log to file even if database fails
        log_security_event(
            event_type=f"{event_type}_logging_failed",
            details={'error': str(e)},
            request=request
        )
        raise


def get_recent_security_events(
    db: Session,
    limit: int = 100,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    hours: Optional[int] = 24
) -> List[SecurityEvent]:
    """
    Get recent security events with optional filtering.
    
    Args:
        db: Database session
        limit: Maximum number of events to return
        event_type: Filter by event type
        severity: Filter by severity level
        resolved: Filter by resolution status
        hours: Only return events from the last N hours
    
    Returns:
        List of SecurityEvent records
    """
    query = db.query(SecurityEvent)
    
    # Time filter
    if hours:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(SecurityEvent.created_at >= cutoff)
    
    # Event type filter
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    
    # Severity filter
    if severity:
        query = query.filter(SecurityEvent.severity == severity)
    
    # Resolution filter
    if resolved is not None:
        query = query.filter(SecurityEvent.resolved == resolved)
    
    # Order by most recent first
    query = query.order_by(SecurityEvent.created_at.desc())
    
    return query.limit(limit).all()


def get_security_stats(
    db: Session,
    hours: int = 24
) -> Dict[str, Any]:
    """
    Get security event statistics for the specified time period.
    
    Args:
        db: Database session
        hours: Time period in hours to analyze
    
    Returns:
        Dictionary containing security statistics
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    # Total events by type
    events_by_type = db.query(
        SecurityEvent.event_type,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.created_at >= cutoff
    ).group_by(
        SecurityEvent.event_type
    ).all()
    
    # Events by severity
    events_by_severity = db.query(
        SecurityEvent.severity,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.created_at >= cutoff
    ).group_by(
        SecurityEvent.severity
    ).all()
    
    # Top offending IPs
    top_ips = db.query(
        SecurityEvent.ip_address,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.created_at >= cutoff
    ).group_by(
        SecurityEvent.ip_address
    ).order_by(
        func.count(SecurityEvent.id).desc()
    ).limit(10).all()
    
    # Unresolved critical/high events
    unresolved_critical = db.query(func.count(SecurityEvent.id)).filter(
        and_(
            SecurityEvent.created_at >= cutoff,
            SecurityEvent.severity.in_(['critical', 'high']),
            SecurityEvent.resolved == False
        )
    ).scalar()
    
    return {
        'time_period_hours': hours,
        'events_by_type': [{'event_type': et, 'count': c} for et, c in events_by_type],
        'events_by_severity': [{'severity': s, 'count': c} for s, c in events_by_severity],
        'top_ips': [{'ip_address': ip, 'count': c} for ip, c in top_ips],
        'unresolved_critical_high': unresolved_critical,
        'total_events': sum(c for _, c in events_by_type)
    }


def mark_security_event_resolved(
    db: Session,
    event_id: UUID,
    resolved_by: UUID,
    resolution_notes: Optional[str] = None
) -> SecurityEvent:
    """
    Mark a security event as resolved.
    
    Args:
        db: Database session
        event_id: ID of the security event to resolve
        resolved_by: User ID of admin resolving the event
        resolution_notes: Optional notes about the resolution
    
    Returns:
        Updated SecurityEvent record
    """
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise ValueError(f"Security event {event_id} not found")
    
    event.resolved = True
    event.resolved_at = datetime.utcnow()
    event.resolved_by = resolved_by
    event.resolution_notes = resolution_notes
    
    db.commit()
    db.refresh(event)
    
    return event


def get_failed_login_attempts(
    db: Session,
    email: Optional[str] = None,
    ip_address: Optional[str] = None,
    hours: int = 24,
    limit: int = 100
) -> List[SecurityEvent]:
    """
    Get failed login attempts with optional filtering by email or IP.
    
    Args:
        db: Database session
        email: Filter by email address
        ip_address: Filter by IP address
        hours: Only return attempts from the last N hours
        limit: Maximum number of results
    
    Returns:
        List of SecurityEvent records for failed logins
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    query = db.query(SecurityEvent).filter(
        and_(
            SecurityEvent.event_type == 'failed_login',
            SecurityEvent.created_at >= cutoff
        )
    )
    
    if email:
        query = query.filter(SecurityEvent.email == email)
    
    if ip_address:
        query = query.filter(SecurityEvent.ip_address == ip_address)
    
    query = query.order_by(SecurityEvent.created_at.desc())
    
    return query.limit(limit).all()


def get_rate_limit_violations(
    db: Session,
    endpoint: Optional[str] = None,
    ip_address: Optional[str] = None,
    hours: int = 24,
    limit: int = 100
) -> List[SecurityEvent]:
    """
    Get rate limit violations with optional filtering.
    
    Args:
        db: Database session
        endpoint: Filter by API endpoint
        ip_address: Filter by IP address
        hours: Only return violations from the last N hours
        limit: Maximum number of results
    
    Returns:
        List of SecurityEvent records for rate limit violations
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    query = db.query(SecurityEvent).filter(
        and_(
            SecurityEvent.event_type == 'rate_limit_exceeded',
            SecurityEvent.created_at >= cutoff
        )
    )
    
    if endpoint:
        query = query.filter(SecurityEvent.endpoint == endpoint)
    
    if ip_address:
        query = query.filter(SecurityEvent.ip_address == ip_address)
    
    query = query.order_by(SecurityEvent.created_at.desc())
    
    return query.limit(limit).all()
