# backend/app/domain/admin/documents_dto.py
"""Data transfer objects for admin document management"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class DocumentSummaryDTO:
    """Summary info for document list in admin"""
    id: UUID
    user_id: Optional[UUID]
    label: str
    file_path: str
    created_at: datetime
    # Computed data
    user_email: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None


@dataclass
class DocumentDetailDTO:
    """Detailed document info for admin inspection"""
    id: UUID
    user_id: Optional[UUID]
    label: str
    file_path: str
    text: Optional[str]
    created_at: datetime
    # Related data
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    usage_count: int = 0  # Number of applications using this resume


@dataclass
class DocumentAnalyticsDTO:
    """Analytics data for document management"""
    total_documents: int
    documents_7d: int
    documents_30d: int
    total_storage_bytes: int
    avg_document_size: float
    by_file_type: list[dict]  # [{"type": "pdf", "count": 100}]
    by_user: list[dict]  # [{"user_email": "user@example.com", "count": 5}]
    orphaned_count: int  # Documents with no user
    documents_by_date: list[dict]
