"""
Google OAuth Authentication Endpoints

Handles Google OAuth 2.0 authentication flow:
- OAuth authorization initiation
- OAuth callback handling and user creation
- Legal agreements storage for OAuth users
- Token generation and session creation

Implements secure OAuth flow with state validation and
automatic user provisioning for new Google sign-ins.
"""
from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from redis.exceptions import RedisError

from ....db.session import get_db
from ....db import models
from ....infra.security.tokens import create_access_token, create_refresh_token
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger
from ....infra.external.google_oauth import OAuthService as GoogleOAuthService
from ....infra.notifications.email_service import email_service
from ....infra.cache.redis_client import get_redis, redis_key
from ....config import settings
from ...deps import get_current_user
from ...schemas.common import SuccessMessageResponse

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()

# OAuth state CSRF protection — 5-minute TTL
_OAUTH_STATE_TTL: int = 300


def _state_key(state: str) -> str:
    """Redis key for OAuth state CSRF token."""
    return redis_key("oauth", "state", state)


def _store_oauth_state(state: str) -> None:
    """Store OAuth state token in Redis with short TTL."""
    try:
        r = get_redis()
        r.setex(_state_key(state), _OAUTH_STATE_TTL, "1")
    except RedisError:
        logger.error("Failed to store OAuth state in Redis", exc_info=True)
        raise


def _consume_oauth_state(state: str) -> bool:
    """Validate and consume an OAuth state token. Returns True if valid."""
    try:
        r = get_redis()
        pipe = r.pipeline(transaction=True)
        pipe.get(_state_key(state))
        pipe.delete(_state_key(state))
        value, _ = pipe.execute()
        return value is not None
    except RedisError:
        logger.error("Redis error consuming OAuth state", exc_info=True)
        return False


class LegalAgreementsIn(BaseModel):
    """Legal agreements from OAuth flow"""
    terms_accepted: bool
    privacy_accepted: bool
    age_verified: bool
    data_processing_consent: bool


@router.get("/google/login")
async def login_google(
    db: Session = Depends(get_db)
):
    """
    Initiate Google OAuth login flow.
    
    Redirects user to Google's OAuth authorization page.
    Generates state token for CSRF protection.
    
    Args:
        db: Database session (from dependency)
        
    Returns:
        RedirectResponse: Redirect to Google OAuth page with:
            - client_id: Application credentials
            - redirect_uri: Callback URL
            - scope: Requested permissions (email, profile)
            - state: CSRF protection token
            
    Raises:
        Redirects to login page with error on failure
        
    Security:
        - State token: CSRF protection (validated in callback)
        - Secure redirect: Only to Google domains
        - Scopes limited: email, profile only
        
    Notes:
        - Generates random state token
        - State validated in callback endpoint
        - User consents on Google's page
        - Returns to /google/callback after consent
        - Use for: "Sign in with Google" button
        
    Example:
        GET /api/auth/google/login
        Returns: 302 Redirect to https://accounts.google.com/...
    """
    try:
        state = secrets.token_urlsafe(16)
        _store_oauth_state(state)
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
    """
    Handle Google OAuth callback.
    
    Processes OAuth authorization response:
    1. Validates authorization code
    2. Exchanges code for tokens
    3. Fetches user profile from Google
    4. Creates new user or updates existing
    5. Generates application tokens
    6. Sets authentication cookies
    7. Redirects to dashboard or legal agreements
    
    Query Parameters:
        code (str): Authorization code from Google
        state (str): CSRF token (should match initiated state)
        error (str): Error code if authorization denied
        
    Args:
        request: FastAPI request for client info extraction
        response: FastAPI response for cookie setting
        code: Authorization code (from query param)
        state: State token (from query param)
        error: Error code (from query param)
        db: Database session (from dependency)
        
    Returns:
        RedirectResponse: Redirect with authentication cookies:
            - Success: /dashboard (existing) or /dashboard?new_user=true (new)
            - Failure: /login?error=<reason>
            Cookies set: access_token, refresh_token, client_id
            
    Raises:
        Redirects to login with error parameter on failure
        
    Security:
        - State validation: CSRF protection via Redis-backed single-use token
        - Code exchange: Secure token retrieval
        - Profile verification: Email from Google validated
        - Extended session: 30-day refresh token for OAuth
        - Audit logging: Login event logged
        
    Notes:
        - New users created automatically
        - Existing users updated with latest Google data
        - New users redirected to legal agreements
        - is_new flag signals frontend to show agreements
        - Email pre-verified (from Google)
        - Password hash not set (OAuth users)
        - Use for: OAuth callback URL
        
    Example:
        GET /api/auth/google/callback?code=...&state=...
        Returns: 302 Redirect to /dashboard
        Sets cookies: access_token, refresh_token
    """
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

    # Validate OAuth state for CSRF protection
    if not state or not _consume_oauth_state(state):
        logger.warning(
            "OAuth state validation failed",
            extra={"has_state": bool(state), "ip_address": ip_address}
        )
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=invalid_state"
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
            
            # Send welcome email for new OAuth users
            try:
                email_service.send_welcome_email(
                    to_email=user.email,
                    name=user.full_name or user.email.split('@')[0]
                )
                logger.info("Welcome email sent to new OAuth user", extra={"user_id": user_id, "email": user.email})
            except Exception as e:
                logger.error(f"Failed to send welcome email to OAuth user: {e}", extra={"user_id": user_id})

        # Generate tokens
        access_token = create_access_token(user_id)
        refresh_token, _family = create_refresh_token(
            user_id,
            user_agent=user_agent,
            ip_address=ip_address,
            extended=True
        )

        # Create redirect response with cookies
        # Add is_new flag to redirect URL so frontend knows if legal agreements needed
        redirect_url = f"{settings.FRONTEND_URL}/dashboard"
        if is_new:
            redirect_url = f"{settings.FRONTEND_URL}/auth/google-callback?new_user=true"
        
        resp = RedirectResponse(redirect_url)
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


@router.post("/google/store-agreements", response_model=SuccessMessageResponse)
async def store_google_agreements(
    payload: LegalAgreementsIn,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Store legal agreements for OAuth user.
    
    Called by frontend after OAuth registration to store
    legal agreement timestamps. Required for GDPR compliance.
    
    Request Body:
        terms_accepted (bool): Terms of Service accepted (required: true)
        privacy_accepted (bool): Privacy Policy accepted (required: true)
        age_verified (bool): Age 13+ verified (required: true)
        data_processing_consent (bool): GDPR consent (required: true)
        
    Args:
        payload: Legal agreements (from request body)
        request: FastAPI request for cookie extraction
        db: Database session (from dependency)
        
    Returns:
        dict: Success confirmation with:
            - success: true
            - message: "Legal agreements recorded"
            
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 400 if any agreement is false
        HTTPException: 500 if update fails
        
    Security:
        Requires user authentication
        All agreements must be true
        Timestamps recorded with IP address
        Audit logging: Agreement acceptance logged
        
    Notes:
        - Called after OAuth callback for new users
        - All agreements MUST be true
        - Timestamps and IP stored for legal compliance
        - Frontend shows agreement UI if is_new=true
        - Existing OAuth users already have agreements
        - Use for: post-OAuth legal agreement capture
        
    Example:
        POST /api/auth/google/store-agreements
        Headers: Cookie: access_token=<valid>
        Body: {
            "terms_accepted": true,
            "privacy_accepted": true,
            "age_verified": true,
            "data_processing_consent": true
        }
        Returns: {
            "success": true,
            "message": "Legal agreements recorded"
        }
    """
    user_agent, ip_address = get_client_info(request)
    
    try:
        # Validate all agreements are True
        if not all([
            payload.terms_accepted,
            payload.privacy_accepted,
            payload.age_verified,
            payload.data_processing_consent
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All legal agreements must be accepted"
            )
        
        # Store legal agreement acceptance
        now = datetime.now(timezone.utc)
        current_user.terms_accepted_at = now
        current_user.privacy_accepted_at = now
        current_user.terms_version = "1.0"
        current_user.acceptance_ip = ip_address
        
        db.commit()
        
        logger.info(
            "Legal agreements stored for OAuth user",
            extra={
                "user_id": str(current_user.id),
                "email": current_user.email,
                "ip_address": ip_address
            }
        )
        
        return {"success": True, "message": "Legal agreements stored successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to store legal agreements",
            extra={"error": str(e), "ip_address": ip_address},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store legal agreements"
        )
