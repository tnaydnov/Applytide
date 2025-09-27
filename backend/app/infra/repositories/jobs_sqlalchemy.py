from __future__ import annotations
from typing import Optional, List, Tuple, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete
from ...db import models
from ...api.utils.pagination import apply_sorting
from ...domain.jobs.dto import JobDTO
from ...domain.jobs.repository import ICompanyRepository, IJobRepository

class CompanySQLARepository(ICompanyRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_id_by_name(self, name: str) -> Optional[UUID]:
        if not name:
            return None
        c = self.db.execute(
            select(models.Company.id).where(models.Company.name == name)
        ).scalar_one_or_none()
        return c

    def ensure_company(self, name: str, website: Optional[str], location: Optional[str]) -> UUID:
        cid = self.get_id_by_name(name)
        if cid:
            return cid
        company = models.Company(name=name, website=website, location=location)
        self.db.add(company)
        self.db.flush()
        return company.id

def _to_dto(job: models.Job, company_name: Optional[str], company_website: Optional[str]) -> JobDTO:
    return JobDTO(
        id=job.id,
        title=job.title,
        company_id=job.company_id,
        company_name=company_name,
        website=company_website,
        location=job.location,
        remote_type=job.remote_type,
        job_type=job.job_type,
        description=job.description,
        requirements=list(job.requirements or []),
        skills=list(job.skills or []),
        source_url=job.source_url,
        created_at=job.created_at,
    )

class JobSQLARepository(IJobRepository):
    def __init__(self, db: Session):
        self.db = db

    def create(self, *, user_id: UUID, company_id: Optional[UUID], payload: Dict) -> JobDTO:
        job = models.Job(
            user_id=user_id,
            company_id=company_id,
            title=payload.get("title"),
            location=payload.get("location"),
            remote_type=payload.get("remote_type"),
            job_type=payload.get("job_type"),
            description=payload.get("description"),
            requirements=payload.get("requirements") or [],
            skills=payload.get("skills") or [],
            source_url=payload.get("source_url"),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # enrich with company info for DTO symmetry
        cname = None
        cweb = None
        if job.company_id:
            row = self.db.execute(
                select(models.Company.name, models.Company.website).where(models.Company.id == job.company_id)
            ).first()
            if row:
                cname, cweb = row
        return _to_dto(job, cname, cweb)

    def get_for_user_with_company(self, job_id: UUID, user_id: UUID) -> JobDTO:
        row = self.db.execute(
            select(
                models.Job,
                models.Company.name.label("company_name"),
                models.Company.website.label("company_website"),
            )
            .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Job.id == job_id, models.Job.user_id == user_id)
        ).first()
        if not row:
            raise LookupError
        job, cname, cweb = row
        return _to_dto(job, cname, cweb)

    def list_for_user(
        self,
        user_id: UUID,
        page: int,
        page_size: int,
        filters: Dict,
        sort: str,
        order: str,
    ) -> Tuple[List[JobDTO], int]:
        base = (
            select(
                models.Job,
                models.Company.name.label("company_name"),
                models.Company.website.label("company_website"),
            )
            .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Job.user_id == user_id)
        )

        location = (filters.get("location") or "").strip()
        remote_type = (filters.get("remote_type") or "").strip()
        company = (filters.get("company") or "").strip()

        if location:
            base = base.where(models.Job.location.ilike(f"%{location}%"))
        if remote_type:
            base = base.where(models.Job.remote_type == remote_type)
        if company:
            base = base.where(models.Company.name.ilike(f"%{company}%"))

        base = apply_sorting(base, models.Job, sort, order)

        offset = (page - 1) * page_size
        rows = self.db.execute(base.offset(offset).limit(page_size)).all()

        total_q = select(func.count(models.Job.id)).where(models.Job.user_id == user_id)
        if location:
            total_q = total_q.where(models.Job.location.ilike(f"%{location}%"))
        if remote_type:
            total_q = total_q.where(models.Job.remote_type == remote_type)
        if company:
            total_q = (
                total_q.join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                .where(models.Company.name.ilike(f"%{company}%"))
            )
        total = self.db.execute(total_q).scalar() or 0

        items = []
        for job, cname, cweb in rows:
            items.append(_to_dto(job, cname, cweb))
        return items, total

    def update_for_user(self, job_id: UUID, user_id: UUID, data: Dict) -> JobDTO:
        job = self.db.execute(
            select(models.Job).where(models.Job.id == job_id, models.Job.user_id == user_id)
        ).scalar_one_or_none()
        if not job:
            raise LookupError

        for k, v in data.items():
            setattr(job, k, v)

        self.db.commit()
        self.db.refresh(job)

        cname = None
        cweb = None
        if job.company_id:
            row = self.db.execute(
                select(models.Company.name, models.Company.website).where(models.Company.id == job.company_id)
            ).first()
            if row:
                cname, cweb = row
        return _to_dto(job, cname, cweb)

    def delete_for_user_cascade(self, job_id: UUID, user_id: UUID) -> None:
        job = self.db.execute(
            select(models.Job).where(models.Job.id == job_id, models.Job.user_id == user_id)
        ).scalar_one_or_none()
        if not job:
            raise LookupError

        # Delete children (matches your current explicit cascade)
        apps = self.db.execute(
            select(models.Application).where(models.Application.job_id == job_id)
        ).scalars().all()

        for app in apps:
            self.db.execute(
                delete(models.ApplicationAttachment).where(
                    models.ApplicationAttachment.application_id == app.id
                )
            )
            self.db.execute(delete(models.Stage).where(models.Stage.application_id == app.id))
            self.db.execute(delete(models.Note).where(models.Note.application_id == app.id))
            self.db.delete(app)

        self.db.execute(delete(models.MatchResult).where(models.MatchResult.job_id == job_id))
        self.db.delete(job)
        self.db.commit()
