from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, File, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt

from ...db.session import get_db
from ...db import models
from ...infra.security.passwords import hash_password, verify_password
from ...api.deps_auth import get_current_user
from ...api.schemas import auth as schemas

from ...infra.security.tokens import (
    create_access_token, create_refresh_token, decode_access, decode_refresh,
    revoke_refresh_token, revoke_all_user_tokens, create_email_token, verify_email_token, revoke_jti
)
from ...infra.security.rate_limiter import login_limiter, refresh_limiter, email_limiter
from ...infra.notifications.email_service import email_service
from ...infra.logging import get_logger
from ...infra.logging.business_logger import BusinessEventLogger

from ...config import settings
from ...infra.external.google_oauth import OAuthService as GoogleOAuthService  # keep for now

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()

class _Schemas:  # tiny helper to make type checkers happy in returns
    TokenPairOut = schemas.TokenPairOut
    TokenResponse = schemas.TokenResponse
    MessageResponse = schemas.MessageResponse
    ExtensionTokenOut = schemas.ExtensionTokenOut
    UserInfo = schemas.UserInfo

@router.post("/extension-token", response_model=schemas.ExtensionTokenOut)
async def get_extension_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate extension token for browser extension authentication."""
    try:
        logger.info(
            "Extension token requested",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        access_token = create_access_token(str(current_user.id))
        
        logger.debug(
            "Extension token generated successfully",
            extra={"user_id": str(current_user.id)}
        )
        
        return schemas.ExtensionTokenOut(access_token=access_token)
    
    except Exception as e:
        logger.error(
            "Failed to generate extension token",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate extension token"
        )

@router.post("/ws-ticket")
def create_ws_ticket(
    current_user: models.User = Depends(get_current_user)
):
    """
    Mint a short-lived access token for WebSocket auth.
    Using get_current_user means if the access cookie is stale,
    your frontend's apiFetch() will auto-refresh then retry this call.
    """
    try:
        logger.info(
            "WebSocket ticket requested",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        # If your helper supports expires_delta, prefer a short TTL:
        token = create_access_token(str(current_user.id))  # or: expires_delta=timedelta(minutes=5)
        
        logger.debug(
            "WebSocket ticket created successfully",
            extra={"user_id": str(current_user.id)}
        )
        
        return {"token": token}
    
    except Exception as e:
        logger.error(
            "Failed to create WebSocket ticket",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to create WS ticket"
        )

def get_client_info(request: Request) -> tuple[str, str]:
    user_agent = request.headers.get("user-agent", "")[:500]
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = getattr(request.client, "host", "unknown")
    return user_agent, ip

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

    logger.info(
        "User registered successfully",
        extra={"user_id": str(user.id), "email": user.email}
    )
    
    return schemas.TokenPairOut(access_token=access, refresh_token=refresh)

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
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=settings.SECURE_COOKIES,
                        samesite=settings.SAME_SITE_COOKIES, max_age=60 * 60 * 24 * refresh_days, path="/api/auth")
    if not request.cookies.get("client_id"):
        response.set_cookie("client_id", str(uuid.uuid4()), httponly=False, secure=settings.SECURE_COOKIES,
                            samesite=settings.SAME_SITE_COOKIES, max_age=60 * 60 * 24 * 365 * 2, path="/")

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

@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user information."""
    try:
        logger.debug(
            "User info requested",
            extra={"user_id": str(current_user.id)}
        )
        
        return {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "avatar_url": current_user.avatar_url or current_user.google_avatar_url,
            "bio": current_user.bio,
            "phone": current_user.phone,
            "location": current_user.location,
            "timezone": current_user.timezone,
            "website": current_user.website,
            "linkedin_url": current_user.linkedin_url,
            "github_url": current_user.github_url,
            "language": current_user.language,
            "theme_preference": current_user.theme_preference,
            "notification_email": current_user.notification_email,
            "notification_push": current_user.notification_push,
            "is_premium": getattr(current_user, 'is_premium', False),
            "is_admin": getattr(current_user, 'is_admin', False),
            "premium_expires_at": current_user.premium_expires_at.isoformat() if getattr(current_user, 'premium_expires_at', None) else None,
            "created_at": current_user.created_at.isoformat(),
            "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
            "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
            "email_verified": bool(current_user.email_verified_at),
            "is_oauth_user": current_user.is_oauth_user,
            "google_id": current_user.google_id
        }
    except Exception as e:
        logger.error(
            "Failed to retrieve user info",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )

@router.put("/profile", response_model=schemas.MessageResponse)
def update_profile(payload: schemas.ProfileUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user profile information."""
    try:
        logger.info(
            "Profile update requested",
            extra={"user_id": str(current_user.id)}
        )
        
        updated_fields = []
        if payload.full_name is not None:
            current_user.full_name = payload.full_name
            updated_fields.append("full_name")
        if payload.first_name is not None:
            current_user.first_name = payload.first_name
            updated_fields.append("first_name")
        if payload.last_name is not None:
            current_user.last_name = payload.last_name
            updated_fields.append("last_name")
        if payload.bio is not None:
            current_user.bio = payload.bio
            updated_fields.append("bio")
        if payload.phone is not None:
            current_user.phone = payload.phone
            updated_fields.append("phone")
        if payload.location is not None:
            current_user.location = payload.location
            updated_fields.append("location")
        if payload.timezone is not None:
            current_user.timezone = payload.timezone
            updated_fields.append("timezone")
        if payload.website is not None:
            current_user.website = payload.website
            updated_fields.append("website")
        if payload.linkedin_url is not None:
            current_user.linkedin_url = payload.linkedin_url
            updated_fields.append("linkedin_url")
        if payload.github_url is not None:
            current_user.github_url = payload.github_url
            updated_fields.append("github_url")
        
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Profile updated successfully",
            extra={
                "user_id": str(current_user.id),
                "updated_fields": updated_fields
            }
        )
        
        return schemas.MessageResponse(message="Profile updated successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to update profile",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.put("/preferences", response_model=schemas.MessageResponse)
def update_preferences(payload: schemas.PreferencesUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user preferences."""
    try:
        logger.info(
            "Preferences update requested",
            extra={"user_id": str(current_user.id)}
        )
        
        updated_fields = []
        if payload.language is not None:
            current_user.language = payload.language
            updated_fields.append("language")
        if payload.theme_preference is not None:
            current_user.theme_preference = payload.theme_preference
            updated_fields.append("theme_preference")
        if payload.notification_email is not None:
            current_user.notification_email = payload.notification_email
            updated_fields.append("notification_email")
        if payload.notification_push is not None:
            current_user.notification_push = payload.notification_push
            updated_fields.append("notification_push")
        
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Preferences updated successfully",
            extra={
                "user_id": str(current_user.id),
                "updated_fields": updated_fields
            }
        )
        
        return schemas.MessageResponse(message="Preferences updated successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to update preferences",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences"
        )

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar image."""
    logger.info(
        "Avatar upload requested",
        extra={
            "user_id": str(current_user.id),
            "filename": file.filename,
            "content_type": file.content_type
        }
    )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        logger.warning(
            "Invalid avatar file type",
            extra={
                "user_id": str(current_user.id),
                "content_type": file.content_type
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed"
        )

    # Validate file size
    MAX = 5 * 1024 * 1024  # 5MB
    try:
        data = await file.read()
        file_size = len(data)
        
        if file_size > MAX:
            logger.warning(
                "Avatar file too large",
                extra={
                    "user_id": str(current_user.id),
                    "file_size_mb": round(file_size / (1024 * 1024), 2)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error reading avatar file",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process avatar file"
        )
    finally:
        await file.seek(0)

    # Save avatar reference
    try:
        avatar_url = f"/avatars/{current_user.id}/{file.filename}"
        current_user.avatar_url = avatar_url
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Avatar uploaded successfully",
            extra={
                "user_id": str(current_user.id),
                "avatar_url": avatar_url,
                "file_size_kb": round(file_size / 1024, 2)
            }
        )
        
        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to save avatar",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )

# ---- Google OAuth endpoints (now under /api/auth) ----

@router.get("/google/login")
async def login_google(db: Session = Depends(get_db)):
    """Initiate Google OAuth login flow."""
    try:
        state = secrets.token_urlsafe(16)
        url = GoogleOAuthService(db).get_google_authorization_url(state=state)
        
        logger.info(
            "Google OAuth flow initiated",
            extra={"state": state[:10]}  # Log prefix only for security
        )
        
        return RedirectResponse(url)
    
    except Exception as e:
        logger.error(
            "Failed to initiate Google OAuth flow",
            extra={"error": str(e)},
            exc_info=True
        )
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=oauth_init_failed"
        )

@router.get("/google/callback")
async def callback_google(
    request: Request,
    response: Response,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback."""
    user_agent, ip_address = get_client_info(request)
    
    logger.info(
        "Google OAuth callback received",
        extra={
            "has_code": bool(code),
            "has_error": bool(error),
            "ip_address": ip_address
        }
    )
    
    if error or not code:
        logger.warning(
            "Google OAuth callback error",
            extra={"error": error or "missing_code", "ip_address": ip_address}
        )
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error={error or 'missing_code'}"
        )

    try:
        # Process Google login
        user, is_new = GoogleOAuthService(db).process_google_login(code)
        user_id = str(user.id)

        logger.info(
            "Google OAuth successful",
            extra={
                "user_id": user_id,
                "email": user.email,
                "is_new_user": is_new,
                "ip_address": ip_address
            }
        )
        
        # Log the authentication event
        event_logger.log_login(
            user_id=user.id,
            success=True,
            method="google",
            ip_address=ip_address
        )
        
        if is_new:
            event_logger.log_registration(
                user_id=user.id,
                email=user.email,
                registration_method="google",
                ip_address=ip_address
            )

        # Generate tokens
        access_token = create_access_token(user_id)
        refresh_token, _family = create_refresh_token(
            user_id,
            user_agent=user_agent,
            ip_address=ip_address,
            extended=True
        )

        # Create redirect response with cookies
        resp = RedirectResponse(f"{settings.FRONTEND_URL}/dashboard")
        resp.set_cookie(
            "access_token", access_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite=settings.SAME_SITE_COOKIES,
            max_age=60 * 15,
            path="/"
        )
        resp.set_cookie(
            "refresh_token", refresh_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite=settings.SAME_SITE_COOKIES,
            max_age=60 * 60 * 24 * 30,
            path="/api/auth"
        )
        if not request.cookies.get("client_id"):
            resp.set_cookie(
                "client_id", str(uuid.uuid4()),
                httponly=False,
                secure=settings.SECURE_COOKIES,
                samesite=settings.SAME_SITE_COOKIES,
                max_age=60 * 60 * 24 * 365 * 2,
                path="/"
            )
        
        return resp

    except Exception as e:
        logger.error(
            "Google OAuth processing failed",
            extra={
                "error": str(e),
                "ip_address": ip_address,
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=oauth_failure"
        )
