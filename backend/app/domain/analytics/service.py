"""
Analytics Service - User Analytics and Insights

Provides comprehensive analytics for job application tracking, including
success rates, timeline analysis, activity patterns, and performance metrics.

Key Features:
- Overview metrics (applications, interviews, offers)
- Application tracking and analysis
- Interview performance metrics
- Company-specific analytics
- Timeline and funnel analysis
- Activity streaks and patterns
- Source effectiveness tracking
- Experimental A/B testing support
- Best time recommendations
- Expectation management (response times)

Architecture:
- Pure domain service (framework-agnostic)
- Repository pattern for data access
- Functional metrics calculation
- DTO pattern for clean data transfer
- Comprehensive error handling
- Structured logging

Performance:
- Time-range based queries for efficiency
- Batch data loading (no N+1 queries)
- In-memory aggregations for complex metrics
- Optimized for 180-day default range

Security:
- User isolation enforced (user_id required)
- No PII in logs
- Read-only operations only

Example:
    service = AnalyticsService(repo)
    analytics = service.get_analytics(
        user_id=user_id,
        range_param="3m"  # Last 3 months
    )
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from uuid import UUID

from .ports import IAnalyticsReadRepo
from .dto import StageLiteDTO
from .metrics import (
    calculate_overview_metrics, calculate_application_metrics, calculate_interview_metrics,
    calculate_company_metrics, calculate_timeline_metrics, calculate_activity_metrics,
    calculate_sources_metrics, calculate_experiments_metrics, calculate_best_time_metrics,
    calculate_expectations_metrics
)
from app.infra.logging import get_logger

logger = get_logger(__name__)


def time_range_start(range_param: str) -> datetime:
    """
    Calculate start date for analytics time range.
    
    Args:
        range_param: Time range identifier:
            - "1m": Last 30 days
            - "3m": Last 90 days (3 months)
            - "6m": Last 180 days (6 months)
            - "1y": Last 365 days (1 year)
            - "all": All time (from 2020-01-01)
    
    Returns:
        datetime: Start date for the range (UTC timezone)
    
    Default:
        Returns 180 days ago if range_param not recognized
    
    Example:
        start = time_range_start("3m")  # 90 days ago
    """
    now = datetime.now(timezone.utc)
    ranges = {
        "1m": now - timedelta(days=30),
        "3m": now - timedelta(days=90),
        "6m": now - timedelta(days=180),
        "1y": now - timedelta(days=365),
        "all": datetime(2020, 1, 1, tzinfo=timezone.utc),
    }
    
    start_date = ranges.get(range_param, now - timedelta(days=180))
    
    if range_param not in ranges:
        logger.warning(
            f"Unknown time range parameter: {range_param}, defaulting to 6 months",
            extra={"range_param": range_param}
        )
    
    return start_date


class AnalyticsService:
    """
    Service for calculating user analytics and insights.
    
    Orchestrates data loading and metric calculation for comprehensive
    job application analytics across multiple dimensions.
    
    Attributes:
        repo: Repository for loading analytics data
    
    Thread Safety:
        Thread-safe (read-only operations, no shared state)
    """
    
    def __init__(self, repo: IAnalyticsReadRepo):
        """
        Initialize analytics service with repository.
        
        Args:
            repo: Repository implementing IAnalyticsReadRepo interface
        
        Raises:
            ValueError: If repo is None
        """
        if repo is None:
            logger.error("AnalyticsService initialized with None repository")
            raise ValueError("Repository cannot be None")
        
        self.repo = repo
        logger.debug("AnalyticsService initialized successfully")

    def get_analytics(self, *, user_id: UUID, range_param: str) -> Dict[str, Any]:
        """
        Get comprehensive analytics for a user.
        
        Loads all application data for the specified time range and calculates
        metrics across multiple dimensions: overview, applications, interviews,
        companies, timeline, activity, sources, experiments, timing, and expectations.
        
        Args:
            user_id: UUID of the user to get analytics for
            range_param: Time range for analytics ("1m", "3m", "6m", "1y", "all")
        
        Returns:
            Dict containing analytics sections:
                - overview: High-level metrics (total, rates, funnel)
                - applications: Application-specific analysis
                - interviews: Interview performance metrics
                - companies: Company-level insights
                - timeline: Time-based progression
                - activity: Activity streaks and patterns
                - sources: Source effectiveness analysis
                - experiments: A/B testing results
                - bestTime: Optimal application timing
                - expectations: Response time expectations
        
        Raises:
            ValueError: If user_id is invalid
            Exception: If data loading or calculation fails
        
        Performance:
            - Loads all data in 4 batch queries
            - All calculations in-memory
            - Typical execution: 100-500ms for 180 days
        
        Example:
            analytics = service.get_analytics(
                user_id=UUID("..."),
                range_param="3m"
            )
            print(f"Interview rate: {analytics['overview']['interviewRate']}%")
        """
        try:
            logger.info(
                "Calculating analytics",
                extra={
                    "user_id": str(user_id),
                    "range_param": range_param
                }
            )
            
            # Validate user_id
            if not user_id:
                logger.error("Invalid user_id provided for analytics")
                raise ValueError("user_id is required")
            
            # Calculate time range
            start_date = time_range_start(range_param)
            logger.debug(
                f"Analytics time range: {start_date} to now",
                extra={
                    "start_date": start_date.isoformat(),
                    "range_param": range_param
                }
            )
            
            # Load application data
            try:
                apps = self.repo.list_user_applications_since(
                    user_id=user_id,
                    start_date=start_date
                )
                logger.debug(f"Loaded {len(apps)} applications")
            except Exception as e:
                logger.error(
                    "Failed to load applications",
                    extra={
                        "user_id": str(user_id),
                        "error": str(e)
                    },
                    exc_info=True
                )
                raise
            
            # Load stages for applications
            app_ids = [a.id for a in apps]
            try:
                stages: List[StageLiteDTO] = (
                    self.repo.list_stages_for_applications(app_ids=app_ids)
                    if app_ids else []
                )
                logger.debug(f"Loaded {len(stages)} stages for {len(app_ids)} applications")
            except Exception as e:
                logger.error(
                    "Failed to load stages",
                    extra={
                        "user_id": str(user_id),
                        "app_count": len(app_ids),
                        "error": str(e)
                    },
                    exc_info=True
                )
                # Continue with empty stages rather than failing
                stages = []
            
            # Load job and company data
            try:
                jobs_map = self.repo.map_jobs(job_ids=[a.job_id for a in apps])
                comp_ids = [j.company_id for j in jobs_map.values() if j and j.company_id]
                companies_map = self.repo.map_companies(company_ids=comp_ids)
                logger.debug(
                    f"Loaded {len(jobs_map)} jobs and {len(companies_map)} companies"
                )
            except Exception as e:
                logger.error(
                    "Failed to load jobs/companies",
                    extra={
                        "user_id": str(user_id),
                        "error": str(e)
                    },
                    exc_info=True
                )
                # Continue with empty maps
                jobs_map = {}
                companies_map = {}
            
            # Calculate all metrics
            try:
                analytics = {
                    "overview": calculate_overview_metrics(apps, stages, start_date),
                    "applications": calculate_application_metrics(apps, jobs_map, companies_map),
                    "interviews": calculate_interview_metrics(stages, apps),
                    "companies": calculate_company_metrics(apps, jobs_map, companies_map),
                    "timeline": calculate_timeline_metrics(apps, stages),
                    "activity": calculate_activity_metrics(apps),
                    "sources": calculate_sources_metrics(apps, stages),
                    "experiments": calculate_experiments_metrics(apps, stages),
                    "bestTime": calculate_best_time_metrics(apps),
                    "expectations": calculate_expectations_metrics(apps, stages),
                }
                
                logger.info(
                    "Analytics calculated successfully",
                    extra={
                        "user_id": str(user_id),
                        "range_param": range_param,
                        "total_applications": len(apps),
                        "total_stages": len(stages)
                    }
                )
                
                return analytics
                
            except Exception as e:
                logger.error(
                    "Failed to calculate analytics metrics",
                    extra={
                        "user_id": str(user_id),
                        "range_param": range_param,
                        "error": str(e)
                    },
                    exc_info=True
                )
                raise
                
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(
                "Failed to get analytics",
                extra={
                    "user_id": str(user_id) if user_id else None,
                    "range_param": range_param,
                    "error": str(e)
                },
                exc_info=True
            )
            raise
