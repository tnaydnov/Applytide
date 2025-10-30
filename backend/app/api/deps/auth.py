"""
Authentication Dependencies Module

Provides comprehensive authentication dependencies for securing API endpoints.
Handles JWT token validation, user lookup, and optional authentication flows.

Key Features:
- Dual token sources (Cookie and Bearer header)
- JWT validation with expiration checking
- Redis-based token blacklist for logout
- User existence validation
- Optional authentication for public endpoints
- Comprehensive error handling and logging

Security:
- Token validation against blacklist (revoked tokens)
- UUID validation prevents injection attacks
- Database lookup ensures user still exists
- No sensitive data in error responses
- Audit logging for security monitoring

Token Flow:
    1. Extract token from cookie or Authorization header
    2. Decode and validate JWT signature
    3. Check token against Redis blacklist
    4. Extract and validate user UUID
    5. Lookup user in database
    6. Return authenticated user

Dependencies:
- FastAPI for dependency injection
- SQLAlchemy for database queries
- JWT handling via infra.security.tokens
- Redis cache for token blacklist

Usage:
    @router.get("/profile")
    def get_profile(user: User = Depends(get_current_user)):
        return user.profile
    
    @router.get("/public")
    def public_endpoint(user: User | None = Depends(get_current_user_optional)):
        # Works for both authenticated and anonymous users
        if user:
            return personalized_response(user)
        return generic_response()
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Cookie, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db import models
from ...infra.security.tokens import decode_access
from ...infra.security.passwords import verify_password
from ...infra.cache.service import CacheService, get_cache_service
from ...infra.logging import get_logger

security = HTTPBearer(auto_error=False)
logger = get_logger(__name__)

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    access_token: str | None = Cookie(None),
    authorization: HTTPAuthorizationCredentials | None = Depends(security),
) -> models.User:
    """
    Get current authenticated user from token in cookie or header (Bearer).
    
    Primary authentication dependency for protected endpoints. Validates JWT token
    from multiple sources and returns authenticated user from database.
    
    Args:
        request: FastAPI Request object for additional context
        db: Database session for user lookup
        access_token: JWT token from cookie (optional)
        authorization: Authorization header with Bearer token (optional)
    
    Returns:
        User: Authenticated user object from database
    
    Raises:
        HTTPException: 401 Unauthorized if:
            - No token provided (cookie or header)
            - Invalid token signature or format
            - Token expired or blacklisted
            - Invalid or missing user_id claim
            - User not found in database
            - Authorization scheme not "Bearer"
    
    Token Priority:
        1. Cookie (access_token) - preferred for web applications
        2. Authorization header (Bearer) - for API clients
    
    Security:
        - Checks Redis blacklist for revoked tokens
        - Validates JWT signature and expiration
        - UUID validation prevents injection
        - User existence verified in database
        - No user data in error messages
        - Comprehensive audit logging
    
    Performance:
        - Token validation includes Redis call (fast)
        - Single database query for user lookup
        - Logs at appropriate levels (debug/warning/error)
    
    Example:
        @router.get("/api/profile")
        async def get_profile(
            user: User = Depends(get_current_user)
        ):
            return {"email": user.email, "name": user.name}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Extract token from cookie or Authorization header
    token = access_token
    if not token and authorization:
        scheme = (authorization.scheme or "").lower()
        if scheme != "bearer":
            logger.warning(
                "Invalid authorization scheme",
                extra={
                    "scheme": scheme,
                    "expected": "bearer",
                    "path": request.url.path
                }
            )
            raise credentials_exception
        token = authorization.credentials

    if not token:
        logger.debug(
            "No authentication token provided",
            extra={"path": request.url.path}
        )
        raise credentials_exception

    try:
        # Decode and validate token (includes blacklist check)
        logger.debug("Decoding access token")
        payload = decode_access(token)  # already checks Redis blacklist + type
        
        user_id = payload.get("sub")
        if not user_id:
            logger.warning(
                "Token missing user ID claim",
                extra={"path": request.url.path}
            )
            raise credentials_exception
        
        # Validate and convert user_id to UUID
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                logger.warning(
                    "Invalid UUID format in token",
                    extra={
                        "user_id": user_id,
                        "path": request.url.path
                    }
                )
                raise credentials_exception
                
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping
        raise
    except Exception as e:
        logger.error(
            "Token validation failed",
            extra={
                "error": str(e),
                "path": request.url.path
            },
            exc_info=True
        )
        raise credentials_exception

    # Lookup user in database
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            logger.warning(
                "User not found for valid token",
                extra={
                    "user_id": str(user_id),
                    "path": request.url.path
                }
            )
            raise credentials_exception
        
        logger.debug(
            "User authenticated successfully",
            extra={
                "user_id": str(user.id),
                "user_email": user.email,
                "path": request.url.path
            }
        )
        
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping
        raise
    except Exception as e:
        logger.error(
            "Database error during user lookup",
            extra={
                "user_id": str(user_id),
                "error": str(e),
                "path": request.url.path
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable"
        )


async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
    access_token: str | None = Cookie(None),
    authorization: HTTPAuthorizationCredentials | None = Depends(security),
) -> models.User | None:
    """
    Get current authenticated user from token (optional).
    
    Returns None if not authenticated instead of raising exception. Useful for
    endpoints that provide different functionality for authenticated vs anonymous users.
    
    Args:
        request: FastAPI Request object for additional context
        db: Database session for user lookup
        access_token: JWT token from cookie (optional)
        authorization: Authorization header with Bearer token (optional)
    
    Returns:
        User | None: Authenticated user object or None if not authenticated
    
    Raises:
        Does not raise exceptions - returns None for any authentication failure
    
    Notes:
        - Never raises HTTPException (graceful degradation)
        - Returns None for: missing token, invalid token, expired token, user not found
        - All authentication errors logged but silently handled
        - Useful for endpoints with optional personalization
        - Still validates tokens when provided (security maintained)
    
    Use Cases:
        - Homepage with optional personalized content
        - Public endpoints with enhanced features for logged-in users
        - Search endpoints accessible to all but with user preferences
        - Content that shows differently based on authentication status
    
    Security:
        - Still validates tokens (no security bypass)
        - Checks blacklist for revoked tokens
        - Validates user existence in database
        - Logs suspicious activity for monitoring
        - No credential details in logs
    
    Example:
        @router.get("/api/jobs/public")
        async def list_public_jobs(
            user: User | None = Depends(get_current_user_optional)
        ):
            if user:
                # Show personalized recommendations
                return get_personalized_jobs(user.id)
            else:
                # Show generic trending jobs
                return get_trending_jobs()
    """
    # Extract token from cookie or Authorization header
    token = access_token
    if not token and authorization:
        scheme = (authorization.scheme or "").lower()
        if scheme == "bearer":
            token = authorization.credentials
        else:
            logger.debug(
                "Invalid authorization scheme for optional auth",
                extra={
                    "scheme": scheme,
                    "path": request.url.path
                }
            )

    if not token:
        logger.debug(
            "No token provided for optional authentication",
            extra={"path": request.url.path}
        )
        return None

    try:
        # Decode and validate token
        logger.debug("Attempting optional authentication")
        payload = decode_access(token)
        
        user_id = payload.get("sub")
        if not user_id:
            logger.debug(
                "Token missing user ID for optional auth",
                extra={"path": request.url.path}
            )
            return None
        
        # Validate and convert user_id to UUID
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                logger.debug(
                    "Invalid UUID in optional auth token",
                    extra={
                        "user_id": user_id,
                        "path": request.url.path
                    }
                )
                return None
                
    except Exception as e:
        logger.debug(
            "Token validation failed for optional auth",
            extra={
                "error": str(e),
                "path": request.url.path
            }
        )
        return None

    # Lookup user in database
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            logger.debug(
                "User not found for optional auth token",
                extra={
                    "user_id": str(user_id),
                    "path": request.url.path
                }
            )
            return None
        
        logger.debug(
            "Optional authentication successful",
            extra={
                "user_id": str(user.id),
                "user_email": user.email,
                "path": request.url.path
            }
        )
        
        return user
        
    except Exception as e:
        logger.error(
            "Database error during optional auth",
            extra={
                "user_id": str(user_id) if user_id else None,
                "error": str(e),
                "path": request.url.path
            },
            exc_info=True
        )
        # Return None on database error (graceful degradation)
        return None
