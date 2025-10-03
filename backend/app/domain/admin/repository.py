# backend/app/domain/admin/repository.py
from __future__ import annotations
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import func, select, and_, or_, desc, text
from sqlalchemy.orm import Session

from ...db import models
from .dto import (
    UserSummaryDTO, UserDetailDTO, DashboardStatsDTO,
    SystemHealthDTO, AnalyticsDTO, AdminLogDTO, UserActivityDTO
)


class AdminRepository:
    """Repository for admin operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
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
        query = self.db.query(models.User)
        
        # Filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    models.User.email.ilike(search_term),
                    models.User.full_name.ilike(search_term)
                )
            )
        
        if is_premium is not None:
            query = query.filter(models.User.is_premium == is_premium)
        
        if is_admin is not None:
            query = query.filter(models.User.is_admin == is_admin)
        
        # Total count
        total = query.count()
        
        # Sorting
        sort_column = getattr(models.User, sort_by, models.User.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        # Pagination
        offset = (page - 1) * page_size
        users = query.offset(offset).limit(page_size).all()
        
        # Get stats for each user
        user_dtos = []
        for user in users:
            # Count related records
            app_count = self.db.query(models.Application).filter(
                models.Application.user_id == user.id
            ).count()
            
            doc_count = self.db.query(models.Resume).filter(
                models.Resume.user_id == user.id
            ).count()
            
            job_count = self.db.query(models.Job).filter(
                models.Job.user_id == user.id
            ).count()
            
            user_dtos.append(UserSummaryDTO(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_premium=user.is_premium,
                is_admin=user.is_admin,
                is_oauth_user=user.is_oauth_user,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                total_applications=app_count,
                total_documents=doc_count,
                total_jobs=job_count
            ))
        
        return user_dtos, total
    
    def get_user_detail(self, user_id: UUID) -> Optional[UserDetailDTO]:
        """Get detailed user information"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return None
        
        # Get stats
        app_count = self.db.query(models.Application).filter(
            models.Application.user_id == user.id
        ).count()
        
        doc_count = self.db.query(models.Resume).filter(
            models.Resume.user_id == user.id
        ).count()
        
        job_count = self.db.query(models.Job).filter(
            models.Job.user_id == user.id
        ).count()
        
        reminder_count = self.db.query(models.Reminder).filter(
            models.Reminder.user_id == user.id
        ).count()
        
        # Get recent activity (last 10 applications)
        recent_apps = self.db.query(models.Application).filter(
            models.Application.user_id == user.id
        ).order_by(desc(models.Application.created_at)).limit(10).all()
        
        recent_activity = [
            {
                "timestamp": app.created_at,
                "action": "application_created",
                "details": {"status": app.status, "job_id": str(app.job_id)}
            }
            for app in recent_apps
        ]
        
        return UserDetailDTO(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_premium=user.is_premium,
            is_admin=user.is_admin,
            is_oauth_user=user.is_oauth_user,
            google_id=user.google_id,
            avatar_url=user.avatar_url or user.google_avatar_url,
            bio=user.bio,
            phone=user.phone,
            location=user.location,
            timezone=user.timezone,
            website=user.website,
            linkedin_url=user.linkedin_url,
            github_url=user.github_url,
            email_verified_at=user.email_verified_at,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            total_applications=app_count,
            total_documents=doc_count,
            total_jobs=job_count,
            total_reminders=reminder_count,
            recent_activity=recent_activity
        )
    
    def update_user_admin_status(self, user_id: UUID, is_admin: bool) -> bool:
        """Update user's admin status"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False
        
        user.is_admin = is_admin
        self.db.commit()
        return True
    
    def update_user_premium_status(
        self, 
        user_id: UUID, 
        is_premium: bool,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """Update user's premium status"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False
        
        user.is_premium = is_premium
        user.premium_expires_at = expires_at
        self.db.commit()
        return True
    
    # ==================== DASHBOARD STATS ====================
    
    def get_dashboard_stats(self) -> DashboardStatsDTO:
        """Get overview statistics"""
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # User metrics
        total_users = self.db.query(models.User).count()
        
        active_7d = self.db.query(models.User).filter(
            models.User.last_login_at >= seven_days_ago
        ).count()
        
        active_30d = self.db.query(models.User).filter(
            models.User.last_login_at >= thirty_days_ago
        ).count()
        
        new_users_7d = self.db.query(models.User).filter(
            models.User.created_at >= seven_days_ago
        ).count()
        
        premium_users = self.db.query(models.User).filter(
            models.User.is_premium == True
        ).count()
        
        oauth_users = self.db.query(models.User).filter(
            models.User.is_oauth_user == True
        ).count()
        
        # Application metrics
        total_applications = self.db.query(models.Application).count()
        
        applications_7d = self.db.query(models.Application).filter(
            models.Application.created_at >= seven_days_ago
        ).count()
        
        applications_30d = self.db.query(models.Application).filter(
            models.Application.created_at >= thirty_days_ago
        ).count()
        
        # Document metrics
        total_documents = self.db.query(models.Resume).count()
        
        # Try to estimate analyzed documents (those with analysis cache)
        documents_analyzed = self.db.query(models.Resume).filter(
            models.Resume.meta_json.isnot(None)
        ).count()
        
        # Estimate cache hit rate (simplified)
        cache_hit_rate = 0.0
        if documents_analyzed > 0:
            # This is a placeholder - real implementation would need actual tracking
            cache_hit_rate = 0.45  # Placeholder
        
        # Job metrics
        total_jobs = self.db.query(models.Job).count()
        
        jobs_7d = self.db.query(models.Job).filter(
            models.Job.created_at >= seven_days_ago
        ).count()
        
        # Reminder metrics
        total_reminders = self.db.query(models.Reminder).count()
        
        reminders_7d = self.db.query(models.Reminder).filter(
            models.Reminder.created_at >= seven_days_ago
        ).count()
        
        return DashboardStatsDTO(
            total_users=total_users,
            active_users_7d=active_7d,
            active_users_30d=active_30d,
            new_users_7d=new_users_7d,
            premium_users=premium_users,
            oauth_users=oauth_users,
            total_applications=total_applications,
            applications_7d=applications_7d,
            applications_30d=applications_30d,
            total_documents=total_documents,
            documents_analyzed=documents_analyzed,
            analysis_cache_hit_rate=cache_hit_rate,
            total_jobs=total_jobs,
            jobs_7d=jobs_7d,
            total_reminders=total_reminders,
            reminders_7d=reminders_7d
        )
    
    # ==================== SYSTEM HEALTH ====================
    
    def get_system_health(self) -> SystemHealthDTO:
        """Get system health metrics"""
        now = datetime.utcnow()
        one_day_ago = now - timedelta(days=1)
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # LLM usage (placeholder - would need actual tracking)
        llm_calls_24h = 0
        llm_calls_7d = 0
        llm_cost_24h = 0.0
        llm_cost_7d = 0.0
        llm_cost_30d = 0.0
        
        # Cache performance (simplified)
        cache_hits_24h = 0
        cache_misses_24h = 0
        cache_hit_rate = 0.0
        cache_size_mb = 0.0
        
        # Database size (PostgreSQL specific)
        try:
            result = self.db.execute(
                text("SELECT pg_database_size(current_database()) / (1024*1024) as size_mb")
            ).first()
            db_size_mb = float(result[0]) if result else 0.0
        except Exception:
            db_size_mb = 0.0
        
        # Connection pool (simplified)
        db_connection_pool_size = 10  # Default
        db_connection_pool_available = 8  # Placeholder
        
        # API health (placeholder)
        total_api_calls_24h = 0
        avg_response_time_ms = 0.0
        error_count_24h = 0
        error_rate = 0.0
        
        return SystemHealthDTO(
            llm_calls_24h=llm_calls_24h,
            llm_calls_7d=llm_calls_7d,
            llm_cost_24h=llm_cost_24h,
            llm_cost_7d=llm_cost_7d,
            llm_cost_30d=llm_cost_30d,
            cache_hits_24h=cache_hits_24h,
            cache_misses_24h=cache_misses_24h,
            cache_hit_rate=cache_hit_rate,
            cache_size_mb=cache_size_mb,
            db_size_mb=db_size_mb,
            db_connection_pool_size=db_connection_pool_size,
            db_connection_pool_available=db_connection_pool_available,
            total_api_calls_24h=total_api_calls_24h,
            avg_response_time_ms=avg_response_time_ms,
            error_count_24h=error_count_24h,
            error_rate=error_rate,
            recent_errors=[]
        )
    
    # ==================== ANALYTICS ====================
    
    def get_analytics(self, days: int = 30) -> AnalyticsDTO:
        """Get analytics data"""
        now = datetime.utcnow()
        start_date = now - timedelta(days=days)
        
        # Feature usage (simplified)
        total_analyses = self.db.query(models.Resume).filter(
            models.Resume.created_at >= start_date
        ).count()
        
        total_jobs = self.db.query(models.Job).filter(
            models.Job.created_at >= start_date
        ).count()
        
        total_apps = self.db.query(models.Application).filter(
            models.Application.created_at >= start_date
        ).count()
        
        feature_usage = {
            "document_analysis": total_analyses,
            "job_tracking": total_jobs,
            "application_tracking": total_apps
        }
        
        # Daily active users
        daily_active_users = []
        for i in range(days):
            date = now - timedelta(days=i)
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            count = self.db.query(models.User).filter(
                and_(
                    models.User.last_login_at >= day_start,
                    models.User.last_login_at < day_end
                )
            ).count()
            
            daily_active_users.append({
                "date": day_start.isoformat(),
                "count": count
            })
        
        # Application statuses
        status_counts = self.db.query(
            models.Application.status,
            func.count(models.Application.id)
        ).filter(
            models.Application.created_at >= start_date
        ).group_by(models.Application.status).all()
        
        application_statuses = {status: count for status, count in status_counts}
        
        # Analysis by day (simplified)
        analysis_by_day = []
        
        # Top users by activity
        top_users_raw = self.db.query(
            models.Application.user_id,
            func.count(models.Application.id).label('activity_count')
        ).filter(
            models.Application.created_at >= start_date
        ).group_by(
            models.Application.user_id
        ).order_by(
            desc('activity_count')
        ).limit(10).all()
        
        top_users = []
        for user_id, count in top_users_raw:
            user = self.db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                top_users.append({
                    "user_id": str(user.id),
                    "email": user.email,
                    "activity_score": count
                })
        
        return AnalyticsDTO(
            feature_usage=feature_usage,
            daily_active_users=daily_active_users,
            weekly_active_users=[],  # Simplified
            application_statuses=application_statuses,
            analysis_by_day=analysis_by_day,
            top_users=top_users
        )
    
    # ==================== ADMIN LOGS ====================
    
    def log_admin_action(
        self,
        admin_id: UUID,
        action: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log an admin action with permanent record keeping
        
        IMPORTANT: Stores admin_email redundantly to preserve audit trail
        even if the admin user account is deleted.
        """
        # Get admin user to store email
        admin = self.db.query(models.User).filter(models.User.id == admin_id).first()
        admin_email = admin.email if admin else "deleted-admin@unknown.com"
        
        log = models.AdminLog(
            admin_id=admin_id,
            admin_email=admin_email,  # Redundant but permanent
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        self.db.commit()
    
    def get_admin_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        admin_id: Optional[UUID] = None,
        action: Optional[str] = None
    ) -> Tuple[List[AdminLogDTO], int]:
        """Get admin action logs"""
        query = self.db.query(models.AdminLog)
        
        if admin_id:
            query = query.filter(models.AdminLog.admin_id == admin_id)
        
        if action:
            query = query.filter(models.AdminLog.action == action)
        
        total = query.count()
        
        offset = (page - 1) * page_size
        logs = query.order_by(desc(models.AdminLog.created_at)).offset(offset).limit(page_size).all()
        
        log_dtos = []
        for log in logs:
            # Use stored admin_email instead of querying user (permanent record)
            log_dtos.append(AdminLogDTO(
                id=log.id,
                admin_id=log.admin_id,
                admin_email=log.admin_email,  # Already stored in log
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at
            ))
        
        return log_dtos, total
