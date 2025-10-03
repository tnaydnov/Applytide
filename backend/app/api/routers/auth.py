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

from ...config import settings
from ...infra.external.google_oauth import OAuthService as GoogleOAuthService  # keep for now

router = APIRouter(prefix="/api/auth", tags=["auth"])

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
    access_token = create_access_token(str(current_user.id))
    return schemas.ExtensionTokenOut(access_token=access_token)

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
        # If your helper supports expires_delta, prefer a short TTL:
        token = create_access_token(str(current_user.id))  # or: expires_delta=timedelta(minutes=5)
        return {"token": token}
    except Exception:
        raise HTTPException(status_code=401, detail="Unable to create WS ticket")

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
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many registration attempts",
                            headers={"Retry-After": str(retry_after)})

    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

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
    db.add(user); db.commit()

    access = create_access_token(str(user.id))
    refresh, _fam = create_refresh_token(str(user.id), user_agent=user_agent, ip_address=ip_address)

    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
    except Exception as e:
        print(f"Failed to send verification email: {e}")

    return schemas.TokenPairOut(access_token=access, refresh_token=refresh)

@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    form_data: schemas.LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    user_agent, ip_address = get_client_info(request)
    email_allowed, _ = login_limiter.check_rate_limit(f"email:{form_data.email.lower()}")
    if not email_allowed:
        raise HTTPException(status_code=429, detail="Too many login attempts")
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many login attempts",
                            headers={"Retry-After": str(retry_after)})

    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    user.last_login_at = datetime.now(timezone.utc); db.commit()

    access_token = create_access_token(str(user.id))
    refresh_token, _fam = create_refresh_token(
        str(user.id), user_agent=user_agent, ip_address=ip_address, extended=form_data.remember_me
    )

    if form_data.remember_me:
        refresh_days = getattr(settings, 'REFRESH_EXTENDED_TTL_DAYS',
                        getattr(settings, 'REFRESH_TTL_EXTENDED_DAYS', settings.REFRESH_TTL_DAYS * 4))
    else:
        refresh_days = settings.REFRESH_TTL_DAYS

    response.set_cookie("access_token", access_token, httponly=True, secure=settings.SECURE_COOKIES,
                        samesite=settings.SAME_SITE_COOKIES, max_age=60 * 15, path="/")
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
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/api/auth")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = refresh_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many refresh attempts",
                            headers={"Retry-After": str(retry_after)})

    try:
        data = decode_refresh(refresh_token)
        if data.get("typ") != "refresh":
            raise HTTPException(status_code=401, detail="Wrong token type")

        user_id = data["sub"]; family = data.get("fam"); jti = data.get("jti")
        revoke_refresh_token(jti)

        new_access = create_access_token(user_id)
        new_refresh, _ = create_refresh_token(user_id, family=family, user_agent=user_agent, ip_address=ip_address)

        new_refresh_data = jwt.decode(new_refresh, settings.REFRESH_SECRET, algorithms=["HS256"])
        expires_in = max(0, int(new_refresh_data["exp"] - int(datetime.now(timezone.utc).timestamp())))

        response.set_cookie("access_token", new_access, httponly=True, secure=settings.SECURE_COOKIES,
                            samesite=settings.SAME_SITE_COOKIES, max_age=60 * 15, path="/")
        response.set_cookie("refresh_token", new_refresh, httponly=True, secure=settings.SECURE_COOKIES,
                            samesite=settings.SAME_SITE_COOKIES, max_age=expires_in, path="/api/auth")

        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

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

    except Exception:
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout", response_model=schemas.MessageResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            data = decode_refresh(refresh_token)
            jti = data.get("jti")
            revoke_refresh_token(jti)
            if jti:
                db_session = db.query(models.UserSession).filter(
                    models.UserSession.refresh_token_jti == jti
                ).first()
                if db_session:
                    db.delete(db_session); db.commit()
        except Exception as e:
            print(f"Error during logout: {e}")

    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            data = decode_access(access_token)
            remaining = max(0, int(data["exp"] - int(datetime.now(timezone.utc).timestamp())))
            jti = data.get("jti")
            if jti and remaining > 0:
                revoke_jti(jti, remaining)
        except Exception:
            pass

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/auth")
    return schemas.MessageResponse(message="Logged out successfully")

@router.post("/logout_all", response_model=schemas.MessageResponse)
def logout_all(current_user: models.User = Depends(get_current_user)):
    revoke_all_user_tokens(str(current_user.id))
    return schemas.MessageResponse(message="Logged out from all devices")

@router.post("/send_verification", response_model=schemas.MessageResponse)
def send_verification_email(payload: schemas.EmailVerificationIn, request: Request, db: Session = Depends(get_db)):
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = email_limiter.check_rate_limit(f"verify:{ip_address}")
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many email requests",
                            headers={"Retry-After": str(retry_after)})

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return schemas.MessageResponse(message="If the email exists, a verification link has been sent")
    if user.email_verified_at:
        return schemas.MessageResponse(message="Email is already verified")

    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

    return schemas.MessageResponse(message="Verification email sent")

@router.post("/verify_email", response_model=schemas.MessageResponse)
def verify_email(payload: schemas.VerifyEmailIn, db: Session = Depends(get_db)):
    user_id = verify_email_token(payload.token, "VERIFY")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if user:
        user.email_verified_at = datetime.now(timezone.utc); db.commit()
    return schemas.MessageResponse(message="Email verified successfully")

@router.post("/password_reset_request", response_model=schemas.MessageResponse)
def password_reset_request(payload: schemas.PasswordResetRequestIn, request: Request, db: Session = Depends(get_db)):
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = email_limiter.check_rate_limit(f"reset:{ip_address}")
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Too many reset requests",
                            headers={"Retry-After": str(retry_after)})

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="This email address is not registered. Please check your email or create an account.")

    try:
        reset_token = create_email_token(str(user.id), "RESET")
        email_service.send_password_reset_email(user.email, reset_token)
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

    return schemas.MessageResponse(message="Password reset email sent successfully! Check your inbox.")

@router.post("/password_reset", response_model=schemas.MessageResponse)
def password_reset(payload: schemas.PasswordResetIn, db: Session = Depends(get_db)):
    user_id = verify_email_token(payload.token, "RESET")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if user:
        user.password_hash = hash_password(payload.new_password)
        db.commit()
        revoke_all_user_tokens(user_id)
    return schemas.MessageResponse(message="Password reset successfully")

@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
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
        "premium_expires_at": current_user.premium_expires_at.isoformat() if getattr(current_user, 'premium_expires_at', None) else None,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "email_verified": bool(current_user.email_verified_at),
        "is_oauth_user": current_user.is_oauth_user,
        "google_id": current_user.google_id
    }

@router.put("/profile", response_model=schemas.MessageResponse)
def update_profile(payload: schemas.ProfileUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.full_name is not None: current_user.full_name = payload.full_name
    if payload.first_name is not None: current_user.first_name = payload.first_name
    if payload.last_name is not None: current_user.last_name = payload.last_name
    if payload.bio is not None: current_user.bio = payload.bio
    if payload.phone is not None: current_user.phone = payload.phone
    if payload.location is not None: current_user.location = payload.location
    if payload.timezone is not None: current_user.timezone = payload.timezone
    if payload.website is not None: current_user.website = payload.website
    if payload.linkedin_url is not None: current_user.linkedin_url = payload.linkedin_url
    if payload.github_url is not None: current_user.github_url = payload.github_url
    current_user.updated_at = datetime.now(timezone.utc); db.commit()
    return schemas.MessageResponse(message="Profile updated successfully")

@router.put("/preferences", response_model=schemas.MessageResponse)
def update_preferences(payload: schemas.PreferencesUpdateIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.language is not None: current_user.language = payload.language
    if payload.theme_preference is not None: current_user.theme_preference = payload.theme_preference
    if payload.notification_email is not None: current_user.notification_email = payload.notification_email
    if payload.notification_push is not None: current_user.notification_push = payload.notification_push
    current_user.updated_at = datetime.now(timezone.utc); db.commit()
    return schemas.MessageResponse(message="Preferences updated successfully")

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    MAX = 5 * 1024 * 1024
    try:
        data = await file.read()
        if len(data) > MAX:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    finally:
        await file.seek(0)

    avatar_url = f"/avatars/{current_user.id}/{file.filename}"
    current_user.avatar_url = avatar_url
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Avatar uploaded successfully", "avatar_url": avatar_url}

# ---- Google OAuth endpoints (now under /api/auth) ----

@router.get("/google/login")
async def login_google(db: Session = Depends(get_db)):
    state = secrets.token_urlsafe(16)
    url = GoogleOAuthService(db).get_google_authorization_url(state=state)
    return RedirectResponse(url)

@router.get("/google/callback")
async def callback_google(
    request: Request,
    response: Response,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error or not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error={error or 'missing_code'}")

    try:
        user, _is_new = GoogleOAuthService(db).process_google_login(code)
        user_id = str(user.id)

        user_agent = request.headers.get("user-agent", "")[:500]
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() \
            or request.headers.get("x-real-ip", "") \
            or (getattr(request.client, "host", None) or "unknown")

        access_token = create_access_token(user_id)
        refresh_token, _family = create_refresh_token(
            user_id, user_agent=user_agent, ip_address=ip, extended=True
        )

        resp = RedirectResponse(f"{settings.FRONTEND_URL}/dashboard")
        resp.set_cookie("access_token", access_token, httponly=True, secure=settings.SECURE_COOKIES,
                        samesite=settings.SAME_SITE_COOKIES, max_age=60 * 15, path="/")
        resp.set_cookie("refresh_token", refresh_token, httponly=True, secure=settings.SECURE_COOKIES,
                        samesite=settings.SAME_SITE_COOKIES, max_age=60 * 60 * 24 * 30, path="/api/auth")
        if not request.cookies.get("client_id"):
            resp.set_cookie("client_id", str(uuid.uuid4()), httponly=False, secure=settings.SECURE_COOKIES,
                            samesite=settings.SAME_SITE_COOKIES, max_age=60 * 60 * 24 * 365 * 2, path="/")
        return resp

    except Exception as e:
        print("OAuth error:", e)
        import traceback; print(traceback.format_exc())
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=oauth_failure")
