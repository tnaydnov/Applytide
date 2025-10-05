# backend/app/domain/admin/security_service.py
import json
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from .security_dto import (
    SecurityStatsDTO, 
    FailedLoginDTO, 
    BlockedIPDTO, 
    ActiveSessionDTO
)
from .service import AdminService
from ...db import models
from ...infra.cache.service import CacheService


class SecurityAdminService:
    """
    Admin service for security monitoring and IP management
    
    Tracks failed logins, manages IP blacklist, monitors sessions
    """
    
    def __init__(self, db: AsyncSession, cache_service: CacheService):
        self.db = db
        self.cache = cache_service
        self.redis = cache_service.redis
        
    async def get_security_stats(self) -> SecurityStatsDTO:
        """
        Get comprehensive security statistics
        
        Returns:
            Overall security metrics
        """
        now = datetime.utcnow()
        
        # Count failed logins from audit logs (last 24h and 7d)
        result_24h = await self.db.execute(
            select(func.count(models.AdminAction.id)).where(
                models.AdminAction.action.in_(['login_failed', 'auth_failed']),
                models.AdminAction.created_at >= now - timedelta(hours=24)
            )
        )
        failed_24h = result_24h.scalar() or 0
        
        result_7d = await self.db.execute(
            select(func.count(models.AdminAction.id)).where(
                models.AdminAction.action.in_(['login_failed', 'auth_failed']),
                models.AdminAction.created_at >= now - timedelta(days=7)
            )
        )
        failed_7d = result_7d.scalar() or 0
        
        # Count blocked IPs from Redis
        blocked_ips = await self._get_blocked_ips_from_redis()
        
        # Count suspicious activities (multiple failed logins)
        result_suspicious = await self.db.execute(
            select(func.count(func.distinct(models.AdminAction.metadata['ip_address'].astext))).where(
                models.AdminAction.action == 'login_failed',
                models.AdminAction.created_at >= now - timedelta(hours=24),
                models.AdminAction.metadata['ip_address'].astext.isnot(None)
            )
        )
        suspicious_24h = result_suspicious.scalar() or 0
        
        # Estimate active sessions (users logged in last hour)
        result_sessions = await self.db.execute(
            select(func.count(func.distinct(models.User.id))).where(
                models.User.last_login_at >= now - timedelta(hours=1)
            )
        )
        active_sessions = result_sessions.scalar() or 0
        
        return SecurityStatsDTO(
            failed_logins_24h=failed_24h,
            failed_logins_7d=failed_7d,
            blocked_ips_count=len(blocked_ips),
            suspicious_activities_24h=suspicious_24h,
            active_sessions_count=active_sessions
        )
    
    async def get_failed_logins(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[FailedLoginDTO]:
        """
        Get recent failed login attempts from audit logs
        
        Args:
            hours: Time window in hours
            limit: Maximum number of records
            
        Returns:
            List of failed login attempts
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        result = await self.db.execute(
            select(models.AdminAction).where(
                models.AdminAction.action.in_(['login_failed', 'auth_failed']),
                models.AdminAction.created_at >= cutoff
            ).order_by(desc(models.AdminAction.created_at)).limit(limit)
        )
        
        failed_logins = []
        for action in result.scalars():
            metadata = action.metadata or {}
            failed_logins.append(FailedLoginDTO(
                email=metadata.get('email', 'unknown'),
                ip_address=metadata.get('ip_address', 'unknown'),
                timestamp=action.created_at,
                reason=metadata.get('reason', 'authentication_failed'),
                user_agent=metadata.get('user_agent')
            ))
        
        return failed_logins
    
    async def get_blocked_ips(self) -> List[BlockedIPDTO]:
        """
        Get list of blocked IP addresses from Redis
        
        Returns:
            List of blocked IPs with metadata
        """
        blocked_ips_data = await self._get_blocked_ips_from_redis()
        
        blocked_ips = []
        for ip_data in blocked_ips_data:
            blocked_ips.append(BlockedIPDTO(
                ip_address=ip_data['ip_address'],
                reason=ip_data.get('reason', 'Too many failed attempts'),
                blocked_at=datetime.fromisoformat(ip_data['blocked_at']),
                blocked_by_admin_id=ip_data.get('blocked_by_admin_id'),
                expires_at=datetime.fromisoformat(ip_data['expires_at']) if ip_data.get('expires_at') else None,
                failed_attempts=ip_data.get('failed_attempts', 0)
            ))
        
        return blocked_ips
    
    async def block_ip(
        self,
        ip_address: str,
        reason: str,
        admin_id: str,
        duration_hours: Optional[int] = None
    ) -> bool:
        """
        Add IP address to blacklist
        
        Args:
            ip_address: IP to block
            reason: Reason for blocking
            admin_id: ID of admin performing action
            duration_hours: Optional expiration time (None = permanent)
            
        Returns:
            True if blocked successfully
        """
        expires_at = None
        if duration_hours:
            expires_at = datetime.utcnow() + timedelta(hours=duration_hours)
        
        # Store in Redis
        key = f"blocked_ip:{ip_address}"
        value = json.dumps({
            "ip_address": ip_address,
            "reason": reason,
            "blocked_at": datetime.utcnow().isoformat(),
            "blocked_by_admin_id": admin_id,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "failed_attempts": 0
        })
        
        if duration_hours:
            await self.redis.setex(key, duration_hours * 3600, value)
        else:
            await self.redis.set(key, value)
        
        # Log the action
        await AdminService.log_action(
            self.db,
            admin_id=admin_id,
            action="ip_blocked",
            entity_type="security",
            entity_id=ip_address,
            justification=reason,
            metadata={
                "ip_address": ip_address,
                "reason": reason,
                "duration_hours": duration_hours,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        )
        
        return True
    
    async def unblock_ip(
        self,
        ip_address: str,
        admin_id: str,
        justification: str
    ) -> bool:
        """
        Remove IP address from blacklist
        
        Args:
            ip_address: IP to unblock
            admin_id: ID of admin performing action
            justification: Reason for unblocking
            
        Returns:
            True if unblocked, False if wasn't blocked
        """
        key = f"blocked_ip:{ip_address}"
        exists = await self.redis.exists(key)
        
        if exists:
            await self.redis.delete(key)
            
            # Log the action
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="ip_unblocked",
                entity_type="security",
                entity_id=ip_address,
                justification=justification,
                metadata={
                    "ip_address": ip_address
                }
            )
            
            return True
        
        return False
    
    async def get_active_sessions(self, hours: int = 24) -> List[ActiveSessionDTO]:
        """
        Get list of active user sessions
        
        Args:
            hours: Consider sessions active if logged in within this time
            
        Returns:
            List of active sessions
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        result = await self.db.execute(
            select(models.User).where(
                models.User.last_login_at >= cutoff
            ).order_by(desc(models.User.last_login_at))
        )
        
        sessions = []
        for user in result.scalars():
            # Try to get session info from recent audit logs
            session_info = await self.db.execute(
                select(models.AdminAction).where(
                    models.AdminAction.admin_id == user.id,
                    models.AdminAction.action == 'login_success',
                    models.AdminAction.created_at >= cutoff
                ).order_by(desc(models.AdminAction.created_at)).limit(1)
            )
            
            session_action = session_info.scalar()
            metadata = session_action.metadata if session_action else {}
            
            sessions.append(ActiveSessionDTO(
                user_id=str(user.id),
                user_email=user.email,
                ip_address=metadata.get('ip_address'),
                last_activity=user.last_login_at,
                session_started=session_action.created_at if session_action else user.last_login_at,
                user_agent=metadata.get('user_agent')
            ))
        
        return sessions
    
    async def _get_blocked_ips_from_redis(self) -> List[dict]:
        """
        Get all blocked IPs from Redis
        
        Returns:
            List of blocked IP data
        """
        blocked_ips = []
        cursor = 0
        
        while True:
            cursor, keys = await self.redis.scan(
                cursor=cursor,
                match="blocked_ip:*",
                count=100
            )
            
            for key in keys:
                value = await self.redis.get(key)
                if value:
                    try:
                        ip_data = json.loads(value.decode('utf-8') if isinstance(value, bytes) else value)
                        blocked_ips.append(ip_data)
                    except (json.JSONDecodeError, AttributeError):
                        pass
            
            if cursor == 0:
                break
        
        return blocked_ips
