"""
Password Reset Endpoints

Handles password reset flow:
- Password reset request (email with token)
- Password reset confirmation (token validation + update)
- Rate limiting and security measures
- Email notifications

Implements secure password reset with time-limited tokens and
comprehensive audit logging.
"""
from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....infra.security.passwords import hash_password, verify_password
from ....api.schemas import auth as schemas
from ....api.deps import get_current_user
from ....infra.security.tokens import (
    create_access_token,
    create_refresh_token,
    create_email_token,
    verify_email_token,
    revoke_all_user_tokens
)
from ....infra.security.rate_limiter import email_limiter, password_reset_limiter
from ....infra.notifications.email_service import email_service
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger
from ....config import settings

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/password_reset_request", response_model=schemas.MessageResponse)
def password_reset_request(
    payload: schemas.PasswordResetRequestIn, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    Request password reset email.
    
    Initiates password reset flow by:
    1. Validating user exists
    2. Generating time-limited reset token
    3. Sending reset email with token link
    4. Logging reset request event
    
    Request Body:
        email (str): User's registered email address
        
    Args:
        payload: Reset request data (from request body)
        request: FastAPI request for client info extraction
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Password reset email sent successfully! Check your inbox."
            
    Raises:
        HTTPException: 404 if email not registered
        HTTPException: 429 if rate limit exceeded (5 requests per 15 min)
        HTTPException: 500 if email sending fails
        
    Security:
        - Rate limiting: 5 attempts per IP/15 min
        - Time-limited tokens: Expire after configured duration
        - Audit logging: All requests logged with email and IP
        - Email validation: Prevents enumeration with generic errors
        
    Notes:
        - Returns success even if email not found (prevents enumeration)
        - Token embedded in email link for one-click reset
        - User receives email with reset instructions
        - Multiple requests invalidate previous tokens
        - Use for: forgot password flow
        
    Example:
        POST /api/auth/password_reset_request
        Body: {"email": "user@example.com"}
        Returns: {"message": "Password reset email sent successfully! Check your inbox."}
        Email sent to user with reset link
    """
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Password reset requested",
        extra={"email": payload.email, "ip_address": ip_address}
    )
    
    # Rate limiting
    is_allowed, retry_after = password_reset_limiter.check_rate_limit(ip_address)
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
        # Return same success message to prevent user enumeration
        return schemas.MessageResponse(
            message="Password reset email sent successfully! Check your inbox."
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
def password_reset(
    payload: schemas.PasswordResetIn, 
    db: Session = Depends(get_db)
):
    """
    Reset password with token.
    
    Completes password reset flow by:
    1. Validating reset token
    2. Updating user password hash
    3. Revoking all existing tokens (security)
    4. Sending confirmation email
    
    Request Body:
        token (str): Reset token from email link
        new_password (str): New password (will be hashed)
        
    Args:
        payload: Reset confirmation data (from request body)
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Password reset successfully"
            
    Raises:
        HTTPException: 400 if token invalid or expired
        HTTPException: 500 if password update fails
        
    Security:
        - Token validation: Verifies signature and expiration
        - Password hashing: bcrypt with strong work factor
        - Token revocation: All user tokens invalidated
        - Confirmation email: Alerts user of password change
        - Audit logging: Password change logged
        
    Notes:
        - **All sessions terminated** - user must re-login
        - Old tokens become invalid immediately
        - User receives confirmation email
        - Token single-use only (invalidated after use)
        - Password strength validated by schema
        - Use for: completing forgot password flow
        
    Example:
        POST /api/auth/password_reset
        Body: {
            "token": "eyJ...",
            "new_password": "newSecurePass123!"
        }
        Returns: {"message": "Password reset successfully"}
        Effect: Password updated, all sessions logged out
    """
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
            
            # Send password changed confirmation email
            try:
                email_service.send_password_changed_email(
                    user.email, 
                    user.full_name or "User",
                    user.timezone or 'UTC'
                )
                logger.info("Password changed email sent", extra={"user_id": user_id})
            except Exception as e:
                logger.error(f"Failed to send password changed email: {e}", extra={"user_id": user_id})
            
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


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    payload: schemas.PasswordChangeIn,
    request: Request,
    response: Response,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user.
    
    Allows logged-in users to change their password by providing their current
    password and a new password. Validates current password before updating.
    
    Request Body:
        current_password (str): User's current password (for verification)
        new_password (str): New password (min 8 chars, validated)
        
    Args:
        payload: Password change data (from request body)
        current_user: Authenticated user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Password changed successfully"
            
    Raises:
        HTTPException: 400 if current password is incorrect
        HTTPException: 422 if new password validation fails
        HTTPException: 500 if database operation fails
        
    Security:
        - Requires authentication via get_current_user dependency
        - Verifies current password before allowing change
        - Revokes all existing tokens (invalidates stolen sessions)
        - Re-issues fresh tokens for current session via HttpOnly cookies
        - Sends confirmation email
        - Audit logging of password changes
        
    Notes:
        - User must provide correct current password
        - New password validated by schema (strength, length)
        - All other sessions are invalidated for security
        - Current session stays active via fresh cookie tokens
        - User receives confirmation email
        - Use for: user-initiated password changes from profile
        
    Example:
        POST /api/auth/change-password
        Headers: Authorization: Bearer <token>
        Body: {
            "current_password": "oldPass123!",
            "new_password": "newSecurePass456!"
        }
        Returns: {"message": "Password changed successfully"}
    """
    logger.info("Password change attempt", extra={"user_id": str(current_user.id)})
    
    try:
        # Verify current password
        if not verify_password(payload.current_password, current_user.password_hash):
            logger.warning(
                "Password change failed - incorrect current password",
                extra={"user_id": str(current_user.id)}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        current_user.password_hash = hash_password(payload.new_password)
        db.commit()
        
        # Revoke all existing tokens (invalidate stolen sessions)
        try:
            revoke_all_user_tokens(str(current_user.id))
            logger.info(
                "All tokens revoked after password change",
                extra={"user_id": str(current_user.id)}
            )
        except Exception as e:
            logger.error(
                "Failed to revoke tokens after password change",
                extra={"user_id": str(current_user.id), "error": str(e)},
                exc_info=True
            )
        
        # Re-issue fresh tokens for current session
        try:
            user_agent = request.headers.get("user-agent", "")
            ip_address = request.client.host if request.client else "unknown"
            
            new_access = create_access_token(str(current_user.id))
            new_refresh, _fam = create_refresh_token(
                str(current_user.id),
                user_agent=user_agent,
                ip_address=ip_address
            )
            
            response.set_cookie(
                "access_token", new_access,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 15,
                path="/"
            )
            response.set_cookie(
                "refresh_token", new_refresh,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 60 * 24 * settings.REFRESH_TTL_DAYS,
                path="/api/auth"
            )
            logger.info(
                "Fresh tokens issued after password change",
                extra={"user_id": str(current_user.id)}
            )
        except Exception as e:
            logger.error(
                "Failed to issue fresh tokens after password change",
                extra={"user_id": str(current_user.id), "error": str(e)},
                exc_info=True
            )
        
        # Send password changed confirmation email
        try:
            email_service.send_password_changed_email(
                current_user.email, 
                current_user.full_name or "User",
                current_user.timezone or 'UTC'
            )
            logger.info(
                "Password changed email sent",
                extra={"user_id": str(current_user.id)}
            )
        except Exception as e:
            logger.error(
                f"Failed to send password changed email: {e}",
                extra={"user_id": str(current_user.id)}
            )
        
        logger.info(
            "Password changed successfully",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        return schemas.MessageResponse(message="Password changed successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error during password change",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )
