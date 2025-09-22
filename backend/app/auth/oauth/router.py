from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.auth.oauth.google import get_authorization_url, process_google_login
from app.auth.tokens import create_access_token, create_refresh_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/google/login")
async def login_google():
    """
    Redirect to Google OAuth login page
    """
    auth_url = get_authorization_url()
    return RedirectResponse(auth_url)

@router.get("/google/callback")
async def callback_google(
    request: Request,
    response: Response,
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth callback
    """
    if error:
        # Redirect to frontend with error
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error={error}")
        
    if not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=missing_code")
        
    try:
        # Extract user agent and IP
        user_agent = request.headers.get("user-agent", "")[:500]
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
        
        # Process the login
        user, is_new_user = await process_google_login(db, code)
        user_id = str(user.id)
        
        # Create tokens using your existing token system
        refresh_token, family = create_refresh_token(
            user_id, 
            user_agent=user_agent, 
            ip_address=ip,
            extended=True  # Use extended session for OAuth
        )
        
        # Extract token data and create user session
        from jose import jwt
        token_data = jwt.decode(refresh_token, settings.REFRESH_SECRET, algorithms=["HS256"])
        refresh_jti = token_data.get("jti")
        
        # Create access token with same JTI as refresh token
        access_token = create_access_token(user_id, token_id=refresh_jti)
        
        # Generate more stable client_id for OAuth that doesn't depend on IP
        # This ensures the same browser+user will get the same client_id even if IP changes
        import hashlib
        # Use user_id and a hash of user_agent for more stability
        browser_fingerprint = f"oauth-{user_id}-{hashlib.md5(user_agent.encode()).hexdigest()[:8]}"
        client_id = browser_fingerprint
        
        # Calculate session expiration for extended OAuth session
        from datetime import datetime, timezone, timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TTL_DAYS * 4)
        
        # Upsert user session (prevents duplicates per device)
        from app.auth.tokens import upsert_user_session
        upsert_user_session(
            user_id=user_id,
            refresh_token_jti=refresh_jti,
            client_id=client_id,
            user_agent=user_agent,
            ip_address=ip,
            expires_at=expires_at
        )
        
        frontend_url = settings.FRONTEND_URL
        print(f"Redirecting to: {frontend_url}/auth/callback")
        
        # Set cookies consistent with your auth system
        response = RedirectResponse(f"{frontend_url}/auth/callback")
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite=settings.SAME_SITE_COOKIES,
            max_age=60 * 15,  # 15 minutes
            path="/"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite=settings.SAME_SITE_COOKIES,
            max_age=60 * 60 * 24 * 30,  # 30 days for OAuth
            path="/api/auth"
        )
        
        return response
    except Exception as e:
        print(f"OAuth error: {str(e)}")
        print(f"OAuth error type: {type(e)}")
        import traceback
        print(f"OAuth traceback: {traceback.format_exc()}")
        # Also use the configured URL for error redirects
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=oauth_failure")