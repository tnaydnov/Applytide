"""Account deletion and recovery endpoints."""
from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....api.schemas import auth as schemas
from ....infra.security.passwords import verify_password
from ....infra.security.tokens import decode_access_token
from ....infra.notifications.email_service import email_service
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/delete-account")
async def request_account_deletion(
    payload: schemas.AccountDeletionRequestIn,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Initiate account deletion with 7-day recovery period.
    Requires password confirmation for non-OAuth users.
    """
    user_agent, ip_address = get_client_info(request)
    
    # Get user from access token
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        token_data = decode_access_token(access_token)
        user_id = token_data.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user
        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate confirmation text
        if payload.confirmation != "DELETE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must type 'DELETE' to confirm account deletion"
            )
        
        # Validate password for non-OAuth users (security requirement)
        if not user.is_oauth_user:
            if not payload.password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is required for security verification"
                )
            
            if not verify_password(payload.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password. Please try again."
                )
        
        # Set deletion timestamps
        now = datetime.now(timezone.utc)
        deletion_scheduled = now + timedelta(days=7)
        recovery_token = secrets.token_urlsafe(32)
        
        user.deleted_at = now
        user.deletion_scheduled_at = deletion_scheduled
        user.deletion_recovery_token = recovery_token
        
        db.commit()
        
        logger.info(
            "Account deletion requested",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "scheduled_for": deletion_scheduled.isoformat(),
                "ip_address": ip_address
            }
        )
        
        # Send deletion confirmation email with recovery link
        try:
            email_service.send_deletion_confirmation_email(
                to_email=user.email,
                name=user.full_name or user.email.split('@')[0],
                deletion_date=deletion_scheduled,
                recovery_token=recovery_token
            )
            logger.info(
                "Deletion confirmation email sent",
                extra={"user_id": str(user.id), "email": user.email}
            )
        except Exception as e:
            logger.error(
                "Failed to send deletion confirmation email",
                extra={"user_id": str(user.id), "error": str(e)},
                exc_info=True
            )
            # Don't fail the deletion request if email fails
        
        return {
            "success": True,
            "message": "Account deletion scheduled",
            "deletion_date": deletion_scheduled.isoformat(),
            "recovery_days_remaining": 7
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Account deletion request failed",
            extra={"error": str(e), "ip_address": ip_address},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process account deletion request"
        )


@router.post("/recover-account")
async def recover_account(
    payload: schemas.AccountRecoveryIn,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recover a deleted account within 7-day grace period.
    Can use recovery token from email or be logged in.
    """
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Account recovery attempt",
        extra={
            "has_token": bool(payload.recovery_token),
            "ip_address": ip_address
        }
    )
    
    try:
        # Find user by recovery token
        user = db.query(models.User).filter(
            models.User.deletion_recovery_token == payload.recovery_token
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid recovery token"
            )
        
        # Check if still within recovery period
        if not user.deleted_at or not user.deletion_scheduled_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is not scheduled for deletion"
            )
        
        now = datetime.now(timezone.utc)
        if now >= user.deletion_scheduled_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Recovery period has expired. Account has been permanently deleted."
            )
        
        # Clear deletion fields
        user.deleted_at = None
        user.deletion_scheduled_at = None
        user.deletion_recovery_token = None
        
        db.commit()
        
        logger.info(
            "Account successfully recovered",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "ip_address": ip_address
            }
        )
        
        # Send recovery success email
        try:
            email_service.send_recovery_success_email(
                to_email=user.email,
                name=user.full_name or user.email.split('@')[0]
            )
            logger.info(
                "Recovery success email sent",
                extra={"user_id": str(user.id), "email": user.email}
            )
        except Exception as e:
            logger.error(
                "Failed to send recovery success email",
                extra={"user_id": str(user.id), "error": str(e)},
                exc_info=True
            )
        
        return {
            "success": True,
            "message": "Account successfully recovered",
            "email": user.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Account recovery failed",
            extra={"error": str(e), "ip_address": ip_address},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to recover account"
        )


@router.get("/deletion-status")
async def check_deletion_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Check if current user's account is scheduled for deletion.
    Used by login flow to show recovery UI.
    """
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        token_data = decode_access_token(access_token)
        user_id = token_data.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.deleted_at and user.deletion_scheduled_at:
            now = datetime.now(timezone.utc)
            days_remaining = (user.deletion_scheduled_at - now).days
            
            return {
                "is_deleted": True,
                "deleted_at": user.deleted_at.isoformat(),
                "deletion_scheduled_at": user.deletion_scheduled_at.isoformat(),
                "days_remaining": max(0, days_remaining),
                "recovery_token": user.deletion_recovery_token
            }
        
        return {
            "is_deleted": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to check deletion status",
            extra={"error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check deletion status"
        )
