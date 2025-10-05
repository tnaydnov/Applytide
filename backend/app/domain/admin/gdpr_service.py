# backend/app/domain/admin/gdpr_service.py
import json
import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import uuid4

from .gdpr_dto import (
    GDPRRequestDTO,
    GDPRStatsDTO,
    GDPRRequestType,
    GDPRRequestStatus
)
from .service import AdminService
from ...db import models
from ...config import settings


class GDPRAdminService:
    """
    Admin service for GDPR compliance operations
    
    Handles user data export and deletion requests
    
    Note: This is a simplified implementation. In production, you would:
    1. Create a gdpr_requests table in the database
    2. Use background jobs for processing (Celery/RQ)
    3. Add email notifications
    4. Implement proper data sanitization
    5. Store exports in secure cloud storage
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.export_dir = getattr(settings, 'GDPR_EXPORT_DIR', 'backend/app/exports')
        
    async def get_gdpr_stats(self) -> GDPRStatsDTO:
        """
        Get GDPR request statistics
        
        Since we don't have a gdpr_requests table, we'll check audit logs
        """
        # Count GDPR-related admin actions
        result = await self.db.execute(
            select(
                models.AdminAction.action,
                func.count(models.AdminAction.id).label('count')
            ).where(
                models.AdminAction.action.in_([
                    'gdpr_export_requested',
                    'gdpr_export_completed',
                    'gdpr_export_failed',
                    'gdpr_delete_requested',
                    'gdpr_delete_completed',
                    'gdpr_delete_failed'
                ])
            ).group_by(
                models.AdminAction.action
            )
        )
        
        stats = {row.action: row.count for row in result}
        
        export_requests = (
            stats.get('gdpr_export_requested', 0) +
            stats.get('gdpr_export_completed', 0) +
            stats.get('gdpr_export_failed', 0)
        )
        
        delete_requests = (
            stats.get('gdpr_delete_requested', 0) +
            stats.get('gdpr_delete_completed', 0) +
            stats.get('gdpr_delete_failed', 0)
        )
        
        completed = (
            stats.get('gdpr_export_completed', 0) +
            stats.get('gdpr_delete_completed', 0)
        )
        
        failed = (
            stats.get('gdpr_export_failed', 0) +
            stats.get('gdpr_delete_failed', 0)
        )
        
        pending = (
            stats.get('gdpr_export_requested', 0) +
            stats.get('gdpr_delete_requested', 0) -
            completed - failed
        )
        
        return GDPRStatsDTO(
            total_requests=export_requests + delete_requests,
            pending_requests=max(0, pending),
            completed_requests=completed,
            failed_requests=failed,
            export_requests=export_requests,
            delete_requests=delete_requests
        )
    
    async def create_export_request(
        self,
        user_id: str,
        admin_id: str,
        justification: str
    ) -> str:
        """
        Create and immediately process a user data export request
        
        Args:
            user_id: User whose data to export
            admin_id: Admin creating the request
            justification: Reason for export
            
        Returns:
            Request ID (export file path)
        """
        # Get user
        result = await self.db.execute(
            select(models.User).where(models.User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        request_id = str(uuid4())
        
        # Log request
        await AdminService.log_action(
            self.db,
            admin_id=admin_id,
            action="gdpr_export_requested",
            entity_type="gdpr",
            entity_id=user_id,
            justification=justification,
            metadata={
                "user_id": user_id,
                "user_email": user.email,
                "request_id": request_id
            }
        )
        
        try:
            # Gather user data
            user_data = await self._gather_user_data(user)
            
            # Create export directory if needed
            os.makedirs(self.export_dir, exist_ok=True)
            
            # Save to JSON file
            file_name = f"user_data_export_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            file_path = os.path.join(self.export_dir, file_name)
            
            with open(file_path, 'w') as f:
                json.dump(user_data, f, indent=2, default=str)
            
            # Log completion
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="gdpr_export_completed",
                entity_type="gdpr",
                entity_id=user_id,
                justification=justification,
                metadata={
                    "user_id": user_id,
                    "request_id": request_id,
                    "file_path": file_path,
                    "file_size_bytes": os.path.getsize(file_path)
                }
            )
            
            return request_id
            
        except Exception as e:
            # Log failure
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="gdpr_export_failed",
                entity_type="gdpr",
                entity_id=user_id,
                justification=justification,
                metadata={
                    "user_id": user_id,
                    "request_id": request_id,
                    "error": str(e)
                }
            )
            raise
    
    async def create_delete_request(
        self,
        user_id: str,
        admin_id: str,
        justification: str
    ) -> str:
        """
        Create and immediately process a user deletion request
        
        DANGEROUS OPERATION - Permanently deletes user and all data!
        
        Args:
            user_id: User to delete
            admin_id: Admin creating the request
            justification: Reason for deletion (must be detailed)
            
        Returns:
            Request ID
        """
        # Get user
        result = await self.db.execute(
            select(models.User).where(models.User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        request_id = str(uuid4())
        user_email = user.email
        
        # Log request
        await AdminService.log_action(
            self.db,
            admin_id=admin_id,
            action="gdpr_delete_requested",
            entity_type="gdpr",
            entity_id=user_id,
            justification=justification,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "request_id": request_id
            }
        )
        
        try:
            # Count related records
            jobs_result = await self.db.execute(
                select(func.count(models.Job.id)).where(models.Job.user_id == user_id)
            )
            jobs_count = jobs_result.scalar() or 0
            
            apps_result = await self.db.execute(
                select(func.count(models.Application.id)).where(models.Application.user_id == user_id)
            )
            apps_count = apps_result.scalar() or 0
            
            docs_result = await self.db.execute(
                select(func.count(models.Document.id)).where(models.Document.user_id == user_id)
            )
            docs_count = docs_result.scalar() or 0
            
            # Delete user (cascade should handle related records)
            await self.db.delete(user)
            await self.db.commit()
            
            # Log completion
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="gdpr_delete_completed",
                entity_type="gdpr",
                entity_id=user_id,
                justification=justification,
                metadata={
                    "user_id": user_id,
                    "user_email": user_email,
                    "request_id": request_id,
                    "jobs_deleted": jobs_count,
                    "applications_deleted": apps_count,
                    "documents_deleted": docs_count
                }
            )
            
            return request_id
            
        except Exception as e:
            await self.db.rollback()
            
            # Log failure
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="gdpr_delete_failed",
                entity_type="gdpr",
                entity_id=user_id,
                justification=justification,
                metadata={
                    "user_id": user_id,
                    "request_id": request_id,
                    "error": str(e)
                }
            )
            raise
    
    async def list_gdpr_requests(
        self,
        request_type: Optional[GDPRRequestType] = None,
        limit: int = 100
    ) -> List[GDPRRequestDTO]:
        """
        List GDPR requests from audit logs
        
        Args:
            request_type: Filter by type (export or delete)
            limit: Maximum number of requests
            
        Returns:
            List of GDPR requests
        """
        # Define action filters based on request type
        if request_type == GDPRRequestType.EXPORT:
            actions = ['gdpr_export_requested', 'gdpr_export_completed', 'gdpr_export_failed']
        elif request_type == GDPRRequestType.DELETE:
            actions = ['gdpr_delete_requested', 'gdpr_delete_completed', 'gdpr_delete_failed']
        else:
            actions = [
                'gdpr_export_requested', 'gdpr_export_completed', 'gdpr_export_failed',
                'gdpr_delete_requested', 'gdpr_delete_completed', 'gdpr_delete_failed'
            ]
        
        result = await self.db.execute(
            select(models.AdminAction).where(
                models.AdminAction.action.in_(actions)
            ).order_by(desc(models.AdminAction.created_at)).limit(limit)
        )
        
        requests = []
        for action in result.scalars():
            metadata = action.metadata or {}
            
            # Determine request type and status
            if 'export' in action.action:
                req_type = GDPRRequestType.EXPORT
            else:
                req_type = GDPRRequestType.DELETE
            
            if 'completed' in action.action:
                status = GDPRRequestStatus.COMPLETED
            elif 'failed' in action.action:
                status = GDPRRequestStatus.FAILED
            else:
                status = GDPRRequestStatus.PENDING
            
            requests.append(GDPRRequestDTO(
                id=metadata.get('request_id', str(action.id)),
                user_id=action.entity_id,
                user_email=metadata.get('user_email', 'unknown'),
                request_type=req_type,
                status=status,
                requested_at=action.created_at,
                completed_at=action.created_at if status == GDPRRequestStatus.COMPLETED else None,
                processed_by_admin_id=str(action.admin_id) if action.admin_id else None,
                error_message=metadata.get('error'),
                file_path=metadata.get('file_path')
            ))
        
        return requests
    
    async def _gather_user_data(self, user: models.User) -> dict:
        """
        Gather all user data for export
        
        Returns:
            Dictionary containing all user data
        """
        # Get user's jobs
        jobs_result = await self.db.execute(
            select(models.Job).where(models.Job.user_id == user.id)
        )
        jobs = [
            {
                "id": str(job.id),
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "created_at": job.created_at.isoformat() if job.created_at else None
            }
            for job in jobs_result.scalars()
        ]
        
        # Get user's applications
        apps_result = await self.db.execute(
            select(models.Application).where(models.Application.user_id == user.id)
        )
        applications = [
            {
                "id": str(app.id),
                "job_id": str(app.job_id) if app.job_id else None,
                "status": app.status,
                "applied_at": app.applied_at.isoformat() if app.applied_at else None
            }
            for app in apps_result.scalars()
        ]
        
        # Get user's documents
        docs_result = await self.db.execute(
            select(models.Document).where(models.Document.user_id == user.id)
        )
        documents = [
            {
                "id": str(doc.id),
                "label": doc.label,
                "file_type": doc.file_type,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None
            }
            for doc in docs_result.scalars()
        ]
        
        return {
            "export_info": {
                "exported_at": datetime.utcnow().isoformat(),
                "format_version": "1.0"
            },
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_premium": user.is_premium,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
            },
            "jobs": jobs,
            "applications": applications,
            "documents": documents,
            "statistics": {
                "total_jobs": len(jobs),
                "total_applications": len(applications),
                "total_documents": len(documents)
            }
        }
