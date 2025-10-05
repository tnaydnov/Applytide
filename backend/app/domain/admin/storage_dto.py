# backend/app/domain/admin/storage_dto.py
from pydantic import BaseModel
from typing import List, Optional


class StorageStatsDTO(BaseModel):
    """Overall storage statistics"""
    total_documents: int
    total_storage_bytes: int
    total_storage_human: str
    avg_document_size_bytes: int
    largest_document_bytes: int
    orphaned_files_count: int
    orphaned_storage_bytes: int
    storage_by_type: List[dict]  # [{"file_type": "pdf", "count": 10, "total_bytes": 1000}]


class UserStorageDTO(BaseModel):
    """Storage usage per user"""
    user_id: str
    user_email: str
    document_count: int
    total_storage_bytes: int
    total_storage_human: str
    largest_document_bytes: int
    avg_document_size_bytes: int


class OrphanedFileDTO(BaseModel):
    """Orphaned file information"""
    file_path: str
    size_bytes: int
    size_human: str
    file_type: Optional[str]
    reason: str  # "no_database_record" or "user_deleted"
