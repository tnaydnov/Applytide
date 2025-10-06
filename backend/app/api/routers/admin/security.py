# backend/app/api/routers/admin/security.py
"""Security monitoring"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.security_service import SecurityAdminService
from ....infra.cache.service import CacheService, get_cache_service
from ....infra.logging import get_logger
from ....infra.logging.security_logging import log_security_event


router = APIRouter(tags=["admin-security"])
logger = get_logger(__name__)

# Failed login tracking, IP blacklist management, session monitoring

class SecurityStatsResponse(BaseModel):
    failed_logins_24h: int
    failed_logins_7d: int
    blocked_ips_count: int
    suspicious_activities_24h: int
    active_sessions_count: int


class FailedLoginResponse(BaseModel):
    email: str
    ip_address: str
    timestamp: datetime
    reason: str
    user_agent: Optional[str]


class BlockedIPResponse(BaseModel):
    ip_address: str
    reason: str
    blocked_at: datetime
    blocked_by_admin_id: Optional[str]
    expires_at: Optional[datetime]
    failed_attempts: int


class ActiveSessionResponse(BaseModel):
    user_id: str
    user_email: str
    ip_address: Optional[str]
    last_activity: datetime
    session_started: datetime
    user_agent: Optional[str]


class BlockIPRequest(BaseModel):
    ip_address: str = Field(..., pattern=r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
    reason: str = Field(..., min_length=10, max_length=500)
    duration_hours: Optional[int] = Field(default=None, ge=1, le=8760)  # Max 1 year


class UnblockIPRequest(BaseModel):
    ip_address: str = Field(..., pattern=r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
    justification: str = Field(..., min_length=10, max_length=500)


@router.get(
    "/security/stats",
    response_model=SecurityStatsResponse,
    summary="Get Security Statistics"
)
@limiter.limit("30/minute")
async def get_security_stats(
    request: Request,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get comprehensive security statistics
    
    Returns failed login counts, blocked IPs, suspicious activities, and active sessions
    """
    try:
        logger.info(
            "Admin requesting security statistics",
            extra={"admin_id": str(current_admin.id)}
        )
        
        service = SecurityAdminService(db, cache_service)
        stats = await service.get_security_stats()
        
        logger.info(
            "Security statistics retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "failed_logins_24h": stats.failed_logins_24h,
                "blocked_ips_count": stats.blocked_ips_count
            }
        )
        
        return SecurityStatsResponse(
            failed_logins_24h=stats.failed_logins_24h,
            failed_logins_7d=stats.failed_logins_7d,
            blocked_ips_count=stats.blocked_ips_count,
            suspicious_activities_24h=stats.suspicious_activities_24h,
            active_sessions_count=stats.active_sessions_count
        )
    
    except Exception as e:
        logger.error(
            "Error retrieving security statistics",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security statistics"
        )


@router.get(
    "/security/failed-logins",
    response_model=List[FailedLoginResponse],
    summary="Get Failed Login Attempts"
)
@limiter.limit("60/minute")
async def get_failed_logins(
    request: Request,
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get recent failed login attempts
    - Shows suspicious activity
    - Helps identify attack patterns
    """
    try:
        logger.info(
            "Admin requesting failed login attempts",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "limit": limit
            }
        )
        
        service = SecurityAdminService(db, cache_service)
        failed_logins = await service.get_failed_logins(
            hours=hours,
            limit=limit
        )
        
        logger.info(
            "Failed login attempts retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "count": len(failed_logins)
            }
        )
        
        return failed_logins
    
    except Exception as e:
        logger.error(
            "Error retrieving failed login attempts",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve login attempts"
        )


@router.get(
    "/security/blocked-ips",
    response_model=list[BlockedIPResponse],
    summary="Get Blocked IP Addresses"
)
@limiter.limit("30/minute")
async def get_blocked_ips(
    request: Request,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get list of blocked IP addresses
    
    Returns all IPs on the blacklist with block reasons and expiration times
    """
    try:
        logger.info(
            "Admin requesting blocked IPs",
            extra={"admin_id": str(current_admin.id)}
        )
        
        service = SecurityAdminService(db, cache_service)
        blocked_ips = await service.get_blocked_ips()
        
        result = [
            BlockedIPResponse(
                ip_address=ip.ip_address,
                reason=ip.reason,
                blocked_at=ip.blocked_at,
                blocked_by_admin_id=ip.blocked_by_admin_id,
                expires_at=ip.expires_at,
                failed_attempts=ip.failed_attempts
            )
            for ip in blocked_ips
        ]
        
        logger.info(
            "Blocked IPs retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "count": len(result)
            }
        )
        
        return result
    
    except Exception as e:
        logger.error(
            "Error retrieving blocked IPs",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve blocked IPs"
        )


@router.post(
    "/security/block-ip",
    summary="Block IP Address"
)
@limiter.limit("20/hour")  # Limit IP blocking operations
async def block_ip_address(
    request: Request,
    block_request: BlockIPRequest,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Add IP address to blacklist
    
    - Requires step-up authentication
    - Can be permanent or temporary (with duration)
    - All blocks are audit logged
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.warning(
            "Admin blocking IP address",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_ip": block_request.ip_address,
                "reason": block_request.reason,
                "duration_hours": block_request.duration_hours,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="ip_blocked",
            details={
                "admin_id": str(current_admin.id),
                "target_ip": block_request.ip_address,
                "reason": block_request.reason,
                "duration_hours": block_request.duration_hours
            },
            request=request
        )
        
        service = SecurityAdminService(db, cache_service)
        
        success = await service.block_ip(
            ip_address=block_request.ip_address,
            reason=block_request.reason,
            admin_id=current_admin.id,
            duration_hours=block_request.duration_hours
        )
        
        if not success:
            logger.error(
                "Failed to block IP address",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_ip": block_request.ip_address
                }
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to block IP address"
            )
        
        logger.info(
            "IP address blocked successfully",
            extra={
                "admin_id": str(current_admin.id),
                "target_ip": block_request.ip_address,
                "duration_hours": block_request.duration_hours
            }
        )
        
        return {
            "success": True,
            "ip_address": block_request.ip_address,
            "message": f"IP {block_request.ip_address} has been blocked",
            "expires_at": (datetime.utcnow() + timedelta(hours=block_request.duration_hours)).isoformat() 
                if block_request.duration_hours else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error blocking IP address",
            extra={
                "admin_id": str(current_admin.id),
                "target_ip": block_request.ip_address,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block IP address"
        )


@router.delete(
    "/security/unblock-ip",
    summary="Unblock IP Address"
)
@limiter.limit("20/hour")
async def unblock_ip_address(
    request: Request,
    unblock_request: UnblockIPRequest,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Remove IP address from blacklist
    
    - Requires step-up authentication
    - All unblocks are audit logged
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.warning(
            "Admin unblocking IP address",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_ip": unblock_request.ip_address,
                "justification": unblock_request.justification,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="ip_unblocked",
            details={
                "admin_id": str(current_admin.id),
                "target_ip": unblock_request.ip_address,
                "justification": unblock_request.justification
            },
            request=request
        )
        
        service = SecurityAdminService(db, cache_service)
        
        unblocked = await service.unblock_ip(
            ip_address=unblock_request.ip_address,
            admin_id=current_admin.id,
            justification=unblock_request.justification
        )
        
        if unblocked:
            logger.info(
                "IP address unblocked successfully",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_ip": unblock_request.ip_address
                }
            )
            return {
                "success": True,
                "ip_address": unblock_request.ip_address,
                "message": f"IP {unblock_request.ip_address} has been unblocked"
            }
        else:
            logger.warning(
                "Attempted to unblock IP that was not blocked",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_ip": unblock_request.ip_address
                }
            )
            return {
                "success": False,
                "ip_address": unblock_request.ip_address,
                "message": f"IP {unblock_request.ip_address} was not blocked"
            }
    
    except Exception as e:
        logger.error(
            "Error unblocking IP address",
            extra={
                "admin_id": str(current_admin.id),
                "target_ip": unblock_request.ip_address,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock IP address"
        )


@router.get(
    "/security/active-sessions",
    response_model=list[ActiveSessionResponse],
    summary="Get Active Sessions"
)
@limiter.limit("30/minute")
async def get_active_sessions(
    request: Request,
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get list of active user sessions
    
    Returns users who have logged in within the specified time window
    """
    try:
        logger.info(
            "Admin requesting active sessions",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours
            }
        )
        
        service = SecurityAdminService(db, cache_service)
        sessions = await service.get_active_sessions(hours=hours)
        
        result = [
            ActiveSessionResponse(
                user_id=session.user_id,
                user_email=session.user_email,
                ip_address=session.ip_address,
                last_activity=session.last_activity,
                session_started=session.session_started,
                user_agent=session.user_agent
            )
            for session in sessions
        ]
        
        logger.info(
            "Active sessions retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "count": len(result)
            }
        )
        
        return result
    
    except Exception as e:
        logger.error(
            "Error retrieving active sessions",
            extra={
                "admin_id": str(current_admin.id),
                "hours": hours,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active sessions"
        )


# ==================== GDPR COMPLIANCE TOOLS ====================
# User data export and deletion requests for GDPR compliance