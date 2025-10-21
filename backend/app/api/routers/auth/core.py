"""Core authentication endpoints (login, refresh, logout)."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from jose import jwt

from ....db.session import get_db
from ....db import models
from ....infra.security.passwords import verify_password
from ....api.deps_auth import get_current_user
from ....api.schemas import auth as schemas
from ....infra.security.tokens import (
    create_access_token,
    create_refresh_token,
    decode_access,
    decode_refresh,
    revoke_refresh_token,
    revoke_all_user_tokens,
    revoke_jti
)
from ....infra.security.rate_limiter import login_limiter, refresh_limiter
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger
from ....infra.logging.security_tracking import log_security_event_db
from ....infra.security.session_tracking import create_active_session, remove_session
from ....config import settings

from .utils import get_client_info

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
    """Authenticate user and return access/refresh tokens."""
    user_agent, ip_address = get_client_info(request)
    
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
        
        # Log to security events database
        try:
            log_security_event_db(
                db=db,
                event_type="rate_limit_exceeded",
                severity="medium",
                ip_address=ip_address,
                email=form_data.email,
                endpoint="/api/auth/login",
                method="POST",
                user_agent=user_agent,
                details={"reason": "email_rate_limit", "email": form_data.email},
                action_taken="blocked"
            )
        except Exception as e:
            logger.error(f"Failed to log security event: {e}", exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts"
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
        
        # Log to security events database
        try:
            log_security_event_db(
                db=db,
                event_type="rate_limit_exceeded",
                severity="high",
                ip_address=ip_address,
                email=form_data.email,
                endpoint="/api/auth/login",
                method="POST",
                user_agent=user_agent,
                details={"reason": "ip_rate_limit", "retry_after": retry_after},
                action_taken="blocked"
            )
        except Exception as e:
            logger.error(f"Failed to log security event: {e}", exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
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
            detail="Login failed"
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
        
        # Log to security events database
        try:
            log_security_event_db(
                db=db,
                event_type="failed_login",
                severity="medium" if user else "low",  # Higher severity if user exists (potential attack)
                ip_address=ip_address,
                email=form_data.email,
                user_id=user.id if user else None,
                endpoint="/api/auth/login",
                method="POST",
                user_agent=user_agent,
                details={
                    "reason": "invalid_credentials",
                    "user_exists": bool(user)
                }
            )
        except Exception as e:
            logger.error(f"Failed to log security event: {e}", exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Update last login
    try:
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.error(
            "Failed to update last_login_at",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True
        )
        # Non-critical, continue

    # Generate tokens
    try:
        access_token = create_access_token(str(user.id))
        refresh_token, _fam = create_refresh_token(
            str(user.id),
            user_agent=user_agent,
            ip_address=ip_address,
            extended=form_data.remember_me
        )
    except Exception as e:
        logger.error(
            "Failed to generate authentication tokens",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

    # Set cookies
    if form_data.remember_me:
        refresh_days = getattr(
            settings, 'REFRESH_EXTENDED_TTL_DAYS',
            getattr(settings, 'REFRESH_TTL_EXTENDED_DAYS', settings.REFRESH_TTL_DAYS * 4)
        )
    else:
        refresh_days = settings.REFRESH_TTL_DAYS

    try:
        response.set_cookie(
            "access_token", access_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite=settings.SAME_SITE_COOKIES,
            max_age=60 * 15,
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
        if not request.cookies.get("client_id"):
            response.set_cookie(
                "client_id", str(uuid.uuid4()),
                httponly=False,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 60 * 24 * 365 * 2,
                path="/"
            )
    except Exception as e:
        logger.error(
            "Failed to set authentication cookies",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

    # Build user response
    user_data = schemas.UserInfo(
        id=str(user.id), email=user.email, full_name=user.full_name, first_name=user.first_name,
        last_name=user.last_name, avatar_url=user.avatar_url or user.google_avatar_url, bio=user.bio,
        phone=user.phone, location=user.location, timezone=user.timezone, website=user.website,
        linkedin_url=user.linkedin_url, github_url=user.github_url, language=user.language,
        theme_preference=user.theme_preference, notification_email=user.notification_email,
        notification_push=user.notification_push, is_premium=getattr(user, 'is_premium', False),
        is_admin=getattr(user, 'is_admin', False),
        premium_expires_at=user.premium_expires_at.isoformat() if getattr(user, 'premium_expires_at', None) else None,
        created_at=user.created_at.isoformat(), updated_at=user.updated_at.isoformat() if user.updated_at else None,
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
        email_verified=bool(user.email_verified_at), is_oauth_user=user.is_oauth_user, google_id=user.google_id
    )

    event_logger.log_login(
        user_id=user.id,
        success=True,
        method="email",
        ip_address=ip_address
    )
    
    # Track active session
    try:
        from datetime import timedelta
        session_expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_days)
        
        create_active_session(
            db=db,
            user_id=user.id,
            session_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=session_expires_at
        )
        logger.debug("Active session tracked", extra={"user_id": str(user.id)})
    except Exception as e:
        # Non-critical - don't fail login if session tracking fails
        logger.error("Failed to track active session", extra={
            "user_id": str(user.id),
            "error": str(e)
        })
    
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


@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    user_agent, ip_address = get_client_info(request)
    refresh_token_value = request.cookies.get("refresh_token")
    
    if not refresh_token_value:
        logger.warning(
            "Refresh attempt without token",
            extra={"ip_address": ip_address}
        )
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/api/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token"
        )

    # Rate limiting
    is_allowed, retry_after = refresh_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        logger.warning(
            "Refresh rate limit exceeded",
            extra={"ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many refresh attempts",
            headers={"Retry-After": str(retry_after)}
        )

    try:
        # Decode and validate refresh token
        data = decode_refresh(refresh_token_value)
        if data.get("typ") != "refresh":
            logger.warning(
                "Invalid token type in refresh attempt",
                extra={"ip_address": ip_address, "token_type": data.get("typ")}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong token type"
            )

        user_id = data["sub"]
        family = data.get("fam")
        jti = data.get("jti")
        
        logger.debug(
            "Refresh token validated",
            extra={"user_id": user_id, "ip_address": ip_address}
        )
        
        # Revoke old refresh token
        revoke_refresh_token(jti)

        # Generate new tokens
        new_access = create_access_token(user_id)
        new_refresh, _ = create_refresh_token(
            user_id,
            family=family,
            user_agent=user_agent,
            ip_address=ip_address
        )

        new_refresh_data = jwt.decode(
            new_refresh,
            settings.REFRESH_SECRET,
            algorithms=["HS256"]
        )
        expires_in = max(0, int(
            new_refresh_data["exp"] - int(datetime.now(timezone.utc).timestamp())
        ))

        # Set new cookies
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
            max_age=expires_in,
            path="/api/auth"
        )

        # Fetch user data
        user = db.query(models.User).filter(
            models.User.id == uuid.UUID(user_id)
        ).first()
        
        if not user:
            logger.error(
                "User not found during token refresh",
                extra={"user_id": user_id}
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = schemas.UserInfo(
            id=str(user.id), email=user.email, full_name=user.full_name, first_name=user.first_name,
            last_name=user.last_name, avatar_url=user.avatar_url or user.google_avatar_url, bio=user.bio,
            phone=user.phone, location=user.location, timezone=user.timezone, website=user.website,
            linkedin_url=user.linkedin_url, github_url=user.github_url, language=user.language,
            theme_preference=user.theme_preference, notification_email=user.notification_email,
            notification_push=user.notification_push, is_premium=getattr(user, 'is_premium', False),
            is_admin=getattr(user, 'is_admin', False),
            premium_expires_at=user.premium_expires_at.isoformat() if getattr(user, 'premium_expires_at', None) else None,
            created_at=user.created_at.isoformat(), updated_at=user.updated_at.isoformat() if user.updated_at else None,
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            email_verified=bool(user.email_verified_at), is_oauth_user=user.is_oauth_user, google_id=user.google_id
        )
        
        event_logger.log_login(
            user_id=user.id,
            success=True,
            method="token_refresh",
            ip_address=ip_address
        )
        
        logger.debug(
            "Token refresh successful",
            extra={"user_id": user_id, "ip_address": ip_address}
        )
        
        return schemas.TokenResponse(user=user_data, expires_in=900)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Token refresh failed",
            extra={"ip_address": ip_address, "error": str(e)},
            exc_info=True
        )
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Logout user and revoke tokens."""
    user_id = None
    user_agent, ip_address = get_client_info(request)
    
    # Revoke refresh token
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            data = decode_refresh(refresh_token)
            user_id = data.get("sub")
            jti = data.get("jti")
            
            revoke_refresh_token(jti)
            
            if jti:
                db_token = db.query(models.RefreshToken).filter(
                    models.RefreshToken.jti == jti
                ).first()
                if db_token:
                    db_token.revoked_at = datetime.now(timezone.utc)
                    db.commit()
                    
            logger.debug(
                "Refresh token revoked during logout",
                extra={"user_id": user_id, "ip_address": ip_address}
            )
        except Exception as e:
            logger.warning(
                "Error revoking refresh token during logout",
                extra={"error": str(e), "ip_address": ip_address}
            )

    # Revoke access token
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            data = decode_access(access_token)
            if not user_id:
                user_id = data.get("sub")
            
            remaining = max(0, int(
                data["exp"] - int(datetime.now(timezone.utc).timestamp())
            ))
            jti = data.get("jti")
            
            if jti and remaining > 0:
                revoke_jti(jti, remaining)
                logger.debug(
                    "Access token revoked during logout",
                    extra={"user_id": user_id, "ip_address": ip_address}
                )
        except Exception as e:
            logger.warning(
                "Error revoking access token during logout",
                extra={"error": str(e), "ip_address": ip_address}
            )

    # Clear cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/auth")
    
    # Remove active session
    if refresh_token:
        try:
            remove_session(db, refresh_token)
            logger.debug("Active session removed", extra={"user_id": user_id})
        except Exception as e:
            logger.error("Failed to remove active session", extra={
                "user_id": user_id,
                "error": str(e)
            })
    
    if user_id:
        event_logger.log_logout(user_id=user_id)
        logger.info(
            "User logged out",
            extra={"user_id": user_id, "ip_address": ip_address}
        )
    else:
        logger.info(
            "Logout completed (user unknown)",
            extra={"ip_address": ip_address}
        )
    
    return schemas.MessageResponse(message="Logged out successfully")


@router.post("/logout_all", response_model=schemas.MessageResponse)
def logout_all(current_user: models.User = Depends(get_current_user)):
    """Logout user from all devices by revoking all tokens."""
    try:
        revoke_all_user_tokens(str(current_user.id))
        
        logger.info(
            "User logged out from all devices",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        return schemas.MessageResponse(message="Logged out from all devices")
    
    except Exception as e:
        logger.error(
            "Failed to logout from all devices",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout from all devices"
        )
