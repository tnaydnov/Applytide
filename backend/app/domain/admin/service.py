"""
Admin service - core business logic for admin panel.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, case, distinct
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
        
        # Active users (users with activity in last 24 hours)
        twenty_four_hours_ago = now - timedelta(hours=24)
        active_users = self.db.scalar(
            select(func.count(distinct(models.ApplicationLog.user_id)))
            .where(
                and_(
                    models.ApplicationLog.user_id.isnot(None),
                    models.ApplicationLog.timestamp >= twenty_four_hours_ago
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
            active_users=active_users,
            recent_errors_count=recent_errors_count
        )
    
    def get_activity_feed(self, limit: int = 20) -> List[dto.ActivityEventDTO]:
        """Get recent business events (not HTTP request logs)."""
        # Filter for logs with event_type in extra field (business events only)
        stmt = (
            select(models.ApplicationLog)
            .where(
                models.ApplicationLog.extra['event_type'].astext.isnot(None)
            )
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
            # Get event type from extra field
            event_type = log.extra.get('event_type') if log.extra else self._parse_event_type(log)
            
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
        """Get user's recent business events (not HTTP request logs)."""
        stmt = (
            select(models.ApplicationLog)
            .where(
                models.ApplicationLog.user_id == user_id,
                models.ApplicationLog.extra['event_type'].astext.isnot(None)
            )
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
                event_type=log.extra.get('event_type') if log.extra else self._parse_event_type(log),
                message=log.message,
                level=log.level
            )
            for log in logs
        ]
    
    # ========================================================================
    # LLM Usage Tracking Methods
    # ========================================================================
    
    def get_llm_usage_stats(self, hours: Optional[int] = 24) -> dto.LLMUsageStatsDTO:
        """Get LLM usage statistics for the specified time window."""
        cutoff = None
        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        stmt = select(models.LLMUsage)
        if cutoff:
            stmt = stmt.where(models.LLMUsage.timestamp >= cutoff)
        
        # Total calls
        total_calls = self.db.scalar(select(func.count(models.LLMUsage.id)).select_from(stmt.subquery())) or 0
        
        # Successful calls
        successful_calls = self.db.scalar(
            select(func.count(models.LLMUsage.id))
            .select_from(stmt.subquery())
            .where(models.LLMUsage.success == True)
        ) or 0
        
        # Total cost
        total_cost = self.db.scalar(
            select(func.sum(models.LLMUsage.estimated_cost))
            .select_from(stmt.subquery())
        ) or 0.0
        
        # Total tokens
        total_tokens = self.db.scalar(
            select(func.sum(models.LLMUsage.total_tokens))
            .select_from(stmt.subquery())
        ) or 0
        
        # Average response time
        avg_response_time = self.db.scalar(
            select(func.avg(models.LLMUsage.response_time_ms))
            .select_from(stmt.subquery())
        ) or 0
        
        # Usage by endpoint
        endpoint_stats = self.db.execute(
            select(
                models.LLMUsage.endpoint,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost'),
                func.sum(models.LLMUsage.total_tokens).label('tokens')
            )
            .select_from(stmt.subquery())
            .group_by(models.LLMUsage.endpoint)
        ).all()
        
        by_endpoint = [
            {
                "endpoint": row[0],
                "calls": row[1],
                "cost": float(row[2] or 0),
                "tokens": row[3] or 0
            }
            for row in endpoint_stats
        ]
        
        # Usage by model
        model_stats = self.db.execute(
            select(
                models.LLMUsage.model,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost')
            )
            .select_from(stmt.subquery())
            .group_by(models.LLMUsage.model)
        ).all()
        
        by_model = [
            {
                "model": row[0],
                "calls": row[1],
                "cost": float(row[2] or 0)
            }
            for row in model_stats
        ]
        
        # Usage by usage_type (NEW)
        usage_type_stats = self.db.execute(
            select(
                models.LLMUsage.usage_type,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost'),
                func.sum(models.LLMUsage.total_tokens).label('tokens')
            )
            .select_from(stmt.subquery())
            .group_by(models.LLMUsage.usage_type)
        ).all()
        
        by_usage_type = [
            {
                "usage_type": row[0],
                "calls": row[1],
                "cost": float(row[2] or 0),
                "tokens": row[3] or 0
            }
            for row in usage_type_stats
        ]
        
        return dto.LLMUsageStatsDTO(
            total_calls=total_calls,
            successful_calls=successful_calls,
            failed_calls=total_calls - successful_calls,
            total_cost=float(total_cost),
            total_tokens=total_tokens,
            avg_response_time_ms=int(avg_response_time),
            by_endpoint=by_endpoint,
            by_model=by_model,
            by_usage_type=by_usage_type
        )
    
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
        """Get paginated list of LLM usage records."""
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 50
        if page_size > 100:
            page_size = 100
        
        stmt = select(models.LLMUsage)
        
        # Apply filters
        if endpoint:
            stmt = stmt.where(models.LLMUsage.endpoint == endpoint)
        
        if usage_type:
            stmt = stmt.where(models.LLMUsage.usage_type == usage_type)
        
        if user_id:
            stmt = stmt.where(models.LLMUsage.user_id == user_id)
        
        if success_only is not None:
            stmt = stmt.where(models.LLMUsage.success == success_only)
        
        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            stmt = stmt.where(models.LLMUsage.timestamp >= cutoff)
        
        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.scalar(count_stmt) or 0
        
        # Apply pagination
        stmt = stmt.order_by(desc(models.LLMUsage.timestamp))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        records = self.db.scalars(stmt).all()
        
        # Build DTOs
        items = []
        for record in records:
            # Get user email if user_id exists
            user_email = None
            if record.user_id:
                user = self.db.get(models.User, record.user_id)
                user_email = user.email if user else None
            
            items.append(dto.LLMUsageDTO(
                id=record.id,
                timestamp=record.timestamp,
                user_id=record.user_id,
                user_email=user_email,
                provider=record.provider,
                model=record.model,
                endpoint=record.endpoint,
                usage_type=record.usage_type,
                prompt_tokens=record.prompt_tokens,
                completion_tokens=record.completion_tokens,
                total_tokens=record.total_tokens,
                estimated_cost=record.estimated_cost,
                response_time_ms=record.response_time_ms,
                success=record.success,
                error_message=record.error_message
            ))
        
        return dto.PaginatedLLMUsageDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )

    # ========================================================================
    # Security Monitoring
    # ========================================================================

    def get_security_stats(self, hours: int = 24) -> dto.SecurityStatsDTO:
        """
        Get security statistics for the specified time window.
        
        Args:
            hours: Number of hours to look back (default 24)
            
        Returns:
            SecurityStatsDTO with counts of security events
        """
        from datetime import datetime, timedelta
        
        # Calculate cutoff time
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        # Query security-related logs
        # Security events are identified by message patterns or logger names
        security_logs = self.db.query(models.ApplicationLog).filter(
            models.ApplicationLog.timestamp >= cutoff,
            or_(
                # Authentication failures
                and_(
                    models.ApplicationLog.level == 'WARNING',
                    models.ApplicationLog.message.ilike('%login%failed%')
                ),
                and_(
                    models.ApplicationLog.level == 'ERROR',
                    models.ApplicationLog.message.ilike('%authentication%')
                ),
                # Rate limiting
                models.ApplicationLog.message.ilike('%rate%limit%'),
                # Token issues
                models.ApplicationLog.message.ilike('%token%revok%'),
                models.ApplicationLog.message.ilike('%token%invalid%'),
                # Unauthorized access
                and_(
                    models.ApplicationLog.status_code.in_([401, 403]),
                    models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                )
            )
        ).all()
        
        # Count by event type (inferred from message/status)
        failed_logins = len([e for e in security_logs if 
                            ('login' in e.message.lower() and 'fail' in e.message.lower()) or
                            (e.status_code == 401 and 'auth' in e.message.lower())])
        
        rate_limit_violations = len([e for e in security_logs if 'rate' in e.message.lower() and 'limit' in e.message.lower()])
        
        token_revocations = len([e for e in security_logs if 'token' in e.message.lower() and ('revok' in e.message.lower() or 'invalid' in e.message.lower())])
        
        # Count unique IPs for each category
        failed_login_ips = set()
        rate_limit_ips = set()
        
        for event in security_logs:
            ip = event.ip_address
            if not ip and event.extra and isinstance(event.extra, dict):
                ip = event.extra.get('ip_address') or event.extra.get('ip')
            
            if ip:
                msg_lower = event.message.lower()
                if 'login' in msg_lower and 'fail' in msg_lower:
                    failed_login_ips.add(ip)
                elif 'rate' in msg_lower and 'limit' in msg_lower:
                    rate_limit_ips.add(ip)
        
        return dto.SecurityStatsDTO(
            failed_logins=failed_logins,
            unique_failed_ips=len(failed_login_ips),
            rate_limit_violations=rate_limit_violations,
            unique_rate_limit_ips=len(rate_limit_ips),
            token_revocations=token_revocations
        )

    def get_security_events(
        self,
        hours: Optional[int] = 24,
        event_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> list:
        """
        Get paginated list of security events.
        
        Args:
            hours: Number of hours to look back
            event_type: Filter by event type (failed_login, rate_limit, token_revoked, unauthorized)
            page: Page number (1-indexed)
            page_size: Items per page
            
        Returns:
            List of security event dictionaries
        """
        from datetime import datetime, timedelta
        
        # Build query
        query = self.db.query(models.ApplicationLog)
        
        # Filter by security events using message patterns and status codes
        if event_type == 'failed_login':
            query = query.filter(
                or_(
                    and_(
                        models.ApplicationLog.level.in_(['WARNING', 'ERROR']),
                        models.ApplicationLog.message.ilike('%login%fail%')
                    ),
                    and_(
                        models.ApplicationLog.status_code == 401,
                        models.ApplicationLog.message.ilike('%auth%')
                    )
                )
            )
        elif event_type == 'rate_limit':
            query = query.filter(
                models.ApplicationLog.message.ilike('%rate%limit%')
            )
        elif event_type == 'token_revoked':
            query = query.filter(
                and_(
                    models.ApplicationLog.message.ilike('%token%'),
                    or_(
                        models.ApplicationLog.message.ilike('%revok%'),
                        models.ApplicationLog.message.ilike('%invalid%')
                    )
                )
            )
        elif event_type == 'unauthorized':
            query = query.filter(
                and_(
                    models.ApplicationLog.status_code.in_([401, 403]),
                    models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                )
            )
        else:
            # Show all security events
            query = query.filter(
                or_(
                    # Authentication failures
                    and_(
                        models.ApplicationLog.level == 'WARNING',
                        models.ApplicationLog.message.ilike('%login%fail%')
                    ),
                    and_(
                        models.ApplicationLog.level == 'ERROR',
                        models.ApplicationLog.message.ilike('%authentication%')
                    ),
                    # Rate limiting
                    models.ApplicationLog.message.ilike('%rate%limit%'),
                    # Token issues
                    and_(
                        models.ApplicationLog.message.ilike('%token%'),
                        or_(
                            models.ApplicationLog.message.ilike('%revok%'),
                            models.ApplicationLog.message.ilike('%invalid%')
                        )
                    ),
                    # Unauthorized access
                    and_(
                        models.ApplicationLog.status_code.in_([401, 403]),
                        models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                    )
                )
            )
        
        # Time window filter
        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            query = query.filter(models.ApplicationLog.timestamp >= cutoff)
        
        # Order by timestamp descending
        query = query.order_by(models.ApplicationLog.timestamp.desc())
        
        # Pagination
        offset = (page - 1) * page_size
        records = query.offset(offset).limit(page_size).all()
        
        # Build response
        events = []
        for record in records:
            # Extract IP from record or extra data
            ip_address = record.ip_address
            if not ip_address and record.extra and isinstance(record.extra, dict):
                ip_address = record.extra.get('ip_address') or record.extra.get('ip')
            
            # Get user email if user_id exists
            user_email = None
            if record.user_id:
                user = self.db.get(models.User, record.user_id)
                if user:
                    user_email = user.email
            
            # Infer event type from message
            msg_lower = record.message.lower()
            inferred_event_type = 'other'
            severity = 'medium'
            
            if 'login' in msg_lower and 'fail' in msg_lower:
                inferred_event_type = 'failed_login'
                severity = 'medium'
            elif 'rate' in msg_lower and 'limit' in msg_lower:
                inferred_event_type = 'rate_limit'
                severity = 'low'
            elif 'token' in msg_lower and ('revok' in msg_lower or 'invalid' in msg_lower):
                inferred_event_type = 'token_revoked'
                severity = 'info'
            elif record.status_code in [401, 403]:
                inferred_event_type = 'unauthorized'
                severity = 'high' if record.status_code == 403 else 'medium'
            
            # Override with severity from extra if present
            if record.extra and isinstance(record.extra, dict) and 'severity' in record.extra:
                severity = record.extra.get('severity', severity)
            
            events.append({
                'id': str(record.id),
                'timestamp': record.timestamp.isoformat(),
                'event_type': inferred_event_type,
                'severity': severity,
                'user_email': user_email,
                'ip_address': ip_address,
                'message': record.message,
                'status_code': record.status_code,
                'endpoint': record.endpoint,
                'method': record.method
            })
        
        return events
