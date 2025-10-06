# backend/app/api/routers/admin/documents.py
"""Document management"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.documents_service import DocumentsAdminService
from ....infra.logging import get_logger


router = APIRouter(tags=["admin-documents"])
logger = get_logger(__name__)


class DocumentSummaryResponse(BaseModel):
    id: str
    user_id: Optional[str]
    label: str
    file_path: str
    created_at: datetime
    user_email: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]


class DocumentDetailResponse(BaseModel):
    id: str
    user_id: Optional[str]
    label: str
    file_path: str
    text: Optional[str]
    created_at: datetime
    user_email: Optional[str]
    user_name: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]
    usage_count: int


class DocumentAnalyticsResponse(BaseModel):
    total_documents: int
    documents_7d: int
    documents_30d: int
    total_storage_bytes: int
    avg_document_size: float
    by_file_type: list[dict]
    by_user: list[dict]
    orphaned_count: int
    documents_by_date: list[dict]


@router.get("/documents", response_model=dict)
@limiter.limit("100/minute")
async def list_documents(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    orphaned_only: bool = Query(False),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """List all documents with pagination and filters"""
    service = DocumentsAdminService(db)
    
    user_uuid = UUID(user_id) if user_id else None
    
    documents, total = await service.list_documents(
        skip=skip,
        limit=limit,
        search=search,
        user_id=user_uuid,
        orphaned_only=orphaned_only,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return {
        "documents": [
            {
                "id": str(doc.id),
                "user_id": str(doc.user_id) if doc.user_id else None,
                "label": doc.label,
                "file_path": doc.file_path,
                "created_at": doc.created_at.isoformat(),
                "user_email": doc.user_email,
                "file_size": doc.file_size,
                "file_type": doc.file_type
            }
            for doc in documents
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse)
@limiter.limit("100/minute")
async def get_document_detail(
    request: Request,
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get detailed document information"""
    service = DocumentsAdminService(db)
    doc = await service.get_document_detail(doc_id)
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentDetailResponse(
        id=str(doc.id),
        user_id=str(doc.user_id) if doc.user_id else None,
        label=doc.label,
        file_path=doc.file_path,
        text=doc.text,
        created_at=doc.created_at,
        user_email=doc.user_email,
        user_name=doc.user_name,
        file_size=doc.file_size,
        file_type=doc.file_type,
        usage_count=doc.usage_count
    )


@router.delete("/documents/{doc_id}")
@limiter.limit("20/minute")
async def delete_document(
    request: Request,
    doc_id: UUID,
    justification: str = Query(..., description="Reason for deletion"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Delete a document (requires step-up authentication)"""
    service = DocumentsAdminService(db)
    
    success = await service.delete_document(
        doc_id=doc_id,
        admin_id=current_admin.id,
        justification=justification
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return {
        "success": True,
        "message": "Document deleted successfully",
        "document_id": str(doc_id)
    }


@router.get("/documents/orphaned/list", response_model=dict)
@limiter.limit("100/minute")
async def list_orphaned_documents(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get list of orphaned documents"""
    service = DocumentsAdminService(db)
    documents = await service.get_orphaned_documents()
    
    return {
        "documents": [
            {
                "id": str(doc.id),
                "label": doc.label,
                "file_path": doc.file_path,
                "created_at": doc.created_at.isoformat(),
                "file_size": doc.file_size,
                "file_type": doc.file_type
            }
            for doc in documents
        ],
        "total": len(documents)
    }


@router.delete("/documents/orphaned/cleanup")
@limiter.limit("5/hour")
async def cleanup_orphaned_documents(
    request: Request,
    justification: str = Query(..., description="Reason for cleanup"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """Cleanup all orphaned documents (requires step-up authentication)"""
    service = DocumentsAdminService(db)
    
    deleted_count = await service.cleanup_orphaned_documents(
        admin_id=current_admin.id,
        justification=justification
    )
    
    return {
        "success": True,
        "message": f"Cleaned up {deleted_count} orphaned documents",
        "deleted_count": deleted_count
    }


@router.get("/documents/analytics/overview", response_model=DocumentAnalyticsResponse)
@limiter.limit("100/minute")
async def get_document_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """Get document analytics"""
    service = DocumentsAdminService(db)
    analytics = await service.get_document_analytics()
    
    return DocumentAnalyticsResponse(
        total_documents=analytics.total_documents,
        documents_7d=analytics.documents_7d,
        documents_30d=analytics.documents_30d,
        total_storage_bytes=analytics.total_storage_bytes,
        avg_document_size=analytics.avg_document_size,
        by_file_type=analytics.by_file_type,
        by_user=analytics.by_user,
        orphaned_count=analytics.orphaned_count,
        documents_by_date=analytics.documents_by_date
    )

