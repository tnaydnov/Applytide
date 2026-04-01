"""
Logout Endpoints

Handles user logout operations:
- Single device logout (revoke current session tokens)
- All devices logout (revoke all user tokens)
- Token revocation (access + refresh)
- Cookie clearing

All logout operations are logged for security auditing.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from .....db.session import get_db
from .....db import models
from .....api.deps import get_current_user
from .....api.schemas import auth as schemas
from .....infra.security.tokens import (
    decode_access,
    decode_refresh,
    revoke_refresh_token,
    revoke_all_user_tokens,
    revoke_jti
)
from .....infra.logging import get_logger
from .....infra.logging.business_logger import BusinessEventLogger
from ..utils import get_client_info

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(
    request: Request, 
    response: Response, 
    db: Session = Depends(get_db)
):
    """
    Logout user from current device.
    
    Performs single-device logout by:
    1. Revoking refresh token (Redis + database)
    2. Blacklisting current access token
    3. Clearing authentication cookies
    
    No authentication required (graceful logout for expired sessions).
    
    Cookies Used:
        access_token: Current access token (optional)
        refresh_token: Current refresh token (optional)
        
    Args:
        request: FastAPI request for cookie extraction
        response: FastAPI response for cookie clearing
        db: Database session (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Logged out successfully"
            Cookies cleared: access_token, refresh_token
            
    Raises:
        None - Graceful logout even on errors
        
    Security:
        - No authentication required (logout can't fail)
        - Token revocation prevents reuse
        - Database-backed refresh token revocation
        - Redis-backed access token blacklist
        - Audit logging: User ID logged if available
        
    Notes:
        - Works even with expired/invalid tokens
        - Only logs out current device
        - For all-device logout use /logout_all
        - Tokens revoked immediately
        - User ID extracted from tokens (no dependency)
        
    Example:
        POST /api/auth/logout
        Cookies: access_token, refresh_token
        Returns: {"message": "Logged out successfully"}
        Clears all authentication cookies
    """
    user_id = None
    user_agent, ip_address = get_client_info(request)
    
    try:
        logger.debug(
            "Logout initiated",
            extra={"ip_address": ip_address}
        )
        
        # Revoke refresh token
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            try:
                data = decode_refresh(refresh_token)
                user_id = data.get("sub")
                jti = data.get("jti")
                
                # Revoke in Redis
                revoke_refresh_token(jti)
                
                # Also mark as revoked in database for audit trail
                if jti:
                    db_token = db.query(models.RefreshToken).filter(
                        models.RefreshToken.jti == jti
                    ).first()
                    if db_token:
                        db_token.revoked_at = datetime.now(timezone.utc)
                        db.commit()
                        
                logger.debug(
                    "Refresh token revoked during logout",
                    extra={
                        "user_id": user_id, 
                        "ip_address": ip_address,
                        "jti": jti[:10] if jti else None
                    }
                )
            except Exception as e:
                db.rollback()
                logger.warning(
                    "Error revoking refresh token during logout",
                    extra={
                        "error": str(e), 
                        "ip_address": ip_address
                    }
                )
                # Continue with logout even if revocation fails

        # Revoke access token (blacklist in Redis)
        access_token = request.cookies.get("access_token")
        if access_token:
            try:
                data = decode_access(access_token)
                if not user_id:
                    user_id = data.get("sub")
                
                # Calculate remaining TTL for blacklist
                remaining = max(0, int(
                    data["exp"] - int(datetime.now(timezone.utc).timestamp())
                ))
                jti = data.get("jti")
                
                # Blacklist only if token still valid
                if jti and remaining > 0:
                    revoke_jti(jti, remaining)
                    logger.debug(
                        "Access token revoked during logout",
                        extra={
                            "user_id": user_id, 
                            "ip_address": ip_address,
                            "jti": jti[:10] if jti else None,
                            "ttl_seconds": remaining
                        }
                    )
            except Exception as e:
                logger.warning(
                    "Error revoking access token during logout",
                    extra={
                        "error": str(e), 
                        "ip_address": ip_address
                    }
                )
                # Continue with logout even if revocation fails

        # Clear authentication cookies
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        
        logger.debug(
            "Authentication cookies cleared",
            extra={"ip_address": ip_address}
        )
        
        # Log business event
        if user_id:
            event_logger.log_logout(user_id=user_id)
            logger.info(
                "User logged out successfully",
                extra={
                    "user_id": user_id, 
                    "ip_address": ip_address
                }
            )
        else:
            logger.info(
                "Logout completed (user unknown - expired tokens)",
                extra={"ip_address": ip_address}
            )
        
        return schemas.MessageResponse(message="Logged out successfully")
    
    except Exception as e:
        logger.error(
            "Unexpected error during logout",
            extra={
                "ip_address": ip_address,
                "error": str(e)
            },
            exc_info=True
        )
        # Still clear cookies and return success (graceful logout)
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        return schemas.MessageResponse(message="Logged out successfully")


@router.post("/logout_all", response_model=schemas.MessageResponse)
def logout_all(
    request: Request,
    response: Response,
    current_user: models.User = Depends(get_current_user)
):
    """
    Logout user from all devices.
    
    Performs global logout by:
    1. Revoking ALL user's refresh tokens (Redis)
    2. Blacklisting current access token (Redis)
    3. Clearing current device cookies
    
    Requires authentication (unlike single logout).
    
    Args:
        request: FastAPI request for cookie extraction
        response: FastAPI response for cookie clearing
        current_user: Authenticated user (from dependency)
        
    Returns:
        MessageResponse: Success confirmation with:
            - message: "Logged out from all devices"
            Cookies cleared: access_token, refresh_token
            
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 500 if token revocation fails
        
    Security:
        Requires user authentication
        Revokes all refresh token families globally
        Blacklists current access token
        Forces re-login on all devices
        Audit logging: All-device logout event
        
    Notes:
        - **GLOBAL LOGOUT** - affects ALL user devices
        - Forces re-authentication everywhere
        - Current device logged out immediately
        - Other devices logged out on next token refresh
        - Use for: security incidents, password changes
        - Use single /logout for normal logout
        
    Example:
        POST /api/auth/logout_all
        Headers: Cookie: access_token=<valid>
        Returns: {"message": "Logged out from all devices"}
        Effect: All devices require re-login
    """
    try:
        logger.info(
            "Global logout initiated",
            extra={
                "user_id": str(current_user.id),
                "email": current_user.email
            }
        )
        
        # Revoke all refresh tokens from Redis
        try:
            revoke_all_user_tokens(str(current_user.id))
            logger.debug(
                "All refresh tokens revoked",
                extra={"user_id": str(current_user.id)}
            )
        except Exception as e:
            logger.error(
                "Failed to revoke all refresh tokens",
                extra={
                    "user_id": str(current_user.id),
                    "error": str(e)
                },
                exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to logout from all devices. Please try again."
            )
        
        # Blacklist current access token for immediate logout
        access_token = request.cookies.get("access_token")
        if access_token:
            try:
                data = decode_access(access_token)
                remaining = max(0, int(
                    data["exp"] - int(datetime.now(timezone.utc).timestamp())
                ))
                jti = data.get("jti")
                
                if jti and remaining > 0:
                    revoke_jti(jti, remaining)
                    logger.debug(
                        "Current access token blacklisted during logout_all",
                        extra={
                            "user_id": str(current_user.id),
                            "jti": jti[:10] if jti else None
                        }
                    )
            except Exception as e:
                logger.warning(
                    "Error blacklisting current access token",
                    extra={
                        "user_id": str(current_user.id),
                        "error": str(e)
                    }
                )
                # Continue with logout
        
        # Clear cookies for current session
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/api/auth")
        
        logger.info(
            "User logged out from all devices successfully",
            extra={
                "user_id": str(current_user.id), 
                "email": current_user.email
            }
        )
        
        return schemas.MessageResponse(message="Logged out from all devices")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error during global logout",
            extra={
                "user_id": str(current_user.id), 
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout from all devices. Please try again."
        )
