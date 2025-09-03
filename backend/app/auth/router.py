import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from .schemas import (
    RegisterIn, LoginIn, TokenPairOut, RefreshIn, 
    EmailVerificationIn, PasswordResetRequestIn, PasswordResetIn, 
    VerifyEmailIn, MessageOut
)
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


@router.post("/register", response_model=TokenPairOut)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)):
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
    
    return TokenPairOut(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPairOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    # Check rate limit
    user_agent, ip_address = get_client_info(request)
    is_allowed, retry_after = login_limiter.check_rate_limit(ip_address)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
            headers={"Retry-After": str(retry_after)}
        )
    
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(str(user.id))
    refresh, _fam = create_refresh_token(str(user.id), user_agent=user_agent, ip_address=ip_address)
    return TokenPairOut(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPairOut)
def refresh(payload: RefreshIn, request: Request):
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
        data = decode_refresh(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")

    # Rotate: revoke current refresh token and issue new ones
    jti = data.get("jti")
    revoke_refresh_token(jti)

    user_id = data["sub"]
    family = data.get("fam")
    new_access = create_access_token(user_id)
    new_refresh, _ = create_refresh_token(user_id, family=family, user_agent=user_agent, ip_address=ip_address)

    return TokenPairOut(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", response_model=MessageOut)
def logout(payload: RefreshIn):
    """Logout from current device"""
    try:
        data = decode_refresh(payload.refresh_token)
        jti = data.get("jti")
        revoke_refresh_token(jti)
    except Exception:
        pass  # Already invalid, that's fine
    
    return MessageOut(message="Logged out successfully")


@router.post("/logout_all", response_model=MessageOut)
def logout_all(current_user: models.User = Depends(get_current_user)):
    """Logout from all devices"""
    revoke_all_user_tokens(str(current_user.id))
    return MessageOut(message="Logged out from all devices")


@router.post("/send_verification", response_model=MessageOut)
def send_verification_email(
    payload: EmailVerificationIn, 
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
        return MessageOut(message="If the email exists, a verification link has been sent")
    
    if user.email_verified_at:
        return MessageOut(message="Email is already verified")
    
    try:
        verification_token = create_email_token(str(user.id), "VERIFY")
        email_service.send_verification_email(user.email, verification_token)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return MessageOut(message="Verification email sent")


@router.post("/verify_email", response_model=MessageOut)
def verify_email(payload: VerifyEmailIn, db: Session = Depends(get_db)):
    """Verify email address with token"""
    user_id = verify_email_token(payload.token, "VERIFY")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Mark email as verified
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if user:
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()
    
    return MessageOut(message="Email verified successfully")


@router.post("/password_reset_request", response_model=MessageOut)
def password_reset_request(
    payload: PasswordResetRequestIn, 
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
        return MessageOut(message="If the email exists, a password reset link has been sent")
    
    try:
        reset_token = create_email_token(str(user.id), "RESET")
        email_service.send_password_reset_email(user.email, reset_token)
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return MessageOut(message="Password reset email sent")


@router.post("/password_reset", response_model=MessageOut)
def password_reset(payload: PasswordResetIn, db: Session = Depends(get_db)):
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
    
    return MessageOut(message="Password reset successfully")


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
