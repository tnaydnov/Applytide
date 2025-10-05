# backend/app/api/routers/admin/analytics_advanced.py
"""Enhanced analytics"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.analytics_service import AnalyticsService
from ....domain.admin.analytics_dto import (
    CohortAnalysisResponseDTO,
    ChurnPredictionResponseDTO,
    FeatureAdoptionResponseDTO,
    ConversionFunnelResponseDTO,
    ApplicationVelocityResponseDTO,
)


router = APIRouter(tags=["admin-analytics-advanced"])


from app.domain.admin.analytics_service import AnalyticsService
from app.domain.admin.analytics_dto import (
    CohortAnalysisResponseDTO,
    ChurnPredictionResponseDTO,
    FeatureAdoptionResponseDTO,
    ConversionFunnelResponseDTO,
    ApplicationVelocityResponseDTO,
)


@router.get(
    "/analytics/cohort-retention",
    response_model=CohortAnalysisResponseDTO,
    summary="Get Cohort Retention Analysis"
)
@limiter.limit("30/minute")
async def get_cohort_retention(
    request: Request,
    months_back: int = Query(12, ge=1, le=24, description="Months of history to analyze"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Cohort retention analysis by signup month
    
    Shows what percentage of users from each cohort are still active over time.
    Tracks retention at 1, 2, 3, 6, and 12 months.
    
    Perfect for understanding:
    - User retention patterns
    - Product-market fit
    - Impact of onboarding changes
    - Long-term user engagement
    """
    service = AnalyticsService(db)
    return service.get_cohort_retention(months_back=months_back)


@router.get(
    "/analytics/churn-prediction",
    response_model=ChurnPredictionResponseDTO,
    summary="Predict User Churn Risk"
)
@limiter.limit("30/minute")
async def predict_churn(
    request: Request,
    days_inactive: int = Query(30, ge=7, le=180, description="Days inactive threshold"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Identify users at risk of churning
    
    Calculates churn score (0-100) based on:
    - Days since last login
    - Application activity level
    - Recent engagement
    - Premium status
    
    Returns:
    - High risk users (score >= 70)
    - Medium risk users (score 40-69)
    - Overall churn rate
    
    Use this to:
    - Send re-engagement emails
    - Offer premium trials
    - Identify product issues
    """
    service = AnalyticsService(db)
    return service.predict_churn(days_inactive_threshold=days_inactive)


@router.get(
    "/analytics/feature-adoption",
    response_model=FeatureAdoptionResponseDTO,
    summary="Track Feature Adoption Rates"
)
@limiter.limit("30/minute")
async def get_feature_adoption(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Track adoption of key platform features
    
    Analyzes:
    - Job applications usage
    - Document uploads
    - Premium subscriptions
    - Feature usage patterns
    
    Shows:
    - Total users who adopted feature
    - Active users (last 30 days)
    - Adoption rate (% of all users)
    - Average usage per user
    - Power users (>10 uses)
    
    Helps identify:
    - Which features drive engagement
    - Underutilized features
    - Premium conversion opportunities
    """
    service = AnalyticsService(db)
    return service.get_feature_adoption()


@router.get(
    "/analytics/conversion-funnel",
    response_model=ConversionFunnelResponseDTO,
    summary="Application Conversion Funnel"
)
@limiter.limit("30/minute")
async def get_conversion_funnel(
    request: Request,
    days: int = Query(30, ge=7, le=180, description="Days of data to analyze"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Application conversion funnel analysis
    
    Tracks user journey:
    1. Signed Up
    2. Applied to Jobs
    3. Got Interviews
    4. Received Offers
    5. Accepted Offers
    
    For each step shows:
    - User count
    - Conversion rate to next step
    - Drop-off rate
    
    Identifies:
    - Biggest friction points
    - Optimization opportunities
    - Overall conversion rate
    """
    service = AnalyticsService(db)
    return service.get_application_funnel(days=days)


@router.get(
    "/analytics/application-velocity",
    response_model=ApplicationVelocityResponseDTO,
    summary="Application Processing Speed"
)
@limiter.limit("30/minute")
async def get_application_velocity(
    request: Request,
    days: int = Query(30, ge=7, le=90, description="Days of data to analyze"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Track how fast applications move through pipeline
    
    Daily metrics:
    - Total applications
    - Time to first action
    - Time to interview
    - Time to offer
    - Conversion rates
    
    Overall metrics:
    - Average time to interview
    - Average time to offer
    - Interview conversion rate
    - Offer conversion rate
    
    Use to:
    - Measure platform effectiveness
    - Identify bottlenecks
    - Track improvements over time
    """
    service = AnalyticsService(db)
    return service.get_application_velocity(days=days)