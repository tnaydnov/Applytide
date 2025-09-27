# backend/app/domain/jobs/service.py
from __future__ import annotations
from typing import Optional, Dict, List, Tuple
from uuid import UUID
from .dto import JobDTO, JobSearchDTO
from .repository import ICompanyRepository, IJobRepository, ISearchGateway
from .errors import JobNotFound
from .helpers import build_final_description

class JobService:
    def __init__(self, jobs: IJobRepository, companies: ICompanyRepository, search: ISearchGateway):
        self.jobs = jobs
        self.companies = companies
        self.search = search

    def create_job(self, *, user_id: UUID, payload: Dict) -> JobDTO:
        company_id: Optional[UUID] = payload.get("company_id")
        if not company_id and payload.get("company_name"):
            company_id = self.companies.ensure_company(
                name=payload["company_name"],
                website=payload.get("website"),
                location=payload.get("location"),
            )
        return self.jobs.create(user_id=user_id, company_id=company_id, payload=payload)

    def create_manual_job(self, *, user_id: UUID, payload: Dict) -> JobDTO:
        company_id = self.companies.ensure_company(
            name=payload["company_name"],
            website=None,
            location=payload.get("location"),
        )
        final_desc = build_final_description(
            payload.get("description"),
            payload.get("requirements"),
            payload.get("skills"),
        )
        data = {**payload, "description": final_desc}
        return self.jobs.create(user_id=user_id, company_id=company_id, payload=data)

    def get_job(self, *, user_id: UUID, job_id: UUID) -> JobDTO:
        try:
            return self.jobs.get_for_user_with_company(job_id, user_id)
        except LookupError:
            raise JobNotFound

    def list_jobs(
        self,
        *,
        user_id: UUID,
        page: int,
        page_size: int,
        filters: Dict,
        sort: str,
        order: str,
        q: str = "",
    ) -> Tuple[List[JobDTO], int]:
        if q and q.strip():
            offset = (page - 1) * page_size
            search_filters = {"user_id": str(user_id)}
            if filters.get("location"):
                search_filters["location"] = filters["location"]
            if filters.get("remote_type"):
                search_filters["remote_type"] = filters["remote_type"]
            if filters.get("company"):
                search_filters["company"] = filters["company"]

            docs = self.search.search_jobs(
                query_text=q, limit=page_size, offset=offset, filters=search_filters
            )
            total = self.search.count(q, search_filters)

            items: List[JobDTO] = []
            from datetime import datetime
            for d in docs:
                created = d.get("created_at")
                # search returns ISO string; keep as-is (Pydantic will coerce downstream)
                items.append(
                    JobDTO(
                        id=UUID(d["id"]),
                        title=d.get("title", ""),
                        company_id=None,
                        company_name=d.get("company_name"),
                        website=d.get("company_website"),
                        location=d.get("location"),
                        remote_type=d.get("remote_type"),
                        job_type=d.get("job_type", ""),
                        description=d.get("description"),
                        requirements=d.get("requirements", []) or [],
                        skills=d.get("skills", []) or [],
                        source_url=d.get("source_url"),
                        created_at=created,  # may be str; acceptable for our DTO usage
                    )
                )
            return items, total

        items, total = self.jobs.list_for_user(
            user_id=user_id,
            page=page,
            page_size=page_size,
            filters=filters,
            sort=sort,
            order=order,
        )
        return items, total

    def search_jobs(
        self,
        *,
        user_id: UUID,
        q: str,
        page: int,
        page_size: int,
        filters: Dict,
    ) -> Tuple[List[JobSearchDTO], int]:
        offset = (page - 1) * page_size
        search_filters = {"user_id": str(user_id)}
        if filters.get("location"):
            search_filters["location"] = filters["location"]
        if filters.get("remote_type"):
            search_filters["remote_type"] = filters["remote_type"]
        if filters.get("company"):
            search_filters["company"] = filters["company"]

        docs = self.search.search_jobs(
            query_text=q, limit=page_size, offset=offset, filters=search_filters
        )
        total = self.search.count(q, search_filters)

        items: List[JobSearchDTO] = []
        for d in docs:
            items.append(
                JobSearchDTO(
                    id=d["id"],
                    title=d.get("title", ""),
                    description=d.get("description"),
                    location=d.get("location"),
                    remote_type=d.get("remote_type"),
                    source_url=d.get("source_url"),
                    created_at=d.get("created_at", ""),
                    company_name=d.get("company_name"),
                    company_website=d.get("company_website"),
                    relevance_score=float(d.get("relevance_score") or 0.0),
                )
            )
        return items, total

    def update_job(self, *, user_id: UUID, job_id: UUID, payload: Dict):
        try:
            company_id = self.companies.ensure_company(
                name=payload["company_name"],
                website=None,
                location=payload.get("location"),
            )
        except KeyError:
            company_id = None

        final_desc = build_final_description(
            payload.get("description"),
            payload.get("requirements"),
            payload.get("skills"),
        )

        data = {
            "company_id": company_id,
            "title": payload.get("title"),
            "location": payload.get("location"),
            "remote_type": payload.get("remote_type"),
            "source_url": payload.get("source_url"),
            "job_type": payload.get("job_type"),
            "description": final_desc,
        }
        if "requirements" in payload:
            data["requirements"] = [r for r in (payload.get("requirements") or []) if r and r.strip()]
        if "skills" in payload:
            data["skills"] = [s for s in (payload.get("skills") or []) if s and s.strip()]

        try:
            return self.jobs.update_for_user(job_id, user_id, data)
        except LookupError:
            raise JobNotFound

    def delete_job(self, *, user_id: UUID, job_id: UUID) -> None:
        try:
            self.jobs.delete_for_user_cascade(job_id, user_id)
        except LookupError:
            raise JobNotFound

    def suggest_terms(self, *, user_id: UUID, q: str):
        return self.search.suggest(q=q, user_id=str(user_id))
