"""
Admin Ban Management Endpoints

Provides admin functionality for banning and unbanning users:
- Ban user by email and/or IP
- Unban user
- List all bans (active and inactive)
- Get ban details
- View user's ban history

All ban operations are logged with admin audit trail.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field, validator

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_admin_user
from app.db import models
from app.infra.security.ban_service import (
    BanService,
    BanServiceError,
    DuplicateBanError,
    InvalidBanDataError
)
from app.infra.http.client_ip import get_client_ip
from app.infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ============= Request/Response Schemas =============

class BanUserRequest(BaseModel):
    """Request to ban a user"""
    user_id: uuid.UUID = Field(..., description="ID of user to ban")
    reason: Optional[str] = Field(None, max_length=2000, description="Reason for ban")
    ban_ip: bool = Field(True, description="Also ban user's IP address")
    ban_duration_days: Optional[int] = Field(None, gt=0, description="Ban duration in days (null = permanent)")
    
    @validator('ban_duration_days')
    def validate_duration(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Ban duration must be positive')
        return v


class UnbanUserRequest(BaseModel):
    """Request to unban a user"""
    user_id: uuid.UUID = Field(..., description="ID of user to unban")


class BanEmailRequest(BaseModel):
    """Request to ban an email address"""
    email: str = Field(..., max_length=320, description="Email address to ban")
    reason: Optional[str] = Field(None, max_length=2000, description="Reason for ban")
    ban_duration_days: Optional[int] = Field(None, gt=0, description="Ban duration in days (null = permanent)")


class BanIPRequest(BaseModel):
    """Request to ban an IP address"""
    ip_address: str = Field(..., max_length=45, description="IP address to ban")
    reason: Optional[str] = Field(None, max_length=2000, description="Reason for ban")
    ban_duration_days: Optional[int] = Field(None, gt=0, description="Ban duration in days (null = permanent)")


class UnbanEmailRequest(BaseModel):
    """Request to unban an email"""
    email: str = Field(..., max_length=320, description="Email address to unban")


class UnbanIPRequest(BaseModel):
    """Request to unban an IP"""
    ip_address: str = Field(..., max_length=45, description="IP address to unban")


class BanInfo(BaseModel):
    """Ban information response"""
    id: uuid.UUID
    entity_type: str  # "email" or "ip"
    entity_value: str
    reason: Optional[str]
    is_active: bool
    banned_at: datetime
    expires_at: Optional[datetime]
    unbanned_at: Optional[datetime]
    banned_user_id: Optional[uuid.UUID]
    banned_by: Optional[uuid.UUID]
    unbanned_by: Optional[uuid.UUID]
    
    class Config:
        from_attributes = True


class BanListResponse(BaseModel):
    """List of bans response"""
    bans: List[BanInfo]
    total: int
    active_count: int
    inactive_count: int


class BanOperationResponse(BaseModel):
    """Response for ban/unban operations"""
    success: bool
    message: str
    ban_id: Optional[uuid.UUID] = None
    email_ban_id: Optional[uuid.UUID] = None
    ip_ban_id: Optional[uuid.UUID] = None


# ============= Endpoints =============

@router.post("/ban", response_model=BanOperationResponse)
def ban_user(
    request: Request,
    payload: BanUserRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Ban a user by email and optionally IP address.
    
    This is the recommended method for banning users as it prevents them
    from creating new accounts with the same email or IP.
    
    **Admin Only Endpoint**
    
    Args:
        payload: Ban request with user_id, reason, options
        current_admin: Currently authenticated admin user
        db: Database session
        
    Returns:
        BanOperationResponse with success status and ban IDs
        
    Raises:
        HTTPException: 404 if user not found
        HTTPException: 400 if user already banned
        HTTPException: 500 if ban operation fails
        
    Security:
        - Admin authentication required
        - All actions logged with admin ID
        - Audit trail maintained
        
    Example:
        POST /api/admin/users/ban
        Body: {
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "reason": "Violated terms of service - spam",
            "ban_ip": true,
            "ban_duration_days": 30
        }
    """
    admin_ip = get_client_ip(request)
    
    logger.info(
        "Admin initiating user ban",
        extra={
            "admin_id": str(current_admin.id),
            "admin_email": current_admin.email,
            "target_user_id": str(payload.user_id),
            "admin_ip": admin_ip,
            "ban_ip": payload.ban_ip,
            "duration_days": payload.ban_duration_days or "permanent"
        }
    )
    
    try:
        # Fetch user to ban
        user = db.query(models.User).filter(
            models.User.id == payload.user_id
        ).first()
        
        if not user:
            logger.warning(
                "Ban attempt failed: user not found",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_user_id": str(payload.user_id)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent banning other admins (optional security measure)
        if user.role == "admin" and user.id != current_admin.id:
            logger.warning(
                "Attempt to ban another admin blocked",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_admin_id": str(user.id)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot ban other administrators"
            )
        
        # Get user's last known IP from acceptance_ip or check recent login events
        user_ip = None
        if payload.ban_ip:
            # Try to get IP from user record
            user_ip = user.acceptance_ip
            
            # If not found, could query business_events for recent login
            if not user_ip:
                logger.info(
                    "No IP found for user, banning email only",
                    extra={"user_id": str(user.id)}
                )
        
        # Ban user (email + optional IP)
        email_ban, ip_ban = BanService.ban_user(
            db=db,
            user_id=user.id,
            email=user.email,
            ip_address=user_ip if payload.ban_ip else None,
            reason=payload.reason,
            banned_by_admin_id=current_admin.id,
            ban_duration_days=payload.ban_duration_days
        )
        
        logger.info(
            "User banned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(user.id),
                "email": user.email,
                "email_ban_id": str(email_ban.id),
                "ip_ban_id": str(ip_ban.id) if ip_ban else None,
                "reason": payload.reason
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"User {user.email} banned successfully",
            email_ban_id=email_ban.id,
            ip_ban_id=ip_ban.id if ip_ban else None
        )
        
    except DuplicateBanError as e:
        logger.warning(
            f"Duplicate ban attempt: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(payload.user_id)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A ban already exists for this entity"
        )
    except InvalidBanDataError as e:
        logger.error(
            f"Invalid ban data: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(payload.user_id)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ban data. Please check your input."
        )
    except BanServiceError as e:
        logger.error(
            f"Ban service error: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(payload.user_id)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ban user. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error banning user: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(payload.user_id)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ban user"
        )


@router.post("/unban", response_model=BanOperationResponse)
def unban_user(
    request: Request,
    payload: UnbanUserRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Unban a user (removes all email and IP bans).
    
    **Admin Only Endpoint**
    
    Args:
        payload: Unban request with user_id
        current_admin: Currently authenticated admin user
        db: Database session
        
    Returns:
        BanOperationResponse with success status
        
    Raises:
        HTTPException: 404 if user not found or no bans exist
        HTTPException: 500 if unban operation fails
    """
    admin_ip = get_client_ip(request)
    
    logger.info(
        "Admin initiating user unban",
        extra={
            "admin_id": str(current_admin.id),
            "admin_email": current_admin.email,
            "target_user_id": str(payload.user_id),
            "admin_ip": admin_ip
        }
    )
    
    try:
        # Verify user exists
        user = db.query(models.User).filter(
            models.User.id == payload.user_id
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Unban user (all associated bans)
        email_count, ip_count = BanService.unban_user(
            db=db,
            user_id=payload.user_id,
            unbanned_by_admin_id=current_admin.id
        )
        
        if email_count == 0 and ip_count == 0:
            logger.info(
                "No active bans found for user",
                extra={
                    "admin_id": str(current_admin.id),
                    "user_id": str(payload.user_id)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active bans found for this user"
            )
        
        logger.info(
            "User unbanned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(user.id),
                "email": user.email,
                "email_bans_removed": email_count,
                "ip_bans_removed": ip_count
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"User {user.email} unbanned ({email_count} email bans, {ip_count} IP bans removed)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error unbanning user: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(payload.user_id)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unban user"
        )


@router.get("/bans", response_model=BanListResponse)
def list_bans(
    active_only: bool = True,
    entity_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all bans (active and/or inactive).
    
    **Admin Only Endpoint**
    
    Query Parameters:
        active_only: Only show active bans (default: true)
        entity_type: Filter by type ("email" or "ip", optional)
        
    Returns:
        BanListResponse with list of bans and counts
    """
    try:
        query = db.query(models.BannedEntity)
        
        if active_only:
            query = query.filter(models.BannedEntity.is_active == True)
        
        if entity_type:
            if entity_type not in ["email", "ip"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="entity_type must be 'email' or 'ip'"
                )
            query = query.filter(models.BannedEntity.entity_type == entity_type)
        
        # Get total count
        total_count = query.count()
        
        # Count active/inactive from total
        active_count = db.query(models.BannedEntity).filter(
            models.BannedEntity.is_active == True
        )
        if entity_type:
            active_count = active_count.filter(models.BannedEntity.entity_type == entity_type)
        active_count = active_count.count()
        inactive_count = total_count - active_count if not active_only else 0
        
        # Apply pagination
        bans = query.order_by(
            models.BannedEntity.banned_at.desc()
        ).offset((page - 1) * page_size).limit(page_size).all()
        
        ban_list = [BanInfo.from_orm(ban) for ban in bans]
        
        logger.info(
            "Admin fetched ban list",
            extra={
                "admin_id": str(current_admin.id),
                "total_bans": total_count,
                "active_count": active_count,
                "inactive_count": inactive_count,
                "filter_active_only": active_only,
                "filter_entity_type": entity_type
            }
        )
        
        return BanListResponse(
            bans=ban_list,
            total=total_count,
            active_count=active_count,
            inactive_count=inactive_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error fetching ban list: {e}",
            extra={"admin_id": str(current_admin.id)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bans"
        )


@router.get("/{user_id}/bans", response_model=List[BanInfo])
def get_user_bans(
    user_id: uuid.UUID,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all bans (active and inactive) for a specific user.
    
    **Admin Only Endpoint**
    
    Shows complete ban history for the user.
    
    Args:
        user_id: ID of user to check
        
    Returns:
        List of BanInfo records
    """
    try:
        # Verify user exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        bans = BanService.get_user_bans(db, user_id)
        ban_list = [BanInfo.from_orm(ban) for ban in bans]
        
        logger.info(
            "Admin fetched user ban history",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "ban_count": len(bans)
            }
        )
        
        return ban_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error fetching user bans: {e}",
            extra={
                "admin_id": str(current_admin.id),
                "user_id": str(user_id)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user bans"
        )


@router.post("/bans/email", response_model=BanOperationResponse)
def ban_email_address(
    request: Request,
    payload: BanEmailRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Ban an email address directly (without user association).
    
    **Admin Only Endpoint**
    
    Useful for preventing registration from known spam/abuse emails.
    """
    admin_ip = get_client_ip(request)
    
    logger.info(
        "Admin banning email address",
        extra={
            "admin_id": str(current_admin.id),
            "email": payload.email,
            "admin_ip": admin_ip
        }
    )
    
    try:
        ban = BanService.ban_email(
            db=db,
            email=payload.email,
            reason=payload.reason,
            banned_by_admin_id=current_admin.id,
            expires_at=None if not payload.ban_duration_days else 
                datetime.now(timezone.utc) + timedelta(days=payload.ban_duration_days)
        )
        
        logger.info(
            "Email banned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "email": payload.email,
                "ban_id": str(ban.id)
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"Email {payload.email} banned successfully",
            ban_id=ban.id
        )
        
    except (DuplicateBanError, InvalidBanDataError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or duplicate ban entry"
        )
    except Exception as e:
        logger.error(f"Error banning email: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ban email"
        )


@router.post("/bans/ip", response_model=BanOperationResponse)
def ban_ip_address(
    request: Request,
    payload: BanIPRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Ban an IP address directly (without user association).
    
    **Admin Only Endpoint**
    
    Useful for blocking malicious IPs or VPN/proxy services.
    """
    admin_ip = get_client_ip(request)
    
    logger.info(
        "Admin banning IP address",
        extra={
            "admin_id": str(current_admin.id),
            "ip_address": payload.ip_address,
            "admin_ip": admin_ip
        }
    )
    
    try:
        ban = BanService.ban_ip(
            db=db,
            ip_address=payload.ip_address,
            reason=payload.reason,
            banned_by_admin_id=current_admin.id,
            expires_at=None if not payload.ban_duration_days else 
                datetime.now(timezone.utc) + timedelta(days=payload.ban_duration_days)
        )
        
        logger.info(
            "IP banned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "ip_address": payload.ip_address,
                "ban_id": str(ban.id)
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"IP {payload.ip_address} banned successfully",
            ban_id=ban.id
        )
        
    except (DuplicateBanError, InvalidBanDataError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or duplicate ban entry"
        )
    except Exception as e:
        logger.error(f"Error banning IP: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ban IP"
        )


@router.delete("/bans/email", response_model=BanOperationResponse)
def unban_email_address(
    request: Request,
    payload: UnbanEmailRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Unban an email address.
    
    **Admin Only Endpoint**
    """
    admin_ip = get_client_ip(request)
    
    try:
        success = BanService.unban_email(
            db=db,
            email=payload.email,
            unbanned_by_admin_id=current_admin.id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active ban found for this email"
            )
        
        logger.info(
            "Email unbanned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "email": payload.email,
                "admin_ip": admin_ip
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"Email {payload.email} unbanned successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unbanning email: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unban email"
        )


@router.delete("/bans/ip", response_model=BanOperationResponse)
def unban_ip_address(
    request: Request,
    payload: UnbanIPRequest,
    current_admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Unban an IP address.
    
    **Admin Only Endpoint**
    """
    admin_ip = get_client_ip(request)
    
    try:
        success = BanService.unban_ip(
            db=db,
            ip_address=payload.ip_address,
            unbanned_by_admin_id=current_admin.id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active ban found for this IP"
            )
        
        logger.info(
            "IP unbanned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "ip_address": payload.ip_address,
                "admin_ip": admin_ip
            }
        )
        
        return BanOperationResponse(
            success=True,
            message=f"IP {payload.ip_address} unbanned successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unbanning IP: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unban IP"
        )
