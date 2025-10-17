"""Feature adoption tracking module."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case
from datetime import datetime, timedelta
import logging

from app.db.models import User, Application, Resume
from ..analytics_dto import (
    FeatureUsageDTO,
    FeatureAdoptionResponseDTO,
)

logger = logging.getLogger(__name__)


class FeatureAnalytics:
    """Handles feature adoption and usage tracking."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_feature_adoption(self) -> FeatureAdoptionResponseDTO:
        """
        Track adoption of key features:
        - Job applications
        - Document uploads
        - Premium subscription
        
        Returns:
            FeatureAdoptionResponseDTO with adoption metrics per feature
        """
        try:
            # Get total users
            total_users_result = self.db.execute(select(func.count(User.id)))
            total_users = total_users_result.scalar() or 0

            thirty_days_ago = datetime.now() - timedelta(days=30)

            features = []

            # Feature 1: Job Applications
            app_stmt = select(
                func.count(func.distinct(Application.user_id)).label('total_users'),
                func.count(func.distinct(case(
                    (Application.created_at >= thirty_days_ago, Application.user_id),
                    else_=None
                ))).label('active_users'),
                func.count(Application.id).label('total_uses'),
                func.count(func.distinct(case(
                    (func.count(Application.id) > 10, Application.user_id),
                    else_=None
                ))).label('power_users')
            ).select_from(Application)

            app_result = self.db.execute(app_stmt)
            app_row = app_result.first()

            if app_row and app_row.total_users:
                features.append(FeatureUsageDTO(
                    feature_name="Job Applications",
                    total_users=app_row.total_users,
                    active_users=app_row.active_users,
                    adoption_rate=round((app_row.total_users / total_users) * 100, 1),
                    avg_usage_per_user=round(app_row.total_uses / app_row.total_users, 1),
                    power_users=0,  # Would need subquery
                ))

            # Feature 2: Document Uploads
            doc_stmt = select(
                func.count(func.distinct(Resume.user_id)).label('total_users'),
                func.count(func.distinct(case(
                    (Resume.created_at >= thirty_days_ago, Resume.user_id),
                    else_=None
                ))).label('active_users'),
                func.count(Resume.id).label('total_uses')
            ).select_from(Resume)

            doc_result = self.db.execute(doc_stmt)
            doc_row = doc_result.first()

            if doc_row and doc_row.total_users:
                features.append(FeatureUsageDTO(
                    feature_name="Document Uploads",
                    total_users=doc_row.total_users,
                    active_users=doc_row.active_users,
                    adoption_rate=round((doc_row.total_users / total_users) * 100, 1),
                    avg_usage_per_user=round(doc_row.total_uses / doc_row.total_users, 1),
                    power_users=0,
                ))

            # Feature 3: Premium Subscription
            premium_stmt = select(
                func.count(User.id).label('total_users')
            ).where(User.is_premium == True)

            premium_result = self.db.execute(premium_stmt)
            premium_count = premium_result.scalar() or 0

            features.append(FeatureUsageDTO(
                feature_name="Premium Subscription",
                total_users=premium_count,
                active_users=premium_count,
                adoption_rate=round((premium_count / total_users) * 100, 1) if total_users > 0 else 0,
                avg_usage_per_user=1.0,
                power_users=premium_count,
            ))

            # Find most/least adopted
            most_adopted = max(features, key=lambda x: x.adoption_rate).feature_name if features else None
            least_adopted = min(features, key=lambda x: x.adoption_rate).feature_name if features else None

            return FeatureAdoptionResponseDTO(
                features=features,
                total_users=total_users,
                most_adopted_feature=most_adopted,
                least_adopted_feature=least_adopted,
            )

        except Exception as e:
            logger.error(f"Error in feature adoption tracking: {e}")
            raise
