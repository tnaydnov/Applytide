"""
Admin dashboard endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_admin import get_admin_user
from app.db import models
from app.domain.admin.service import AdminService
from app.domain.admin import dto

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get admin service instance."""
    return AdminService(db)


@router.get("/stats", response_model=dto.DashboardStatsDTO)
def get_dashboard_stats(
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get dashboard statistics.
    
    Returns quick stats cards:
    - Total users, premium users
    - New users today/this week
    - Total applications
    - Active sessions
    - Recent error count
    """
    return service.get_dashboard_stats()


@router.get("/activity", response_model=List[dto.ActivityEventDTO])
def get_activity_feed(
    limit: int = 20,
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get recent activity feed.
    
    Returns recent events from application logs including:
    - User registrations
    - User logins
    - Application creations
    - Errors
    - Other significant events
    """
    if limit > 100:
        limit = 100  # Max 100 events
    
    return service.get_activity_feed(limit=limit)


@router.get("/charts", response_model=dto.DashboardChartsDTO)
def get_dashboard_charts(
    admin_user: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service)
):
    """
    Get chart data for dashboard.
    
    Returns data for last 7 days:
    - Daily signups
    - Daily applications
    - Daily errors
    """
    return service.get_dashboard_charts()
