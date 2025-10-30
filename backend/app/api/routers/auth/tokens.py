"""
Token Generation Endpoints

Generates special-purpose authentication tokens for:
- Browser extension authentication (long-lived access tokens)
- WebSocket connection authentication (short-lived tickets)

These endpoints require user authentication and return tokens that
bypass the standard cookie-based authentication flow.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....api.deps import get_current_user
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
    """
    Generate access token for browser extension.
    
    Creates a standard access token for use in the browser extension.
    Extension uses this token for API authentication instead of cookies.
    Token has same TTL as regular access tokens (15 minutes).
    
    Args:
        current_user: Authenticated user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        ExtensionTokenOut: Token response with:
            - access_token: JWT access token string
            Valid for 15 minutes
            
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 500 if token generation fails
        
    Security:
        Requires user authentication via cookies
        Returns standard JWT access token
        Token has 15-minute expiration
        Use for: browser extension Bearer authentication
        
    Notes:
        - Extension stores token in chrome.storage
        - Token refreshed via extension's refresh flow
        - Same token format as cookie-based auth
        - Use in Authorization header: Bearer <token>
        
    Example:
        POST /api/auth/extension-token
        Headers: Cookie: access_token=<valid>
        Returns: {"access_token": "eyJ..."}
    """
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
    Create short-lived token for WebSocket authentication.
    
    Generates a JWT access token specifically for WebSocket connection
    authentication. Token should be used immediately to establish WS
    connection before expiration.
    
    Args:
        current_user: Authenticated user (from dependency)
        
    Returns:
        dict: Token response with:
            - token: JWT access token string
            Valid for 15 minutes (use immediately)
            
    Raises:
        HTTPException: 401 if not authenticated or token generation fails
        
    Security:
        Requires user authentication via cookies
        Frontend auto-refreshes if access cookie stale
        Token valid for 15 minutes (same as access token)
        Use immediately for WS connection
        
    Notes:
        - Frontend calls this before WebSocket connect
        - Token sent as query param or first WS message
        - Server validates JWT on WebSocket handshake
        - Use for: real-time notifications, live updates
        - Short TTL recommended for security (5-15 min)
        
    Example:
        POST /api/auth/ws-ticket
        Headers: Cookie: access_token=<valid>
        Returns: {"token": "eyJ..."}
        Usage: ws://api/ws?token=eyJ...
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
