from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Cookie, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db import models
from ..infra.security.tokens import decode_access
from ..infra.security.passwords import verify_password
from ..infra.cache.service import CacheService, get_cache_service

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    access_token: str | None = Cookie(None),
    authorization: HTTPAuthorizationCredentials | None = Depends(security),
) -> models.User:
    """Get current authenticated user from token in cookie or header (Bearer)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = access_token
    if not token and authorization:
        scheme = (authorization.scheme or "").lower()
        if scheme != "bearer":
            raise credentials_exception
        token = authorization.credentials

    if not token:
        raise credentials_exception

    try:
        payload = decode_access(token)  # already checks Redis blacklist + type
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise credentials_exception

    return user


async def get_admin_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """Ensure the current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ==================== STEP-UP AUTHENTICATION ====================
# For sensitive operations, require recent password verification

STEP_UP_EXPIRY_MINUTES = 5  # Step-up lasts 5 minutes


async def verify_step_up(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    cache: CacheService = Depends(get_cache_service)
) -> models.User:
    """
    Verify that user has recently re-authenticated (step-up auth).
    
    Step-up authentication requires users to verify their password
    before performing sensitive operations like changing admin status.
    The verification is cached for 5 minutes.
    
    Raises:
        HTTPException: 403 if step-up verification is not present or expired
    """
    cache_key = f"step_up:{current_user.id}"
    step_up_time = await cache.get(cache_key)
    
    if not step_up_time:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Step-up authentication required. Please verify your password."
        )
    
    # Check if step-up is still valid (within 5 minutes)
    try:
        verified_at = datetime.fromisoformat(step_up_time)
        if datetime.utcnow() - verified_at > timedelta(minutes=STEP_UP_EXPIRY_MINUTES):
            await cache.delete(cache_key)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Step-up authentication expired. Please verify your password again."
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid step-up token. Please verify your password."
        )
    
    return current_user


async def get_admin_user_with_step_up(
    current_user: models.User = Depends(verify_step_up)
) -> models.User:
    """
    Ensure user is admin AND has recently verified password (step-up).
    
    Use this dependency for highly sensitive operations like:
    - Changing admin status
    - Deleting users
    - Purging audit logs
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
