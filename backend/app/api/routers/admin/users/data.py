"""
Admin User Management - Data Access

Handles user data retrieval operations:
- Get user's job applications
- Get user's saved jobs
- Get user's activity timeline

All endpoints require admin authentication.
Read-only operations for user support and analytics.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_admin_user, get_admin_service
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/{user_id}/applications", response_model=list[dto.UserApplicationDTO])
def get_user_applications(
    user_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve list of job applications submitted by a user.
    
    Returns detailed application history including job details,
    status, and timestamps. Essential for user support and
    application tracking.
    
    Path Parameters:
        user_id (UUID): ID of the user whose applications to retrieve
        
    Query Parameters:
        limit (int): Maximum number of applications to return (default: 50)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: AdminService instance (from dependency)
        
    Returns:
        list[UserApplicationDTO]: List of application records containing:
            - id: Application UUID
            - job_id: Associated job UUID
            - job_title: Job position title
            - company: Company name
            - status: Application status (applied, in_review, interview, etc.)
            - applied_at: Application submission timestamp
            - last_updated_at: Last status change timestamp
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if applications cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Applications are ordered by applied_at desc (most recent first)
        - Limit parameter controls maximum results returned
        - Use for: user support, application tracking, dispute resolution
        - Includes full job details for context
        
    Example:
        GET /api/admin/users/123e4567-e89b-12d3-a456-426614174000/applications?limit=100
        Returns up to 100 most recent applications for the user
    """
    try:
        logger.debug(
            "Admin fetching user applications",
            extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id), "limit": limit}
        )
        
        # Verify user exists
        user = service.get_user_detail(user_id)
        if not user:
            logger.warning(
                "User not found for applications fetch",
                extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        applications = service.get_user_applications(user_id, limit)
        
        logger.info(
            "User applications retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "applications_count": len(applications)
            }
        )
        
        return applications
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching user applications",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user applications"
        )


@router.get("/{user_id}/jobs", response_model=list[dto.UserJobDTO])
def get_user_jobs(
    user_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve list of jobs saved/bookmarked by a user.
    
    Returns user's saved job listings with full job details.
    Essential for understanding user interests and job search behavior.
    
    Path Parameters:
        user_id (UUID): ID of the user whose saved jobs to retrieve
        
    Query Parameters:
        limit (int): Maximum number of jobs to return (default: 50)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: AdminService instance (from dependency)
        
    Returns:
        list[UserJobDTO]: List of saved job records containing:
            - id: Job UUID
            - title: Job position title
            - company: Company name
            - location: Job location
            - salary_range: Salary information (if provided)
            - posted_at: Job posting timestamp
            - saved_at: When user bookmarked the job
            - is_active: Whether job is still accepting applications
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if jobs cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Jobs are ordered by saved_at desc (most recently saved first)
        - Includes both active and expired job postings
        - Use for: understanding user preferences, support inquiries
        - Saved jobs don't imply applications were submitted
        
    Example:
        GET /api/admin/users/123e4567-e89b-12d3-a456-426614174000/jobs?limit=100
        Returns up to 100 most recently saved jobs for the user
    """
    try:
        logger.debug(
            "Admin fetching user jobs",
            extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id), "limit": limit}
        )
        
        # Verify user exists
        user = service.get_user_detail(user_id)
        if not user:
            logger.warning(
                "User not found for jobs fetch",
                extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        jobs = service.get_user_jobs(user_id, limit)
        
        logger.info(
            "User jobs retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "jobs_count": len(jobs)
            }
        )
        
        return jobs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching user jobs",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user jobs"
        )


@router.get("/{user_id}/activity", response_model=list[dto.ActivityEventDTO])
def get_user_activity(
    user_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve user's recent activity timeline from application logs.
    
    Returns chronological activity log showing user actions, logins,
    and system events. Essential for user behavior analysis, support,
    and security investigations.
    
    Path Parameters:
        user_id (UUID): ID of the user whose activity to retrieve
        
    Query Parameters:
        limit (int): Maximum number of activity events to return (default: 50)
        
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: AdminService instance (from dependency)
        
    Returns:
        list[ActivityEventDTO]: List of activity events containing:
            - id: Event UUID
            - event_type: Type of activity (login, application_submit, etc.)
            - description: Human-readable description of the event
            - timestamp: When the event occurred
            - ip_address: Source IP address (if available)
            - user_agent: Browser/device information (if available)
            - metadata: Additional event-specific data (JSON)
            
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 500 if activity cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Events are ordered by timestamp desc (most recent first)
        - Includes login events, application submissions, profile updates
        - IP address and user agent help with fraud detection
        - Use for: support tickets, suspicious activity investigation
        - Activity is sourced from ApplicationLog table
        - Metadata field contains event-specific additional context
        
    Example:
        GET /api/admin/users/123e4567-e89b-12d3-a456-426614174000/activity?limit=100
        Returns up to 100 most recent activity events for the user
    """
    try:
        logger.debug(
            "Admin fetching user activity",
            extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id), "limit": limit}
        )
        
        # Verify user exists
        user = service.get_user_detail(user_id)
        if not user:
            logger.warning(
                "User not found for activity fetch",
                extra={"admin_id": str(admin_user.id), "target_user_id": str(user_id)}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        activity = service.get_user_activity(user_id, limit)
        
        logger.info(
            "User activity retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "activity_count": len(activity)
            }
        )
        
        return activity
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching user activity",
            extra={
                "admin_id": str(admin_user.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user activity"
        )
