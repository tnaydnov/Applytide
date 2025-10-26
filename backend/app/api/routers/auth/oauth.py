"""Google OAuth authentication endpoints."""
from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ....db.session import get_db
from ....db import models
from ....infra.security.tokens import create_access_token, create_refresh_token, decode_access_token
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger
from ....infra.external.google_oauth import OAuthService as GoogleOAuthService
from ....infra.notifications.email_service import email_service
from ....config import settings

from .utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


class LegalAgreementsIn(BaseModel):
    """Legal agreements from OAuth flow"""
    terms_accepted: bool
    privacy_accepted: bool
    age_verified: bool
    data_processing_consent: bool


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


@router.post("/google/store-agreements")
async def store_google_agreements(
    payload: LegalAgreementsIn,
    request: Request,
    db: Session = Depends(get_db)
):
    """Store legal agreements for OAuth user after callback."""
    user_agent, ip_address = get_client_info(request)
    
    # Get user from access token cookie
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
        
        # Get user and update legal agreements
        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Store legal agreement acceptance
        now = datetime.now(timezone.utc)
        user.terms_accepted_at = now
        user.privacy_accepted_at = now
        user.terms_version = "1.0"
        user.acceptance_ip = ip_address
        
        db.commit()
        
        logger.info(
            "Legal agreements stored for OAuth user",
            extra={
                "user_id": user_id,
                "email": user.email,
                "ip_address": ip_address
            }
        )
        
        return {"success": True, "message": "Legal agreements stored successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to store legal agreements",
            extra={"error": str(e), "ip_address": ip_address},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store legal agreements"
        )
