# backend/app/domain/admin/service.py
from __future__ import annotations
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime

from .repository import AdminRepository
from .dto import (
    UserSummaryDTO, UserDetailDTO, DashboardStatsDTO,
    SystemHealthDTO, AnalyticsDTO, AdminLogDTO
)


class AdminService:
    """Service layer for admin operations"""
    
    def __init__(self, repo: AdminRepository):
        self.repo = repo
    
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
