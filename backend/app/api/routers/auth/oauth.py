"""Google OAuth authentication endpoints."""
from __future__ import annotations
import uuid
import secrets

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....infra.security.tokens import create_access_token, create_refresh_token
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
