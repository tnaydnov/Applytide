"""
Dashboard Service - Admin Dashboard Statistics and Monitoring

Provides dashboard metrics, activity feed, and chart data for the admin panel.
Handles all dashboard-related operations including statistics aggregation
and real-time activity monitoring.
"""
from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy import select, func, and_, or_, desc, distinct
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db import models
from app.domain.admin import dto
from app.domain.logging import get_logger

logger = get_logger(__name__)


class DashboardService:
    """Service for admin dashboard operations."""
    
    def __init__(self, db: Session):
        """Initialize dashboard service with database session."""
        if db is None:
            logger.error("DashboardService initialized with None database session")
            raise ValueError("Database session cannot be None")
        
        self.db = db
        logger.debug("DashboardService initialized successfully")
    
    def get_dashboard_stats(self) -> dto.DashboardStatsDTO:
        """Get quick statistics for admin dashboard."""
        try:
            logger.debug("Fetching dashboard statistics")
            
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=7)
            
            # Total users
            try:
                total_users = self.db.scalar(
                    select(func.count(models.User.id))
                ) or 0
                logger.debug(f"Total users: {total_users}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count total users: {e}", exc_info=True)
                total_users = 0
            
            # Premium users (paid plans that are active)
            try:
                premium_users = self.db.scalar(
                    select(func.count(models.User.id))
                    .where(
                        and_(
                            models.User.subscription_plan != 'starter',
                            models.User.subscription_status == 'active'
                        )
                    )
                ) or 0
                logger.debug(f"Premium users: {premium_users}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count premium users: {e}", exc_info=True)
                premium_users = 0
            
            # New users today
            try:
                new_users_today = self.db.scalar(
                    select(func.count(models.User.id))
                    .where(models.User.created_at >= today_start)
                ) or 0
                logger.debug(f"New users today: {new_users_today}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count new users today: {e}", exc_info=True)
                new_users_today = 0
            
            # New users this week
            try:
                new_users_this_week = self.db.scalar(
                    select(func.count(models.User.id))
                    .where(models.User.created_at >= week_start)
                ) or 0
                logger.debug(f"New users this week: {new_users_this_week}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count new users this week: {e}", exc_info=True)
                new_users_this_week = 0
            
            # Total applications
            try:
                total_applications = self.db.scalar(
                    select(func.count(models.Application.id))
                ) or 0
                logger.debug(f"Total applications: {total_applications}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count total applications: {e}", exc_info=True)
                total_applications = 0
            
            # Active users (users with activity in last 24 hours)
            try:
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
                logger.debug(f"Active users (24h): {active_users}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count active users: {e}", exc_info=True)
                active_users = 0
            
            # Recent errors (last 24 hours)
            try:
                recent_errors_count = self.db.scalar(
                    select(func.count(models.ApplicationLog.id))
                    .where(
                        and_(
                            models.ApplicationLog.level.in_(["ERROR", "CRITICAL"]),
                            models.ApplicationLog.timestamp >= now - timedelta(hours=24)
                        )
                    )
                ) or 0
                logger.debug(f"Recent errors (24h): {recent_errors_count}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count recent errors: {e}", exc_info=True)
                recent_errors_count = 0
            
            stats = dto.DashboardStatsDTO(
                total_users=total_users,
                premium_users=premium_users,
                new_users_today=new_users_today,
                new_users_this_week=new_users_this_week,
                total_applications=total_applications,
                active_users=active_users,
                recent_errors_count=recent_errors_count
            )
            
            logger.info(
                "Dashboard statistics retrieved successfully",
                extra={
                    "total_users": total_users,
                    "premium_users": premium_users,
                    "active_users": active_users
                }
            )
            
            return stats
            
        except Exception as e:
            logger.error(
                "Failed to retrieve dashboard statistics",
                extra={"error": str(e)},
                exc_info=True
            )
            raise
    
    def get_activity_feed(self, limit: int = 20) -> List[dto.ActivityEventDTO]:
        """Get recent business events (not HTTP request logs)."""
        try:
            # Input validation
            if not isinstance(limit, int) or limit < 1:
                logger.warning(f"Invalid limit parameter: {limit}, using default 20")
                limit = 20
            if limit > 100:
                logger.warning(f"Limit {limit} exceeds maximum 100, capping at 100")
                limit = 100
            
            logger.debug(f"Fetching activity feed with limit={limit}")
            
            # Filter for logs with event_type in extra field (business events only)
            try:
                stmt = (
                    select(models.ApplicationLog)
                    .where(
                        models.ApplicationLog.extra['event_type'].astext.isnot(None)
                    )
                    .order_by(desc(models.ApplicationLog.timestamp))
                    .limit(limit)
                )
                
                logs = self.db.scalars(stmt).all()
                logger.debug(f"Retrieved {len(logs)} activity log entries")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query activity logs: {e}", exc_info=True)
                return []
            
            if not logs:
                logger.debug("No activity logs found")
                return []
            
            # Get user emails for logs with user_id (with None check)
            user_ids = [log.user_id for log in logs if log and hasattr(log, 'user_id') and log.user_id]
            users_map = {}
            
            if user_ids:
                try:
                    users = self.db.scalars(
                        select(models.User)
                        .where(models.User.id.in_(user_ids))
                    ).all()
                    users_map = {user.id: user.email for user in users if user and hasattr(user, 'id') and hasattr(user, 'email')}
                    logger.debug(f"Loaded {len(users_map)} user emails for activity feed")
                except SQLAlchemyError as e:
                    logger.warning(f"Failed to load user emails for activity feed: {e}")
                    # Continue without user emails
            
            # Build event DTOs with error handling
            events = []
            for log in logs:
                if not log:
                    continue
                
                try:
                    # Get event type from extra field with fallback
                    event_type = None
                    if hasattr(log, 'extra') and log.extra and isinstance(log.extra, dict):
                        event_type = log.extra.get('event_type')
                    
                    if not event_type:
                        event_type = self._parse_event_type(log)
                    
                    events.append(dto.ActivityEventDTO(
                        id=log.id if hasattr(log, 'id') else None,
                        timestamp=log.timestamp if hasattr(log, 'timestamp') else datetime.now(timezone.utc),
                        user_email=users_map.get(log.user_id) if hasattr(log, 'user_id') and log.user_id else None,
                        user_id=log.user_id if hasattr(log, 'user_id') else None,
                        event_type=event_type,
                        message=log.message if hasattr(log, 'message') else "",
                        level=log.level if hasattr(log, 'level') else "INFO"
                    ))
                except Exception as e:
                    logger.warning(f"Failed to build ActivityEventDTO for log {getattr(log, 'id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Activity feed retrieved successfully with {len(events)} events")
            return events
            
        except Exception as e:
            logger.error(
                "Failed to retrieve activity feed",
                extra={"limit": limit, "error": str(e)},
                exc_info=True
            )
            return []
    
    def get_dashboard_charts(self) -> dto.DashboardChartsDTO:
        """Get chart data for last 7 days."""
        try:
            logger.debug("Fetching dashboard charts for last 7 days")
            
            now = datetime.now(timezone.utc)
            start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Generate date range (8 days to include today)
            dates = [(start_date + timedelta(days=i)).date() for i in range(8)]
            logger.debug(f"Generated date range: {dates[0]} to {dates[-1]}")
            
            # Signups per day
            signups_dict = {}
            try:
                signups_stmt = (
                    select(
                        func.date(models.User.created_at).label('date'),
                        func.count(models.User.id).label('count')
                    )
                    .where(models.User.created_at >= start_date)
                    .group_by(func.date(models.User.created_at))
                )
                signups_raw = self.db.execute(signups_stmt).all()
                signups_dict = {row.date: row.count for row in signups_raw if row and hasattr(row, 'date') and hasattr(row, 'count')}
                logger.debug(f"Retrieved signups for {len(signups_dict)} days")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query signups per day: {e}", exc_info=True)
                # Continue with empty dict
            
            # Applications per day
            apps_dict = {}
            try:
                apps_stmt = (
                    select(
                        func.date(models.Application.created_at).label('date'),
                        func.count(models.Application.id).label('count')
                    )
                    .where(models.Application.created_at >= start_date)
                    .group_by(func.date(models.Application.created_at))
                )
                apps_raw = self.db.execute(apps_stmt).all()
                apps_dict = {row.date: row.count for row in apps_raw if row and hasattr(row, 'date') and hasattr(row, 'count')}
                logger.debug(f"Retrieved applications for {len(apps_dict)} days")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query applications per day: {e}", exc_info=True)
                # Continue with empty dict
            
            # Errors per day
            errors_dict = {}
            try:
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
                errors_dict = {row.date: row.count for row in errors_raw if row and hasattr(row, 'date') and hasattr(row, 'count')}
                logger.debug(f"Retrieved errors for {len(errors_dict)} days")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query errors per day: {e}", exc_info=True)
                # Continue with empty dict
            
            # Build chart data with safe date conversion
            try:
                charts = dto.DashboardChartsDTO(
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
                
                logger.info("Dashboard charts retrieved successfully")
                return charts
                
            except Exception as e:
                logger.error(f"Failed to build dashboard charts DTO: {e}", exc_info=True)
                # Return empty charts
                return dto.DashboardChartsDTO(
                    signups_last_7_days=[],
                    applications_last_7_days=[],
                    errors_last_7_days=[]
                )
        
        except Exception as e:
            logger.error(
                "Failed to retrieve dashboard charts",
                extra={"error": str(e)},
                exc_info=True
            )
            # Return empty charts as fallback
            return dto.DashboardChartsDTO(
                signups_last_7_days=[],
                applications_last_7_days=[],
                errors_last_7_days=[]
            )
    
    def _parse_event_type(self, log: models.ApplicationLog) -> str:
        """Parse event type from log message/endpoint."""
        if not log:
            return "general"
        
        try:
            msg = (log.message or "").lower() if hasattr(log, 'message') else ""
            endpoint = (log.endpoint or "").lower() if hasattr(log, 'endpoint') else ""
            level = log.level if hasattr(log, 'level') else ""
            
            if "register" in msg or "signup" in msg:
                return "user_registered"
            elif "login" in msg:
                return "user_login"
            elif "application" in msg and "created" in msg:
                return "application_created"
            elif level in ["ERROR", "CRITICAL"]:
                return "error"
            elif "premium" in msg:
                return "premium_change"
            else:
                return "general"
        except Exception as e:
            logger.debug(f"Failed to parse event type: {e}")
            return "general"
