"""
OAuth Flow Operations Module

This module handles Google OAuth flow operations including authorization,
token exchange, user info retrieval, and complete login flow.
Split from google_oauth.py for better organization.

Features:
    - Authorization URL generation with CSRF protection
    - Authorization code exchange for tokens
    - User info retrieval from Google
    - Complete login flow (new and returning users)
    - Automatic token refresh on expiration
    - Legal agreement tracking for new users

Classes:
    - OAuthService: Main service class for OAuth operations

Author: ApplyTide Team
Last Updated: 2025-01-18
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

import requests
from requests.exceptions import RequestException, Timeout, ConnectionError as RequestsConnectionError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ...config import settings
from ...db import models
from ..logging import get_logger

# Import token management functions
from .oauth_tokens import (
    _save_oauth_token,
    _get_oauth_token,
    _token_is_valid,
)
from .google_urls import (
    GOOGLE_AUTH_URL,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
)

logger = get_logger(__name__)

# Configuration constants
HTTP_TIMEOUT_SECONDS: int = 15  # Timeout for Google API calls
USERINFO_TIMEOUT_SECONDS: int = 10  # Shorter timeout for user info
DEFAULT_TERMS_VERSION: str = "1.0"  # Current terms version


class OAuthService:
    """
    Google OAuth login + token lifecycle service.
    
    This class provides all OAuth operations for Google integration,
    including authorization, token exchange, refresh, and user info.
    
    Attributes:
        db: SQLAlchemy database session
    
    Thread Safety:
        - Not thread-safe (uses shared DB session)
        - Create one instance per request/async task
    """

    def __init__(self, db: Session):
        """
        Initialize OAuth service.
        
        Args:
            db: SQLAlchemy database session
        
        Raises:
            ValueError: If db is None
        """
        if db is None:
            logger.error("OAuthService initialized with None db session")
            raise ValueError("db session cannot be None")
        
        self.db = db
        
        logger.debug("OAuthService initialized")

    # ----- Authorization URL -----
    def get_google_authorization_url(self, state: str) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Args:
            state: Random state string for CSRF protection
        
        Returns:
            str: Full authorization URL to redirect user to
        
        Example:
            >>> service = OAuthService(db)
            >>> url = service.get_google_authorization_url(state="random123")
            >>> # Redirect user to URL
            >>> return RedirectResponse(url)
        
        Notes:
            - State parameter prevents CSRF attacks
            - access_type=offline requests refresh token
            - prompt=consent forces consent screen (ensures refresh token)
            - Scopes defined in settings.GOOGLE_SCOPES
        """
        if not state or not state.strip():
            logger.warning("get_google_authorization_url called with empty state")
            state = ""
        
        from urllib.parse import urlencode
        
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(settings.GOOGLE_SCOPES),
            "access_type": "offline",  # Request refresh token
            "prompt": "consent",  # Force consent to get refresh token
            "state": state,
        }
        
        url = GOOGLE_AUTH_URL + "?" + urlencode(params)
        
        logger.info(
            "Generated Google authorization URL",
            extra={
                "state": state[:20] if state else "",  # Log partial state
                "scopes": settings.GOOGLE_SCOPES,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI
            }
        )
        
        return url

    # ----- Token exchange + user info -----
    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access/refresh tokens.
        
        Args:
            code: Authorization code from Google OAuth callback
        
        Returns:
            Dict[str, Any]: Token response containing:
                - access_token (str): Access token for API calls
                - refresh_token (str): Refresh token (if offline access)
                - expires_in (int): Seconds until expiration
                - token_type (str): "Bearer"
                - scope (str): Granted scopes
        
        Raises:
            RuntimeError: If token exchange fails
            ValueError: If code is empty
            requests.Timeout: If request times out
            requests.RequestException: If network error occurs
        
        Example:
            >>> service = OAuthService(db)
            >>> token_data = service.exchange_code_for_token(code="4/0AY...")
            >>> print(f"Access token: {token_data['access_token']}")
        
        Notes:
            - Code can only be used once
            - Refresh token only provided on first authorization
            - Timeout set to 15 seconds
        """
        if not code or not code.strip():
            logger.error("exchange_code_for_token called with empty code")
            raise ValueError("Authorization code cannot be empty")
        
        payload = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }
        
        try:
            logger.debug(
                "Exchanging authorization code for token",
                extra={
                    "code_length": len(code),
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI
                }
            )
            
            r = requests.post(
                GOOGLE_TOKEN_URL, 
                data=payload, 
                timeout=HTTP_TIMEOUT_SECONDS
            )
            
            if r.status_code != 200:
                error_detail = r.text[:500]
                logger.error(
                    "Failed to exchange code for token",
                    extra={
                        "status_code": r.status_code,
                        "error_detail": error_detail
                    }
                )
                raise RuntimeError(f"Failed to get token (HTTP {r.status_code}): {error_detail}")
            
            token_data = r.json()
            
            logger.info(
                "Authorization code exchanged successfully",
                extra={
                    "has_refresh_token": bool(token_data.get("refresh_token")),
                    "expires_in": token_data.get("expires_in"),
                    "scope": token_data.get("scope")
                }
            )
            
            return token_data
            
        except Timeout as e:
            logger.error(
                "Timeout exchanging authorization code",
                extra={
                    "error": str(e),
                    "timeout_seconds": HTTP_TIMEOUT_SECONDS
                },
                exc_info=True
            )
            raise RuntimeError("Timeout connecting to Google OAuth") from e
        
        except RequestsConnectionError as e:
            logger.error(
                "Connection error exchanging authorization code",
                extra={"error": str(e)},
                exc_info=True
            )
            raise RuntimeError("Failed to connect to Google OAuth") from e
        
        except RequestException as e:
            logger.error(
                "Network error exchanging authorization code",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise RuntimeError("Network error during token exchange") from e
        
        except Exception as e:
            logger.error(
                "Unexpected error exchanging authorization code",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise

    def get_google_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieve user info from Google using access token.
        
        Args:
            access_token: Valid Google access token
        
        Returns:
            Dict[str, Any]: User info containing:
                - sub (str): Google user ID
                - email (str): User's email
                - name (str): User's full name
                - picture (str): Profile picture URL
                - email_verified (bool): Email verification status
        
        Raises:
            RuntimeError: If user info request fails
            ValueError: If access_token is empty
            requests.Timeout: If request times out
            requests.RequestException: If network error occurs
        
        Example:
            >>> service = OAuthService(db)
            >>> info = service.get_google_user_info(access_token="ya29...")
            >>> print(f"User: {info['name']} ({info['email']})")
        
        Notes:
            - Requires valid access token (not expired)
            - Timeout set to 10 seconds (shorter than token exchange)
        """
        if not access_token or not access_token.strip():
            logger.error("get_google_user_info called with empty access_token")
            raise ValueError("Access token cannot be empty")
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            logger.debug("Retrieving Google user info")
            
            r = requests.get(
                GOOGLE_USERINFO_URL, 
                headers=headers, 
                timeout=USERINFO_TIMEOUT_SECONDS
            )
            
            if r.status_code != 200:
                error_detail = r.text[:500]
                logger.error(
                    "Failed to get user info",
                    extra={
                        "status_code": r.status_code,
                        "error_detail": error_detail
                    }
                )
                raise RuntimeError(f"Failed to get user info (HTTP {r.status_code}): {error_detail}")
            
            user_info = r.json()
            
            logger.info(
                "Google user info retrieved successfully",
                extra={
                    "email": user_info.get("email"),
                    "email_verified": user_info.get("email_verified"),
                    "has_name": bool(user_info.get("name"))
                }
            )
            
            return user_info
            
        except Timeout as e:
            logger.error(
                "Timeout getting user info",
                extra={
                    "error": str(e),
                    "timeout_seconds": USERINFO_TIMEOUT_SECONDS
                },
                exc_info=True
            )
            raise RuntimeError("Timeout connecting to Google") from e
        
        except RequestsConnectionError as e:
            logger.error(
                "Connection error getting user info",
                extra={"error": str(e)},
                exc_info=True
            )
            raise RuntimeError("Failed to connect to Google") from e
        
        except RequestException as e:
            logger.error(
                "Network error getting user info",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise RuntimeError("Network error getting user info") from e
        
        except Exception as e:
            logger.error(
                "Unexpected error getting user info",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise

    # ----- High-level login flow -----
    def process_google_login(
        self, 
        code: str,
        legal_agreements: dict = None,
        ip_address: str = None
    ) -> Tuple[models.User, bool]:
        """
        Complete Google OAuth login flow (exchange code, get user info, create/update user).
        
        Args:
            code: Authorization code from Google OAuth callback
            legal_agreements: Optional dict with legal agreement flags (for new users)
            ip_address: Optional IP address for legal compliance tracking
        
        Returns:
            Tuple[models.User, bool]: (user, is_new)
                - user: User model (created or existing)
                - is_new: True if new user was created, False if existing
        
        Raises:
            RuntimeError: If token exchange or user info fails
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> service = OAuthService(db)
            >>> user, is_new = service.process_google_login(
            ...     code="4/0AY...",
            ...     legal_agreements={"terms": True, "privacy": True},
            ...     ip_address="192.168.1.1"
            ... )
            >>> if is_new:
            ...     print(f"Welcome new user: {user.email}")
            ... else:
            ...     print(f"Welcome back: {user.email}")
        
        Notes:
            - Creates new user if Google ID not found
            - Links existing email user if email matches
            - Marks email as verified for OAuth users
            - Tracks legal agreement acceptance for new users
            - Saves OAuth tokens to database
        """
        if not code or not code.strip():
            logger.error("process_google_login called with empty code")
            raise ValueError("Authorization code cannot be empty")
        
        try:
            # Exchange code for tokens
            token_data = self.exchange_code_for_token(code)
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error("Token exchange succeeded but no access_token in response")
                raise RuntimeError("No access token received from Google")
            
            # Get user info
            info = self.get_google_user_info(access_token)
            
            google_id = info.get("sub")
            email = info.get("email")
            name = info.get("name")
            
            if not google_id:
                logger.error("User info missing Google ID (sub)")
                raise RuntimeError("Invalid user info: missing Google ID")
            
            if not email:
                logger.error("User info missing email")
                raise RuntimeError("Invalid user info: missing email")
            
            # Find existing user by Google ID
            user = self.db.query(models.User).filter(
                models.User.google_id == google_id
            ).first()
            
            is_new = False

            if not user:
                # Check if user exists with same email
                user = self.db.query(models.User).filter(
                    models.User.email == email
                ).first()
                
                if user:
                    # Link existing email user to Google
                    logger.info(
                        "Linking existing user to Google account",
                        extra={
                            "user_id": str(user.id),
                            "email": email
                        }
                    )
                    
                    user.google_id = google_id
                    user.is_oauth_user = True
                    if not user.email_verified_at:
                        user.email_verified_at = datetime.now(timezone.utc)
                    self.db.commit()
                else:
                    # Create new user
                    is_new = True
                    now = datetime.now(timezone.utc)
                    
                    logger.info(
                        "Creating new user from Google login",
                        extra={
                            "email": email,
                            "has_legal_agreements": bool(legal_agreements)
                        }
                    )
                    
                    user = models.User(
                        id=uuid.uuid4(),
                        email=email,
                        full_name=name,
                        google_id=google_id,
                        is_oauth_user=True,
                        email_verified_at=now,
                        # Legal agreement tracking
                        terms_accepted_at=now if legal_agreements else None,
                        privacy_accepted_at=now if legal_agreements else None,
                        terms_version=DEFAULT_TERMS_VERSION if legal_agreements else None,
                        acceptance_ip=ip_address if legal_agreements else None,
                    )
                    self.db.add(user)
                    self.db.commit()
                    self.db.refresh(user)
                    
                    logger.info(
                        "New user created successfully",
                        extra={
                            "user_id": str(user.id),
                            "email": email
                        }
                    )

            # Save OAuth tokens
            _save_oauth_token(self.db, user.id, "google", token_data)
            
            logger.info(
                "Google login processed successfully",
                extra={
                    "user_id": str(user.id),
                    "email": email,
                    "is_new": is_new
                }
            )
            
            return user, is_new
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(
                "Database error processing Google login",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise
        
        except Exception as e:
            try:
                self.db.rollback()
            except Exception:
                pass
            logger.error(
                "Error processing Google login",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise

    # ----- Token lifecycle -----
    def refresh_google_token(self, user_id: uuid.UUID) -> Optional[str]:
        """
        Refresh expired Google access token using refresh token.
        
        Args:
            user_id: User's UUID
        
        Returns:
            Optional[str]: New access token, or None if refresh failed
        
        Notes:
            - Returns None if user has no refresh token
            - Returns None if refresh request fails
            - Updates token in database on success
            - Logs errors but doesn't raise exceptions
        
        Example:
            >>> service = OAuthService(db)
            >>> new_token = service.refresh_google_token(user_id)
            >>> if new_token:
            ...     print("Token refreshed successfully")
            ... else:
            ...     print("User needs to reconnect Google")
        """
        if not user_id:
            logger.error("refresh_google_token called with None user_id")
            return None
        
        try:
            tok = _get_oauth_token(self.db, user_id, "google")
            
            if not tok:
                logger.warning(
                    "refresh_google_token called but no token found",
                    extra={"user_id": str(user_id)}
                )
                return None
            
            if not tok.refresh_token:
                logger.warning(
                    "refresh_google_token called but no refresh token",
                    extra={"user_id": str(user_id)}
                )
                return None

            payload = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": tok.refresh_token,
                "grant_type": "refresh_token",
            }
            
            logger.debug(
                "Refreshing Google access token",
                extra={"user_id": str(user_id)}
            )
            
            r = requests.post(
                GOOGLE_TOKEN_URL, 
                data=payload, 
                timeout=HTTP_TIMEOUT_SECONDS
            )
            
            if r.status_code != 200:
                error_detail = r.text[:500]
                logger.error(
                    "Failed to refresh token",
                    extra={
                        "user_id": str(user_id),
                        "status_code": r.status_code,
                        "error_detail": error_detail
                    }
                )
                return None

            data = r.json()
            
            # Save new token
            _save_oauth_token(self.db, user_id, "google", data)
            
            new_access_token = data.get("access_token")
            
            logger.info(
                "Google token refreshed successfully",
                extra={
                    "user_id": str(user_id),
                    "expires_in": data.get("expires_in")
                }
            )
            
            return new_access_token
            
        except Timeout as e:
            logger.error(
                "Timeout refreshing token",
                extra={
                    "user_id": str(user_id),
                    "error": str(e)
                },
                exc_info=True
            )
            return None
        
        except RequestException as e:
            logger.error(
                "Network error refreshing token",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None
        
        except Exception as e:
            logger.error(
                "Unexpected error refreshing token",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None

    def get_valid_google_access_token(self, user_id: uuid.UUID) -> Optional[str]:
        """
        Get valid Google access token (automatically refreshes if expired).
        
        Args:
            user_id: User's UUID
        
        Returns:
            Optional[str]: Valid access token, or None if:
                - User not connected to Google
                - Token expired and no refresh token
                - Refresh failed
        
        Example:
            >>> service = OAuthService(db)
            >>> token = service.get_valid_google_access_token(user_id)
            >>> if token:
            ...     # Make Google API call with token
            ...     pass
            ... else:
            ...     # User needs to reconnect Google
            ...     pass
        
        Notes:
            - This is the main method to use for getting tokens
            - Handles expiration and refresh automatically
            - Returns None instead of raising exceptions
            - Use 5-minute buffer before expiration
        """
        if not user_id:
            logger.warning("get_valid_google_access_token called with None user_id")
            return None
        
        try:
            tok = _get_oauth_token(self.db, user_id, "google")
            
            if not tok:
                logger.debug(
                    "No Google token found for user",
                    extra={"user_id": str(user_id)}
                )
                return None
            
            # Check if token is still valid
            if _token_is_valid(tok):
                logger.debug(
                    "Returning valid cached token",
                    extra={"user_id": str(user_id)}
                )
                return tok.access_token
            
            # Token expired - try to refresh
            if tok.refresh_token:
                logger.debug(
                    "Token expired, attempting refresh",
                    extra={"user_id": str(user_id)}
                )
                return self.refresh_google_token(user_id)
            
            # No refresh token available
            logger.warning(
                "Token expired and no refresh token available",
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


# Export all public classes
__all__ = ['OAuthService']
