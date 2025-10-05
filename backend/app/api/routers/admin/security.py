# backend/app/api/routers/admin/security.py
"""Securityclass BlockIPRequest(BaseModel):
    ip_address: str = Field(..., pattern=r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
    reason: Optional[str] = None
    duration_hours: Optional[int] = Field(default=None, ge=1)itoring"""
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


router = APIRouter(tags=["admin-security"])

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
    service = SecurityAdminService(db, cache_service)
    stats = await service.get_security_stats()
    
    return SecurityStatsResponse(
        failed_logins_24h=stats.failed_logins_24h,
        failed_logins_7d=stats.failed_logins_7d,
        blocked_ips_count=stats.blocked_ips_count,
        suspicious_activities_24h=stats.suspicious_activities_24h,
        active_sessions_count=stats.active_sessions_count
    )


@router.get(
    "/security/failed-logins",
    response_model=list[FailedLoginResponse],
    summary="Get Failed Login Attempts"
)
@limiter.limit("30/minute")
async def get_failed_logins(
    request: Request,
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get recent failed login attempts
    
    Returns list of failed authentication attempts from audit logs
    """
    service = SecurityAdminService(db, cache_service)
    failed_logins = await service.get_failed_logins(hours=hours, limit=limit)
    
    return [
        FailedLoginResponse(
            email=login.email,
            ip_address=login.ip_address,
            timestamp=login.timestamp,
            reason=login.reason,
            user_agent=login.user_agent
        )
        for login in failed_logins
    ]


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
    service = SecurityAdminService(db, cache_service)
    blocked_ips = await service.get_blocked_ips()
    
    return [
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
    service = SecurityAdminService(db, cache_service)
    
    success = await service.block_ip(
        ip_address=block_request.ip_address,
        reason=block_request.reason,
        admin_id=current_admin.id,
        duration_hours=block_request.duration_hours
    )
    
    return {
        "success": True,
        "ip_address": block_request.ip_address,
        "message": f"IP {block_request.ip_address} has been blocked",
        "expires_at": (datetime.utcnow() + timedelta(hours=block_request.duration_hours)).isoformat() 
            if block_request.duration_hours else None
    }


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
    service = SecurityAdminService(db, cache_service)
    
    unblocked = await service.unblock_ip(
        ip_address=unblock_request.ip_address,
        admin_id=current_admin.id,
        justification=unblock_request.justification
    )
    
    if unblocked:
        return {
            "success": True,
            "ip_address": unblock_request.ip_address,
            "message": f"IP {unblock_request.ip_address} has been unblocked"
        }
    else:
        return {
            "success": False,
            "ip_address": unblock_request.ip_address,
            "message": f"IP {unblock_request.ip_address} was not blocked"
        }


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
    service = SecurityAdminService(db, cache_service)
    sessions = await service.get_active_sessions(hours=hours)
    
    return [
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


# ==================== GDPR COMPLIANCE TOOLS ====================
# User data export and deletion requests for GDPR compliance