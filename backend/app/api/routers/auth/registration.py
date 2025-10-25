"""User registration and email verification endpoints."""
from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....infra.security.passwords import hash_password
from ....api.schemas import auth as schemas
from ....infra.security.tokens import (
    create_access_token,
    create_refresh_token,
    create_email_token,
    verify_email_token
)
from ....infra.security.rate_limiter import login_limiter, email_limiter
from ....infra.notifications.email_service import email_service
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/register", response_model=schemas.TokenPairOut)
def register(payload: schemas.RegisterIn, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Registration attempt",
        extra={
            "email": payload.email,
            "ip_address": ip_address,
            "user_agent": user_agent[:100]
        }
    )
    
    # Rate limiting
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        logger.warning(
            "Registration rate limit exceeded",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts",
            headers={"Retry-After": str(retry_after)}
        )

    # Check if email already exists
    try:
        existing_user = db.query(models.User).filter(
            models.User.email == payload.email
        ).first()
        
        if existing_user:
            logger.warning(
                "Registration attempted with existing email",
                extra={"email": payload.email, "ip_address": ip_address}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Database error checking existing user",
            extra={"email": payload.email, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

    # Create new user
    try:
        user = models.User(
            id=uuid.uuid4(),
            email=payload.email,
            full_name=payload.full_name,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            timezone=payload.timezone,
            language=payload.language or "en",
            password_hash=hash_password(payload.password),
            role="user",
            calendar_token=secrets.token_urlsafe(32),
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        event_logger.log_registration(
            user_id=user.id,
            email=user.email,
            registration_method="email",
            ip_address=ip_address
        )
        
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to create user account",
            extra={"email": payload.email, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account"
        )

    # Generate tokens
    try:
        access = create_access_token(str(user.id))
        refresh, _fam = create_refresh_token(
            str(user.id),
            user_agent=user_agent,
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(
            "Failed to generate tokens for new user",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration successful but login failed"
        )

    # Send verification email (non-blocking)
    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
        logger.info(
            "Verification email sent",
            extra={"user_id": str(user.id), "email": user.email}
        )
    except Exception as e:
        # Log but don't fail registration
        logger.error(
            "Failed to send verification email",
            extra={"user_id": str(user.id), "email": user.email, "error": str(e)},
            exc_info=True
        )
    
    # Send welcome email (non-blocking)
    try:
        email_service.send_welcome_email(user.email, user.full_name or user.email.split('@')[0])
        logger.info(
            "Welcome email sent",
            extra={"user_id": str(user.id), "email": user.email}
        )
    except Exception as e:
        # Log but don't fail registration
        logger.error(
            "Failed to send welcome email",
            extra={"user_id": str(user.id), "email": user.email, "error": str(e)},
            exc_info=True
        )

    logger.info(
        "User registered successfully",
        extra={"user_id": str(user.id), "email": user.email}
    )
    
    return schemas.TokenPairOut(access_token=access, refresh_token=refresh)


@router.post("/send_verification", response_model=schemas.MessageResponse)
def send_verification_email(payload: schemas.EmailVerificationIn, request: Request, db: Session = Depends(get_db)):
    """Send email verification link."""
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Email verification requested",
        extra={"email": payload.email, "ip_address": ip_address}
    )
    
    # Rate limiting
    is_allowed, retry_after = email_limiter.check_rate_limit(f"verify:{ip_address}")
    if not is_allowed:
        logger.warning(
            "Email verification rate limit exceeded",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many email requests",
            headers={"Retry-After": str(retry_after)}
        )

    # Fetch user
    try:
        user = db.query(models.User).filter(
            models.User.email == payload.email
        ).first()
    except Exception as e:
        logger.error(
            "Database error during verification email lookup",
            extra={"email": payload.email, "error": str(e)},
            exc_info=True
        )
        # Return generic message to avoid user enumeration
        return schemas.MessageResponse(
            message="If the email exists, a verification link has been sent"
        )
    
    # Generic response to prevent email enumeration
    if not user:
        logger.debug(
            "Verification email requested for non-existent user",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        return schemas.MessageResponse(
            message="If the email exists, a verification link has been sent"
        )
    
    if user.email_verified_at:
        logger.debug(
            "Verification email requested for already verified user",
            extra={"user_id": str(user.id), "email": payload.email}
        )
        return schemas.MessageResponse(
            message="Email is already verified"
        )

    # Send verification email
    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
        
        logger.info(
            "Verification email sent",
            extra={"user_id": str(user.id), "email": user.email}
        )
    except Exception as e:
        logger.error(
            "Failed to send verification email",
            extra={"user_id": str(user.id), "email": user.email, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )

    return schemas.MessageResponse(message="Verification email sent")


@router.post("/verify_email", response_model=schemas.MessageResponse)
def verify_email(payload: schemas.VerifyEmailIn, db: Session = Depends(get_db)):
    """Verify user email with token."""
    logger.info("Email verification attempt")
    
    try:
        user_id = verify_email_token(payload.token, "VERIFY")
        
        if not user_id:
            logger.warning(
                "Invalid or expired verification token",
                extra={"token_prefix": payload.token[:10] if payload.token else "none"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        user = db.query(models.User).filter(
            models.User.id == uuid.UUID(user_id)
        ).first()
        
        if user:
            if user.email_verified_at:
                logger.debug(
                    "Email already verified",
                    extra={"user_id": user_id, "email": user.email}
                )
            else:
                user.email_verified_at = datetime.now(timezone.utc)
                db.commit()
                
                logger.info(
                    "Email verified successfully",
                    extra={"user_id": user_id, "email": user.email}
                )
        else:
            logger.error(
                "User not found for valid verification token",
                extra={"user_id": user_id}
            )
        
        return schemas.MessageResponse(message="Email verified successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error during email verification",
            extra={"error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )
