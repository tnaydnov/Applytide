"""
Token generation endpoints for browser extensions and WebSocket authentication.
Extracted from api.routers.auth during refactoring.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....api.deps_auth import get_current_user
from ....api.schemas import auth as schemas
from ....infra.security.tokens import create_access_token
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/extension-token", response_model=schemas.ExtensionTokenOut)
async def get_extension_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate extension token for browser extension authentication."""
    try:
        logger.info(
            "Extension token requested",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        access_token = create_access_token(str(current_user.id))
        
        logger.debug(
            "Extension token generated successfully",
            extra={"user_id": str(current_user.id)}
        )
        
        return schemas.ExtensionTokenOut(access_token=access_token)
    
    except Exception as e:
        logger.error(
            "Failed to generate extension token",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate extension token"
        )


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
        logger.info(
            "WebSocket ticket requested",
            extra={"user_id": str(current_user.id), "email": current_user.email}
        )
        
        # If your helper supports expires_delta, prefer a short TTL:
        token = create_access_token(str(current_user.id))  # or: expires_delta=timedelta(minutes=5)
        
        logger.debug(
            "WebSocket ticket created successfully",
            extra={"user_id": str(current_user.id)}
        )
        
        return {"token": token}
    
    except Exception as e:
        logger.error(
            "Failed to create WebSocket ticket",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to create WS ticket"
        )
