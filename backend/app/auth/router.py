import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from . import schemas
from ..core.security import hash_password, verify_password
from .tokens import (
    create_access_token, create_refresh_token,
    decode_refresh, revoke_refresh_token, revoke_all_user_tokens,
    create_email_token, verify_email_token
)
from .rate_limiting import login_limiter, refresh_limiter, email_limiter
from .email_service import email_service
# Import sessions endpoints
from .sessions import router as sessions_router
from ..auth.deps import get_current_user

from typing import Optional
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Include sessions endpoints
router.include_router(sessions_router)


def get_client_info(request: Request) -> tuple[str, str]:
    """Extract user agent and IP address from request"""
    user_agent = request.headers.get("user-agent", "")[:500]
    # Handle forwarded headers for IP
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = getattr(request.client, "host", "unknown")
    return user_agent, ip


@router.post("/register", response_model=schemas.TokenPairOut)
def register(payload: schemas.RegisterIn, request: Request, db: Session = Depends(get_db)):
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts",
            headers={"Retry-After": str(retry_after)}
        )
    
    # Check if email already exists
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = models.User(
        id=uuid.uuid4(),
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="user",
        calendar_token=secrets.token_urlsafe(32),
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()

    # Create tokens
    access = create_access_token(str(user.id))
    refresh, _fam = create_refresh_token(str(user.id), user_agent=user_agent, ip_address=ip_address)
    
    # Send verification email
    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
    
    return schemas.TokenPairOut(access_token=access, refresh_token=refresh)


@router.post("/extension-token", response_model=schemas.TokenResponse)
async def get_extension_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a token specifically for the browser extension"""
    access_token = create_access_token(current_user.id)
    
    # Return token in JSON (not cookies) for extension use
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    form_data: schemas.LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    email_allowed, email_retry = login_limiter.check_rate_limit(f"email:{form_data.email.lower()}")
    if not email_allowed:
        # Don't reveal if we're rate limiting by email or IP
        raise HTTPException(status_code=429, detail="Too many login attempts")
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
            headers={"Retry-After": str(retry_after)}
        )
    
    # Authenticate user
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create tokens
    access_token = create_access_token(str(user.id))
    refresh_token, _fam = create_refresh_token(
        str(user.id), 
        user_agent=user_agent, 
        ip_address=ip_address,
        extended=form_data.remember_me
    )

    try:
        token_data = decode_refresh(refresh_token)
        jti = token_data.get("jti")
        
        # Create user session
        device_info = {
            "client_id": request.cookies.get("client_id", str(uuid.uuid4())),
            "device_type": "browser",
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        from .sessions import create_user_session
        create_user_session(db, str(user.id), jti, device_info)
    except Exception as e:
        print(f"Failed to create user session: {e}")
    
    # Calculate cookie expiration
    if form_data.remember_me:
        # Default extended period is 30 days, or 4x regular period
        refresh_days = getattr(settings, 'REFRESH_EXTENDED_TTL_DAYS', 
                            getattr(settings, 'REFRESH_TTL_EXTENDED_DAYS',
                                    settings.REFRESH_TTL_DAYS * 4))
    else:
        refresh_days = settings.REFRESH_TTL_DAYS
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 15,  # 15 minutes
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * refresh_days,  # 7 or 30 days
        path="/auth"
    )
    
    # Return user info
    user_data = schemas.UserInfo(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_premium=getattr(user, 'is_premium', False),
        premium_expires_at=user.premium_expires_at.isoformat() if getattr(user, 'premium_expires_at', None) else None,
        created_at=user.created_at.isoformat(),
        email_verified=bool(user.email_verified_at)
    )
    
    return schemas.TokenResponse(
        user=user_data,
        expires_in=900  # 15 minutes in seconds
    )

@router.post("/refresh")
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token"
        )
    
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = refresh_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many refresh attempts",
            headers={"Retry-After": str(retry_after)}
        )
    
    try:
        # Verify and decode refresh token
        data = decode_refresh(refresh_token)
        
        if data.get("typ") != "refresh":
            raise HTTPException(status_code=401, detail="Wrong token type")
            
        # Get user ID and family from token
        user_id = data["sub"]
        family = data.get("fam")
        jti = data.get("jti")
        
        # Revoke the current refresh token
        revoke_refresh_token(jti)
        
        # Create new tokens
        new_access = create_access_token(user_id)
        new_refresh, _ = create_refresh_token(
            user_id, 
            family=family, 
            user_agent=user_agent, 
            ip_address=ip_address
        )
        
        # Set new cookies
        response.set_cookie(
            key="access_token",
            value=new_access,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=60 * 15,  # 15 minutes
            path="/"
        )
        
        # Use the same expiry as before since we're refreshing
        # Calculate based on token family creation time
        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            secure=False,
            samesite="lax",
            # Keep the same expiry as the original refresh token family
            path="/auth"
        )
        
        # Get user info
        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_data = schemas.UserInfo(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_premium=getattr(user, 'is_premium', False),
            premium_expires_at=user.premium_expires_at.isoformat() if getattr(user, 'premium_expires_at', None) else None,
            created_at=user.created_at.isoformat(),
            email_verified=bool(user.email_verified_at)
        )
        
        return schemas.TokenResponse(
            user=user_data,
            expires_in=900  # 15 minutes in seconds
        )
        
    except Exception as e:
        # Clear cookies on error
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/auth")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Logout from current device"""
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        try:
            data = decode_refresh(refresh_token)
            jti = data.get("jti")
            revoke_refresh_token(jti)
            
            # Add this block to delete the session record
            if jti:
                db_session = db.query(models.UserSession).filter(
                    models.UserSession.token_id == jti
                ).first()
                if db_session:
                    db.delete(db_session)
                    db.commit()
        except Exception as e:
            # Already invalid, that's fine
            print(f"Error during logout: {e}")
    
    # Clear cookies regardless
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth")
    
    return schemas.MessageResponse(message="Logged out successfully")


@router.post("/logout_all", response_model=schemas.MessageResponse)
def logout_all(current_user: models.User = Depends(get_current_user)):
    """Logout from all devices"""
    revoke_all_user_tokens(str(current_user.id))
    return schemas.MessageResponse(message="Logged out from all devices")


@router.post("/send_verification", response_model=schemas.MessageResponse)
def send_verification_email(
    payload: schemas.EmailVerificationIn, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Send email verification email"""
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = email_limiter.check_rate_limit(f"verify:{ip_address}")
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many email requests",
            headers={"Retry-After": str(retry_after)}
        )
    
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        # Don't reveal if email exists
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
    """Verify email address with token"""
    user_id = verify_email_token(payload.token, "VERIFY")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Mark email as verified
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if user:
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()
    
    return schemas.MessageResponse(message="Email verified successfully")


@router.post("/password_reset_request", response_model=schemas.MessageResponse)
def password_reset_request(
    payload: schemas.PasswordResetRequestIn,
    request: Request,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = email_limiter.check_rate_limit(f"reset:{ip_address}")
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset requests",
            headers={"Retry-After": str(retry_after)}
        )
    
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        # Don't reveal if email exists
        return schemas.MessageResponse(message="If the email exists, a password reset link has been sent")

    try:
        reset_token = create_email_token(str(user.id), "RESET")
        email_service.send_password_reset_email(user.email, reset_token)
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

    return schemas.MessageResponse(message="Password reset email sent")


@router.post("/password_reset", response_model=schemas.MessageResponse)
def password_reset(payload: schemas.PasswordResetIn, db: Session = Depends(get_db)):
    """Reset password with token"""
    user_id = verify_email_token(payload.token, "RESET")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if user:
        user.password_hash = hash_password(payload.new_password)
        db.commit()
        
        # Revoke all refresh tokens for security
        revoke_all_user_tokens(user_id)

    return schemas.MessageResponse(message="Password reset successfully")


@router.get("/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """Get current user information including premium status"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_premium": getattr(current_user, 'is_premium', False),
        "premium_expires_at": current_user.premium_expires_at.isoformat() if getattr(current_user, 'premium_expires_at', None) else None,
        "created_at": current_user.created_at.isoformat(),
        "email_verified": bool(current_user.email_verified_at)
    }
