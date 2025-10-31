"""
User Dashboard Metrics Router

This module provides quick dashboard metrics for the main user dashboard.
Returns high-level counts and status breakdowns for jobs, resumes, and applications.

Key Features:
- Quick dashboard metrics aggregation
- Multi-entity counts (jobs, resumes, applications)
- Application status breakdown
- Optimized for dashboard overview display

Use Cases:
- Main dashboard overview cards
- Quick stats display
- User progress tracking

Dependencies:
- SQLAlchemy for database aggregations
- User authentication for data isolation

Router: /api/dashboard
Note: Different from admin dashboard (/api/admin/dashboard)
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ...db.session import get_db
from ...db import models
from ...api.deps import get_current_user
from ...infra.logging import get_logger
from ...domain.analytics.insights import generate_dashboard_insights
from ...domain.analytics.ports import IAnalyticsReadRepo
from ...infra.repositories.analytics_sqlalchemy import AnalyticsSQLARepository

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = get_logger(__name__)

@router.get("/metrics", response_model=dict)
def metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get dashboard overview metrics.
    
    Retrieves quick summary metrics for user dashboard including counts of jobs,
    resumes, applications, and application status breakdown.
    
    Args:
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Dashboard metrics with:
            - total_jobs: Count of saved jobs
            - total_resumes: Count of uploaded resumes/documents
            - total_applications: Count of all applications
            - applications_by_status: Dict mapping status to count
    
    Raises:
        Exception: Re-raises any database errors for global handler
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own metrics
        - Automatic filtering by user_id
    
    Notes:
        - Optimized aggregation queries for performance
        - All counts calculated in database layer
        - applications_by_status groups by status field
        - Used by main dashboard cards
        - Fast response for quick overview
    
    Example:
        GET /api/dashboard/metrics
        Response:
        {
            "total_jobs": 42,
            "total_resumes": 3,
            "total_applications": 28,
            "applications_by_status": {
                "Applied": 15,
                "Interview": 5,
                "Offer": 2,
                "Rejected": 6
            }
        }
    """
    try:
        logger.debug("Getting dashboard metrics", extra={"user_id": current_user.id})

        total_jobs = (
            db.scalar(
                select(func.count(models.Job.id)).where(
                    models.Job.user_id == current_user.id
                )
            )
            or 0
        )
        total_resumes = (
            db.scalar(
                select(func.count(models.Resume.id)).where(
                    models.Resume.user_id == current_user.id
                )
            )
            or 0
        )
        total_apps = (
            db.scalar(
                select(func.count(models.Application.id)).where(
                    models.Application.user_id == current_user.id
                )
            )
            or 0
        )
        by_status = dict(
            db.execute(
                select(
                    models.Application.status, func.count(models.Application.id)
                )
                .where(models.Application.user_id == current_user.id)
                .group_by(models.Application.status)
            ).all()
        )

        logger.debug(
            "Dashboard metrics retrieved",
            extra={
                "user_id": current_user.id,
                "total_jobs": total_jobs,
                "total_resumes": total_resumes,
                "total_applications": total_apps,
            },
        )

        return {
            "total_jobs": total_jobs,
            "total_resumes": total_resumes,
            "total_applications": total_apps,
            "applications_by_status": by_status,
        }
    except Exception as e:
        logger.error(
            "Failed to retrieve dashboard metrics",
            extra={"user_id": current_user.id, "error": str(e)},
            exc_info=True,
        )
        raise


@router.get("/insights", response_model=dict)
def insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get personalized AI insights for dashboard.
    
    Generates 3-5 actionable insights based on user's actual application data,
    patterns, and performance metrics. Insights are prioritized and include
    recommendations for improving job search effectiveness.
    
    Args:
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Dashboard insights with:
            - insights: List of insight objects with:
                - text: The insight message
                - type: "warning", "success", "info", "tip"
                - action: Optional action link (URL)
                - priority: 1-5 (1 is highest)
            - weekly_goal: User's weekly application goal
    
    Raises:
        Exception: Re-raises any database errors for global handler
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own insights
        - Automatic filtering by user_id
    
    Notes:
        - Analyzes last 90 days of data for patterns
        - Prioritizes actionable insights (overdue follow-ups, goals)
        - Detects weekday patterns, company types, response rates
        - Falls back to generic tips if insufficient data
        - Fast response (typically < 200ms)
    
    Example Insights:
        - "You have 3 follow-ups overdue - take action now!"
        - "Your Tuesday applications get 34% more responses"
        - "Tech companies respond 2.1 days faster"
        - "On track! 4/5 applications this week"
    
    Example:
        GET /api/dashboard/insights
        Response:
        {
            "insights": [
                {
                    "text": "You have 2 follow-ups overdue - take action now!",
                    "type": "warning",
                    "action": "/pipeline?filter=overdue",
                    "priority": 1
                },
                {
                    "text": "On track! 3/5 applications this week - 2 to go",
                    "type": "info",
                    "priority": 2
                }
            ],
            "weekly_goal": 5
        }
    """
    try:
        logger.debug("Generating dashboard insights", extra={"user_id": current_user.id})
        
        # Get user's weekly goal (default to 5)
        weekly_goal = current_user.weekly_goal if hasattr(current_user, 'weekly_goal') and current_user.weekly_goal else 5
        
        # Load last 90 days of data for insights
        from datetime import datetime, timezone, timedelta
        start_date = datetime.now(timezone.utc) - timedelta(days=90)
        
        # Use analytics repository to load data
        repo: IAnalyticsReadRepo = AnalyticsSQLARepository(db)
        
        try:
            apps = repo.list_user_applications_since(
                user_id=current_user.id,
                start_date=start_date
            )
            logger.debug(f"Loaded {len(apps)} applications for insights")
        except Exception as e:
            logger.error(
                "Failed to load applications for insights",
                extra={"user_id": current_user.id, "error": str(e)},
                exc_info=True
            )
            apps = []
        
        # Load stages
        app_ids = [a.id for a in apps]
        try:
            stages = repo.list_stages_for_applications(app_ids=app_ids) if app_ids else []
            logger.debug(f"Loaded {len(stages)} stages for insights")
        except Exception as e:
            logger.error(
                "Failed to load stages for insights",
                extra={"user_id": current_user.id, "error": str(e)},
                exc_info=True
            )
            stages = []
        
        # Load jobs and companies
        try:
            jobs_map = repo.map_jobs(job_ids=[a.job_id for a in apps])
            comp_ids = [j.company_id for j in jobs_map.values() if j and j.company_id]
            companies_map = repo.map_companies(company_ids=comp_ids)
            logger.debug(f"Loaded {len(jobs_map)} jobs and {len(companies_map)} companies")
        except Exception as e:
            logger.error(
                "Failed to load jobs/companies for insights",
                extra={"user_id": current_user.id, "error": str(e)},
                exc_info=True
            )
            jobs_map = {}
            companies_map = {}
        
        # Generate insights
        insight_list = generate_dashboard_insights(
            apps=apps,
            stages=stages,
            jobs_map=jobs_map,
            companies_map=companies_map,
            weekly_goal=weekly_goal
        )
        
        logger.info(
            "Dashboard insights generated successfully",
            extra={
                "user_id": current_user.id,
                "insight_count": len(insight_list)
            }
        )
        
        return {
            "insights": insight_list,
            "weekly_goal": weekly_goal
        }
        
    except Exception as e:
        logger.error(
            "Failed to generate dashboard insights",
            extra={"user_id": current_user.id, "error": str(e)},
            exc_info=True,
        )
        # Return safe fallback instead of raising
        return {
            "insights": [{
                "text": "Track your applications to unlock personalized insights",
                "type": "info",
                "priority": 5
            }],
            "weekly_goal": 5
        }
