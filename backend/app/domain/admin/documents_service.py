# backend/app/domain/admin/documents_service.py
"""Business logic for admin document management"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .documents_repository import DocumentsAdminRepository
from .documents_dto import DocumentSummaryDTO, DocumentDetailDTO, DocumentAnalyticsDTO
from .service import AdminService


class DocumentsAdminService:
    """Handles business logic for admin document management"""
    
    def __init__(self, db: AsyncSession):
        self.repo = DocumentsAdminRepository(db)
        self.admin_service = AdminService(db)
        self.db = db
    
    async def list_documents(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        user_id: Optional[UUID] = None,
        orphaned_only: bool = False,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[list[DocumentSummaryDTO], int]:
        """List documents with filters and pagination"""
        return await self.repo.list_documents(
            skip=skip,
            limit=limit,
            search=search,
            user_id=user_id,
            orphaned_only=orphaned_only,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    async def get_document_detail(self, doc_id: UUID) -> Optional[DocumentDetailDTO]:
        """Get detailed document information"""
        return await self.repo.get_document_detail(doc_id)
    
    async def delete_document(
        self,
        doc_id: UUID,
        admin_id: UUID,
        justification: str
    ) -> bool:
        """Delete document with audit logging"""
        # Get document info for audit trail
        doc = await self.repo.get_document_detail(doc_id)
        if not doc:
            return False
        
        # Delete document
        success, file_path = await self.repo.delete_document(doc_id)
        
        if success:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="delete_document",
                target_type="document",
                target_id=doc_id,
                justification=justification,
                metadata={
                    "label": doc.label,
                    "user_email": doc.user_email,
                    "file_path": file_path,
                    "usage_count": doc.usage_count
                }
            )
        
        return success
    
    async def get_orphaned_documents(self) -> list[DocumentSummaryDTO]:
        """Get orphaned documents"""
        return await self.repo.get_orphaned_documents()
    
    async def cleanup_orphaned_documents(
        self,
        admin_id: UUID,
        justification: str
    ) -> int:
        """Cleanup orphaned documents with audit logging"""
        # Get count before cleanup
        orphaned = await self.repo.get_orphaned_documents()
        orphaned_count = len(orphaned)
        
        if orphaned_count == 0:
            return 0
        
        # Perform cleanup
        deleted_count = await self.repo.cleanup_orphaned_documents()
        
        if deleted_count > 0:
            # Log the action
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="cleanup_orphaned_documents",
                target_type="document",
                target_id=None,
                justification=justification,
                metadata={
                    "deleted_count": deleted_count,
                    "file_paths": [doc.file_path for doc in orphaned[:10]]  # First 10
                }
            )
        
        return deleted_count
    
    async def get_document_analytics(self) -> DocumentAnalyticsDTO:
        """Get document analytics"""
        return await self.repo.get_document_analytics()
