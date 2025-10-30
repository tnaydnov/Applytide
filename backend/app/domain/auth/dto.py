"""
Authentication domain Data Transfer Objects (DTOs).

This module defines data structures for transferring authentication data
between layers of the application. DTOs are used to:
- Transfer OAuth token data from repositories to services
- Transfer token data from services to API layers
- Structure authentication credentials

Classes:
- OAuthTokenDTO: OAuth token information with expiration tracking
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)

# Configuration constants
MAX_PROVIDER_LENGTH: int = 50  # Maximum provider name length
MAX_TOKEN_TYPE_LENGTH: int = 50  # Maximum token type length
MAX_SCOPE_LENGTH: int = 500  # Maximum scope string length


@dataclass
class OAuthTokenDTO:
    """
    OAuth token information with expiration tracking.
    
    This DTO represents OAuth tokens stored for external service
    integration (Google, LinkedIn, etc.) with refresh capabilities.
    
    Attributes:
        id: Unique token identifier (UUID)
        user_id: UUID of user who owns the token
        provider: OAuth provider name (google, linkedin, etc.)
        access_token: OAuth access token for API calls
        refresh_token: Optional refresh token for renewing access
        expires_at: Optional expiration timestamp for access token
        token_type: Optional token type (Bearer, etc.)
        scope: Optional granted permission scopes
        created_at: Timestamp when token was created
        updated_at: Optional timestamp when token was last updated
    
    Validation:
        - id, user_id must be valid UUIDs
        - provider, access_token must not be empty
        - expires_at, refresh_token, token_type, scope can be None
        - created_at must be valid datetime
    
    Examples:
        >>> token = OAuthTokenDTO(
        ...     id=uuid4(),
        ...     user_id=uuid4(),
        ...     provider="google",
        ...     access_token="ya29.xxx",
        ...     refresh_token="1//xxx",
        ...     expires_at=datetime.now() + timedelta(hours=1),
        ...     token_type="Bearer",
        ...     scope="calendar.readonly",
        ...     created_at=datetime.now()
        ... )
    
    Security Notes:
        - Tokens should be encrypted at rest
        - Access tokens should not be logged
        - Refresh tokens should be stored securely
    """
    id: UUID
    user_id: UUID
    provider: str
    access_token: str
    refresh_token: Optional[str]
    expires_at: Optional[datetime]
    token_type: Optional[str]
    scope: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    def __post_init__(self):
        """
        Validate DTO fields after initialization.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate UUID fields
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.user_id, UUID):
                raise ValueError(f"user_id must be UUID, got {type(self.user_id).__name__}")
            
            # Validate provider
            if not self.provider or not self.provider.strip():
                raise ValueError("provider must not be empty")
            
            if len(self.provider) > MAX_PROVIDER_LENGTH:
                logger.warning(
                    "OAuth provider name exceeds maximum length",
                    extra={
                        "token_id": str(self.id),
                        "provider_length": len(self.provider),
                        "max_length": MAX_PROVIDER_LENGTH
                    }
                )
                self.provider = self.provider[:MAX_PROVIDER_LENGTH]
            
            # Validate access_token
            if not self.access_token or not self.access_token.strip():
                raise ValueError("access_token must not be empty")
            
            # Validate token_type
            if self.token_type and len(self.token_type) > MAX_TOKEN_TYPE_LENGTH:
                logger.warning(
                    "Token type exceeds maximum length",
                    extra={
                        "token_id": str(self.id),
                        "token_type_length": len(self.token_type),
                        "max_length": MAX_TOKEN_TYPE_LENGTH
                    }
                )
                self.token_type = self.token_type[:MAX_TOKEN_TYPE_LENGTH]
            
            # Validate scope
            if self.scope and len(self.scope) > MAX_SCOPE_LENGTH:
                logger.warning(
                    "Token scope exceeds maximum length",
                    extra={
                        "token_id": str(self.id),
                        "scope_length": len(self.scope),
                        "max_length": MAX_SCOPE_LENGTH
                    }
                )
                self.scope = self.scope[:MAX_SCOPE_LENGTH]
            
            # Validate datetimes
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if self.updated_at is not None and not isinstance(self.updated_at, datetime):
                raise ValueError(f"updated_at must be datetime or None, got {type(self.updated_at).__name__}")
            
            if self.expires_at is not None and not isinstance(self.expires_at, datetime):
                raise ValueError(f"expires_at must be datetime or None, got {type(self.expires_at).__name__}")
            
            # Check if token is expired
            if self.expires_at and self.expires_at < datetime.now():
                logger.warning(
                    "OAuth token is expired",
                    extra={
                        "token_id": str(self.id),
                        "user_id": str(self.user_id),
                        "provider": self.provider,
                        "expires_at": self.expires_at.isoformat()
                    }
                )
            
            logger.debug(
                "OAuthTokenDTO validated successfully",
                extra={
                    "token_id": str(self.id),
                    "user_id": str(self.user_id),
                    "provider": self.provider,
                    "has_refresh_token": self.refresh_token is not None,
                    "expires_at": self.expires_at.isoformat() if self.expires_at else None
                }
            )
            
        except Exception as e:
            logger.error(
                "OAuthTokenDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "token_id": str(self.id) if isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """
        Convert DTO to dictionary for JSON serialization.
        
        Args:
            include_sensitive: If True, includes access_token and refresh_token.
                              Default False for security.
        
        Returns:
            Dict[str, Any]: Dictionary representation of token data
        
        Security:
            By default, sensitive tokens are excluded from serialization.
            Only include them when absolutely necessary and over secure channels.
        """
        try:
            result = {
                'id': str(self.id),
                'user_id': str(self.user_id),
                'provider': self.provider,
                'expires_at': self.expires_at.isoformat() if self.expires_at else None,
                'token_type': self.token_type,
                'scope': self.scope,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
            
            if include_sensitive:
                result['access_token'] = self.access_token
                result['refresh_token'] = self.refresh_token
                logger.warning(
                    "Sensitive token data included in serialization",
                    extra={
                        "token_id": str(self.id),
                        "provider": self.provider
                    }
                )
            
            return result
            
        except Exception as e:
            logger.error(
                "Error converting OAuthTokenDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "token_id": str(self.id)
                },
                exc_info=True
            )
            raise
    
    def is_expired(self) -> bool:
        """
        Check if access token is expired.
        
        Returns:
            bool: True if token is expired or expires_at is None, False otherwise
        """
        if self.expires_at is None:
            logger.debug(
                "Token has no expiration time",
                extra={"token_id": str(self.id), "provider": self.provider}
            )
            return False
        
        is_expired = self.expires_at < datetime.now()
        
        if is_expired:
            logger.info(
                "Token is expired",
                extra={
                    "token_id": str(self.id),
                    "provider": self.provider,
                    "expires_at": self.expires_at.isoformat()
                }
            )
        
        return is_expired


# Export all DTOs
__all__ = ['OAuthTokenDTO']
