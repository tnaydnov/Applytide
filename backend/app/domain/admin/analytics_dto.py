# backend/app/domain/admin/analytics_dto.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import date

# ==================== COHORT ANALYSIS ====================

class CohortRetentionDTO(BaseModel):
    """Cohort retention analysis by signup month"""
    cohort_month: str = Field(..., description="Month of user signup (YYYY-MM)")
    cohort_size: int = Field(..., description="Number of users in cohort")
    month_0: float = Field(..., description="Retention % at month 0 (100%)")
    month_1: Optional[float] = Field(None, description="Retention % at month 1")
    month_2: Optional[float] = Field(None, description="Retention % at month 2")
    month_3: Optional[float] = Field(None, description="Retention % at month 3")
    month_6: Optional[float] = Field(None, description="Retention % at month 6")
    month_12: Optional[float] = Field(None, description="Retention % at month 12")

class CohortAnalysisResponseDTO(BaseModel):
    """Response for cohort retention analysis"""
    cohorts: List[CohortRetentionDTO]
    total_cohorts: int
    avg_retention_month_1: Optional[float] = None
    avg_retention_month_3: Optional[float] = None
    avg_retention_month_6: Optional[float] = None

# ==================== CHURN PREDICTION ====================

class ChurnRiskUserDTO(BaseModel):
    """User at risk of churning"""
    user_id: int
    email: str
    name: Optional[str] = None
    is_premium: bool
    churn_score: float = Field(..., description="Churn probability 0-100")
    last_login: Optional[str] = None
    days_inactive: int
    total_applications: int
    last_application_date: Optional[str] = None

class ChurnPredictionResponseDTO(BaseModel):
    """Response for churn prediction analysis"""
    high_risk_users: List[ChurnRiskUserDTO] = Field(default_factory=list, description="Churn score >= 70")
    medium_risk_users: List[ChurnRiskUserDTO] = Field(default_factory=list, description="Churn score 40-69")
    total_high_risk: int
    total_medium_risk: int
    overall_churn_rate: float = Field(..., description="% of users likely to churn")

# ==================== FEATURE ADOPTION ====================

class FeatureUsageDTO(BaseModel):
    """Feature usage statistics"""
    feature_name: str
    total_users: int = Field(..., description="Users who tried feature")
    active_users: int = Field(..., description="Users active in last 30 days")
    adoption_rate: float = Field(..., description="% of total users who adopted")
    avg_usage_per_user: float = Field(..., description="Average uses per user")
    power_users: int = Field(..., description="Users with >10 uses")

class FeatureAdoptionResponseDTO(BaseModel):
    """Response for feature adoption tracking"""
    features: List[FeatureUsageDTO]
    total_users: int
    most_adopted_feature: Optional[str] = None
    least_adopted_feature: Optional[str] = None

# ==================== CONVERSION FUNNELS ====================

class FunnelStepDTO(BaseModel):
    """Single step in conversion funnel"""
    step_name: str
    step_number: int
    users_count: int
    conversion_rate: float = Field(..., description="% converted to next step")
    drop_off_rate: float = Field(..., description="% dropped at this step")

class ConversionFunnelResponseDTO(BaseModel):
    """Response for conversion funnel analysis"""
    funnel_name: str
    steps: List[FunnelStepDTO]
    overall_conversion_rate: float = Field(..., description="% who completed full funnel")
    biggest_drop_off_step: Optional[str] = None
    total_started: int
    total_completed: int

# ==================== APPLICATION VELOCITY ====================

class ApplicationVelocityDTO(BaseModel):
    """Application processing speed metrics"""
    date: str
    total_applications: int
    avg_time_to_first_action_hours: Optional[float] = None
    avg_time_to_interview_days: Optional[float] = None
    avg_time_to_offer_days: Optional[float] = None
    avg_time_to_rejection_days: Optional[float] = None
    conversion_to_interview_rate: float
    conversion_to_offer_rate: float

class ApplicationVelocityResponseDTO(BaseModel):
    """Response for application velocity analysis"""
    daily_metrics: List[ApplicationVelocityDTO]
    avg_time_to_interview: Optional[float] = None
    avg_time_to_offer: Optional[float] = None
    overall_interview_rate: float
    overall_offer_rate: float

# ==================== USER ENGAGEMENT ====================

class UserEngagementDTO(BaseModel):
    """User engagement metrics"""
    date: str
    daily_active_users: int
    weekly_active_users: int
    monthly_active_users: int
    new_users: int
    returning_users: int
    avg_session_duration_minutes: Optional[float] = None
    avg_applications_per_user: float

class UserEngagementResponseDTO(BaseModel):
    """Response for user engagement trends"""
    engagement_data: List[UserEngagementDTO]
    dau_wau_ratio: float = Field(..., description="Daily/Weekly active users ratio (stickiness)")
    mau_trend: str = Field(..., description="MAU trend: increasing, stable, or decreasing")
