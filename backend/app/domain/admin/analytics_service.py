# backend/app/domain/admin/analytics_service.py
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, cast, Date, case, Integer
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import logging

from app.db.models import User, Job, Application, Document, AdminAuditLog
from .analytics_dto import (
    CohortRetentionDTO,
    CohortAnalysisResponseDTO,
    ChurnRiskUserDTO,
    ChurnPredictionResponseDTO,
    FeatureUsageDTO,
    FeatureAdoptionResponseDTO,
    FunnelStepDTO,
    ConversionFunnelResponseDTO,
    ApplicationVelocityDTO,
    ApplicationVelocityResponseDTO,
    UserEngagementDTO,
    UserEngagementResponseDTO,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for advanced analytics and business intelligence"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== COHORT RETENTION ANALYSIS ====================

    def get_cohort_retention(
        self, months_back: int = 12
    ) -> CohortAnalysisResponseDTO:
        """
        Calculate cohort retention analysis by signup month
        Shows what % of users from each cohort are still active over time
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=months_back * 30)

            # Get all users with their cohort month
            stmt = select(
                func.date_trunc('month', User.created_at).label('cohort_month'),
                User.id,
                User.last_login_at
            ).where(User.created_at >= cutoff_date)

            result = self.db.execute(stmt)
            rows = result.all()

            # Group users by cohort
            cohorts: Dict[str, List[tuple]] = {}
            for row in rows:
                cohort_key = row.cohort_month.strftime('%Y-%m')
                if cohort_key not in cohorts:
                    cohorts[cohort_key] = []
                cohorts[cohort_key].append((row.id, row.last_login_at, row.cohort_month))

            cohort_data = []
            retention_1m = []
            retention_3m = []
            retention_6m = []

            for cohort_month, users in sorted(cohorts.items()):
                cohort_size = len(users)
                cohort_date = users[0][2]
                now = datetime.now()

                # Calculate retention for different periods
                def calc_retention(months: int) -> Optional[float]:
                    check_date = cohort_date + timedelta(days=months * 30)
                    if check_date > now:
                        return None
                    active = sum(
                        1 for _, last_login, _ in users
                        if last_login and last_login >= check_date - timedelta(days=30)
                    )
                    return round((active / cohort_size) * 100, 1)

                month_1 = calc_retention(1)
                month_2 = calc_retention(2)
                month_3 = calc_retention(3)
                month_6 = calc_retention(6)
                month_12 = calc_retention(12)

                if month_1 is not None:
                    retention_1m.append(month_1)
                if month_3 is not None:
                    retention_3m.append(month_3)
                if month_6 is not None:
                    retention_6m.append(month_6)

                cohort_data.append(
                    CohortRetentionDTO(
                        cohort_month=cohort_month,
                        cohort_size=cohort_size,
                        month_0=100.0,
                        month_1=month_1,
                        month_2=month_2,
                        month_3=month_3,
                        month_6=month_6,
                        month_12=month_12,
                    )
                )

            return CohortAnalysisResponseDTO(
                cohorts=cohort_data,
                total_cohorts=len(cohort_data),
                avg_retention_month_1=round(sum(retention_1m) / len(retention_1m), 1) if retention_1m else None,
                avg_retention_month_3=round(sum(retention_3m) / len(retention_3m), 1) if retention_3m else None,
                avg_retention_month_6=round(sum(retention_6m) / len(retention_6m), 1) if retention_6m else None,
            )

        except Exception as e:
            logger.error(f"Error in cohort retention analysis: {e}")
            raise

    # ==================== CHURN PREDICTION ====================

    def predict_churn(
        self, days_inactive_threshold: int = 30
    ) -> ChurnPredictionResponseDTO:
        """
        Predict users at risk of churning based on:
        - Days since last login
        - Application activity
        - Premium status
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

            result = self.db.execute(stmt)
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

    # ==================== FEATURE ADOPTION ====================

    def get_feature_adoption(self) -> FeatureAdoptionResponseDTO:
        """
        Track adoption of key features:
        - Job applications
        - Document uploads
        - Premium features
        - Calendar integration
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
                func.count(func.distinct(Document.user_id)).label('total_users'),
                func.count(func.distinct(case(
                    (Document.created_at >= thirty_days_ago, Document.user_id),
                    else_=None
                ))).label('active_users'),
                func.count(Document.id).label('total_uses')
            ).select_from(Document)

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

    # ==================== CONVERSION FUNNELS ====================

    def get_application_funnel(self, days: int = 30) -> ConversionFunnelResponseDTO:
        """
        Application conversion funnel:
        1. Users signed up
        2. Users viewed jobs
        3. Users applied to jobs
        4. Users got interviews
        5. Users got offers
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            # Step 1: Total users
            total_users_result = self.db.execute(
                select(func.count(User.id)).where(User.created_at >= cutoff_date)
            )
            total_users = total_users_result.scalar() or 0

            # Step 2: Users with applications (proxy for viewed jobs)
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

    # ==================== APPLICATION VELOCITY ====================

    def get_application_velocity(self, days: int = 30) -> ApplicationVelocityResponseDTO:
        """
        Track how fast applications move through the pipeline
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

            result = self.db.execute(stmt)
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

        """
        Calculate cohort retention analysis by signup month
        Shows what % of users from each cohort are still active over time
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=months_back * 30)

            # Get all users with their cohort month
            stmt = select(
                func.date_trunc('month', User.created_at).label('cohort_month'),
                User.id,
                User.last_login_at
            ).where(User.created_at >= cutoff_date)

            result = await self.db.execute(stmt)
            rows = result.all()

            # Group users by cohort
            cohorts: Dict[str, List[tuple]] = {}
            for row in rows:
                cohort_key = row.cohort_month.strftime('%Y-%m')
                if cohort_key not in cohorts:
                    cohorts[cohort_key] = []
                cohorts[cohort_key].append((row.id, row.last_login_at, row.cohort_month))

            cohort_data = []
            retention_1m = []
            retention_3m = []
            retention_6m = []

            for cohort_month, users in sorted(cohorts.items()):
                cohort_size = len(users)
                cohort_date = users[0][2]
                now = datetime.now()

                # Calculate retention for different periods
                def calc_retention(months: int) -> Optional[float]:
                    check_date = cohort_date + timedelta(days=months * 30)
                    if check_date > now:
                        return None
                    active = sum(
                        1 for _, last_login, _ in users
                        if last_login and last_login >= check_date - timedelta(days=30)
                    )
                    return round((active / cohort_size) * 100, 1)

                month_1 = calc_retention(1)
                month_2 = calc_retention(2)
                month_3 = calc_retention(3)
                month_6 = calc_retention(6)
                month_12 = calc_retention(12)

                if month_1 is not None:
                    retention_1m.append(month_1)
                if month_3 is not None:
                    retention_3m.append(month_3)
                if month_6 is not None:
                    retention_6m.append(month_6)

                cohort_data.append(
                    CohortRetentionDTO(
                        cohort_month=cohort_month,
                        cohort_size=cohort_size,
                        month_0=100.0,
                        month_1=month_1,
                        month_2=month_2,
                        month_3=month_3,
                        month_6=month_6,
                        month_12=month_12,
                    )
                )

            return CohortAnalysisResponseDTO(
                cohorts=cohort_data,
                total_cohorts=len(cohort_data),
                avg_retention_month_1=round(sum(retention_1m) / len(retention_1m), 1) if retention_1m else None,
                avg_retention_month_3=round(sum(retention_3m) / len(retention_3m), 1) if retention_3m else None,
                avg_retention_month_6=round(sum(retention_6m) / len(retention_6m), 1) if retention_6m else None,
            )

        except Exception as e:
            logger.error(f"Error in cohort retention analysis: {e}")
            raise

    # ==================== CHURN PREDICTION ====================

    async def predict_churn(
        self, days_inactive_threshold: int = 30
    ) -> ChurnPredictionResponseDTO:
        """
        Predict users at risk of churning based on:
        - Days since last login
        - Application activity
        - Premium status
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

    # ==================== FEATURE ADOPTION ====================

    async def get_feature_adoption(self) -> FeatureAdoptionResponseDTO:
        """
        Track adoption of key features:
        - Job applications
        - Document uploads
        - Premium features
        - Calendar integration
        """
        try:
            # Get total users
            total_users_result = await self.db.execute(select(func.count(User.id)))
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

            app_result = await self.db.execute(app_stmt)
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
                func.count(func.distinct(Document.user_id)).label('total_users'),
                func.count(func.distinct(case(
                    (Document.created_at >= thirty_days_ago, Document.user_id),
                    else_=None
                ))).label('active_users'),
                func.count(Document.id).label('total_uses')
            ).select_from(Document)

            doc_result = await self.db.execute(doc_stmt)
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

            premium_result = await self.db.execute(premium_stmt)
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

    # ==================== CONVERSION FUNNELS ====================

    async def get_application_funnel(self, days: int = 30) -> ConversionFunnelResponseDTO:
        """
        Application conversion funnel:
        1. Users signed up
        2. Users viewed jobs
        3. Users applied to jobs
        4. Users got interviews
        5. Users got offers
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            # Step 1: Total users
            total_users_result = await self.db.execute(
                select(func.count(User.id)).where(User.created_at >= cutoff_date)
            )
            total_users = total_users_result.scalar() or 0

            # Step 2: Users with applications (proxy for viewed jobs)
            users_with_apps_result = await self.db.execute(
                select(func.count(func.distinct(Application.user_id)))
                .where(Application.created_at >= cutoff_date)
            )
            users_with_apps = users_with_apps_result.scalar() or 0

            # Step 3: Users with interviews
            users_with_interviews_result = await self.db.execute(
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
            users_with_offers_result = await self.db.execute(
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
            users_accepted_result = await self.db.execute(
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

    # ==================== APPLICATION VELOCITY ====================

    async def get_application_velocity(self, days: int = 30) -> ApplicationVelocityResponseDTO:
        """
        Track how fast applications move through the pipeline
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
