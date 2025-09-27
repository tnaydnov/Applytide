from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from uuid import UUID

from .ports import IAnalyticsReadRepo
from .dto import ApplicationLiteDTO, StageLiteDTO
from .metrics import (
    calculate_overview_metrics, calculate_application_metrics, calculate_interview_metrics,
    calculate_company_metrics, calculate_timeline_metrics, calculate_activity_metrics,
    calculate_sources_metrics, calculate_experiments_metrics, calculate_best_time_metrics,
    calculate_expectations_metrics
)

def time_range_start(range_param: str) -> datetime:
    now = datetime.now(timezone.utc)
    return {
        "1m": now - timedelta(days=30),
        "3m": now - timedelta(days=90),
        "6m": now - timedelta(days=180),
        "1y": now - timedelta(days=365),
        "all": datetime(2020, 1, 1, tzinfo=timezone.utc),
    }.get(range_param, now - timedelta(days=180))

class AnalyticsService:
    def __init__(self, repo: IAnalyticsReadRepo):
        self.repo = repo

    def get_analytics(self, *, user_id: UUID, range_param: str) -> Dict[str, Any]:
        start_date = time_range_start(range_param)
        apps = self.repo.list_user_applications_since(user_id=user_id, start_date=start_date)
        app_ids = [a.id for a in apps]
        stages: List[StageLiteDTO] = self.repo.list_stages_for_applications(app_ids=app_ids) if app_ids else []

        jobs_map = self.repo.map_jobs(job_ids=[a.job_id for a in apps])
        comp_ids = [j.company_id for j in jobs_map.values() if j and j.company_id]
        companies_map = self.repo.map_companies(company_ids=comp_ids)

        return {
            "overview": calculate_overview_metrics(apps, stages, start_date),
            "applications": calculate_application_metrics(apps, jobs_map, companies_map),
            "interviews": calculate_interview_metrics(stages, apps),
            "companies": calculate_company_metrics(apps, jobs_map, companies_map),
            "timeline": calculate_timeline_metrics(apps, stages),
            "activity": calculate_activity_metrics(apps),
            "sources": calculate_sources_metrics(apps, stages),
            "experiments": calculate_experiments_metrics(apps, stages),
            "bestTime": calculate_best_time_metrics(apps),
            "expectations": calculate_expectations_metrics(apps, stages),
        }
