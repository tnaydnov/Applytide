# backend/app/domain/admin/security_dto.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SecurityStatsDTO(BaseModel):
    """Overall security statistics"""
    failed_logins_24h: int
    failed_logins_7d: int
    blocked_ips_count: int
    suspicious_activities_24h: int
    active_sessions_count: int


class FailedLoginDTO(BaseModel):
    """Failed login attempt information"""
    email: str
    ip_address: str
    timestamp: datetime
    reason: str  # "invalid_password", "user_not_found", "account_locked"
    user_agent: Optional[str]


class BlockedIPDTO(BaseModel):
    """Blocked IP address information"""
    ip_address: str
    reason: str
    blocked_at: datetime
    blocked_by_admin_id: Optional[str]
    expires_at: Optional[datetime]
    failed_attempts: int


class ActiveSessionDTO(BaseModel):
    """Active user session information"""
    user_id: str
    user_email: str
    ip_address: Optional[str]
    last_activity: datetime
    session_started: datetime
    user_agent: Optional[str]
