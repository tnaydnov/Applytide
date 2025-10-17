"""Application velocity tracking module."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func, cast, Date, case
from datetime import datetime, timedelta
import logging

from app.db.models import Application
from ..analytics_dto import (
    ApplicationVelocityDTO,
    ApplicationVelocityResponseDTO,
)

logger = logging.getLogger(__name__)


class VelocityAnalytics:
    """Handles application velocity tracking."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_application_velocity(self, days: int = 30) -> ApplicationVelocityResponseDTO:
        """
        Track how fast applications move through the pipeline.
        Provides daily metrics and overall conversion rates.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            ApplicationVelocityResponseDTO with daily metrics and aggregate rates
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            # Get daily application metrics
            stmt = select(
                cast(Application.created_at, Date).label('date'),
                func.count(Application.id).label('total_applications'),
                func.count(case(
                    (Application.status.in_(['interviewing', 'offer', 'accepted']), 1),
                    else_=None
                )).label('to_interview'),
                func.count(case(
                    (Application.status.in_(['offer', 'accepted']), 1),
                    else_=None
                )).label('to_offer'),
            ).where(
                Application.created_at >= cutoff_date
            ).group_by('date').order_by('date')

            result = await self.db.execute(stmt)
            rows = result.all()

            daily_metrics = []
            total_interview = 0
            total_offer = 0
            total_apps = 0

            for row in rows:
                total_apps += row.total_applications
                total_interview += row.to_interview
                total_offer += row.to_offer

                daily_metrics.append(
                    ApplicationVelocityDTO(
                        date=row.date.isoformat(),
                        total_applications=row.total_applications,
                        avg_time_to_first_action_hours=None,  # Would need status change tracking
                        avg_time_to_interview_days=None,
                        avg_time_to_offer_days=None,
                        avg_time_to_rejection_days=None,
                        conversion_to_interview_rate=round((row.to_interview / row.total_applications) * 100, 1) if row.total_applications > 0 else 0,
                        conversion_to_offer_rate=round((row.to_offer / row.total_applications) * 100, 1) if row.total_applications > 0 else 0,
                    )
                )

            return ApplicationVelocityResponseDTO(
                daily_metrics=daily_metrics,
                avg_time_to_interview=None,
                avg_time_to_offer=None,
                overall_interview_rate=round((total_interview / total_apps) * 100, 1) if total_apps > 0 else 0,
                overall_offer_rate=round((total_offer / total_apps) * 100, 1) if total_apps > 0 else 0,
            )

        except Exception as e:
            logger.error(f"Error in application velocity: {e}")
            raise
