"""Cohort retention analysis module."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import List, Dict
import logging

from app.db.models import User
from ..analytics_dto import (
    CohortRetentionDTO,
    CohortAnalysisResponseDTO,
)

logger = logging.getLogger(__name__)


class CohortAnalytics:
    """Handles cohort retention analysis."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_cohort_retention(
        self, months_back: int = 12
    ) -> CohortAnalysisResponseDTO:
        """
        Calculate cohort retention analysis by signup month.
        Shows what % of users from each cohort are still active over time.
        
        Args:
            months_back: Number of months to look back for cohort analysis
            
        Returns:
            CohortAnalysisResponseDTO with retention data by cohort
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
                def calc_retention(months: int) -> float | None:
                    """Calculate retention percentage for given month offset."""
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
                        retention_month_1=month_1,
                        retention_month_2=month_2,
                        retention_month_3=month_3,
                        retention_month_6=month_6,
                        retention_month_12=month_12,
                    )
                )

            # Calculate averages
            avg_1m = round(sum(retention_1m) / len(retention_1m), 1) if retention_1m else 0
            avg_3m = round(sum(retention_3m) / len(retention_3m), 1) if retention_3m else 0
            avg_6m = round(sum(retention_6m) / len(retention_6m), 1) if retention_6m else 0

            return CohortAnalysisResponseDTO(
                cohorts=cohort_data,
                avg_retention_1m=avg_1m,
                avg_retention_3m=avg_3m,
                avg_retention_6m=avg_6m,
            )

        except Exception as e:
            logger.error(f"Error in cohort retention analysis: {e}")
            raise
