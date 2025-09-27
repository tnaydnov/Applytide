from __future__ import annotations
import uuid
from fastapi import Depends, HTTPException, status, Cookie, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db import models
from ..infra.security.tokens import decode_access

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
