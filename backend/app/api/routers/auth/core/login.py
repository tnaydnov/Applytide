"""
User Login Endpoint

Handles email/password authentication with:
- Rate limiting (by email and IP)
- Credential verification
- Token generation (access + refresh)
- Cookie management
- Remember me functionality
- Business event logging

All authentication attempts are logged for security auditing.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from .....db.session import get_db
from .....db import models
from .....infra.security.passwords import verify_password
from .....api.schemas import auth as schemas
from .....infra.security.tokens import create_access_token, create_refresh_token
from .....infra.security.rate_limiter import login_limiter
from .....infra.logging import get_logger
from .....infra.logging.business_logger import BusinessEventLogger
from .....config import settings
from ..utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    form_data: schemas.LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with email and password.
    
    Performs comprehensive authentication including:
    - Rate limiting (email + IP based)
    - Credential validation
    - Token generation
    - Cookie setting with configurable expiration
    - Business event logging
    - Last login timestamp update
    
    Request Body:
        email (str): User's email address
        password (str): User's password
        remember_me (bool): Extended session duration (default: False)
                           True: 30 days, False: 7 days
                           
    Args:
        form_data: Login credentials (from request body)
        request: FastAPI request for client info extraction
        response: FastAPI response for cookie setting
        db: Database session (from dependency)
        
    Returns:
        TokenResponse: Authentication response with:
            - user: Complete user profile (UserInfo)
            - expires_in: Access token TTL in seconds (900)
            Cookies set: access_token, refresh_token, client_id
            
    Raises:
        HTTPException: 429 if rate limit exceeded (email or IP)
        HTTPException: 401 if credentials invalid
        HTTPException: 500 if authentication process fails
        
    Security:
        - Rate limiting: 5 attempts per email/15 min, 10 per IP/15 min
        - Password hashing: bcrypt verification
        - Tokens: JWT with secure signing
        - Cookies: httpOnly, secure (production), SameSite protection
        - Audit logging: All attempts logged with outcome
        
    Notes:
        - Generic error messages prevent user enumeration
        - Failed attempts logged with failure reason
        - Remember me extends refresh token to 30 days
        - Client ID cookie persists for 2 years (analytics)
        - Access token valid for 15 minutes
        - Refresh token valid for 7-30 days based on remember_me
        
    Example:
        POST /api/auth/login
        Body: {
            "email": "user@example.com",
            "password": "securepass123",
            "remember_me": true
        }
        Returns: {
            "user": {
                "id": "...",
                "email": "user@example.com",
                "role": "user",
                ...
            },
            "expires_in": 900
        }
        Sets cookies: access_token, refresh_token, client_id
    """
    user_agent, ip_address = get_client_info(request)
    
    try:
        logger.info(
            "Login attempt",
            extra={
                "email": form_data.email,
                "ip_address": ip_address,
                "user_agent": user_agent[:100],
                "remember_me": form_data.remember_me
            }
        )
        
        # Rate limiting by email
        email_allowed, _ = login_limiter.check_rate_limit(f"email:{form_data.email.lower()}")
        if not email_allowed:
            logger.warning(
                "Login rate limit exceeded for email",
                extra={"email": form_data.email, "ip_address": ip_address}
            )
            event_logger.log_login(
                user_id="unknown",
                success=False,
                method="email",
                ip_address=ip_address,
                failure_reason="rate_limit_exceeded"
            )
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later."
            )
        
        # Rate limiting by IP
        is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
        if not is_allowed:
            logger.warning(
                "Login rate limit exceeded for IP",
                extra={"email": form_data.email, "ip_address": ip_address}
            )
            event_logger.log_login(
                user_id="unknown",
                success=False,
                method="email",
                ip_address=ip_address,
                failure_reason="rate_limit_exceeded"
            )
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)}
            )

        # Fetch user
        try:
            user = db.query(models.User).filter(
                models.User.email == form_data.email
            ).first()
        except Exception as e:
            logger.error(
                "Database error during login user lookup",
                extra={"email": form_data.email, "error": str(e)},
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed. Please try again."
            )
        
        # Verify credentials
        if not user or not verify_password(form_data.password, user.password_hash):
            logger.warning(
                "Login failed - invalid credentials",
                extra={
                    "email": form_data.email,
                    "ip_address": ip_address,
                    "user_exists": bool(user)
                }
            )
            event_logger.log_login(
                user_id=str(user.id) if user else "unknown",
                success=False,
                method="email",
                ip_address=ip_address,
                failure_reason="invalid_credentials"
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Update last login timestamp
        try:
            user.last_login_at = datetime.now(timezone.utc)
            db.commit()
            logger.debug(
                "Last login timestamp updated",
                extra={"user_id": str(user.id)}
            )
        except Exception as e:
            logger.error(
                "Failed to update last_login_at",
                extra={"user_id": str(user.id), "error": str(e)},
                exc_info=True
            )
            # Non-critical, continue with authentication

        # Generate authentication tokens
        try:
            access_token = create_access_token(str(user.id))
            refresh_token, _fam = create_refresh_token(
                str(user.id),
                user_agent=user_agent,
                ip_address=ip_address,
                extended=form_data.remember_me
            )
            
            logger.debug(
                "Authentication tokens generated",
                extra={
                    "user_id": str(user.id),
                    "remember_me": form_data.remember_me
                }
            )
        except Exception as e:
            logger.error(
                "Failed to generate authentication tokens",
                extra={"user_id": str(user.id), "error": str(e)},
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed. Please try again."
            )

        # Calculate refresh token expiration
        if form_data.remember_me:
            refresh_days = getattr(
                settings, 'REFRESH_EXTENDED_TTL_DAYS',
                getattr(settings, 'REFRESH_TTL_EXTENDED_DAYS', settings.REFRESH_TTL_DAYS * 4)
            )
        else:
            refresh_days = settings.REFRESH_TTL_DAYS

        # Set authentication cookies
        try:
            response.set_cookie(
                "access_token", access_token,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 15,  # 15 minutes
                path="/"
            )
            response.set_cookie(
                "refresh_token", refresh_token,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 60 * 24 * refresh_days,
                path="/api/auth"
            )
            
            # Set persistent client ID if not exists (for analytics)
            if not request.cookies.get("client_id"):
                response.set_cookie(
                    "client_id", str(uuid.uuid4()),
                    httponly=False,
                    secure=settings.SECURE_COOKIES,
                    samesite=settings.SAME_SITE_COOKIES,
                    max_age=60 * 60 * 24 * 365 * 2,  # 2 years
                    path="/"
                )
            
            logger.debug(
                "Authentication cookies set",
                extra={
                    "user_id": str(user.id),
                    "refresh_days": refresh_days
                }
            )
        except Exception as e:
            logger.error(
                "Failed to set authentication cookies",
                extra={"user_id": str(user.id), "error": str(e)},
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed. Please try again."
            )

        # Build user response
        user_data = schemas.UserInfo(
            id=str(user.id), 
            email=user.email, 
            role=user.role, 
            full_name=user.full_name, 
            first_name=user.first_name,
            last_name=user.last_name, 
            avatar_url=user.avatar_url or user.google_avatar_url, 
            bio=user.bio,
            phone=user.phone, 
            location=user.location, 
            timezone=user.timezone, 
            website=user.website,
            linkedin_url=user.linkedin_url, 
            github_url=user.github_url, 
            language=user.language,
            theme_preference=user.theme_preference, 
            notification_email=user.notification_email,
            notification_push=user.notification_push, 
            subscription_plan=user.subscription_plan,
            subscription_status=user.subscription_status,
            subscription_period=user.subscription_period,
            subscription_started_at=user.subscription_started_at.isoformat() if user.subscription_started_at else None,
            subscription_renews_at=user.subscription_renews_at.isoformat() if user.subscription_renews_at else None,
            subscription_ends_at=user.subscription_ends_at.isoformat() if user.subscription_ends_at else None,
            subscription_canceled_at=user.subscription_canceled_at.isoformat() if user.subscription_canceled_at else None,
            is_premium=user.is_premium,  # Computed property
            created_at=user.created_at.isoformat(), 
            updated_at=user.updated_at.isoformat() if user.updated_at else None,
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            email_verified=bool(user.email_verified_at), 
            is_oauth_user=user.is_oauth_user, 
            google_id=user.google_id
        )

        # Log successful authentication
        event_logger.log_login(
            user_id=user.id,
            success=True,
            method="email",
            ip_address=ip_address
        )
        
        logger.info(
            "User logged in successfully",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "ip_address": ip_address,
                "remember_me": form_data.remember_me
            }
        )

        return schemas.TokenResponse(user=user_data, expires_in=900)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error during login",
            extra={
                "email": form_data.email,
                "ip_address": ip_address,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )
