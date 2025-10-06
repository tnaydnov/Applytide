# backend/app/api/routers/admin/gdpr.py
"""GDPR compliance"""
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
from ....domain.admin.gdpr_service import GDPRAdminService
from ....infra.logging import get_logger
from ....infra.logging.security_logger import log_security_event


router = APIRouter(tags=["admin-gdpr"])
logger = get_logger(__name__)


class GDPRStatsResponse(BaseModel):
    total_requests: int
    pending_requests: int
    completed_requests: int
    failed_requests: int
    export_requests: int
    delete_requests: int


class GDPRRequestResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    request_type: str
    status: str
    requested_at: datetime
    completed_at: Optional[datetime]
    processed_by_admin_id: Optional[str]
    error_message: Optional[str]
    file_path: Optional[str]


class CreateExportRequest(BaseModel):
    user_id: str = Field(..., description="User ID to export data for")
    justification: str = Field(..., min_length=20, description="Detailed reason for export")


class CreateDeleteRequest(BaseModel):
    user_id: str = Field(..., description="User ID to delete")
    justification: str = Field(..., min_length=50, description="Detailed reason for deletion (DANGEROUS OPERATION)")


@router.get(
    "/gdpr/stats",
    response_model=GDPRStatsResponse,
    summary="Get GDPR Statistics"
)
@limiter.limit("30/minute")
async def get_gdpr_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get GDPR request statistics
    
    Returns counts of export/delete requests and their statuses
    """
    try:
        logger.info(
            "Admin requesting GDPR statistics",
            extra={"admin_id": str(current_admin.id)}
        )
        
        service = GDPRAdminService(db)
        stats = await service.get_gdpr_stats()
        
        logger.info(
            "GDPR statistics retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "total_requests": stats.total_requests,
                "pending_requests": stats.pending_requests
            }
        )
        
        return GDPRStatsResponse(
            total_requests=stats.total_requests,
            pending_requests=stats.pending_requests,
            completed_requests=stats.completed_requests,
            failed_requests=stats.failed_requests,
            export_requests=stats.export_requests,
            delete_requests=stats.delete_requests
        )
    
    except Exception as e:
        logger.error(
            "Error retrieving GDPR statistics",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve GDPR statistics"
        )


@router.get(
    "/gdpr/requests",
    response_model=list[GDPRRequestResponse],
    summary="List GDPR Requests"
)
@limiter.limit("30/minute")
async def list_gdpr_requests(
    request: Request,
    request_type: Optional[str] = Query(default=None, pattern="^(export|delete)$"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    List GDPR requests from audit logs
    
    Returns history of data export and deletion requests
    """
    try:
        logger.info(
            "Admin listing GDPR requests",
            extra={
                "admin_id": str(current_admin.id),
                "request_type": request_type,
                "limit": limit
            }
        )
        
        from ...domain.admin.gdpr_dto import GDPRRequestType
        
        service = GDPRAdminService(db)
        req_type = GDPRRequestType(request_type) if request_type else None
        requests = await service.list_gdpr_requests(request_type=req_type, limit=limit)
        
        result = [
            GDPRRequestResponse(
                id=req.id,
                user_id=req.user_id,
                user_email=req.user_email,
                request_type=req.request_type.value,
                status=req.status.value,
                requested_at=req.requested_at,
                completed_at=req.completed_at,
                processed_by_admin_id=req.processed_by_admin_id,
                error_message=req.error_message,
                file_path=req.file_path
            )
            for req in requests
        ]
        
        logger.info(
            "GDPR requests listed",
            extra={
                "admin_id": str(current_admin.id),
                "count": len(result),
                "request_type": request_type
            }
        )
        
        return result
    
    except Exception as e:
        logger.error(
            "Error listing GDPR requests",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve GDPR requests"
        )


@router.post(
    "/gdpr/export",
    summary="Create Data Export Request"
)
@limiter.limit("10/hour")  # Strict limit for GDPR operations
async def create_export_request(
    request: Request,
    export_request: CreateExportRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Create and process user data export request
    
    - Requires step-up authentication
    - Exports all user data to JSON file
    - Includes jobs, applications, documents
    - Rate limited to 10 per hour
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        # Log this CRITICAL privacy operation
        logger.warning(
            "Admin initiating GDPR data export",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": export_request.user_id,
                "justification": export_request.justification,
                "admin_ip": ip_address
            }
        )
        
        # Security event logging for compliance
        log_security_event(
            event_type="gdpr_data_export",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": export_request.user_id,
                "justification": export_request.justification
            },
            request=request
        )
        
        service = GDPRAdminService(db)
        
        request_id = await service.create_export_request(
            user_id=export_request.user_id,
            admin_id=current_admin.id,
            justification=export_request.justification
        )
        
        logger.info(
            "GDPR data export completed",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": export_request.user_id,
                "request_id": request_id
            }
        )
        
        return {
            "success": True,
            "request_id": request_id,
            "message": f"Data export completed for user {export_request.user_id}"
        }
    
    except ValueError as e:
        logger.warning(
            "GDPR export failed - user not found",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": export_request.user_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "GDPR export failed",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": export_request.user_id,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post(
    "/gdpr/delete",
    summary="Create User Deletion Request"
)
@limiter.limit("5/hour")  # Very strict limit for deletions
async def create_delete_request(
    request: Request,
    delete_request: CreateDeleteRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Create and process user deletion request
    
    EXTREMELY DANGEROUS OPERATION - Permanently deletes user and ALL data!
    
    - Requires step-up authentication
    - Requires detailed justification (min 50 characters)
    - Deletes user, jobs, applications, documents
    - Cascades to all related records
    - Rate limited to 5 per hour
    - Permanently logged in audit trail
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        # Log this EXTREMELY DANGEROUS operation with maximum detail
        logger.critical(
            "Admin initiating PERMANENT USER DELETION",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": delete_request.user_id,
                "justification": delete_request.justification,
                "admin_ip": ip_address,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Critical security event logging
        log_security_event(
            event_type="gdpr_user_deletion",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": delete_request.user_id,
                "justification": delete_request.justification,
                "warning": "PERMANENT_DATA_DELETION"
            },
            request=request
        )
        
        service = GDPRAdminService(db)
        
        request_id = await service.create_delete_request(
            user_id=delete_request.user_id,
            admin_id=current_admin.id,
            justification=delete_request.justification
        )
        
        logger.critical(
            "User and all data PERMANENTLY DELETED",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": delete_request.user_id,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "success": True,
            "request_id": request_id,
            "message": f"User {delete_request.user_id} and all related data have been permanently deleted",
            "warning": "This operation cannot be undone"
        }
    
    except ValueError as e:
        logger.warning(
            "User deletion failed - user not found",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": delete_request.user_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "CRITICAL: User deletion failed",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": delete_request.user_id,
                "error": str(e)
            },
            exc_info=True
        )
        
        try:
            await db.rollback()
            logger.info("Database rolled back after deletion failure")
        except Exception as rollback_error:
            logger.critical(
                "Failed to rollback database after deletion failure",
                extra={"rollback_error": str(rollback_error)},
                exc_info=True
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )

