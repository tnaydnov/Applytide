# backend/app/domain/admin/applications_service.py
"""Business logic for admin application management"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .applications_repository import ApplicationsAdminRepository
from .applications_dto import ApplicationSummaryDTO, ApplicationDetailDTO, ApplicationAnalyticsDTO
from .service import AdminService


class ApplicationsAdminService:
    """Handles business logic for admin application management"""
    
    def __init__(self, db: AsyncSession):
        self.repo = ApplicationsAdminRepository(db)
        self.admin_service = AdminService(db)
        self.db = db
    
    async def list_applications(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status: Optional[str] = None,
        source: Optional[str] = None,
        user_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[list[ApplicationSummaryDTO], int]:
        """List applications with filters and pagination"""
        return await self.repo.list_applications(
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            source=source,
            user_id=user_id,
            job_id=job_id,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    async def get_application_detail(self, app_id: UUID) -> Optional[ApplicationDetailDTO]:
        """Get detailed application information"""
        return await self.repo.get_application_detail(app_id)
    
    async def update_application_status(
        self,
        app_id: UUID,
        admin_id: UUID,
        status: str,
        justification: str
    ) -> bool:
        """Update application status with audit logging"""
        # Get current application for audit trail
        app = await self.repo.get_application_detail(app_id)
        if not app:
            return False
        
        old_status = app.status
        
        # Update status
        success = await self.repo.update_application_status(app_id, status)
        
        if success:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="update_application_status",
                target_type="application",
                target_id=app_id,
                justification=justification,
                metadata={
                    "job_title": app.job_title,
                    "user_email": app.user_email,
                    "old_status": old_status,
                    "new_status": status
                }
            )
        
        return success
    
    async def delete_application(
        self,
        app_id: UUID,
        admin_id: UUID,
        justification: str
    ) -> bool:
        """Delete application with audit logging"""
        # Get application info for audit trail
        app = await self.repo.get_application_detail(app_id)
        if not app:
            return False
        
        # Delete application
        success = await self.repo.delete_application(app_id)
        
        if success:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="delete_application",
                target_type="application",
                target_id=app_id,
                justification=justification,
                metadata={
                    "job_title": app.job_title,
                    "user_email": app.user_email,
                    "status": app.status
                }
            )
        
        return success
    
    async def bulk_delete_applications(
        self,
        app_ids: list[UUID],
        admin_id: UUID,
        justification: str
    ) -> int:
        """Bulk delete applications with audit logging"""
        deleted_count = await self.repo.bulk_delete_applications(app_ids)
        
        if deleted_count > 0:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="bulk_delete_applications",
                target_type="application",
                target_id=None,
                justification=justification,
                metadata={
                    "application_count": deleted_count,
                    "application_ids": [str(aid) for aid in app_ids[:10]]
                }
            )
        
        return deleted_count
    
    async def get_application_analytics(self) -> ApplicationAnalyticsDTO:
        """Get application analytics"""
        return await self.repo.get_application_analytics()
