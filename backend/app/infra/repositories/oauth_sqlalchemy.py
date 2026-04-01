"""
OAuth Token SQLAlchemy Repository Module

This module provides SQLAlchemy-based repository implementation for OAuth
token storage and retrieval operations.

Features:
    - Token upsert (insert or update) with atomic operations
    - Token expiration calculation and validation
    - Safe token retrieval with error handling
    - Comprehensive logging for OAuth operations
    - Transaction management with automatic commit/rollback

Implements IOAuthTokenRepo port for domain layer.

Constants:
    EXPIRY_SAFETY_BUFFER: Safety buffer for token expiry (5 minutes)
    MAX_PROVIDER_LENGTH: Maximum provider name length (100 characters)
    MAX_TOKEN_LENGTH: Maximum token string length (10KB)

Example:
    >>> from app.infra.repositories.oauth_sqlalchemy import OAuthTokenSQLARepo
    >>> 
    >>> repo = OAuthTokenSQLARepo(db_session)
    >>> repo.upsert_token(
    ...     user_id=user_uuid,
    ...     provider="google",
    ...     token_data={"access_token": "abc...", "expires_in": 3600}
    ... )
    >>> token = repo.get_token(user_id=user_uuid, provider="google")
    >>> is_valid = repo.token_is_valid(token)
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ...db import models
from ...domain.auth.ports import IOAuthTokenRepo

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class OAuthTokenRepositoryError(Exception):
    """Base exception for OAuth token repository operations"""
    pass

class DatabaseOperationError(OAuthTokenRepositoryError):
    """Exception raised when database operation fails"""
    pass

class ValidationError(OAuthTokenRepositoryError):
    """Exception raised when input validation fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# Token expiry settings
EXPIRY_SAFETY_BUFFER = timedelta(minutes=5)  # 5-minute safety buffer for token expiry

# Validation limits
MAX_PROVIDER_LENGTH = 100
MAX_TOKEN_LENGTH = 10240  # 10KB

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_user_id(user_id: UUID) -> None:
    """Validate user ID parameter."""
    if not isinstance(user_id, UUID):
        raise ValidationError(f"user_id must be UUID, got {type(user_id).__name__}")

def _validate_provider(provider: str) -> None:
    """Validate provider parameter."""
    if not isinstance(provider, str):
        raise ValidationError(f"provider must be string, got {type(provider).__name__}")
    
    if not provider or not provider.strip():
        raise ValidationError("provider cannot be empty")
    
    if len(provider) > MAX_PROVIDER_LENGTH:
        raise ValidationError(
            f"provider too long ({len(provider)} chars, max {MAX_PROVIDER_LENGTH})"
        )

def _validate_token_data(token_data: Dict[str, Any]) -> None:
    """Validate token data dictionary."""
    if not isinstance(token_data, dict):
        raise ValidationError(f"token_data must be dict, got {type(token_data).__name__}")
    
    # Check for required fields
    if "access_token" not in token_data:
        raise ValidationError("token_data must contain 'access_token'")
    
    # Validate token lengths
    for key in ("access_token", "refresh_token"):
        if key in token_data:
            token_val = token_data[key]
            if token_val and len(str(token_val)) > MAX_TOKEN_LENGTH:
                raise ValidationError(
                    f"{key} too long ({len(str(token_val))} chars, max {MAX_TOKEN_LENGTH})"
                )

# ============================================================================
# Repository Implementation
# ============================================================================

class OAuthTokenSQLARepo(IOAuthTokenRepo):
    """
    SQLAlchemy repository for OAuth token operations.
    
    Provides upsert, retrieval, and validation operations for OAuth tokens
    with comprehensive error handling and logging.
    """
    
    def __init__(self, db: Session):
        """
        Initialize repository with database session.
        
        Args:
            db: SQLAlchemy session
            
        Raises:
            ValidationError: If db is not a Session
        """
        if not isinstance(db, Session):
            raise ValidationError(f"db must be SQLAlchemy Session, got {type(db).__name__}")
        
        self.db = db
        logger.debug("Initialized OAuthTokenSQLARepo")
    
    def upsert_token(
        self,
        *,
        user_id: UUID,
        provider: str,
        token_data: Dict[str, Any]
    ) -> None:
        """
        Insert or update OAuth token for user and provider.
        
        If token exists, updates it. If not, creates new token.
        Automatically commits transaction.
        
        Args:
            user_id: User UUID
            provider: OAuth provider name (e.g., "google", "github")
            token_data: Dictionary with token fields:
                - access_token (required): OAuth access token
                - refresh_token (optional): OAuth refresh token
                - expires_in (optional): Expiry time in seconds
                - token_type (optional): Token type (e.g., "Bearer")
                - scope (optional): Token scope string
                
        Raises:
            ValidationError: If parameters are invalid
            DatabaseOperationError: If database operation fails
            
        Example:
            >>> repo = OAuthTokenSQLARepo(db)
            >>> repo.upsert_token(
            ...     user_id=user_uuid,
            ...     provider="google",
            ...     token_data={
            ...         "access_token": "ya29.a0...",
            ...         "refresh_token": "1//0g...",
            ...         "expires_in": 3600,
            ...         "token_type": "Bearer",
            ...         "scope": "email profile"
            ...     }
            ... )
            
        Notes:
            - Automatically calculates expires_at from expires_in
            - Preserves existing refresh_token if not in new token_data
            - Uses timezone-aware UTC timestamps
            - Commits transaction automatically (no manual commit needed)
        """
        try:
            # Validate inputs
            _validate_user_id(user_id)
            _validate_provider(provider)
            _validate_token_data(token_data)
            
            logger.debug(
                "Upserting OAuth token",
                extra={
                    "user_id": str(user_id),
                    "provider": provider,
                    "has_refresh_token": "refresh_token" in token_data,
                    "has_expiry": "expires_in" in token_data,
                }
            )
            
            # Find existing token
            try:
                rec = self.db.query(models.OAuthToken).filter(
                    models.OAuthToken.user_id == user_id,
                    models.OAuthToken.provider == provider,
                ).first()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query existing token",
                    exc_info=True,
                    extra={
                        "user_id": str(user_id),
                        "provider": provider,
                        "error": str(e),
                    }
                )
                raise DatabaseOperationError(f"Token query failed: {e}") from e
            
            # Calculate expires_at from expires_in
            expires_at = None
            expires_in = token_data.get("expires_in")
            if expires_in:
                try:
                    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
                except (ValueError, TypeError) as e:
                    logger.warning(
                        "Invalid expires_in value, ignoring",
                        extra={
                            "expires_in": expires_in,
                            "error": str(e),
                        }
                    )
            
            # Update or create token
            try:
                if rec:
                    # Update existing token
                    rec.access_token = token_data.get("access_token")
                    
                    # Only update refresh_token if provided (preserve existing)
                    if token_data.get("refresh_token"):
                        rec.refresh_token = token_data.get("refresh_token")
                    
                    rec.expires_at = expires_at
                    rec.token_type = token_data.get("token_type")
                    rec.scope = token_data.get("scope")
                    rec.updated_at = datetime.now(timezone.utc)
                    
                    logger.info(
                        "Updated OAuth token",
                        extra={
                            "user_id": str(user_id),
                            "provider": provider,
                            "has_expiry": expires_at is not None,
                        }
                    )
                else:
                    # Create new token
                    rec = models.OAuthToken(
                        user_id=user_id,
                        provider=provider,
                        access_token=token_data.get("access_token"),
                        refresh_token=token_data.get("refresh_token"),
                        expires_at=expires_at,
                        token_type=token_data.get("token_type"),
                        scope=token_data.get("scope"),
                    )
                    self.db.add(rec)
                    
                    logger.info(
                        "Created OAuth token",
                        extra={
                            "user_id": str(user_id),
                            "provider": provider,
                            "has_expiry": expires_at is not None,
                        }
                    )
                
                # Commit transaction
                self.db.commit()
                
            except SQLAlchemyError as e:
                # Rollback on error
                self.db.rollback()
                logger.error(
                    "Failed to upsert token, rolled back",
                    exc_info=True,
                    extra={
                        "user_id": str(user_id),
                        "provider": provider,
                        "error": str(e),
                    }
                )
                raise DatabaseOperationError(f"Token upsert failed: {e}") from e
            
        except (ValidationError, DatabaseOperationError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in upsert_token",
                exc_info=True,
                extra={
                    "user_id": str(user_id) if isinstance(user_id, UUID) else None,
                    "provider": provider if isinstance(provider, str) else None,
                    "error": str(e),
                }
            )
            raise DatabaseOperationError(f"Token upsert failed: {e}") from e
    
    def get_token(
        self,
        *,
        user_id: UUID,
        provider: str
    ) -> Optional[models.OAuthToken]:
        """
        Retrieve OAuth token for user and provider.
        
        Args:
            user_id: User UUID
            provider: OAuth provider name
            
        Returns:
            OAuthToken model instance or None if not found
            
        Raises:
            ValidationError: If parameters are invalid
            DatabaseOperationError: If database query fails
            
        Example:
            >>> repo = OAuthTokenSQLARepo(db)
            >>> token = repo.get_token(user_id=user_uuid, provider="google")
            >>> if token:
            ...     print(token.access_token[:10])
            ya29.a0...
            
        Notes:
            - Returns None if token not found (doesn't raise)
            - Does not validate token expiry (use token_is_valid() for that)
        """
        try:
            # Validate inputs
            _validate_user_id(user_id)
            _validate_provider(provider)
            
            logger.debug(
                "Retrieving OAuth token",
                extra={
                    "user_id": str(user_id),
                    "provider": provider,
                }
            )
            
            # Query token
            try:
                token = self.db.query(models.OAuthToken).filter(
                    models.OAuthToken.user_id == user_id,
                    models.OAuthToken.provider == provider,
                ).first()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query token",
                    exc_info=True,
                    extra={
                        "user_id": str(user_id),
                        "provider": provider,
                        "error": str(e),
                    }
                )
                raise DatabaseOperationError(f"Token query failed: {e}") from e
            
            if token:
                logger.info(
                    "Token found",
                    extra={
                        "user_id": str(user_id),
                        "provider": provider,
                        "has_refresh_token": bool(token.refresh_token),
                        "has_expiry": bool(token.expires_at),
                    }
                )
            else:
                logger.debug(
                    "Token not found",
                    extra={
                        "user_id": str(user_id),
                        "provider": provider,
                    }
                )
            
            return token
            
        except (ValidationError, DatabaseOperationError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in get_token",
                exc_info=True,
                extra={
                    "user_id": str(user_id) if isinstance(user_id, UUID) else None,
                    "provider": provider if isinstance(provider, str) else None,
                    "error": str(e),
                }
            )
            raise DatabaseOperationError(f"Token retrieval failed: {e}") from e
    
    def token_is_valid(self, token_obj: models.OAuthToken) -> bool:
        """
        Check if token is valid (not expired).
        
        Args:
            token_obj: OAuthToken model instance to check
            
        Returns:
            True if token is valid and not expired, False otherwise
            
        Example:
            >>> repo = OAuthTokenSQLARepo(db)
            >>> token = repo.get_token(user_id=user_uuid, provider="google")
            >>> if repo.token_is_valid(token):
            ...     # Use token
            ...     pass
            ... else:
            ...     # Refresh token
            ...     pass
            
        Notes:
            - Returns False if token_obj is None
            - Returns False if expires_at is None (no expiry info)
            - Uses EXPIRY_SAFETY_BUFFER (5 minutes) for safety margin
            - Token considered expired if expires within safety buffer
        """
        try:
            if not token_obj:
                logger.debug("Token is None, returning False")
                return False
            
            if not token_obj.expires_at:
                logger.debug("Token has no expiry timestamp, returning False")
                return False
            
            # Check expiry with safety buffer
            now = datetime.now(timezone.utc)
            expiry_threshold = now + EXPIRY_SAFETY_BUFFER
            is_valid = token_obj.expires_at > expiry_threshold
            
            logger.debug(
                "Token validity checked",
                extra={
                    "is_valid": is_valid,
                    "expires_at": token_obj.expires_at.isoformat(),
                    "now": now.isoformat(),
                    "safety_buffer_seconds": EXPIRY_SAFETY_BUFFER.total_seconds(),
                }
            )
            
            return is_valid
            
        except Exception as e:
            # Log error and return False (safe default)
            logger.error(
                "Error checking token validity, returning False",
                exc_info=True,
                extra={"error": str(e)}
            )
            return False

    def delete_token(self, *, user_id: UUID, provider: str) -> bool:
        """
        Delete OAuth token for user and provider (disconnect).

        Args:
            user_id: User UUID
            provider: OAuth provider name (e.g., "google")

        Returns:
            True if a token was deleted, False if none existed
        """
        try:
            _validate_user_id(user_id)
            _validate_provider(provider)

            token = (
                self.db.query(models.OAuthToken)
                .filter(
                    models.OAuthToken.user_id == user_id,
                    models.OAuthToken.provider == provider,
                )
                .first()
            )

            if not token:
                logger.info(
                    "No OAuth token to delete",
                    extra={"user_id": str(user_id), "provider": provider},
                )
                return False

            self.db.delete(token)
            self.db.commit()

            logger.info(
                "OAuth token deleted (disconnect)",
                extra={"user_id": str(user_id), "provider": provider},
            )
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(
                "Failed to delete OAuth token",
                exc_info=True,
                extra={"user_id": str(user_id), "provider": provider, "error": str(e)},
            )
            raise DatabaseOperationError(f"Token deletion failed: {e}") from e
