# backend/app/api/routers/admin/storage.py
"""Storage management"""
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
from ....domain.admin.storage_service import StorageAdminService


router = APIRouter(tags=["admin-storage"])

# Disk usage analysis and orphaned file cleanup

class StorageStatsResponse(BaseModel):
    total_documents: int
    total_storage_bytes: int
    total_storage_human: str
    avg_document_size_bytes: int
    largest_document_bytes: int
    orphaned_files_count: int
    orphaned_storage_bytes: int
    storage_by_type: list[dict]


class UserStorageResponse(BaseModel):
    user_id: str
    user_email: str
    document_count: int
    total_storage_bytes: int
    total_storage_human: str
    largest_document_bytes: int
    avg_document_size_bytes: int


class OrphanedFileResponse(BaseModel):
    file_path: str
    size_bytes: int
    size_human: str
    file_type: Optional[str]
    reason: str


class CleanupOrphanedRequest(BaseModel):
    justification: str = Field(..., min_length=10)
    max_files: int = Field(default=100, ge=1, le=1000)


@router.get(
    "/storage/stats",
    response_model=StorageStatsResponse,
    summary="Get Storage Statistics"
)
@limiter.limit("30/minute")
async def get_storage_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get comprehensive storage statistics
    
    Returns disk usage, document counts, orphaned files, and storage by file type
    """
    service = StorageAdminService(db)
    stats = await service.get_storage_stats()
    
    return StorageStatsResponse(
        total_documents=stats.total_documents,
        total_storage_bytes=stats.total_storage_bytes,
        total_storage_human=stats.total_storage_human,
        avg_document_size_bytes=stats.avg_document_size_bytes,
        largest_document_bytes=stats.largest_document_bytes,
        orphaned_files_count=stats.orphaned_files_count,
        orphaned_storage_bytes=stats.orphaned_storage_bytes,
        storage_by_type=stats.storage_by_type
    )


@router.get(
    "/storage/by-user",
    response_model=list[UserStorageResponse],
    summary="Get Storage by User"
)
@limiter.limit("30/minute")
async def get_storage_by_user(
    request: Request,
    limit: int = Query(default=50, ge=1, le=500),
    sort_by: str = Query(default="storage", regex="^(storage|count)$"),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get storage usage breakdown by user
    
    Returns top users by storage consumption or document count
    """
    service = StorageAdminService(db)
    user_storage = await service.get_storage_by_user(limit=limit, sort_by=sort_by)
    
    return [
        UserStorageResponse(
            user_id=user.user_id,
            user_email=user.user_email,
            document_count=user.document_count,
            total_storage_bytes=user.total_storage_bytes,
            total_storage_human=user.total_storage_human,
            largest_document_bytes=user.largest_document_bytes,
            avg_document_size_bytes=user.avg_document_size_bytes
        )
        for user in user_storage
    ]


@router.get(
    "/storage/orphaned",
    response_model=list[OrphanedFileResponse],
    summary="Find Orphaned Files"
)
@limiter.limit("20/minute")
async def find_orphaned_files(
    request: Request,
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Find files on disk without database records
    
    Returns list of orphaned files with size information
    """
    service = StorageAdminService(db)
    orphaned = await service.find_orphaned_files(limit=limit)
    
    return [
        OrphanedFileResponse(
            file_path=file.file_path,
            size_bytes=file.size_bytes,
            size_human=file.size_human,
            file_type=file.file_type,
            reason=file.reason
        )
        for file in orphaned
    ]


@router.delete(
    "/storage/orphaned/cleanup",
    summary="Cleanup Orphaned Files"
)
@limiter.limit("5/hour")  # Very strict limit for file deletion
async def cleanup_orphaned_files(
    request: Request,
    cleanup_request: CleanupOrphanedRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Delete orphaned files from disk
    
    DANGEROUS OPERATION - Permanently deletes files!
    
    - Requires step-up authentication
    - Rate limited to 5 per hour
    - Maximum 1000 files per operation
    - All deletions are audit logged
    """
    service = StorageAdminService(db)
    deleted_count = await service.cleanup_orphaned_files(
        admin_id=current_admin.id,
        justification=cleanup_request.justification,
        max_files=cleanup_request.max_files
    )
    
    return {
        "success": True,
        "files_deleted": deleted_count,
        "message": f"Successfully deleted {deleted_count} orphaned files"
    }


# ==================== SECURITY MONITORING ====================