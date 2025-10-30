"""
OAuth Token Management Module

This module handles OAuth token storage, validation, and lifecycle management.
Split from google_oauth.py for better organization.

Features:
    - Token expiration calculation with buffer
    - Token persistence to database
    - Token validation with expiration checking
    - Automatic token refresh when expired
    - Convenience function for getting valid tokens

Functions:
    - _calc_expires_at: Calculate token expiration datetime
    - _save_oauth_token: Save/update token in database
    - _get_oauth_token: Retrieve token from database
    - _token_is_valid: Check if token is still valid
    - get_valid_google_token: Get valid token with auto-refresh

Author: ApplyTide Team
Last Updated: 2025-01-18
"""

from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ...db import models
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants (shared with oauth_flow.py)
TOKEN_EXPIRY_BUFFER_MINUTES: int = 5  # Refresh tokens 5 min before expiry


def _calc_expires_at(token_data: Dict[str, Any]) -> Optional[datetime]:
    """
    Calculate token expiration datetime from token response.
    
    Args:
        token_data: Token response dict from Google OAuth
    
    Returns:
        Optional[datetime]: UTC expiration datetime, or None if no expires_in
    
    Example:
        >>> token = {"access_token": "...", "expires_in": 3600}
        >>> expires = _calc_expires_at(token)
        >>> print(expires)  # ~1 hour from now
    
    Notes:
        - Uses UTC timezone for consistency
        - Returns None if expires_in missing or invalid
        - Logs warnings for invalid expires_in values
    """
    expires_in = token_data.get("expires_in")
    
    if expires_in is None:
        logger.warning(
            "Token data missing expires_in",
            extra={"token_keys": list(token_data.keys())}
        )
        return None
    
    # Validate expires_in is a positive integer
    try:
        expires_in = int(expires_in)
    except (ValueError, TypeError) as e:
        logger.error(
            "Invalid expires_in type",
            extra={
                "expires_in": expires_in,
                "expires_in_type": type(expires_in).__name__,
                "error": str(e)
            }
        )
        return None
    
    if expires_in <= 0:
        logger.warning(
            "Invalid expires_in value (non-positive)",
            extra={"expires_in": expires_in}
        )
        return None
    
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    logger.debug(
        "Calculated token expiration",
        extra={
            "expires_in_seconds": expires_in,
            "expires_at": expires_at.isoformat()
        }
    )
    
    return expires_at


def _save_oauth_token(
    db: Session,
    user_id: uuid.UUID,
    provider: str,
    token_data: Dict[str, Any]
) -> models.OAuthToken:
    """
    Save or update OAuth token in database.
    
    Args:
        db: Database session
        user_id: User UUID
        provider: OAuth provider name (e.g., "google")
        token_data: Token response from OAuth provider
    
    Returns:
        models.OAuthToken: Saved token model
    
    Raises:
        ValueError: If required parameters missing or invalid
        IntegrityError: If database constraint violated
        SQLAlchemyError: If database operation fails
    
    Example:
        >>> token_data = {
        ...     "access_token": "ya29...",
        ...     "refresh_token": "1//...",
        ...     "expires_in": 3600
        ... }
        >>> token = _save_oauth_token(db, user.id, "google", token_data)
        >>> print(token.access_token)
    
    Notes:
        - Updates existing token if found (upsert behavior)
        - Creates new token if not found
        - Validates all required fields before saving
        - Logs all operations for audit trail
    """
    # Validate inputs
    if not user_id:
        logger.error("_save_oauth_token called with empty user_id")
        raise ValueError("user_id cannot be empty")
    
    if not provider or not provider.strip():
        logger.error("_save_oauth_token called with empty provider")
        raise ValueError("provider cannot be empty")
    
    if not token_data:
        logger.error("_save_oauth_token called with empty token_data")
        raise ValueError("token_data cannot be empty")
    
    access_token = token_data.get("access_token")
    if not access_token:
        logger.error(
            "token_data missing access_token",
            extra={"token_keys": list(token_data.keys())}
        )
        raise ValueError("token_data must contain access_token")
    
    # Calculate expiration
    expires_at = _calc_expires_at(token_data)
    
    logger.debug(
        "Saving OAuth token",
        extra={
            "user_id": str(user_id),
            "provider": provider,
            "has_refresh_token": "refresh_token" in token_data,
            "expires_at": expires_at.isoformat() if expires_at else None
        }
    )
    
    try:
        # Try to find existing token (upsert pattern)
        existing = (
            db.query(models.OAuthToken)
            .filter_by(user_id=user_id, provider=provider)
            .first()
        )
        
        if existing:
            # Update existing token
            logger.debug(
                "Updating existing OAuth token",
                extra={
                    "user_id": str(user_id),
                    "provider": provider,
                    "token_id": str(existing.id)
                }
            )
            
            existing.access_token = access_token
            existing.refresh_token = token_data.get("refresh_token") or existing.refresh_token
            existing.token_type = token_data.get("token_type", "Bearer")
            existing.scope = token_data.get("scope", "")
            existing.expires_at = expires_at
            existing.updated_at = datetime.now(timezone.utc)
            
            token_model = existing
        else:
            # Create new token
            logger.debug(
                "Creating new OAuth token",
                extra={
                    "user_id": str(user_id),
                    "provider": provider
                }
            )
            
            token_model = models.OAuthToken(
                id=uuid.uuid4(),
                user_id=user_id,
                provider=provider,
                access_token=access_token,
                refresh_token=token_data.get("refresh_token"),
                token_type=token_data.get("token_type", "Bearer"),
                scope=token_data.get("scope", ""),
                expires_at=expires_at,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(token_model)
        
        db.commit()
        db.refresh(token_model)
        
        logger.info(
            "OAuth token saved successfully",
            extra={
                "user_id": str(user_id),
                "provider": provider,
                "token_id": str(token_model.id),
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        )
        
        return token_model
        
    except IntegrityError as e:
        db.rollback()
        logger.error(
            "Database integrity error saving OAuth token",
            extra={
                "user_id": str(user_id),
                "provider": provider,
                "error": str(e)
            },
            exc_info=True
        )
        raise
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(
            "Database error saving OAuth token",
            extra={
                "user_id": str(user_id),
                "provider": provider,
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        raise


def _get_oauth_token(
    db: Session,
    user_id: uuid.UUID,
    provider: str
) -> Optional[models.OAuthToken]:
    """
    Retrieve OAuth token from database.
    
    Args:
        db: Database session
        user_id: User UUID
        provider: OAuth provider name (e.g., "google")
    
    Returns:
        Optional[models.OAuthToken]: Token model if found, None otherwise
    
    Raises:
        ValueError: If required parameters missing
        SQLAlchemyError: If database query fails
    
    Example:
        >>> token = _get_oauth_token(db, user.id, "google")
        >>> if token:
        ...     print(token.access_token)
    
    Notes:
        - Returns None if token not found (not an error)
        - Does NOT validate token expiration (use _token_is_valid)
        - Logs all queries for audit trail
    """
    # Validate inputs
    if not user_id:
        logger.error("_get_oauth_token called with empty user_id")
        raise ValueError("user_id cannot be empty")
    
    if not provider or not provider.strip():
        logger.error("_get_oauth_token called with empty provider")
        raise ValueError("provider cannot be empty")
    
    logger.debug(
        "Retrieving OAuth token",
        extra={
            "user_id": str(user_id),
            "provider": provider
        }
    )
    
    try:
        token = (
            db.query(models.OAuthToken)
            .filter_by(user_id=user_id, provider=provider)
            .first()
        )
        
        if token:
            logger.debug(
                "OAuth token found",
                extra={
                    "user_id": str(user_id),
                    "provider": provider,
                    "token_id": str(token.id),
                    "expires_at": token.expires_at.isoformat() if token.expires_at else None
                }
            )
        else:
            logger.debug(
                "OAuth token not found",
                extra={
                    "user_id": str(user_id),
                    "provider": provider
                }
            )
        
        return token
        
    except SQLAlchemyError as e:
        logger.error(
            "Database error retrieving OAuth token",
            extra={
                "user_id": str(user_id),
                "provider": provider,
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        raise


def _token_is_valid(tok: models.OAuthToken) -> bool:
    """
    Check if OAuth token is still valid (not expired).
    
    Args:
        tok: OAuth token model
    
    Returns:
        bool: True if token is valid, False if expired or no expiration
    
    Example:
        >>> token = _get_oauth_token(db, user.id, "google")
        >>> if token and _token_is_valid(token):
        ...     print("Token is valid!")
        >>> else:
        ...     print("Token expired, need to refresh")
    
    Notes:
        - Uses 5-minute buffer (TOKEN_EXPIRY_BUFFER_MINUTES)
        - Buffer prevents race conditions and API failures
        - Returns False if expires_at is None (conservative)
        - All comparisons use UTC timezone
    """
    if not tok:
        logger.warning("_token_is_valid called with None token")
        return False
    
    if not tok.expires_at:
        logger.debug(
            "Token has no expiration time, treating as invalid",
            extra={"token_id": str(tok.id)}
        )
        return False
    
    # Add 5-minute buffer: consider token expired if it expires within 5 minutes
    # This prevents race conditions where token expires during API call
    buffer = timedelta(minutes=TOKEN_EXPIRY_BUFFER_MINUTES)
    now = datetime.now(timezone.utc)
    expiry_with_buffer = tok.expires_at - buffer
    
    is_valid = now < expiry_with_buffer
    
    logger.debug(
        "Token validity checked",
        extra={
            "token_id": str(tok.id),
            "is_valid": is_valid,
            "expires_at": tok.expires_at.isoformat(),
            "now": now.isoformat(),
            "expiry_with_buffer": expiry_with_buffer.isoformat(),
            "buffer_minutes": TOKEN_EXPIRY_BUFFER_MINUTES
        }
    )
    
    return is_valid


def get_valid_google_token(db: Session, user_id: uuid.UUID) -> Optional[str]:
    """
    Get valid Google access token, refreshing if needed.
    
    This is a convenience function that combines token retrieval,
    validation, and automatic refresh in one call.
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        Optional[str]: Valid access token, or None if unavailable/refresh failed
    
    Example:
        >>> token = get_valid_google_token(db, user.id)
        >>> if token:
        ...     # Use token for Google API call
        ...     headers = {"Authorization": f"Bearer {token}"}
        ...     response = requests.get(url, headers=headers)
    
    Notes:
        - Automatically refreshes expired tokens
        - Returns None if no token exists or refresh fails
        - Safe to call frequently (checks expiration first)
        - Requires OAuthService from oauth_flow module for refresh
    """
    if not user_id:
        logger.error("get_valid_google_token called with empty user_id")
        return None
    
    logger.debug(
        "Getting valid Google token",
        extra={"user_id": str(user_id)}
    )
    
    try:
        # Get token from database
        token = _get_oauth_token(db, user_id, "google")
        if not token:
            logger.debug(
                "No Google token found for user",
                extra={"user_id": str(user_id)}
            )
            return None
        
        # Check if token is still valid
        if _token_is_valid(token):
            logger.debug(
                "Token is valid, returning",
                extra={
                    "user_id": str(user_id),
                    "token_id": str(token.id)
                }
            )
            return token.access_token
        
        # Token expired, try to refresh
        logger.info(
            "Token expired, attempting refresh",
            extra={
                "user_id": str(user_id),
                "token_id": str(token.id)
            }
        )
        
        # Import here to avoid circular dependency
        from .oauth_flow import OAuthService
        
        service = OAuthService(db)
        new_token = service.refresh_google_token(user_id)
        
        if new_token:
            logger.info(
                "Token refreshed successfully",
                extra={
                    "user_id": str(user_id),
                    "new_token_id": str(new_token.id)
                }
            )
            return new_token.access_token
        else:
            logger.warning(
                "Token refresh failed",
                extra={"user_id": str(user_id)}
            )
            return None
            
    except Exception as e:
        logger.error(
            "Error getting valid Google token",
            extra={
                "user_id": str(user_id),
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return None


# Export all public functions
__all__ = [
    '_calc_expires_at',
    '_save_oauth_token',
    '_get_oauth_token',
    '_token_is_valid',
    'get_valid_google_token',
    'TOKEN_EXPIRY_BUFFER_MINUTES',
]
