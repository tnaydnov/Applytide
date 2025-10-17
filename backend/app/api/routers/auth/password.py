"""Password reset endpoints."""
from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....infra.security.passwords import hash_password
from ....api.schemas import auth as schemas
from ....infra.security.tokens import (
    create_email_token,
    verify_email_token,
    revoke_all_user_tokens
)
from ....infra.security.rate_limiter import email_limiter
from ....infra.notifications.email_service import email_service
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/password_reset_request", response_model=schemas.MessageResponse)
def password_reset_request(payload: schemas.PasswordResetRequestIn, request: Request, db: Session = Depends(get_db)):
    """Request password reset email."""
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Password reset requested",
        extra={"email": payload.email, "ip_address": ip_address}
    )
    
    # Rate limiting
    is_allowed, retry_after = email_limiter.check_rate_limit(f"reset:{ip_address}")
    if not is_allowed:
        logger.warning(
            "Password reset rate limit exceeded",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset requests",
            headers={"Retry-After": str(retry_after)}
        )

    # Fetch user
    try:
        user = db.query(models.User).filter(
            models.User.email == payload.email
        ).first()
    except Exception as e:
        logger.error(
            "Database error during password reset lookup",
            extra={"email": payload.email, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )
    
    if not user:
        logger.warning(
            "Password reset requested for non-existent email",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email address is not registered. Please check your email or create an account."
        )

    # Send reset email
    try:
        reset_token = create_email_token(str(user.id), "RESET")
        email_service.send_password_reset_email(user.email, reset_token)
        
        event_logger.log_password_reset(user_id=user.id, email=user.email)
        
        logger.info(
            "Password reset email sent",
            extra={"user_id": str(user.id), "email": user.email}
        )
    except Exception as e:
        logger.error(
            "Failed to send password reset email",
            extra={"user_id": str(user.id), "email": user.email, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )

    return schemas.MessageResponse(
        message="Password reset email sent successfully! Check your inbox."
    )


@router.post("/password_reset", response_model=schemas.MessageResponse)
def password_reset(payload: schemas.PasswordResetIn, db: Session = Depends(get_db)):
    """Reset password with token."""
    logger.info("Password reset attempt")
    
    try:
        user_id = verify_email_token(payload.token, "RESET")
        
        if not user_id:
            logger.warning(
                "Invalid or expired password reset token",
                extra={"token_prefix": payload.token[:10] if payload.token else "none"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        user = db.query(models.User).filter(
            models.User.id == uuid.UUID(user_id)
        ).first()
        
        if user:
            # Update password
            user.password_hash = hash_password(payload.new_password)
            db.commit()
            
            # Revoke all existing tokens for security
            revoke_all_user_tokens(user_id)
            
            logger.info(
                "Password reset successful",
                extra={"user_id": user_id, "email": user.email}
            )
        else:
            logger.error(
                "User not found for valid reset token",
                extra={"user_id": user_id}
            )
        
        return schemas.MessageResponse(message="Password reset successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error during password reset",
            extra={"error": str(e)},
            exc_info=True
        )
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )
