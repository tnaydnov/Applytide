"""
User Service - Admin User Management Operations

Provides user management operations for the admin panel including user listing,
user details, and user resource access (applications, jobs, activity).
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db import models
from app.domain.admin import dto
from app.infra.logging import get_logger

logger = get_logger(__name__)


class UserService:
    """Service for admin user management operations."""
    
    def __init__(self, db: Session):
        """Initialize user service with database session."""
        if db is None:
            logger.error("UserService initialized with None database session")
            raise ValueError("Database session cannot be None")
        
        self.db = db
        logger.debug("UserService initialized successfully")
    
    def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_premium: Optional[bool] = None,
        email_verified: Optional[bool] = None
    ) -> dto.PaginatedUsersDTO:
        """
        Get paginated list of users with filters.
        
        Args:
            page: Page number (1-indexed, default 1)
            page_size: Items per page (default 20, max 100)
            search: Search term for email/location (optional)
            role: Filter by role (optional)
            is_premium: Filter by premium status (optional)
            email_verified: Filter by email verification status (optional)
        
        Returns:
            PaginatedUsersDTO with user list and pagination metadata
        
        Raises:
            ValueError: If pagination parameters are invalid
            SQLAlchemyError: If database query fails
        """
        try:
            # Input validation
            if not isinstance(page, int) or page < 1:
                logger.warning(f"Invalid page parameter: {page}, using default 1")
                page = 1
            
            if not isinstance(page_size, int) or page_size < 1:
                logger.warning(f"Invalid page_size parameter: {page_size}, using default 20")
                page_size = 20
            
            if page_size > 100:
                logger.warning(f"page_size {page_size} exceeds maximum 100, capping at 100")
                page_size = 100
            
            logger.debug(f"Fetching users: page={page}, page_size={page_size}, search={search}, role={role}")
            
            # Base query
            stmt = select(models.User)
            
            # Apply filters
            filters = []
            
            if search:
                try:
                    search_term = f"%{search}%"
                    filters.append(
                        or_(
                            models.User.email.ilike(search_term),
                            models.User.location.ilike(search_term)
                        )
                    )
                    logger.debug(f"Applied search filter: {search}")
                except Exception as e:
                    logger.warning(f"Failed to apply search filter: {e}")
            
            if role:
                filters.append(models.User.role == role)
                logger.debug(f"Applied role filter: {role}")
            
            if is_premium is not None:
                # Filter by subscription status - paid plans (pro/premium) are considered premium
                if is_premium:
                    filters.append(
                        and_(
                            models.User.subscription_plan != 'starter',
                            models.User.subscription_status == 'active'
                        )
                    )
                else:
                    filters.append(
                        or_(
                            models.User.subscription_plan == 'starter',
                            models.User.subscription_status != 'active'
                        )
                    )
                logger.debug(f"Applied is_premium filter: {is_premium}")
            
            if email_verified is not None:
                if email_verified:
                    filters.append(models.User.email_verified_at.isnot(None))
                else:
                    filters.append(models.User.email_verified_at.is_(None))
                logger.debug(f"Applied email_verified filter: {email_verified}")
            
            if filters:
                stmt = stmt.where(and_(*filters))
            
            # Get total count
            try:
                total = self.db.scalar(
                    select(func.count()).select_from(stmt.subquery())
                ) or 0
                logger.debug(f"Total users matching filters: {total}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to count users: {e}", exc_info=True)
                total = 0
            
            # Apply pagination
            stmt = stmt.order_by(desc(models.User.created_at))
            stmt = stmt.offset((page - 1) * page_size).limit(page_size)
            
            # Execute query
            try:
                users = self.db.scalars(stmt).all()
                logger.debug(f"Retrieved {len(users)} users")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query users: {e}", exc_info=True)
                return dto.PaginatedUsersDTO(
                    items=[],
                    total=0,
                    page=page,
                    page_size=page_size,
                    total_pages=0
                )
            
            # Build DTOs with computed fields
            items = []
            for user in users:
                if not user:
                    continue
                
                try:
                    # Count active sessions
                    sessions_count = 0
                    try:
                        if hasattr(user, 'id') and user.id:
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
                    except SQLAlchemyError as e:
                        logger.debug(f"Failed to count sessions for user {user.id}: {e}")
                    
                    # Count applications
                    apps_count = 0
                    try:
                        if hasattr(user, 'id') and user.id:
                            apps_count = self.db.scalar(
                                select(func.count(models.Application.id))
                                .where(models.Application.user_id == user.id)
                            ) or 0
                    except SQLAlchemyError as e:
                        logger.debug(f"Failed to count applications for user {user.id}: {e}")
                    
                    items.append(dto.UserListItemDTO(
                        id=user.id if hasattr(user, 'id') else None,
                        email=user.email if hasattr(user, 'email') else "",
                        role=user.role if hasattr(user, 'role') else "user",
                        is_premium=user.is_premium if hasattr(user, 'is_premium') else False,
                        premium_expires_at=user.premium_expires_at if hasattr(user, 'premium_expires_at') else None,
                        email_verified_at=user.email_verified_at if hasattr(user, 'email_verified_at') else None,
                        is_oauth_user=user.is_oauth_user if hasattr(user, 'is_oauth_user') else False,
                        last_login_at=user.last_login_at if hasattr(user, 'last_login_at') else None,
                        created_at=user.created_at if hasattr(user, 'created_at') else datetime.utcnow(),
                        active_sessions_count=sessions_count,
                        total_applications=apps_count
                    ))
                except Exception as e:
                    logger.warning(f"Failed to build UserListItemDTO for user {getattr(user, 'id', 'unknown')}: {e}")
                    continue
            
            result = dto.PaginatedUsersDTO(
                items=items,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=(total + page_size - 1) // page_size if page_size > 0 else 0
            )
            
            logger.info(f"Users list retrieved successfully: {len(items)} users on page {page}")
            return result
            
        except Exception as e:
            logger.error(
                "Failed to retrieve users list",
                extra={"page": page, "page_size": page_size, "error": str(e)},
                exc_info=True
            )
            return dto.PaginatedUsersDTO(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0
            )
    
    def get_user_detail(self, user_id: int) -> Optional[dto.UserDetailDTO]:
        """
        Get detailed user information.
        
        Args:
            user_id: ID of the user to retrieve
        
        Returns:
            UserDetailDTO with full user information and resource counts, or None if user not found
        
        Raises:
            ValueError: If user_id is invalid
            SQLAlchemyError: If database query fails
        """
        try:
            # Input validation
            if not isinstance(user_id, int) or user_id < 1:
                logger.warning(f"Invalid user_id parameter: {user_id}")
                return None
            
            logger.debug(f"Fetching user detail for user_id={user_id}")
            
            # Get user
            try:
                user = self.db.get(models.User, user_id)
            except SQLAlchemyError as e:
                logger.error(f"Failed to query user {user_id}: {e}", exc_info=True)
                return None
            
            if not user:
                logger.debug(f"User {user_id} not found")
                return None
            
            # Count resources with individual error handling
            sessions_count = 0
            try:
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
            except SQLAlchemyError as e:
                logger.warning(f"Failed to count sessions for user {user_id}: {e}")
            
            apps_count = 0
            try:
                apps_count = self.db.scalar(
                    select(func.count(models.Application.id))
                    .where(models.Application.user_id == user.id)
                ) or 0
            except SQLAlchemyError as e:
                logger.warning(f"Failed to count applications for user {user_id}: {e}")
            
            jobs_count = 0
            try:
                jobs_count = self.db.scalar(
                    select(func.count(models.Job.id))
                    .where(models.Job.user_id == user.id)
                ) or 0
            except SQLAlchemyError as e:
                logger.warning(f"Failed to count jobs for user {user_id}: {e}")
            
            reminders_count = 0
            try:
                reminders_count = self.db.scalar(
                    select(func.count(models.Reminder.id))
                    .where(models.Reminder.user_id == user.id)
                ) or 0
            except SQLAlchemyError as e:
                logger.warning(f"Failed to count reminders for user {user_id}: {e}")
            
            docs_count = 0
            try:
                docs_count = self.db.scalar(
                    select(func.count(models.Resume.id))
                    .where(models.Resume.user_id == user.id)
                ) or 0
            except SQLAlchemyError as e:
                logger.warning(f"Failed to count documents for user {user_id}: {e}")
            
            # Build DTO with safe attribute access
            detail = dto.UserDetailDTO(
                id=user.id if hasattr(user, 'id') else None,
                email=user.email if hasattr(user, 'email') else "",
                role=user.role if hasattr(user, 'role') else "user",
                is_premium=user.is_premium if hasattr(user, 'is_premium') else False,
                premium_expires_at=user.premium_expires_at if hasattr(user, 'premium_expires_at') else None,
                email_verified_at=user.email_verified_at if hasattr(user, 'email_verified_at') else None,
                is_oauth_user=user.is_oauth_user if hasattr(user, 'is_oauth_user') else False,
                google_id=user.google_id if hasattr(user, 'google_id') else None,
                avatar_url=user.avatar_url if hasattr(user, 'avatar_url') else None,
                location=user.location if hasattr(user, 'location') else None,
                timezone=user.timezone if hasattr(user, 'timezone') else None,
                phone=user.phone if hasattr(user, 'phone') else None,
                linkedin_url=user.linkedin_url if hasattr(user, 'linkedin_url') else None,
                website=user.website if hasattr(user, 'website') else None,
                last_login_at=user.last_login_at if hasattr(user, 'last_login_at') else None,
                created_at=user.created_at if hasattr(user, 'created_at') else datetime.utcnow(),
                updated_at=user.updated_at if hasattr(user, 'updated_at') else datetime.utcnow(),
                active_sessions_count=sessions_count,
                total_applications=apps_count,
                total_jobs=jobs_count,
                total_reminders=reminders_count,
                total_documents=docs_count
            )
            
            logger.info(f"User detail retrieved successfully for user {user_id}")
            return detail
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve user detail for user {user_id}",
                extra={"user_id": user_id, "error": str(e)},
                exc_info=True
            )
            return None
    
    def get_user_applications(self, user_id: int, limit: int = 50) -> List[dto.UserApplicationDTO]:
        """
        Get user's applications.
        
        Args:
            user_id: ID of the user
            limit: Maximum number of applications to return (default 50, max 200)
        
        Returns:
            List of UserApplicationDTO objects ordered by created_at descending
        
        Raises:
            ValueError: If user_id or limit is invalid
            SQLAlchemyError: If database query fails
        """
        try:
            # Input validation
            if not isinstance(user_id, int) or user_id < 1:
                logger.warning(f"Invalid user_id parameter: {user_id}")
                return []
            
            if not isinstance(limit, int) or limit < 1:
                logger.warning(f"Invalid limit parameter: {limit}, using default 50")
                limit = 50
            
            if limit > 200:
                logger.warning(f"Limit {limit} exceeds maximum 200, capping at 200")
                limit = 200
            
            logger.debug(f"Fetching applications for user {user_id}, limit={limit}")
            
            # Query applications
            try:
                stmt = (
                    select(models.Application)
                    .where(models.Application.user_id == user_id)
                    .order_by(desc(models.Application.created_at))
                    .limit(limit)
                )
                
                applications = self.db.scalars(stmt).all()
                logger.debug(f"Retrieved {len(applications)} applications for user {user_id}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query applications for user {user_id}: {e}", exc_info=True)
                return []
            
            # Build DTOs with safe attribute access
            results = []
            for app in applications:
                if not app:
                    continue
                
                try:
                    results.append(dto.UserApplicationDTO(
                        id=app.id if hasattr(app, 'id') else None,
                        job_title=app.job_title if hasattr(app, 'job_title') else "",
                        company_name=app.company_name if hasattr(app, 'company_name') else "",
                        current_stage=app.current_stage if hasattr(app, 'current_stage') else "",
                        applied_date=app.applied_date if hasattr(app, 'applied_date') else None,
                        created_at=app.created_at if hasattr(app, 'created_at') else datetime.utcnow()
                    ))
                except Exception as e:
                    logger.warning(f"Failed to build UserApplicationDTO for app {getattr(app, 'id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"User applications retrieved successfully: {len(results)} applications for user {user_id}")
            return results
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve applications for user {user_id}",
                extra={"user_id": user_id, "limit": limit, "error": str(e)},
                exc_info=True
            )
            return []
    
    def get_user_jobs(self, user_id: int, limit: int = 50) -> List[dto.UserJobDTO]:
        """
        Get user's saved jobs.
        
        Args:
            user_id: ID of the user
            limit: Maximum number of jobs to return (default 50, max 200)
        
        Returns:
            List of UserJobDTO objects ordered by created_at descending
        
        Raises:
            ValueError: If user_id or limit is invalid
            SQLAlchemyError: If database query fails
        """
        try:
            # Input validation
            if not isinstance(user_id, int) or user_id < 1:
                logger.warning(f"Invalid user_id parameter: {user_id}")
                return []
            
            if not isinstance(limit, int) or limit < 1:
                logger.warning(f"Invalid limit parameter: {limit}, using default 50")
                limit = 50
            
            if limit > 200:
                logger.warning(f"Limit {limit} exceeds maximum 200, capping at 200")
                limit = 200
            
            logger.debug(f"Fetching jobs for user {user_id}, limit={limit}")
            
            # Query jobs
            try:
                stmt = (
                    select(models.Job)
                    .where(models.Job.user_id == user_id)
                    .order_by(desc(models.Job.created_at))
                    .limit(limit)
                )
                
                jobs = self.db.scalars(stmt).all()
                logger.debug(f"Retrieved {len(jobs)} jobs for user {user_id}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query jobs for user {user_id}: {e}", exc_info=True)
                return []
            
            # Build DTOs with safe attribute access
            results = []
            for job in jobs:
                if not job:
                    continue
                
                try:
                    results.append(dto.UserJobDTO(
                        id=job.id if hasattr(job, 'id') else None,
                        title=job.title if hasattr(job, 'title') else "",
                        company=job.company if hasattr(job, 'company') else "",
                        location=job.location if hasattr(job, 'location') else "",
                        created_at=job.created_at if hasattr(job, 'created_at') else datetime.utcnow()
                    ))
                except Exception as e:
                    logger.warning(f"Failed to build UserJobDTO for job {getattr(job, 'id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"User jobs retrieved successfully: {len(results)} jobs for user {user_id}")
            return results
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve jobs for user {user_id}",
                extra={"user_id": user_id, "limit": limit, "error": str(e)},
                exc_info=True
            )
            return []
    
    def get_user_activity(self, user_id: int, limit: int = 50) -> List[dto.ActivityEventDTO]:
        """
        Get user's recent business events (not HTTP request logs).
        
        Args:
            user_id: ID of the user
            limit: Maximum number of events to return (default 50, max 200)
        
        Returns:
            List of ActivityEventDTO objects ordered by timestamp descending
        
        Raises:
            ValueError: If user_id or limit is invalid
            SQLAlchemyError: If database query fails
        """
        try:
            # Input validation
            if not isinstance(user_id, int) or user_id < 1:
                logger.warning(f"Invalid user_id parameter: {user_id}")
                return []
            
            if not isinstance(limit, int) or limit < 1:
                logger.warning(f"Invalid limit parameter: {limit}, using default 50")
                limit = 50
            
            if limit > 200:
                logger.warning(f"Limit {limit} exceeds maximum 200, capping at 200")
                limit = 200
            
            logger.debug(f"Fetching activity for user {user_id}, limit={limit}")
            
            # Query activity logs
            try:
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
                logger.debug(f"Retrieved {len(logs)} activity logs for user {user_id}")
            except SQLAlchemyError as e:
                logger.error(f"Failed to query activity for user {user_id}: {e}", exc_info=True)
                return []
            
            # Build DTOs with safe attribute access
            results = []
            for log in logs:
                if not log:
                    continue
                
                try:
                    event_type = None
                    if hasattr(log, 'extra') and log.extra and isinstance(log.extra, dict):
                        event_type = log.extra.get('event_type')
                    
                    if not event_type:
                        event_type = self._parse_event_type(log)
                    
                    results.append(dto.ActivityEventDTO(
                        id=log.id if hasattr(log, 'id') else None,
                        timestamp=log.timestamp if hasattr(log, 'timestamp') else datetime.utcnow(),
                        user_email=None,  # Not needed since we know the user
                        user_id=log.user_id if hasattr(log, 'user_id') else user_id,
                        event_type=event_type,
                        message=log.message if hasattr(log, 'message') else "",
                        level=log.level if hasattr(log, 'level') else "INFO"
                    ))
                except Exception as e:
                    logger.warning(f"Failed to build ActivityEventDTO for log {getattr(log, 'id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"User activity retrieved successfully: {len(results)} events for user {user_id}")
            return results
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve activity for user {user_id}",
                extra={"user_id": user_id, "limit": limit, "error": str(e)},
                exc_info=True
            )
            return []
    
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
