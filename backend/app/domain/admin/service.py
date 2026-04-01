"""
Admin Service - Facade for Admin Panel Operations

Provides comprehensive administrative capabilities by delegating to specialized
sub-services. This facade maintains backward compatibility while organizing
code into focused, maintainable modules.

Architecture:
- Facade pattern: Delegates to Dashboard, User, LLM, and Security services
- Pure domain service (no HTTP/framework dependencies)
- Comprehensive error handling and logging
- Transaction management via SQLAlchemy

Sub-Services:
- DashboardService: Dashboard statistics, activity feed, charts
- UserService: User management, user details, user resources
- LLMService: LLM usage tracking, cost analysis, performance metrics
- SecurityService: Security monitoring, event tracking, threat analysis

Example:
    service = AdminService(db_session)
    stats = service.get_dashboard_stats()  # Delegates to DashboardService
    users = service.get_users(page=1)      # Delegates to UserService
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.domain.admin import dto
from app.domain.admin.dashboard_service import DashboardService
from app.domain.admin.user_service import UserService
from app.domain.admin.llm_service import LLMService
from app.domain.admin.security_service import SecurityService
from app.domain.logging import get_logger

logger = get_logger(__name__)


class AdminService:
    """
    Facade service for admin panel operations.
    
    Delegates to specialized sub-services for each domain:
    - Dashboard operations  DashboardService
    - User management  UserService
    - LLM monitoring  LLMService
    - Security tracking  SecurityService
    
    Maintains the same public API as the original monolithic service
    for backward compatibility with existing routers and consumers.
    """
    
    def __init__(self, db: Session):
        """
        Initialize admin service facade with database session.
        
        Args:
            db: SQLAlchemy database session
        
        Raises:
            ValueError: If db session is None
        """
        if db is None:
            logger.error("AdminService initialized with None database session")
            raise ValueError("Database session cannot be None")
        
        # Initialize all sub-services
        self.dashboard_service = DashboardService(db)
        self.user_service = UserService(db)
        self.llm_service = LLMService(db)
        self.security_service = SecurityService(db)
        
        self.db = db
        logger.debug("AdminService facade initialized with all sub-services")
    
    # ========================================================================
    # Dashboard Methods - Delegate to DashboardService
    # ========================================================================
    
    def get_dashboard_stats(self) -> dto.DashboardStatsDTO:
        """Get dashboard statistics. Delegates to DashboardService."""
        return self.dashboard_service.get_dashboard_stats()
    
    def get_activity_feed(self, limit: int = 20) -> List[dto.ActivityEventDTO]:
        """Get activity feed. Delegates to DashboardService."""
        return self.dashboard_service.get_activity_feed(limit=limit)
    
    def get_dashboard_charts(self) -> dto.DashboardChartsDTO:
        """Get dashboard charts. Delegates to DashboardService."""
        return self.dashboard_service.get_dashboard_charts()
    
    # ========================================================================
    # User Management Methods - Delegate to UserService
    # ========================================================================
    
    def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_premium: Optional[bool] = None,
        email_verified: Optional[bool] = None
    ) -> dto.PaginatedUsersDTO:
        """Get paginated users list. Delegates to UserService."""
        return self.user_service.get_users(
            page=page,
            page_size=page_size,
            search=search,
            role=role,
            is_premium=is_premium,
            email_verified=email_verified
        )
    
    def get_user_detail(self, user_id: int) -> Optional[dto.UserDetailDTO]:
        """Get user detail. Delegates to UserService."""
        return self.user_service.get_user_detail(user_id=user_id)
    
    def get_user_applications(self, user_id: int, limit: int = 50) -> List[dto.UserApplicationDTO]:
        """Get user applications. Delegates to UserService."""
        return self.user_service.get_user_applications(user_id=user_id, limit=limit)
    
    def get_user_jobs(self, user_id: int, limit: int = 50) -> List[dto.UserJobDTO]:
        """Get user jobs. Delegates to UserService."""
        return self.user_service.get_user_jobs(user_id=user_id, limit=limit)
    
    def get_user_activity(self, user_id: int, limit: int = 50) -> List[dto.ActivityEventDTO]:
        """Get user activity. Delegates to UserService."""
        return self.user_service.get_user_activity(user_id=user_id, limit=limit)
    
    # ========================================================================
    # LLM Usage Methods - Delegate to LLMService
    # ========================================================================
    
    def get_llm_usage_stats(self, hours: Optional[int] = 24) -> dto.LLMUsageStatsDTO:
        """Get LLM usage statistics. Delegates to LLMService."""
        return self.llm_service.get_llm_usage_stats(hours=hours)
    
    def get_llm_usage_list(
        self,
        page: int = 1,
        page_size: int = 50,
        endpoint: Optional[str] = None,
        usage_type: Optional[str] = None,
        user_id: Optional[int] = None,
        success_only: Optional[bool] = None,
        hours: Optional[int] = None
    ) -> dto.PaginatedLLMUsageDTO:
        """Get paginated LLM usage list. Delegates to LLMService."""
        return self.llm_service.get_llm_usage_list(
            page=page,
            page_size=page_size,
            endpoint=endpoint,
            usage_type=usage_type,
            user_id=user_id,
            success_only=success_only,
            hours=hours
        )
    
    # ========================================================================
    # Security Methods - Delegate to SecurityService
    # ========================================================================
    
    def get_security_stats(self, hours: int = 24) -> dto.SecurityStatsDTO:
        """Get security statistics. Delegates to SecurityService."""
        return self.security_service.get_security_stats(hours=hours)
    
    def get_security_events(
        self,
        hours: Optional[int] = 24,
        event_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> list:
        """Get security events list. Delegates to SecurityService."""
        return self.security_service.get_security_events(
            hours=hours,
            event_type=event_type,
            page=page,
            page_size=page_size
        )