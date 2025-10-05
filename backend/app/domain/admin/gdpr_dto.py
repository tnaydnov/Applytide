# backend/app/domain/admin/gdpr_dto.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class GDPRRequestType(str, Enum):
    """Types of GDPR requests"""
    EXPORT = "export"
    DELETE = "delete"


class GDPRRequestStatus(str, Enum):
    """Status of GDPR requests"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GDPRRequestDTO(BaseModel):
    """GDPR request information"""
    id: str
    user_id: str
    user_email: str
    request_type: GDPRRequestType
    status: GDPRRequestStatus
    requested_at: datetime
    completed_at: Optional[datetime]
    processed_by_admin_id: Optional[str]
    error_message: Optional[str]
    file_path: Optional[str]  # For export requests


class GDPRStatsDTO(BaseModel):
    """GDPR request statistics"""
    total_requests: int
    pending_requests: int
    completed_requests: int
    failed_requests: int
    export_requests: int
    delete_requests: int
