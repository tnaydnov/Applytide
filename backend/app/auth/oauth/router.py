from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.auth.oauth.google import get_authorization_url, process_google_login
from app.auth.tokens import create_access_token, create_refresh_token
from app.config import settings
from app.auth.sessions import create_user_session

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
        access_token = create_access_token(user_id)
        refresh_token, family = create_refresh_token(
            user_id, 
            user_agent=user_agent, 
            ip_address=ip,
            extended=True  # Use extended session for OAuth
        )
        
        # Extract token data and create user session
        from jose import jwt
        token_data = jwt.decode(refresh_token, settings.REFRESH_SECRET, algorithms=["HS256"])
        jti = token_data.get("jti")
        
        # Create user session
        device_info = {
            "client_id": request.cookies.get("client_id", str(uuid.uuid4())),
            "device_type": "browser",
            "ip_address": ip,
            "user_agent": user_agent
        }
        create_user_session(db, user_id, jti, device_info)
        
        frontend_url = settings.FRONTEND_URL
        print(f"Redirecting to: {frontend_url}/dashboard")
        
        # Set cookies consistent with your auth system
        response = RedirectResponse(f"{frontend_url}/dashboard")
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