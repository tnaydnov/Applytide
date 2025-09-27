from __future__ import annotations
from typing import List, Dict, Iterable
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from ...db import models
from ...domain.analytics.ports import IAnalyticsReadRepo
from ...domain.analytics.dto import ApplicationLiteDTO, StageLiteDTO, JobLiteDTO, CompanyLiteDTO

class AnalyticsSQLARepository(IAnalyticsReadRepo):
    def __init__(self, db: Session): self.db = db

    def list_user_applications_since(self, *, user_id: UUID, start_date: datetime) -> List[ApplicationLiteDTO]:
        rows = self.db.execute(
            select(models.Application).where(
                models.Application.user_id == user_id,
                models.Application.created_at >= start_date
            )
        ).scalars().all()
        out: List[ApplicationLiteDTO] = []
        # tolerate optional columns (source, resume_id, has_cover_letter) if your schema has them
        for a in rows:
            out.append(ApplicationLiteDTO(
                id=a.id, user_id=a.user_id, job_id=a.job_id, status=a.status,
                created_at=a.created_at, updated_at=a.updated_at,
                source=getattr(a, "source", None),
                resume_id=getattr(a, "resume_id", None),
                has_cover_letter=getattr(a, "has_cover_letter", None),
            ))
        return out

    def list_stages_for_applications(self, *, app_ids: Iterable[UUID]) -> List[StageLiteDTO]:
        if not app_ids: return []
        rows = self.db.execute(
            select(models.Stage).where(models.Stage.application_id.in_(list(app_ids)))
        ).scalars().all()
        return [StageLiteDTO(
            id=s.id, application_id=s.application_id, name=s.name, outcome=s.outcome, created_at=s.created_at
        ) for s in rows]

    def map_jobs(self, *, job_ids: Iterable[UUID]) -> Dict[UUID, JobLiteDTO]:
        ids = list(set(job_ids))
        if not ids: return {}
        rows = self.db.execute(select(models.Job).where(models.Job.id.in_(ids))).scalars().all()
        return {j.id: JobLiteDTO(id=j.id, title=j.title, company_id=j.company_id, created_at=j.created_at) for j in rows}

    def map_companies(self, *, company_ids: Iterable[UUID]) -> Dict[UUID, CompanyLiteDTO]:
        ids = [cid for cid in set(company_ids) if cid]
        if not ids: return {}
        rows = self.db.execute(select(models.Company).where(models.Company.id.in_(ids))).scalars().all()
        return {c.id: CompanyLiteDTO(id=c.id, name=c.name, location=c.location) for c in rows}
