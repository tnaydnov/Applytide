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
from ....infra.security.ws_tickets import create_ws_ticket as _create_ws_ticket
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


@router.post("/ws-ticket", response_model=schemas.WsTicketResponse)
def ws_ticket_endpoint(
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a single-use, short-lived WebSocket authentication ticket.

    The ticket is an opaque token stored in Redis with a 30-second TTL.
    It is consumed (deleted) on first use by the WebSocket handshake,
    preventing replay attacks.  Unlike the previous implementation that
    returned a full JWT, the ticket never leaks long-lived credentials
    into query strings, server logs, or browser history.

    Returns:
        dict: ``{"token": "<opaque ticket>"}``

    Raises:
        HTTPException 401: Not authenticated
        HTTPException 503: Redis unavailable
    """
    try:
        ticket = _create_ws_ticket(current_user.id)
        return {"token": ticket}
    except Exception as e:
        logger.error(
            "Failed to create WebSocket ticket",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create WS ticket",
        )
