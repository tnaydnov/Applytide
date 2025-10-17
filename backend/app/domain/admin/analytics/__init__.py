"""Analytics Service - Barrel export for backward compatibility."""
from sqlalchemy.orm import Session

from ..analytics_dto import (
    CohortAnalysisResponseDTO,
    ChurnPredictionResponseDTO,
    FeatureAdoptionResponseDTO,
    ConversionFunnelResponseDTO,
    ApplicationVelocityResponseDTO,
)
from .cohort import CohortAnalytics
from .churn import ChurnAnalytics
from .features import FeatureAnalytics
from .funnel import FunnelAnalytics
from .velocity import VelocityAnalytics


class AnalyticsService:
    """
    Service for advanced analytics and business intelligence.
    
    Delegates to specialized modules:
    - CohortAnalytics: Retention analysis
    - ChurnAnalytics: Churn prediction
    - FeatureAnalytics: Feature adoption tracking
    - FunnelAnalytics: Conversion funnel analysis
    - VelocityAnalytics: Application velocity tracking
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.cohort = CohortAnalytics(db)
        self.churn = ChurnAnalytics(db)
        self.features = FeatureAnalytics(db)
        self.funnel = FunnelAnalytics(db)
        self.velocity = VelocityAnalytics(db)
    
    # ==================== COHORT RETENTION ANALYSIS ====================
    
    async def get_cohort_retention(
        self, months_back: int = 12
    ) -> CohortAnalysisResponseDTO:
        """
        Calculate cohort retention analysis by signup month.
        Shows what % of users from each cohort are still active over time.
        
        Delegates to: CohortAnalytics.get_cohort_retention()
        """
        return await self.cohort.get_cohort_retention(months_back)
    
    # ==================== CHURN PREDICTION ====================
    
    async def predict_churn(
        self, days_inactive_threshold: int = 30
    ) -> ChurnPredictionResponseDTO:
        """
        Predict users at risk of churning based on:
        - Days since last login
        - Application activity
        - Premium status
        
        Delegates to: ChurnAnalytics.predict_churn()
        """
        return await self.churn.predict_churn(days_inactive_threshold)
    
    # ==================== FEATURE ADOPTION ====================
    
    async def get_feature_adoption(self) -> FeatureAdoptionResponseDTO:
        """
        Track adoption of key features:
        - Job applications
        - Document uploads
        - Premium features
        
        Delegates to: FeatureAnalytics.get_feature_adoption()
        """
        return await self.features.get_feature_adoption()
    
    # ==================== CONVERSION FUNNELS ====================
    
    async def get_application_funnel(self, days: int = 30) -> ConversionFunnelResponseDTO:
        """
        Application conversion funnel:
        1. Users signed up
        2. Users applied to jobs
        3. Users got interviews
        4. Users received offers
        5. Users accepted offers
        
        Delegates to: FunnelAnalytics.get_application_funnel()
        """
        return await self.funnel.get_application_funnel(days)
    
    # ==================== APPLICATION VELOCITY ====================
    
    async def get_application_velocity(self, days: int = 30) -> ApplicationVelocityResponseDTO:
        """
        Track how fast applications move through the pipeline.
        
        Delegates to: VelocityAnalytics.get_application_velocity()
        """
        return await self.velocity.get_application_velocity(days)


# Export for backward compatibility
__all__ = ["AnalyticsService"]
