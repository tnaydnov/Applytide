import uuid
from fastapi import Depends, HTTPException, status, Cookie, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from ..db.session import get_db
from typing import Optional, Union
from ..db import models
from .tokens import decode_access

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(None),  # Try cookie first
    authorization: Optional[str] = Depends(security)  # Fallback to header
) -> models.User:
    """Get current authenticated user from token in cookie or header"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # First try cookie
    token = access_token
    
    # If no cookie, try header
    if not token and authorization:
        scheme, param = authorization.scheme.lower(), authorization.credentials
        if scheme != "bearer":
            raise credentials_exception
        token = param
    
    if not token:
        raise credentials_exception
        
    try:
        payload = decode_access(token)
        user_id = payload.get("sub")
        jti = payload.get("jti")
        
        if user_id is None or jti is None:
            raise credentials_exception
            
        # Convert string to UUID if needed
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise credentials_exception

        # Strict session validation for new system
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Must have a valid refresh token
        rt = db.query(models.RefreshToken).filter(
            models.RefreshToken.jti == jti,
            models.RefreshToken.revoked_at.is_(None),
            models.RefreshToken.expires_at > now,
        ).first()
        
        if not rt:
            raise HTTPException(
                status_code=401, 
                detail="Session expired or revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Must have an active user session
        us = db.query(models.UserSession).filter(
            models.UserSession.refresh_token_jti == jti,
            models.UserSession.is_active == True,
        ).first()
        
        if not us:
            raise HTTPException(
                status_code=401, 
                detail="Session revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Touch last_seen_at on every authenticated request
        us.last_seen_at = now
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Token decode error: {e}")
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    return user
