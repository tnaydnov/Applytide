"""
Admin service - core business logic for admin panel.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.orm import Session, selectinload
from app.db import models
from app.domain.admin import dto


class AdminService:
    """Service for admin panel operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================================================
    # Dashboard Methods
    # ========================================================================
    
    def get_dashboard_stats(self) -> dto.DashboardStatsDTO:
        """Get quick stats for dashboard."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        # Total users
        total_users = self.db.scalar(
            select(func.count(models.User.id))
        ) or 0
        
        # Premium users
        premium_users = self.db.scalar(
            select(func.count(models.User.id))
            .where(models.User.is_premium == True)
        ) or 0
        
        # New users today
        new_users_today = self.db.scalar(
            select(func.count(models.User.id))
            .where(models.User.created_at >= today_start)
        ) or 0
        
        # New users this week
        new_users_this_week = self.db.scalar(
            select(func.count(models.User.id))
            .where(models.User.created_at >= week_start)
        ) or 0
        
        # Total applications
        total_applications = self.db.scalar(
            select(func.count(models.Application.id))
        ) or 0
        
        # Active sessions
        active_sessions = self.db.scalar(
            select(func.count(models.RefreshToken.id))
            .where(
                and_(
                    models.RefreshToken.is_active == True,
                    models.RefreshToken.expires_at > now
                )
            )
        ) or 0
        
        # Recent errors (last 24 hours)
        recent_errors_count = self.db.scalar(
            select(func.count(models.ApplicationLog.id))
            .where(
                and_(
                    models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                    models.ApplicationLog.timestamp >= now - timedelta(hours=24)
                )
            )
        ) or 0
        
        return dto.DashboardStatsDTO(
            total_users=total_users,
            premium_users=premium_users,
            new_users_today=new_users_today,
            new_users_this_week=new_users_this_week,
            total_applications=total_applications,
            active_sessions=active_sessions,
            recent_errors_count=recent_errors_count
        )
    
    def get_activity_feed(self, limit: int = 20) -> List[dto.ActivityEventDTO]:
        """Get recent activity events."""
        # Get recent logs
        stmt = (
            select(models.ApplicationLog)
            .order_by(desc(models.ApplicationLog.timestamp))
            .limit(limit)
        )
        
        logs = self.db.scalars(stmt).all()
        
        # Get user emails for logs with user_id
        user_ids = [log.user_id for log in logs if log.user_id]
        users_map = {}
        if user_ids:
            users = self.db.scalars(
                select(models.User)
                .where(models.User.id.in_(user_ids))
            ).all()
            users_map = {user.id: user.email for user in users}
        
        events = []
        for log in logs:
            # Determine event type from message/endpoint
            event_type = self._parse_event_type(log)
            
            events.append(dto.ActivityEventDTO(
                id=log.id,
                timestamp=log.timestamp,
                user_email=users_map.get(log.user_id) if log.user_id else None,
                user_id=log.user_id,
                event_type=event_type,
                message=log.message,
                level=log.level
            ))
        
        return events
    
    def get_dashboard_charts(self) -> dto.DashboardChartsDTO:
        """Get chart data for last 7 days."""
        now = datetime.utcnow()
        start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Generate date range
        dates = [(start_date + timedelta(days=i)).date() for i in range(8)]
        
        # Signups per day
        signups_stmt = (
            select(
                func.date(models.User.created_at).label('date'),
                func.count(models.User.id).label('count')
            )
            .where(models.User.created_at >= start_date)
            .group_by(func.date(models.User.created_at))
        )
        signups_raw = self.db.execute(signups_stmt).all()
        signups_dict = {row.date: row.count for row in signups_raw}
        
        # Applications per day
        apps_stmt = (
            select(
                func.date(models.Application.created_at).label('date'),
                func.count(models.Application.id).label('count')
            )
            .where(models.Application.created_at >= start_date)
            .group_by(func.date(models.Application.created_at))
        )
        apps_raw = self.db.execute(apps_stmt).all()
        apps_dict = {row.date: row.count for row in apps_raw}
        
        # Errors per day
        errors_stmt = (
            select(
                func.date(models.ApplicationLog.timestamp).label('date'),
                func.count(models.ApplicationLog.id).label('count')
            )
            .where(
                and_(
                    models.ApplicationLog.timestamp >= start_date,
                    models.ApplicationLog.level.in_(["ERROR", "CRITICAL"])
                )
            )
            .group_by(func.date(models.ApplicationLog.timestamp))
        )
        errors_raw = self.db.execute(errors_stmt).all()
        errors_dict = {row.date: row.count for row in errors_raw}
        
        # Build chart data
        return dto.DashboardChartsDTO(
            signups_last_7_days=[
                dto.ChartDataPointDTO(date=d.isoformat(), count=signups_dict.get(d, 0))
                for d in dates
            ],
            applications_last_7_days=[
                dto.ChartDataPointDTO(date=d.isoformat(), count=apps_dict.get(d, 0))
                for d in dates
            ],
            errors_last_7_days=[
                dto.ChartDataPointDTO(date=d.isoformat(), count=errors_dict.get(d, 0))
                for d in dates
            ]
        )
    
    def _parse_event_type(self, log: models.ApplicationLog) -> str:
        """Parse event type from log message/endpoint."""
        msg = log.message.lower()
        endpoint = (log.endpoint or "").lower()
        
        if "register" in msg or "signup" in msg:
            return "user_registered"
        elif "login" in msg:
            return "user_login"
        elif "application" in msg and "created" in msg:
            return "application_created"
        elif log.level in ["ERROR", "CRITICAL"]:
            return "error"
        elif "premium" in msg:
            return "premium_change"
        else:
            return "general"
    
    # ========================================================================
    # User Management Methods
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
        """Get paginated list of users with filters."""
        # Base query
        stmt = select(models.User)
        
        # Apply filters
        filters = []
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    models.User.email.ilike(search_term),
                    models.User.location.ilike(search_term)
                )
            )
        if role:
            filters.append(models.User.role == role)
        if is_premium is not None:
            filters.append(models.User.is_premium == is_premium)
        if email_verified is not None:
            if email_verified:
                filters.append(models.User.email_verified_at.isnot(None))
            else:
                filters.append(models.User.email_verified_at.is_(None))
        
        if filters:
            stmt = stmt.where(and_(*filters))
        
        # Get total count
        total = self.db.scalar(
            select(func.count()).select_from(stmt.subquery())
        ) or 0
        
        # Apply pagination
        stmt = stmt.order_by(desc(models.User.created_at))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        users = self.db.scalars(stmt).all()
        
        # Build DTOs with computed fields
        items = []
        for user in users:
            # Count active sessions
            sessions_count = self.db.scalar(
                select(func.count(models.RefreshToken.id))
                .where(
                    and_(
                        models.RefreshToken.user_id == user.id,
                        models.RefreshToken.is_active == True,
                        models.RefreshToken.expires_at > datetime.utcnow()
                    )
                )
            ) or 0
            
            # Count applications
            apps_count = self.db.scalar(
                select(func.count(models.Application.id))
                .where(models.Application.user_id == user.id)
            ) or 0
            
            items.append(dto.UserListItemDTO(
                id=user.id,
                email=user.email,
                role=user.role,
                is_premium=user.is_premium,
                premium_expires_at=user.premium_expires_at,
                email_verified_at=user.email_verified_at,
                is_oauth_user=user.is_oauth_user,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                active_sessions_count=sessions_count,
                total_applications=apps_count
            ))
        
        return dto.PaginatedUsersDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        )
    
    def get_user_detail(self, user_id: int) -> Optional[dto.UserDetailDTO]:
        """Get detailed user information."""
        user = self.db.get(models.User, user_id)
        if not user:
            return None
        
        # Count resources
        sessions_count = self.db.scalar(
            select(func.count(models.RefreshToken.id))
            .where(
                and_(
                    models.RefreshToken.user_id == user.id,
                    models.RefreshToken.is_active == True,
                    models.RefreshToken.expires_at > datetime.utcnow()
                )
            )
        ) or 0
        
        apps_count = self.db.scalar(
            select(func.count(models.Application.id))
            .where(models.Application.user_id == user.id)
        ) or 0
        
        jobs_count = self.db.scalar(
            select(func.count(models.Job.id))
            .where(models.Job.user_id == user.id)
        ) or 0
        
        reminders_count = self.db.scalar(
            select(func.count(models.Reminder.id))
            .where(models.Reminder.user_id == user.id)
        ) or 0
        
        docs_count = self.db.scalar(
            select(func.count(models.Resume.id))
            .where(models.Resume.user_id == user.id)
        ) or 0
        
        return dto.UserDetailDTO(
            id=user.id,
            email=user.email,
            role=user.role,
            is_premium=user.is_premium,
            premium_expires_at=user.premium_expires_at,
            email_verified_at=user.email_verified_at,
            is_oauth_user=user.is_oauth_user,
            google_id=user.google_id,
            avatar_url=user.avatar_url,
            location=user.location,
            timezone=user.timezone,
            phone=user.phone,
            linkedin_url=user.linkedin_url,
            website=user.website,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            active_sessions_count=sessions_count,
            total_applications=apps_count,
            total_jobs=jobs_count,
            total_reminders=reminders_count,
            total_documents=docs_count
        )
    
    def get_user_applications(self, user_id: int, limit: int = 50) -> List[dto.UserApplicationDTO]:
        """Get user's applications."""
        stmt = (
            select(models.Application)
            .where(models.Application.user_id == user_id)
            .order_by(desc(models.Application.created_at))
            .limit(limit)
        )
        
        applications = self.db.scalars(stmt).all()
        
        return [
            dto.UserApplicationDTO(
                id=app.id,
                job_title=app.job_title,
                company_name=app.company_name,
                current_stage=app.current_stage,
                applied_date=app.applied_date,
                created_at=app.created_at
            )
            for app in applications
        ]
    
    def get_user_jobs(self, user_id: int, limit: int = 50) -> List[dto.UserJobDTO]:
        """Get user's saved jobs."""
        stmt = (
            select(models.Job)
            .where(models.Job.user_id == user_id)
            .order_by(desc(models.Job.created_at))
            .limit(limit)
        )
        
        jobs = self.db.scalars(stmt).all()
        
        return [
            dto.UserJobDTO(
                id=job.id,
                title=job.title,
                company=job.company,
                location=job.location,
                created_at=job.created_at
            )
            for job in jobs
        ]
    
    def get_user_activity(self, user_id: int, limit: int = 50) -> List[dto.ActivityEventDTO]:
        """Get user's recent activity from logs."""
        stmt = (
            select(models.ApplicationLog)
            .where(models.ApplicationLog.user_id == user_id)
            .order_by(desc(models.ApplicationLog.timestamp))
            .limit(limit)
        )
        
        logs = self.db.scalars(stmt).all()
        
        return [
            dto.ActivityEventDTO(
                id=log.id,
                timestamp=log.timestamp,
                user_email=None,  # Not needed since we know the user
                user_id=log.user_id,
                event_type=self._parse_event_type(log),
                message=log.message,
                level=log.level
            )
            for log in logs
        ]
