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
        
        if user_id is None:
            raise credentials_exception
            
        # Convert string to UUID if needed
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise credentials_exception

        # Optional enhanced session checking (only for new tokens with JTI)
        jti = payload.get("jti")
        if jti:  
            try:
                # Check if refresh token exists and is valid
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                rt = db.query(models.RefreshToken).filter(
                    models.RefreshToken.jti == jti,
                    models.RefreshToken.revoked_at.is_(None),
                    models.RefreshToken.expires_at > now,
                ).first()
                
                # If refresh token exists, check user session and touch last_seen
                if rt:
                    us = db.query(models.UserSession).filter(
                        models.UserSession.refresh_token_jti == jti,
                        models.UserSession.is_active == True,
                    ).first()
                    
                    if us:
                        # Touch last_seen_at for active sessions
                        us.last_seen_at = now
                        db.commit()
                    # If user session doesn't exist, that's ok - might be old session
                elif rt is None:
                    # Only fail if refresh token was explicitly revoked
                    revoked_rt = db.query(models.RefreshToken).filter(
                        models.RefreshToken.jti == jti,
                        models.RefreshToken.revoked_at.is_not(None),
                    ).first()
                    if revoked_rt:
                        raise HTTPException(
                            status_code=401, 
                            detail="Session revoked",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
            except HTTPException:
                raise
            except Exception as e:
                # Don't fail on session check errors - just log them
                print(f"Session check error (non-fatal): {e}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Token decode error: {e}")
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    return user
