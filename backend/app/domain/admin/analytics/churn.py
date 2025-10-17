"""Churn prediction module."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta
import logging

from app.db.models import User, Application
from ..analytics_dto import (
    ChurnRiskUserDTO,
    ChurnPredictionResponseDTO,
)

logger = logging.getLogger(__name__)


class ChurnAnalytics:
    """Handles churn prediction and risk analysis."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def predict_churn(
        self, days_inactive_threshold: int = 30
    ) -> ChurnPredictionResponseDTO:
        """
        Predict users at risk of churning based on:
        - Days since last login
        - Application activity
        - Premium status
        
        Churn scoring algorithm (0-100):
        - Days inactive: 40 points max
        - Application activity: 30 points max
        - Recent application activity: 20 points max
        - Premium status: 10 points (non-premium gets points)
        
        Risk categories:
        - High risk: 70+ score
        - Medium risk: 40-69 score
        
        Args:
            days_inactive_threshold: Threshold for considering user inactive
            
        Returns:
            ChurnPredictionResponseDTO with high/medium risk users
        """
        try:
            now = datetime.now()
            inactive_date = now - timedelta(days=days_inactive_threshold)

            # Get users with their activity metrics
            stmt = select(
                User.id,
                User.email,
                User.name,
                User.is_premium,
                User.last_login_at,
                func.count(Application.id).label('total_applications'),
                func.max(Application.created_at).label('last_application_date')
            ).outerjoin(Application).group_by(User.id)

            result = await self.db.execute(stmt)
            rows = result.all()

            high_risk = []
            medium_risk = []

            for row in rows:
                # Calculate days inactive
                if row.last_login_at:
                    days_inactive = (now - row.last_login_at).days
                else:
                    days_inactive = 999  # Never logged in

                # Calculate churn score (0-100)
                churn_score = 0

                # Factor 1: Days inactive (40 points max)
                if days_inactive >= 90:
                    churn_score += 40
                elif days_inactive >= 60:
                    churn_score += 30
                elif days_inactive >= 30:
                    churn_score += 20
                elif days_inactive >= 14:
                    churn_score += 10

                # Factor 2: Application activity (30 points max)
                if row.total_applications == 0:
                    churn_score += 30
                elif row.total_applications < 3:
                    churn_score += 20
                elif row.total_applications < 10:
                    churn_score += 10

                # Factor 3: Recent application activity (20 points max)
                if row.last_application_date:
                    days_since_app = (now - row.last_application_date).days
                    if days_since_app >= 60:
                        churn_score += 20
                    elif days_since_app >= 30:
                        churn_score += 10
                else:
                    churn_score += 20

                # Factor 4: Premium status (10 points - premium less likely to churn)
                if not row.is_premium:
                    churn_score += 10

                user_dto = ChurnRiskUserDTO(
                    user_id=row.id,
                    email=row.email,
                    name=row.name,
                    is_premium=row.is_premium,
                    churn_score=round(churn_score, 1),
                    last_login=row.last_login_at.isoformat() if row.last_login_at else None,
                    days_inactive=days_inactive,
                    total_applications=row.total_applications,
                    last_application_date=row.last_application_date.isoformat() if row.last_application_date else None,
                )

                if churn_score >= 70:
                    high_risk.append(user_dto)
                elif churn_score >= 40:
                    medium_risk.append(user_dto)

            # Sort by churn score
            high_risk.sort(key=lambda x: x.churn_score, reverse=True)
            medium_risk.sort(key=lambda x: x.churn_score, reverse=True)

            total_users = len(rows)
            overall_churn_rate = round((len(high_risk) / total_users) * 100, 1) if total_users > 0 else 0

            return ChurnPredictionResponseDTO(
                high_risk_users=high_risk[:50],  # Limit to top 50
                medium_risk_users=medium_risk[:50],
                total_high_risk=len(high_risk),
                total_medium_risk=len(medium_risk),
                overall_churn_rate=overall_churn_rate,
            )

        except Exception as e:
            logger.error(f"Error in churn prediction: {e}")
            raise
