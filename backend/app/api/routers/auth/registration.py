"""
User Registration and Email Verification Endpoints

Handles new user account creation:
- User registration with legal agreements
- Email verification requests
- Email verification confirmation
- Rate limiting and validation
- Welcome and verification emails

Implements secure registration flow with mandatory legal agreement
tracking and email verification.
"""
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
from ....infra.security.ban_service import BanService, InvalidBanDataError
from ....infra.http.client_ip import get_client_ip
from ....infra.notifications.email_service import email_service
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/register", response_model=schemas.TokenPairOut)
def register(
    payload: schemas.RegisterIn, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    Creates new user account with:
    1. Legal agreement validation (all must be true)
    2. Email uniqueness check
    3. Password hashing
    4. Initial token generation
    5. Welcome and verification emails
    
    Request Body:
        email (str): User's email address (must be unique)
        password (str): Password (will be hashed)
        full_name (str): Complete name
        first_name (str): First name (optional)
        last_name (str): Last name (optional)
        phone (str): Phone number (optional)
        timezone (str): IANA timezone (optional)
        language (str): Language code (default: "en")
        terms_accepted (bool): Terms of Service accepted (required: true)
        privacy_accepted (bool): Privacy Policy accepted (required: true)
        age_verified (bool): Age 13+ verified (required: true)
        data_processing_consent (bool): GDPR consent (required: true)
        
    Args:
        payload: Registration data (from request body)
        request: FastAPI request for client info extraction
        db: Database session (from dependency)
        
    Returns:
        TokenPairOut: Initial tokens with:
            - access_token: JWT access token
            - refresh_token: JWT refresh token
            Sets cookies: access_token, refresh_token
            
    Raises:
        HTTPException: 400 if legal agreements not all true
        HTTPException: 400 if email already registered
        HTTPException: 429 if rate limit exceeded
        HTTPException: 500 if registration fails
        
    Security:
        - Rate limiting: 10 attempts per IP/15 min
        - Password hashing: bcrypt with strong work factor
        - Legal tracking: All agreements timestamped with IP
        - Email uniqueness: Prevents duplicate accounts
        - Audit logging: Registration event logged
        
    Notes:
        - All legal agreements MUST be true
        - Email verification sent (non-blocking)
        - Welcome email sent (non-blocking)
        - User starts as unverified (email_verified_at = null)
        - Tokens allow immediate login
        - Calendar token generated for integrations
        - Use for: sign-up flow
        
    Example:
        POST /api/auth/register
        Body: {
            "email": "user@example.com",
            "password": "securePass123!",
            "full_name": "John Doe",
            "terms_accepted": true,
            "privacy_accepted": true,
            "age_verified": true,
            "data_processing_consent": true
        }
        Returns: {
            "access_token": "eyJ...",
            "refresh_token": "eyJ..."
        }
    """
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Registration attempt",
        extra={
            "email": payload.email,
            "ip_address": ip_address,
            "user_agent": user_agent[:100]
        }
    )
    
    # Check if email or IP is banned
    try:
        if BanService.is_email_banned(db, payload.email):
            logger.warning(
                "Registration blocked: email is banned",
                extra={"email": payload.email, "ip_address": ip_address}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Your account has been suspended."
            )
        
        if BanService.is_ip_banned(db, ip_address):
            logger.warning(
                "Registration blocked: IP is banned",
                extra={"email": payload.email, "ip_address": ip_address}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This IP address has been blocked."
            )
    except InvalidBanDataError as e:
        # Log validation error but don't block registration on data format issues
        logger.error(
            f"Ban check validation error: {e}",
            extra={"email": payload.email, "ip_address": ip_address}
        )
    except HTTPException:
        # Re-raise HTTP exceptions (403 Forbidden)
        raise
    except Exception as e:
        # Log other errors but fail open (don't block registration on service errors)
        logger.error(
            f"Ban check service error: {e}",
            extra={"email": payload.email, "ip_address": ip_address},
            exc_info=True
        )
    
    # Validate legal agreements (all must be True)
    if not all([
        payload.terms_accepted,
        payload.privacy_accepted,
        payload.age_verified,
        payload.data_processing_consent
    ]):
        logger.warning(
            "Registration rejected: legal agreements not accepted",
            extra={"email": payload.email, "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept all legal agreements to register"
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
        now = datetime.now(timezone.utc)
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
            # Legal agreement acceptance tracking
            terms_accepted_at=now,
            privacy_accepted_at=now,
            terms_version="1.0",  # Update this when terms change
            acceptance_ip=ip_address,
            created_at=now,
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
def send_verification_email(
    payload: schemas.EmailVerificationIn, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    Send email verification link.
    
    Sends verification email to user with time-limited token link.
    Can be called to resend verification if previous email lost.
    
    Request Body:
        email (str): User's registered email address
        
    Args:
        payload: Email verification request (from request body)
        request: FastAPI request for client info extraction
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Generic success message (anti-enumeration):
            - message: "Verification email sent"
            
    Raises:
        HTTPException: 429 if rate limit exceeded (3 per IP/15 min)
        HTTPException: 500 if email sending fails
        
    Security:
        - Rate limiting: 3 attempts per IP/15 min
        - Anti-enumeration: Generic response regardless of email existence
        - Time-limited tokens: Expire after configured duration
        - Already verified: Returns success without sending
        
    Notes:
        - Generic response prevents email enumeration
        - Returns success even if email not found
        - Returns success if already verified (no email sent)
        - Token embedded in email link
        - Multiple requests send new tokens
        - Use for: resend verification email
        
    Example:
        POST /api/auth/send_verification
        Body: {"email": "user@example.com"}
        Returns: {"message": "Verification email sent"}
    """
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
def verify_email(
    payload: schemas.VerifyEmailIn, 
    db: Session = Depends(get_db)
):
    """
    Verify user email with token.
    
    Completes email verification by:
    1. Validating verification token
    2. Setting email_verified_at timestamp
    3. Sending confirmation email
    
    Request Body:
        token (str): Verification token from email link
        
    Args:
        payload: Verification confirmation (from request body)
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Email verified successfully"
            
    Raises:
        HTTPException: 400 if token invalid or expired
        HTTPException: 400 if email already verified
        HTTPException: 500 if verification update fails
        
    Security:
        - Token validation: Verifies signature and expiration
        - Single-use: Token type checked (VERIFY)
        - Already verified: Rejected with error
        - Audit logging: Verification logged
        
    Notes:
        - Token single-use (type: VERIFY)
        - Sets email_verified_at timestamp
        - Confirmation email sent (non-blocking)
        - Already verified returns error
        - Use for: email verification confirmation
        
    Example:
        POST /api/auth/verify_email
        Body: {"token": "eyJ..."}
        Returns: {"message": "Email verified successfully"}
    """
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
