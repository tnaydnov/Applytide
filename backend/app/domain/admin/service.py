# backend/app/domain/admin/service.py
from __future__ import annotations
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime

from .repository import AdminRepository
from .user_management_service import UserManagementService
from .dto import (
    UserSummaryDTO, UserDetailDTO, DashboardStatsDTO,
    SystemHealthDTO, AnalyticsDTO, AdminLogDTO
)


class AdminService:
    """Service layer for admin operations"""
    
    def __init__(self, repo: AdminRepository, user_mgmt: Optional[UserManagementService] = None):
        self.repo = repo
        self.user_mgmt = user_mgmt or UserManagementService(repo.db)
    
    # ==================== USER MANAGEMENT ====================
    
    def list_users(
        self,
        *,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        is_premium: Optional[bool] = None,
        is_admin: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[UserSummaryDTO], int]:
        """List users with pagination and filters"""
        return self.repo.list_users(
            page=page,
            page_size=page_size,
            search=search,
            is_premium=is_premium,
            is_admin=is_admin,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    def get_user_detail(self, user_id: UUID) -> Optional[UserDetailDTO]:
        """Get detailed user information"""
        return self.repo.get_user_detail(user_id)
    
    def update_user_admin_status(
        self, 
        admin_id: UUID,
        user_id: UUID, 
        is_admin: bool,
        reason: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Update user's admin status and log the action with justification"""
        success = self.repo.update_user_admin_status(user_id, is_admin)
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="update_admin_status",
                target_type="user",
                target_id=str(user_id),
                details={"is_admin": is_admin, "reason": reason},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def update_user_premium_status(
        self,
        admin_id: UUID,
        user_id: UUID,
        is_premium: bool,
        expires_at: Optional[datetime] = None,
        reason: str = "",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Update user's premium status and log the action with justification"""
        success = self.repo.update_user_premium_status(
            user_id, is_premium, expires_at
        )
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="update_premium_status",
                target_type="user",
                target_id=str(user_id),
                details={
                    "is_premium": is_premium,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "reason": reason
                },
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    # ==================== ENHANCED USER MANAGEMENT ====================
    
    def ban_user(
        self,
        admin_id: UUID,
        user_id: UUID,
        reason: str,
        revoke_sessions: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Ban a user and log the action"""
        success = self.user_mgmt.ban_user(user_id, admin_id, reason, revoke_sessions)
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="ban_user",
                target_type="user",
                target_id=str(user_id),
                details={"reason": reason, "revoke_sessions": revoke_sessions},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def unban_user(
        self,
        admin_id: UUID,
        user_id: UUID,
        reason: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Unban a user and log the action"""
        success = self.user_mgmt.unban_user(user_id, admin_id, reason)
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="unban_user",
                target_type="user",
                target_id=str(user_id),
                details={"reason": reason},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def delete_user(
        self,
        admin_id: UUID,
        user_id: UUID,
        reason: str,
        hard_delete: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Delete a user and log the action"""
        success = self.user_mgmt.delete_user(user_id, admin_id, reason, hard_delete)
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="delete_user" if hard_delete else "soft_delete_user",
                target_type="user",
                target_id=str(user_id),
                details={"reason": reason, "hard_delete": hard_delete},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def reset_user_password(
        self,
        admin_id: UUID,
        user_id: UUID,
        new_password_hash: str,
        reason: str,
        revoke_sessions: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Reset a user's password and log the action"""
        success = self.user_mgmt.admin_reset_user_password(
            user_id, new_password_hash, admin_id, reason, revoke_sessions
        )
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="reset_user_password",
                target_type="user",
                target_id=str(user_id),
                details={"reason": reason, "revoke_sessions": revoke_sessions},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def get_user_sessions(self, user_id: UUID):
        """Get all active sessions for a user"""
        return self.user_mgmt.get_user_active_sessions(user_id)
    
    def terminate_session(
        self,
        admin_id: UUID,
        session_id: UUID,
        reason: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Terminate a specific session and log the action"""
        success = self.user_mgmt.terminate_session(session_id, admin_id, reason)
        
        if success:
            self.repo.log_admin_action(
                admin_id=admin_id,
                action="terminate_session",
                target_type="session",
                target_id=str(session_id),
                details={"reason": reason},
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return success
    
    def terminate_all_user_sessions(
        self,
        admin_id: UUID,
        user_id: UUID,
        reason: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> int:
        """Terminate all sessions for a user and log the action"""
        count = self.user_mgmt.terminate_all_user_sessions(user_id, admin_id, reason)
        
        self.repo.log_admin_action(
            admin_id=admin_id,
            action="terminate_all_sessions",
            target_type="user",
            target_id=str(user_id),
            details={"reason": reason, "sessions_terminated": count},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return count
    
    # ==================== DASHBOARD & STATS ====================
    
    def get_dashboard_stats(self) -> DashboardStatsDTO:
        """Get overview statistics"""
        return self.repo.get_dashboard_stats()
    
    def get_system_health(self) -> SystemHealthDTO:
        """Get system health metrics"""
        return self.repo.get_system_health()
    
    def get_analytics(self, days: int = 30) -> AnalyticsDTO:
        """Get analytics data"""
        return self.repo.get_analytics(days)
    
    # ==================== ADMIN LOGS ====================
    
    def log_action(
        self,
        admin_id: UUID,
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log an admin action"""
        self.repo.log_admin_action(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def get_admin_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        admin_id: Optional[UUID] = None,
        action: Optional[str] = None
    ) -> Tuple[List[AdminLogDTO], int]:
        """Get admin action logs"""
        return self.repo.get_admin_logs(page, page_size, admin_id, action)
