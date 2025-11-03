"""
Token Refresh Endpoint

Handles access token renewal using refresh tokens with:
- Refresh token validation
- Rate limiting (IP based)
- Token rotation (revoke old, issue new)
- Family tracking for token chains
- Cookie management

Implements token rotation security pattern to prevent token reuse attacks.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from jose import jwt

from .....db.session import get_db
from .....db import models
from .....api.schemas import auth as schemas
from .....infra.security.tokens import (
    create_access_token,
    create_refresh_token,
    decode_refresh,
    revoke_refresh_token
)
from .....infra.security.rate_limiter import refresh_limiter
from .....infra.logging import get_logger
from .....infra.logging.business_logger import BusinessEventLogger
from .....config import settings
from ..utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/refresh")
def refresh_token(
    request: Request, 
    response: Response, 
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    
    Implements token rotation security pattern:
    1. Validates existing refresh token
    2. Revokes old refresh token
    3. Issues new access + refresh token pair
    4. Maintains token family for tracking
    
    Cookies Required:
        refresh_token: Valid refresh token (httpOnly cookie)
        
    Args:
        request: FastAPI request for cookie and client info extraction
        response: FastAPI response for cookie setting
        db: Database session (from dependency)
        
    Returns:
        TokenResponse: New authentication tokens with:
            - user: Complete user profile (UserInfo)
            - expires_in: Access token TTL in seconds (900)
            Cookies set: access_token (new), refresh_token (new)
            
    Raises:
        HTTPException: 401 if refresh token missing or invalid
        HTTPException: 404 if user not found
        HTTPException: 429 if rate limit exceeded
        HTTPException: 500 if token generation fails
        
    Security:
        - Rate limiting: 20 attempts per IP/15 min
        - Token rotation: Old refresh token revoked immediately
        - Token family: Prevents parallel refresh attacks
        - Cookie clearing: Invalid tokens cleared automatically
        - Audit logging: All refresh attempts logged
        
    Notes:
        - Old refresh token becomes invalid after use
        - New refresh token inherits expiration from old one
        - Access token always 15 minutes TTL
        - Failed refresh clears all authentication cookies
        - Use for: automatic token renewal in frontend
        
    Example:
        POST /api/auth/refresh
        Cookies: refresh_token=<valid_token>
        Returns: {
            "user": {"id": "...", "email": "...", ...},
            "expires_in": 900
        }
        Sets cookies: access_token (new), refresh_token (new)
    """
    user_agent, ip_address = get_client_info(request)
    refresh_token_value = request.cookies.get("refresh_token")
    
    try:
        # Validate refresh token presence
        if not refresh_token_value:
            logger.warning(
                "Refresh attempt without token",
                extra={"ip_address": ip_address}
            )
            response.delete_cookie("access_token", path="/")
            response.delete_cookie("refresh_token", path="/api/auth")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing refresh token. Please log in again."
            )

        # Rate limiting by IP
        is_allowed, retry_after = refresh_limiter.check_rate_limit(ip_address)
        if not is_allowed:
            logger.warning(
                "Refresh rate limit exceeded",
                extra={"ip_address": ip_address}
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many refresh attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)}
            )

        # Decode and validate refresh token
        try:
            data = decode_refresh(refresh_token_value)
            
            if data.get("typ") != "refresh":
                logger.warning(
                    "Invalid token type in refresh attempt",
                    extra={
                        "ip_address": ip_address, 
                        "token_type": data.get("typ")
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type. Please log in again."
                )

            user_id = data["sub"]
            family = data.get("fam")
            jti = data.get("jti")
            
            logger.debug(
                "Refresh token validated",
                extra={
                    "user_id": user_id, 
                    "ip_address": ip_address,
                    "family": family[:10] if family else None
                }
            )
        except Exception as e:
            logger.error(
                "Failed to decode refresh token",
                extra={
                    "ip_address": ip_address,
                    "error": str(e)
                },
                exc_info=True
            )
            response.delete_cookie("access_token", path="/")
            response.delete_cookie("refresh_token", path="/api/auth")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token. Please log in again."
            )
        
        # Revoke old refresh token (token rotation)
        try:
            revoke_refresh_token(jti)
            logger.debug(
                "Old refresh token revoked",
                extra={"user_id": user_id, "jti": jti[:10] if jti else None}
            )
        except Exception as e:
            logger.error(
                "Failed to revoke old refresh token",
                extra={
                    "user_id": user_id,
                    "jti": jti[:10] if jti else None,
                    "error": str(e)
                },
                exc_info=True
            )
            # Continue with token generation

        # Generate new token pair
        try:
            new_access = create_access_token(user_id)
            new_refresh, _ = create_refresh_token(
                user_id,
                family=family,
                user_agent=user_agent,
                ip_address=ip_address
            )
            
            logger.debug(
                "New tokens generated",
                extra={"user_id": user_id}
            )
        except Exception as e:
            logger.error(
                "Failed to generate new tokens",
                extra={
                    "user_id": user_id,
                    "error": str(e)
                },
                exc_info=True
            )
            response.delete_cookie("access_token", path="/")
            response.delete_cookie("refresh_token", path="/api/auth")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh failed. Please log in again."
            )

        # Calculate new refresh token expiration
        try:
            new_refresh_data = jwt.decode(
                new_refresh,
                settings.REFRESH_SECRET,
                algorithms=["HS256"]
            )
            expires_in = max(0, int(
                new_refresh_data["exp"] - int(datetime.now(timezone.utc).timestamp())
            ))
            
            logger.debug(
                "Refresh token expiration calculated",
                extra={
                    "user_id": user_id,
                    "expires_in_seconds": expires_in
                }
            )
        except Exception as e:
            logger.error(
                "Failed to calculate token expiration",
                extra={
                    "user_id": user_id,
                    "error": str(e)
                },
                exc_info=True
            )
            # Use default if calculation fails
            expires_in = 60 * 60 * 24 * settings.REFRESH_TTL_DAYS

        # Set new authentication cookies
        try:
            response.set_cookie(
                "access_token", new_access,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 15,  # 15 minutes
                path="/"
            )
            response.set_cookie(
                "refresh_token", new_refresh,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=expires_in,
                path="/api/auth"
            )
            
            logger.debug(
                "New cookies set",
                extra={"user_id": user_id}
            )
        except Exception as e:
            logger.error(
                "Failed to set cookies",
                extra={
                    "user_id": user_id,
                    "error": str(e)
                },
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh failed. Please log in again."
            )

        # Fetch current user data
        try:
            user = db.query(models.User).filter(
                models.User.id == uuid.UUID(user_id)
            ).first()
            
            if not user:
                logger.error(
                    "User not found during token refresh",
                    extra={"user_id": user_id}
                )
                response.delete_cookie("access_token", path="/")
                response.delete_cookie("refresh_token", path="/api/auth")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found. Please log in again."
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                "Database error fetching user",
                extra={
                    "user_id": user_id,
                    "error": str(e)
                },
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh failed. Please try again."
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
        
        # Log successful token refresh
        event_logger.log_login(
            user_id=user.id,
            success=True,
            method="token_refresh",
            ip_address=ip_address
        )
        
        logger.info(
            "Token refresh successful",
            extra={
                "user_id": user_id, 
                "ip_address": ip_address,
                "email": user.email
            }
        )
        
        return schemas.TokenResponse(user=user_data, expires_in=900)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error during token refresh",
            extra={
                "ip_address": ip_address,
                "error": str(e)
            },
            exc_info=True
        )
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed. Please log in again."
        )
