# backend/app/domain/admin/jobs_repository.py
"""Repository for admin job management queries"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, delete, update, desc, asc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, Application, Company
from .jobs_dto import JobSummaryDTO, JobDetailDTO, JobAnalyticsDTO


class JobsAdminRepository:
    """Handles database operations for admin job management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_jobs(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        location: Optional[str] = None,
        remote_type: Optional[str] = None,
        job_type: Optional[str] = None,
        has_applications: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[list[JobSummaryDTO], int]:
        """List jobs with pagination and filters"""
        
        # Build base query
        query = select(
            Job,
            func.count(Application.id).label("app_count"),
            Company.name.label("company_name")
        ).outerjoin(
            Application, Application.job_id == Job.id
        ).outerjoin(
            Company, Company.id == Job.company_id
        ).group_by(Job.id, Company.name)
        
        # Apply filters
        conditions = []
        
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Job.title.ilike(search_pattern),
                    Job.description.ilike(search_pattern),
                    Job.location.ilike(search_pattern)
                )
            )
        
        if location:
            conditions.append(Job.location.ilike(f"%{location}%"))
        
        if remote_type:
            conditions.append(Job.remote_type == remote_type)
        
        if job_type:
            conditions.append(Job.job_type == job_type)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Count total before pagination
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply sorting
        sort_column = getattr(Job, sort_by, Job.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Convert to DTOs
        jobs = []
        for row in rows:
            job, app_count, company_name = row
            jobs.append(JobSummaryDTO(
                id=job.id,
                title=job.title,
                location=job.location,
                remote_type=job.remote_type,
                job_type=job.job_type,
                source_url=job.source_url,
                user_id=job.user_id,
                company_id=job.company_id,
                created_at=job.created_at,
                total_applications=app_count or 0,
                company_name=company_name
            ))
        
        # Apply has_applications filter if needed
        if has_applications is not None:
            if has_applications:
                jobs = [j for j in jobs if j.total_applications > 0]
            else:
                jobs = [j for j in jobs if j.total_applications == 0]
            total = len(jobs)
        
        return jobs, total
    
    async def get_job_detail(self, job_id: UUID) -> Optional[JobDetailDTO]:
        """Get detailed job information"""
        query = select(
            Job,
            func.count(Application.id).label("app_count"),
            Company.name.label("company_name")
        ).outerjoin(
            Application, Application.job_id == Job.id
        ).outerjoin(
            Company, Company.id == Job.company_id
        ).where(
            Job.id == job_id
        ).group_by(Job.id, Company.name)
        
        result = await self.db.execute(query)
        row = result.first()
        
        if not row:
            return None
        
        job, app_count, company_name = row
        
        # Get recent applications
        apps_query = select(Application).where(
            Application.job_id == job_id
        ).order_by(desc(Application.created_at)).limit(10)
        apps_result = await self.db.execute(apps_query)
        applications = apps_result.scalars().all()
        
        return JobDetailDTO(
            id=job.id,
            title=job.title,
            location=job.location,
            remote_type=job.remote_type,
            job_type=job.job_type,
            description=job.description,
            requirements=job.requirements or [],
            skills=job.skills or [],
            source_url=job.source_url,
            user_id=job.user_id,
            company_id=job.company_id,
            created_at=job.created_at,
            total_applications=app_count or 0,
            company_name=company_name,
            applications=[{
                "id": str(app.id),
                "user_id": str(app.user_id) if app.user_id else None,
                "status": app.status,
                "created_at": app.created_at.isoformat()
            } for app in applications]
        )
    
    async def update_job(
        self,
        job_id: UUID,
        title: Optional[str] = None,
        location: Optional[str] = None,
        remote_type: Optional[str] = None,
        job_type: Optional[str] = None,
        description: Optional[str] = None,
        requirements: Optional[list[str]] = None,
        skills: Optional[list[str]] = None,
        source_url: Optional[str] = None
    ) -> bool:
        """Update job details"""
        updates = {}
        
        if title is not None:
            updates[Job.title] = title
        if location is not None:
            updates[Job.location] = location
        if remote_type is not None:
            updates[Job.remote_type] = remote_type
        if job_type is not None:
            updates[Job.job_type] = job_type
        if description is not None:
            updates[Job.description] = description
        if requirements is not None:
            updates[Job.requirements] = requirements
        if skills is not None:
            updates[Job.skills] = skills
        if source_url is not None:
            updates[Job.source_url] = source_url
        
        if not updates:
            return False
        
        query = update(Job).where(Job.id == job_id).values(**updates)
        result = await self.db.execute(query)
        await self.db.commit()
        
        return result.rowcount > 0
    
    async def delete_job(self, job_id: UUID) -> bool:
        """Delete a job (and cascade delete applications)"""
        # First delete applications
        await self.db.execute(
            delete(Application).where(Application.job_id == job_id)
        )
        
        # Then delete job
        result = await self.db.execute(
            delete(Job).where(Job.id == job_id)
        )
        await self.db.commit()
        
        return result.rowcount > 0
    
    async def bulk_delete_jobs(self, job_ids: list[UUID]) -> int:
        """Delete multiple jobs"""
        # Delete applications first
        await self.db.execute(
            delete(Application).where(Application.job_id.in_(job_ids))
        )
        
        # Delete jobs
        result = await self.db.execute(
            delete(Job).where(Job.id.in_(job_ids))
        )
        await self.db.commit()
        
        return result.rowcount
    
    async def get_job_analytics(self) -> JobAnalyticsDTO:
        """Get job analytics"""
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # Total jobs
        total_result = await self.db.execute(
            select(func.count(Job.id))
        )
        total_jobs = total_result.scalar() or 0
        
        # Jobs in last 7 days
        jobs_7d_result = await self.db.execute(
            select(func.count(Job.id)).where(
                Job.created_at >= seven_days_ago
            )
        )
        jobs_7d = jobs_7d_result.scalar() or 0
        
        # Jobs in last 30 days
        jobs_30d_result = await self.db.execute(
            select(func.count(Job.id)).where(
                Job.created_at >= thirty_days_ago
            )
        )
        jobs_30d = jobs_30d_result.scalar() or 0
        
        # Jobs with applications
        jobs_with_apps_result = await self.db.execute(
            select(func.count(func.distinct(Application.job_id)))
        )
        jobs_with_applications = jobs_with_apps_result.scalar() or 0
        
        # Average applications per job
        avg_apps_result = await self.db.execute(
            select(func.avg(func.count(Application.id)))
            .select_from(Job)
            .outerjoin(Application, Application.job_id == Job.id)
            .group_by(Job.id)
        )
        avg_applications_per_job = avg_apps_result.scalar() or 0.0
        
        # Top locations
        top_locations_result = await self.db.execute(
            select(
                Job.location,
                func.count(Job.id).label("count")
            )
            .where(Job.location.isnot(None))
            .group_by(Job.location)
            .order_by(desc("count"))
            .limit(10)
        )
        top_locations = [
            {"location": row[0], "count": row[1]}
            for row in top_locations_result.all()
        ]
        
        # Top remote types
        top_remote_result = await self.db.execute(
            select(
                Job.remote_type,
                func.count(Job.id).label("count")
            )
            .where(Job.remote_type.isnot(None))
            .group_by(Job.remote_type)
            .order_by(desc("count"))
            .limit(10)
        )
        top_remote_types = [
            {"remote_type": row[0], "count": row[1]}
            for row in top_remote_result.all()
        ]
        
        # Top job types
        top_job_types_result = await self.db.execute(
            select(
                Job.job_type,
                func.count(Job.id).label("count")
            )
            .where(Job.job_type.isnot(None))
            .group_by(Job.job_type)
            .order_by(desc("count"))
            .limit(10)
        )
        top_job_types = [
            {"job_type": row[0], "count": row[1]}
            for row in top_job_types_result.all()
        ]
        
        # Jobs by date (last 30 days)
        jobs_by_date_result = await self.db.execute(
            select(
                func.date(Job.created_at).label("date"),
                func.count(Job.id).label("count")
            )
            .where(Job.created_at >= thirty_days_ago)
            .group_by(func.date(Job.created_at))
            .order_by(asc("date"))
        )
        jobs_by_date = [
            {"date": row[0].isoformat(), "count": row[1]}
            for row in jobs_by_date_result.all()
        ]
        
        return JobAnalyticsDTO(
            total_jobs=total_jobs,
            jobs_7d=jobs_7d,
            jobs_30d=jobs_30d,
            jobs_with_applications=jobs_with_applications,
            avg_applications_per_job=float(avg_applications_per_job),
            top_locations=top_locations,
            top_remote_types=top_remote_types,
            top_job_types=top_job_types,
            jobs_by_date=jobs_by_date
        )
