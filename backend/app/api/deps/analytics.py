"""
Analytics service dependencies.

Provides dependency injection for user statistics and insights.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.analytics.service import AnalyticsService
from ...infra.repositories.analytics_sqlalchemy import AnalyticsSQLARepository
from ...infra.logging import get_logger

logger = get_logger(__name__)


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    """
    Provide AnalyticsService for user statistics and insights.
    
    Constructs AnalyticsService with repository for querying application
    statistics, trends, and aggregated data.
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Returns:
        AnalyticsService: Configured service for analytics operations
    
    Components:
        - AnalyticsSQLARepository: Aggregation queries and statistics
        - AnalyticsService: Business logic for insights
    
    Features:
        - Application statistics (total, by stage, by date range)
        - Success rate calculations
        - Timeline visualizations
        - Response time tracking
        - Stage duration analysis
        - Trend identification
    
    Metrics Provided:
        - Total applications count
        - Applications by stage breakdown
        - Average response time
        - Success rate (offers / applications)
        - Most active companies
        - Application trends over time
        - Stage conversion rates
    
    Raises:
        Exception: If repository construction fails
    
    Performance:
        - Aggregation queries optimized with indexes
        - Results cached when appropriate
        - Batch calculations for efficiency
        - Materialized views for complex metrics
    
    Security:
        - User isolation enforced
        - Only own data visible
        - Aggregations prevent PII leakage
    
    Example:
        @router.get("/api/analytics/overview")
        async def get_analytics_overview(
            service: AnalyticsService = Depends(get_analytics_service),
            user: User = Depends(get_current_user)
        ):
            return await service.get_overview(user.id)
    """
    try:
        logger.debug("Initializing AnalyticsService")
        
        repo = AnalyticsSQLARepository(db)
        service = AnalyticsService(repo=repo)
        
        logger.debug("AnalyticsService initialized successfully")
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize AnalyticsService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
