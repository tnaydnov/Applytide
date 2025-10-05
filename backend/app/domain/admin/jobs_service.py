# backend/app/domain/admin/jobs_service.py
"""Business logic for admin job management"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .jobs_repository import JobsAdminRepository
from .jobs_dto import JobSummaryDTO, JobDetailDTO, JobAnalyticsDTO
from .service import AdminService  # For audit logging


class JobsAdminService:
    """Handles business logic for admin job management"""
    
    def __init__(self, db: AsyncSession):
        self.repo = JobsAdminRepository(db)
        self.admin_service = AdminService(db)
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
        """List jobs with filters and pagination"""
        return await self.repo.list_jobs(
            skip=skip,
            limit=limit,
            search=search,
            location=location,
            remote_type=remote_type,
            job_type=job_type,
            has_applications=has_applications,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    async def get_job_detail(self, job_id: UUID) -> Optional[JobDetailDTO]:
        """Get detailed job information"""
        return await self.repo.get_job_detail(job_id)
    
    async def update_job(
        self,
        job_id: UUID,
        admin_id: UUID,
        justification: str,
        title: Optional[str] = None,
        location: Optional[str] = None,
        remote_type: Optional[str] = None,
        job_type: Optional[str] = None,
        description: Optional[str] = None,
        requirements: Optional[list[str]] = None,
        skills: Optional[list[str]] = None,
        source_url: Optional[str] = None
    ) -> bool:
        """Update job with audit logging"""
        # Get current job for audit trail
        job = await self.repo.get_job_detail(job_id)
        if not job:
            return False
        
        # Update job
        success = await self.repo.update_job(
            job_id=job_id,
            title=title,
            location=location,
            remote_type=remote_type,
            job_type=job_type,
            description=description,
            requirements=requirements,
            skills=skills,
            source_url=source_url
        )
        
        if success:
            # Log the action
            changes = {}
            if title and title != job.title:
                changes["title"] = {"old": job.title, "new": title}
            if location and location != job.location:
                changes["location"] = {"old": job.location, "new": location}
            if remote_type and remote_type != job.remote_type:
                changes["remote_type"] = {"old": job.remote_type, "new": remote_type}
            if job_type and job_type != job.job_type:
                changes["job_type"] = {"old": job.job_type, "new": job_type}
            
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="update_job",
                target_type="job",
                target_id=job_id,
                justification=justification,
                metadata={
                    "job_title": job.title,
                    "changes": changes
                }
            )
        
        return success
    
    async def delete_job(
        self,
        job_id: UUID,
        admin_id: UUID,
        justification: str
    ) -> bool:
        """Delete job with audit logging"""
        # Get job info for audit trail
        job = await self.repo.get_job_detail(job_id)
        if not job:
            return False
        
        # Delete job
        success = await self.repo.delete_job(job_id)
        
        if success:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="delete_job",
                target_type="job",
                target_id=job_id,
                justification=justification,
                metadata={
                    "job_title": job.title,
                    "had_applications": job.total_applications > 0,
                    "application_count": job.total_applications
                }
            )
        
        return success
    
    async def bulk_delete_jobs(
        self,
        job_ids: list[UUID],
        admin_id: UUID,
        justification: str
    ) -> int:
        """Bulk delete jobs with audit logging"""
        deleted_count = await self.repo.bulk_delete_jobs(job_ids)
        
        if deleted_count > 0:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="bulk_delete_jobs",
                target_type="job",
                target_id=None,
                justification=justification,
                metadata={
                    "job_count": deleted_count,
                    "job_ids": [str(jid) for jid in job_ids[:10]]  # Log first 10
                }
            )
        
        return deleted_count
    
    async def get_job_analytics(self) -> JobAnalyticsDTO:
        """Get job analytics"""
        return await self.repo.get_job_analytics()
