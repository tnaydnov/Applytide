# backend/app/domain/admin/documents_repository.py
"""Repository for admin document management queries"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import os

from sqlalchemy import func, select, delete, desc, asc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Resume, User, Application
from .documents_dto import DocumentSummaryDTO, DocumentDetailDTO, DocumentAnalyticsDTO


class DocumentsAdminRepository:
    """Handles database operations for admin document management"""
    
    def __init__(self, db: AsyncSession):
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
        """List documents with pagination and filters"""
        
        # Build base query
        query = select(
            Resume,
            User.email.label("user_email")
        ).outerjoin(
            User, User.id == Resume.user_id
        )
        
        # Apply filters
        conditions = []
        
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Resume.label.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    Resume.file_path.ilike(search_pattern)
                )
            )
        
        if user_id:
            conditions.append(Resume.user_id == user_id)
        
        if orphaned_only:
            conditions.append(Resume.user_id.is_(None))
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Count total before pagination
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply sorting
        sort_column = getattr(Resume, sort_by, Resume.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Convert to DTOs
        documents = []
        for row in rows:
            doc, user_email = row
            
            # Get file info
            file_size = None
            file_type = None
            if os.path.exists(doc.file_path):
                file_size = os.path.getsize(doc.file_path)
                file_type = os.path.splitext(doc.file_path)[1].lower()
            
            documents.append(DocumentSummaryDTO(
                id=doc.id,
                user_id=doc.user_id,
                label=doc.label,
                file_path=doc.file_path,
                created_at=doc.created_at,
                user_email=user_email,
                file_size=file_size,
                file_type=file_type
            ))
        
        return documents, total
    
    async def get_document_detail(self, doc_id: UUID) -> Optional[DocumentDetailDTO]:
        """Get detailed document information"""
        query = select(
            Resume,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
            func.count(Application.id).label("usage_count")
        ).outerjoin(
            User, User.id == Resume.user_id
        ).outerjoin(
            Application, Application.resume_id == Resume.id
        ).where(
            Resume.id == doc_id
        ).group_by(Resume.id, User.email, User.full_name)
        
        result = await self.db.execute(query)
        row = result.first()
        
        if not row:
            return None
        
        doc, user_email, user_name, usage_count = row
        
        # Get file info
        file_size = None
        file_type = None
        if os.path.exists(doc.file_path):
            file_size = os.path.getsize(doc.file_path)
            file_type = os.path.splitext(doc.file_path)[1].lower()
        
        return DocumentDetailDTO(
            id=doc.id,
            user_id=doc.user_id,
            label=doc.label,
            file_path=doc.file_path,
            text=doc.text,
            created_at=doc.created_at,
            user_email=user_email,
            user_name=user_name,
            file_size=file_size,
            file_type=file_type,
            usage_count=usage_count or 0
        )
    
    async def delete_document(self, doc_id: UUID) -> tuple[bool, Optional[str]]:
        """Delete a document and its file"""
        # Get file path first
        query = select(Resume.file_path).where(Resume.id == doc_id)
        result = await self.db.execute(query)
        file_path = result.scalar()
        
        if not file_path:
            return False, None
        
        # Delete from database
        delete_result = await self.db.execute(
            delete(Resume).where(Resume.id == doc_id)
        )
        await self.db.commit()
        
        # Delete file if it exists
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                from ...infra.logging import get_logger
                logger = get_logger(__name__)
                logger.error("Failed to delete file", extra={"file_path": file_path, "error": str(e)}, exc_info=True)
        
        return delete_result.rowcount > 0, file_path
    
    async def get_orphaned_documents(self) -> list[DocumentSummaryDTO]:
        """Get documents with no associated user"""
        query = select(Resume).where(Resume.user_id.is_(None))
        result = await self.db.execute(query)
        documents = result.scalars().all()
        
        orphaned = []
        for doc in documents:
            file_size = None
            file_type = None
            if os.path.exists(doc.file_path):
                file_size = os.path.getsize(doc.file_path)
                file_type = os.path.splitext(doc.file_path)[1].lower()
            
            orphaned.append(DocumentSummaryDTO(
                id=doc.id,
                user_id=doc.user_id,
                label=doc.label,
                file_path=doc.file_path,
                created_at=doc.created_at,
                user_email=None,
                file_size=file_size,
                file_type=file_type
            ))
        
        return orphaned
    
    async def cleanup_orphaned_documents(self) -> int:
        """Delete all orphaned documents"""
        # Get orphaned documents
        query = select(Resume.file_path).where(Resume.user_id.is_(None))
        result = await self.db.execute(query)
        file_paths = [row[0] for row in result.all()]
        
        # Delete from database
        delete_result = await self.db.execute(
            delete(Resume).where(Resume.user_id.is_(None))
        )
        await self.db.commit()
        
        # Delete files
        for file_path in file_paths:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    from ...infra.logging import get_logger
                    logger = get_logger(__name__)
                    logger.error("Failed to delete file", extra={"file_path": file_path, "error": str(e)}, exc_info=True)
        
        return delete_result.rowcount
    
    async def get_document_analytics(self) -> DocumentAnalyticsDTO:
        """Get document analytics"""
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # Total documents
        total_result = await self.db.execute(
            select(func.count(Resume.id))
        )
        total_documents = total_result.scalar() or 0
        
        # Documents in last 7 days
        docs_7d_result = await self.db.execute(
            select(func.count(Resume.id)).where(
                Resume.created_at >= seven_days_ago
            )
        )
        documents_7d = docs_7d_result.scalar() or 0
        
        # Documents in last 30 days
        docs_30d_result = await self.db.execute(
            select(func.count(Resume.id)).where(
                Resume.created_at >= thirty_days_ago
            )
        )
        documents_30d = docs_30d_result.scalar() or 0
        
        # Calculate storage (approximate from file paths)
        all_docs_result = await self.db.execute(select(Resume.file_path))
        all_file_paths = [row[0] for row in all_docs_result.all()]
        
        total_storage = 0
        file_type_counts = {}
        
        for file_path in all_file_paths:
            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                total_storage += size
                
                ext = os.path.splitext(file_path)[1].lower() or 'unknown'
                file_type_counts[ext] = file_type_counts.get(ext, 0) + 1
        
        avg_size = total_storage / total_documents if total_documents > 0 else 0
        
        # By file type
        by_file_type = [
            {"type": ext, "count": count}
            for ext, count in sorted(file_type_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        # By user (top 10)
        by_user_result = await self.db.execute(
            select(
                User.email,
                func.count(Resume.id).label("count")
            )
            .join(User, User.id == Resume.user_id)
            .group_by(User.email)
            .order_by(desc("count"))
            .limit(10)
        )
        by_user = [
            {"user_email": row[0], "count": row[1]}
            for row in by_user_result.all()
        ]
        
        # Orphaned count
        orphaned_result = await self.db.execute(
            select(func.count(Resume.id)).where(Resume.user_id.is_(None))
        )
        orphaned_count = orphaned_result.scalar() or 0
        
        # Documents by date (last 30 days)
        docs_by_date_result = await self.db.execute(
            select(
                func.date(Resume.created_at).label("date"),
                func.count(Resume.id).label("count")
            )
            .where(Resume.created_at >= thirty_days_ago)
            .group_by(func.date(Resume.created_at))
            .order_by(asc("date"))
        )
        documents_by_date = [
            {"date": row[0].isoformat(), "count": row[1]}
            for row in docs_by_date_result.all()
        ]
        
        return DocumentAnalyticsDTO(
            total_documents=total_documents,
            documents_7d=documents_7d,
            documents_30d=documents_30d,
            total_storage_bytes=total_storage,
            avg_document_size=avg_size,
            by_file_type=by_file_type,
            by_user=by_user,
            orphaned_count=orphaned_count,
            documents_by_date=documents_by_date
        )
