"""
Security monitoring models and tracking
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...db import models
from ..logging import get_logger

logger = get_logger(__name__)


def track_failed_login(
    db: Session,
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    failure_reason: str = "invalid_credentials"
) -> bool:
    """
    Track a failed login attempt by logging it as an error
    
    Args:
        db: Database session
        email: Email address used in login attempt
        ip_address: Client IP address
        user_agent: Client user agent
        failure_reason: Reason for failure
    
    Returns:
        True if logged successfully
    """
    try:
        from ...infra.logging.error_tracking import log_error
        
        # Create a pseudo-exception for tracking
        error = Exception(f"Failed login attempt for {email}: {failure_reason}")
        
        log_error(
            db=db,
            error=error,
            endpoint="/api/auth/login",
            method="POST",
            status_code=401,
            ip_address=ip_address,
            user_agent=user_agent,
            service="auth",
            severity="warning"
        )
        
        logger.warning("Failed login tracked", extra={
            "email": email,
            "ip_address": ip_address,
            "reason": failure_reason
        })
        
        return True
    
    except Exception as e:
        logger.error("Failed to track failed login", extra={"error": str(e)})
        return False


def get_failed_login_stats(db: Session, hours: int = 24) -> Dict[str, Any]:
    """
    Get statistics on failed login attempts
    
    Args:
        db: Database session
        hours: Number of hours to look back
    
    Returns:
        Dict with failed login statistics
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Count failed logins
        total_failed = db.query(models.ErrorLog).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.endpoint == "/api/auth/login",
            models.ErrorLog.status_code == 401
        ).count()
        
        # By IP address (top 10)
        by_ip = {}
        ip_results = db.query(
            models.ErrorLog.ip_address,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.endpoint == "/api/auth/login",
            models.ErrorLog.status_code == 401,
            models.ErrorLog.ip_address.isnot(None)
        ).group_by(models.ErrorLog.ip_address).order_by(
            func.count(models.ErrorLog.id).desc()
        ).limit(10).all()
        
        for ip, count in ip_results:
            by_ip[ip] = count
        
        # Recent attempts
        recent_attempts = db.query(models.ErrorLog).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.endpoint == "/api/auth/login",
            models.ErrorLog.status_code == 401
        ).order_by(models.ErrorLog.created_at.desc()).limit(20).all()
        
        return {
            "total_failed_logins": total_failed,
            "by_ip_address": by_ip,
            "recent_attempts": [
                {
                    "timestamp": attempt.created_at.isoformat(),
                    "ip_address": attempt.ip_address,
                    "user_agent": attempt.user_agent,
                    "error_message": attempt.error_message
                }
                for attempt in recent_attempts
            ],
            "time_period_hours": hours
        }
    
    except Exception as e:
        logger.error("Failed to get failed login stats", extra={"error": str(e)})
        return {
            "total_failed_logins": 0,
            "by_ip_address": {},
            "recent_attempts": [],
            "time_period_hours": hours
        }


def get_rate_limit_stats(db: Session, hours: int = 24) -> Dict[str, Any]:
    """
    Get statistics on rate limit violations
    
    Args:
        db: Database session
        hours: Number of hours to look back
    
    Returns:
        Dict with rate limit statistics
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Count rate limit errors (429 status)
        total_rate_limits = db.query(models.ErrorLog).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.status_code == 429
        ).count()
        
        # By endpoint
        by_endpoint = {}
        endpoint_results = db.query(
            models.ErrorLog.endpoint,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.status_code == 429,
            models.ErrorLog.endpoint.isnot(None)
        ).group_by(models.ErrorLog.endpoint).order_by(
            func.count(models.ErrorLog.id).desc()
        ).limit(10).all()
        
        for endpoint, count in endpoint_results:
            by_endpoint[endpoint] = count
        
        # By IP address
        by_ip = {}
        ip_results = db.query(
            models.ErrorLog.ip_address,
            func.count(models.ErrorLog.id)
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.status_code == 429,
            models.ErrorLog.ip_address.isnot(None)
        ).group_by(models.ErrorLog.ip_address).order_by(
            func.count(models.ErrorLog.id).desc()
        ).limit(10).all()
        
        for ip, count in ip_results:
            by_ip[ip] = count
        
        return {
            "total_rate_limits": total_rate_limits,
            "by_endpoint": by_endpoint,
            "by_ip_address": by_ip,
            "time_period_hours": hours
        }
    
    except Exception as e:
        logger.error("Failed to get rate limit stats", extra={"error": str(e)})
        return {
            "total_rate_limits": 0,
            "by_endpoint": {},
            "by_ip_address": {},
            "time_period_hours": hours
        }


def get_suspicious_activity(db: Session, hours: int = 24) -> Dict[str, Any]:
    """
    Detect suspicious activity patterns
    
    Args:
        db: Database session
        hours: Number of hours to look back
    
    Returns:
        Dict with suspicious activity indicators
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # IPs with multiple failed logins
        suspicious_ips = db.query(
            models.ErrorLog.ip_address,
            func.count(models.ErrorLog.id).label('count')
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.endpoint == "/api/auth/login",
            models.ErrorLog.status_code == 401,
            models.ErrorLog.ip_address.isnot(None)
        ).group_by(models.ErrorLog.ip_address).having(
            func.count(models.ErrorLog.id) >= 5  # 5+ failed attempts
        ).all()
        
        # IPs hitting rate limits frequently
        rate_limit_ips = db.query(
            models.ErrorLog.ip_address,
            func.count(models.ErrorLog.id).label('count')
        ).filter(
            models.ErrorLog.created_at >= cutoff,
            models.ErrorLog.status_code == 429,
            models.ErrorLog.ip_address.isnot(None)
        ).group_by(models.ErrorLog.ip_address).having(
            func.count(models.ErrorLog.id) >= 10  # 10+ rate limit hits
        ).all()
        
        return {
            "ips_with_multiple_failed_logins": [
                {"ip_address": ip, "failed_attempts": count}
                for ip, count in suspicious_ips
            ],
            "ips_hitting_rate_limits": [
                {"ip_address": ip, "rate_limit_hits": count}
                for ip, count in rate_limit_ips
            ],
            "time_period_hours": hours
        }
    
    except Exception as e:
        logger.error("Failed to detect suspicious activity", extra={"error": str(e)})
        return {
            "ips_with_multiple_failed_logins": [],
            "ips_hitting_rate_limits": [],
            "time_period_hours": hours
        }
