"""
Admin Dashboard Endpoints

Provides overview statistics and activity monitoring for the admin panel.
This module contains endpoints for:
- Dashboard statistics (users, applications, sessions)
- Recent activity feed
- Chart data for visualizations

All endpoints require admin authentication via get_admin_user dependency.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto
from app.infra.logging import get_logger

# Router configuration
router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])
logger = get_logger(__name__)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """
    Dependency injection for AdminService.
    
    Args:
        db: Database session from FastAPI dependency
        
    Returns:
        AdminService: Initialized service instance with database access
    """
    return AdminService(db)


@router.get("/stats", response_model=dto.DashboardStatsDTO)
def get_dashboard_stats(
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve dashboard overview statistics.
    
    Returns comprehensive statistics for the admin dashboard including:
    - Total users (all-time and by type: premium, verified)
    - New user counts (today and this week)
    - Application statistics (total applications created)
    - Active session count
    - Recent error count (for health monitoring)
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: Admin service instance (from dependency)
        
    Returns:
        DashboardStatsDTO: Statistics object containing all dashboard metrics
        
    Raises:
        HTTPException: 500 if statistics cannot be retrieved
        
    Security:
        Requires admin role authentication
    """
    try:
        # Log the request for audit trail
        logger.debug(
            "Admin fetching dashboard stats",
            extra={"admin_id": str(admin_user.id), "admin_email": admin_user.email}
        )
        
        # Fetch statistics from service layer
        stats = service.get_dashboard_stats()
        
        # Log successful retrieval with key metrics
        logger.info(
            "Dashboard stats retrieved",
            extra={
                "admin_id": str(admin_user.id),
                "total_users": stats.total_users,
                "total_applications": stats.total_applications
            }
        )
        
        return stats
        
    except Exception as e:
        # Log error with full context and stack trace
        logger.error(
            "Error fetching dashboard stats",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch dashboard statistics"
        )


@router.get("/activity", response_model=List[dto.ActivityEventDTO])
def get_activity_feed(
    limit: int = 20,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve recent activity feed for monitoring.
    
    Returns chronologically ordered events from application logs showing:
    - User registrations and authentication events
    - Application creations and status changes
    - System errors and warnings
    - Other significant system events
    
    Args:
        limit: Maximum number of events to return (default: 20, max: 100)
        admin_user: Authenticated admin user (from dependency)
        service: Admin service instance (from dependency)
        
    Returns:
        List[ActivityEventDTO]: List of recent activity events, newest first
        
    Raises:
        HTTPException: 500 if activity feed cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Events are pulled from ApplicationLog table
        - Limit is capped at 100 to prevent excessive data transfer
        - Useful for real-time monitoring of system activity
    """
    try:
        # Enforce maximum limit for performance
        if limit > 100:
            limit = 100  # Max 100 events to prevent excessive data transfer
        
        # Log the request
        logger.debug(
            "Admin fetching activity feed",
            extra={"admin_id": str(admin_user.id), "limit": limit}
        )
        
        # Fetch activity from service
        activity = service.get_activity_feed(limit=limit)
        
        # Log successful retrieval
        logger.info(
            "Activity feed retrieved",
            extra={"admin_id": str(admin_user.id), "event_count": len(activity)}
        )
        
        return activity
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error fetching activity feed",
            extra={"admin_id": str(admin_user.id), "limit": limit, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch activity feed"
        )


@router.get("/charts", response_model=dto.DashboardChartsDTO)
def get_dashboard_charts(
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Retrieve chart data for dashboard visualizations.
    
    Returns time-series data for the last 7 days including:
    - Daily user signups (new registrations per day)
    - Daily applications (job applications created per day)
    - Daily errors (error count per day for system health)
    
    Args:
        admin_user: Authenticated admin user (from dependency)
        service: Admin service instance (from dependency)
        
    Returns:
        DashboardChartsDTO: Time-series data structured for chart rendering
        
    Raises:
        HTTPException: 500 if chart data cannot be retrieved
        
    Security:
        Requires admin role authentication
        
    Notes:
        - Data is aggregated by day
        - Covers last 7 days for trend visualization
        - Useful for identifying patterns and anomalies
    """
    try:
        # Log the request
        logger.debug(
            "Admin fetching dashboard charts",
            extra={"admin_id": str(admin_user.id)}
        )
        
        # Fetch chart data from service
        charts = service.get_dashboard_charts()
        
        # Log successful retrieval
        logger.info(
            "Dashboard charts retrieved",
            extra={"admin_id": str(admin_user.id)}
        )
        
        return charts
        
    except Exception as e:
        # Log error with context
        logger.error(
            "Error fetching dashboard charts",
            extra={"admin_id": str(admin_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch dashboard charts"
        )
