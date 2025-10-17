"""Conversion funnel analysis module."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
import logging

from app.db.models import User, Application
from ..analytics_dto import (
    FunnelStepDTO,
    ConversionFunnelResponseDTO,
)

logger = logging.getLogger(__name__)


class FunnelAnalytics:
    """Handles conversion funnel analysis."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_application_funnel(self, days: int = 30) -> ConversionFunnelResponseDTO:
        """
        Application conversion funnel:
        1. Users signed up
        2. Users applied to jobs
        3. Users got interviews
        4. Users received offers
        5. Users accepted offers
        
        Args:
            days: Number of days to analyze
            
        Returns:
            ConversionFunnelResponseDTO with funnel steps and conversion rates
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            # Step 1: Total users
            total_users_result = self.db.execute(
                select(func.count(User.id)).where(User.created_at >= cutoff_date)
            )
            total_users = total_users_result.scalar() or 0

            # Step 2: Users with applications
            users_with_apps_result = self.db.execute(
                select(func.count(func.distinct(Application.user_id)))
                .where(Application.created_at >= cutoff_date)
            )
            users_with_apps = users_with_apps_result.scalar() or 0

            # Step 3: Users with interviews
            users_with_interviews_result = self.db.execute(
                select(func.count(func.distinct(Application.user_id)))
                .where(
                    and_(
                        Application.created_at >= cutoff_date,
                        Application.status.in_(['interviewing', 'offer', 'accepted'])
                    )
                )
            )
            users_with_interviews = users_with_interviews_result.scalar() or 0

            # Step 4: Users with offers
            users_with_offers_result = self.db.execute(
                select(func.count(func.distinct(Application.user_id)))
                .where(
                    and_(
                        Application.created_at >= cutoff_date,
                        Application.status.in_(['offer', 'accepted'])
                    )
                )
            )
            users_with_offers = users_with_offers_result.scalar() or 0

            # Step 5: Users who accepted offers
            users_accepted_result = self.db.execute(
                select(func.count(func.distinct(Application.user_id)))
                .where(
                    and_(
                        Application.created_at >= cutoff_date,
                        Application.status == 'accepted'
                    )
                )
            )
            users_accepted = users_accepted_result.scalar() or 0

            # Build funnel steps
            steps = [
                FunnelStepDTO(
                    step_name="Signed Up",
                    step_number=1,
                    users_count=total_users,
                    conversion_rate=round((users_with_apps / total_users) * 100, 1) if total_users > 0 else 0,
                    drop_off_rate=round(((total_users - users_with_apps) / total_users) * 100, 1) if total_users > 0 else 0,
                ),
                FunnelStepDTO(
                    step_name="Applied to Jobs",
                    step_number=2,
                    users_count=users_with_apps,
                    conversion_rate=round((users_with_interviews / users_with_apps) * 100, 1) if users_with_apps > 0 else 0,
                    drop_off_rate=round(((users_with_apps - users_with_interviews) / users_with_apps) * 100, 1) if users_with_apps > 0 else 0,
                ),
                FunnelStepDTO(
                    step_name="Got Interviews",
                    step_number=3,
                    users_count=users_with_interviews,
                    conversion_rate=round((users_with_offers / users_with_interviews) * 100, 1) if users_with_interviews > 0 else 0,
                    drop_off_rate=round(((users_with_interviews - users_with_offers) / users_with_interviews) * 100, 1) if users_with_interviews > 0 else 0,
                ),
                FunnelStepDTO(
                    step_name="Received Offers",
                    step_number=4,
                    users_count=users_with_offers,
                    conversion_rate=round((users_accepted / users_with_offers) * 100, 1) if users_with_offers > 0 else 0,
                    drop_off_rate=round(((users_with_offers - users_accepted) / users_with_offers) * 100, 1) if users_with_offers > 0 else 0,
                ),
                FunnelStepDTO(
                    step_name="Accepted Offers",
                    step_number=5,
                    users_count=users_accepted,
                    conversion_rate=100.0,
                    drop_off_rate=0.0,
                ),
            ]

            # Find biggest drop-off
            biggest_drop = max(steps[:-1], key=lambda x: x.drop_off_rate)

            return ConversionFunnelResponseDTO(
                funnel_name=f"Application Funnel (Last {days} days)",
                steps=steps,
                overall_conversion_rate=round((users_accepted / total_users) * 100, 1) if total_users > 0 else 0,
                biggest_drop_off_step=biggest_drop.step_name,
                total_started=total_users,
                total_completed=users_accepted,
            )

        except Exception as e:
            logger.error(f"Error in conversion funnel: {e}")
            raise
