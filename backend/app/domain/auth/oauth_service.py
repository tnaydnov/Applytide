"""
OAuth Service - Google OAuth 2.0 Authentication

Handles Google OAuth authentication flow including:
- Authorization URL generation
- Token exchange (code for access/refresh tokens)
- User info retrieval
- Token refresh and validation
- User account creation and linking

Security Considerations:
- Always validate state parameter to prevent CSRF attacks
- Store tokens securely in database
- Use HTTPS for all OAuth endpoints
- Validate redirect URIs
- Implement token rotation for refresh tokens

OAuth Flow:
1. Generate authorization URL with state parameter
2. User authorizes with Google
3. Exchange authorization code for tokens
4. Retrieve user info from Google
5. Create or link user account
6. Store tokens for future API access

Example:
    # Generate auth URL
    auth_url = service.google_authorization_url(state="random-state")
    
    # After callback
    user, is_new = service.process_google_login(code="auth-code")
    
    # Get valid token (auto-refreshes if expired)
    token = service.get_valid_google_access_token(user_id=user.id)
"""
from __future__ import annotations
from typing import Dict, Any, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timezone
from urllib.parse import urlencode
import time
import re

from .ports import IOAuthTokenRepo, IHTTPClient, ISettings
from ...db import models  # reuse your ORM models for user lookups
from app.infra.logging import get_logger

logger = get_logger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds
BACKOFF_MULTIPLIER = 2.0

class OAuthError(Exception):
    """Base exception for OAuth operations."""
    pass

class OAuthConfigError(OAuthError):
    """Raised when OAuth configuration is invalid."""
    pass

class OAuthTokenError(OAuthError):
    """Raised when token exchange or refresh fails."""
    pass

class OAuthUserInfoError(OAuthError):
    """Raised when user info retrieval fails."""
    pass

class OAuthValidationError(OAuthError):
    """Raised when input validation fails."""
    pass



class OAuthService:
    """
    Service for handling Google OAuth 2.0 authentication flows.
    
    Manages the complete OAuth lifecycle including authorization,
    token exchange, user info retrieval, and token refresh.
    """
    
    def __init__(self, *, token_repo: IOAuthTokenRepo, http: IHTTPClient, settings: ISettings, db):
        """
        Initialize OAuth service with required dependencies.
        
        Args:
            token_repo: Repository for storing OAuth tokens
            http: HTTP client for API requests
            settings: Application settings with OAuth config
            db: Database session for user operations
        
        Raises:
            OAuthConfigError: If required OAuth configuration is missing
        """
        try:
            # Validate dependencies
            if not all([token_repo, http, settings, db]):
                logger.error("OAuthService initialized with None dependencies")
                raise ValueError("All dependencies must be provided")
            
            self.token_repo = token_repo
            self.http = http
            self.settings = settings
            self.db = db
            
            # Validate OAuth configuration
            self._validate_config()
            
            logger.debug("OAuthService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OAuthService: {e}", exc_info=True)
            raise

    def _validate_config(self) -> None:
        """
        Validate OAuth configuration settings.
        
        Raises:
            OAuthConfigError: If required settings are missing or invalid
        """
        try:
            required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GOOGLE_SCOPES"]
            missing = []
            
            for setting in required:
                if not getattr(self.settings, setting, None):
                    missing.append(setting)
            
            if missing:
                logger.error(f"Missing OAuth configuration: {missing}")
                raise OAuthConfigError(f"Missing required OAuth settings: {', '.join(missing)}")
            
            # Validate redirect URI format
            redirect_uri = self.settings.GOOGLE_REDIRECT_URI
            if not redirect_uri.startswith(("http://", "https://")):
                logger.error(f"Invalid redirect URI format: {redirect_uri}")
                raise OAuthConfigError("Redirect URI must start with http:// or https://")
            
            # Validate scopes
            if not isinstance(self.settings.GOOGLE_SCOPES, (list, tuple)) or not self.settings.GOOGLE_SCOPES:
                logger.error(f"Invalid GOOGLE_SCOPES: {self.settings.GOOGLE_SCOPES}")
                raise OAuthConfigError("GOOGLE_SCOPES must be a non-empty list")
            
            logger.debug("OAuth configuration validated successfully")
            
        except OAuthConfigError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error validating OAuth config: {e}", exc_info=True)
            raise OAuthConfigError(f"Configuration validation failed: {e}")

    def _validate_state(self, state: str) -> None:
        """
        Validate state parameter for CSRF protection.
        
        Args:
            state: State parameter to validate
        
        Raises:
            OAuthValidationError: If state is invalid
        """
        if not state or not isinstance(state, str):
            logger.warning(f"Invalid state parameter: {state}")
            raise OAuthValidationError("state must be a non-empty string")
        
        if len(state) < 8:
            logger.warning(f"State parameter too short: {len(state)} characters")
            raise OAuthValidationError("state must be at least 8 characters")
        
        if len(state) > 500:
            logger.warning(f"State parameter too long: {len(state)} characters")
            raise OAuthValidationError("state must be 500 characters or less")

    def _validate_email(self, email: str) -> None:
        """
        Validate email format.
        
        Args:
            email: Email address to validate
        
        Raises:
            OAuthValidationError: If email format is invalid
        """
        if not email or not isinstance(email, str):
            raise OAuthValidationError("email must be a non-empty string")
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            logger.warning(f"Invalid email format: {email}")
            raise OAuthValidationError(f"Invalid email format: {email}")

    def _retry_request(self, func, *args, **kwargs):
        """
        Retry a request with exponential backoff.
        
        Args:
            func: Function to retry
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
        
        Returns:
            Result from successful function call
        
        Raises:
            Exception: If all retries fail
        """
        last_error = None
        delay = RETRY_DELAY
        
        for attempt in range(MAX_RETRIES):
            try:
                logger.debug(f"Request attempt {attempt + 1}/{MAX_RETRIES}")
                return func(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:
                    logger.warning(
                        f"Request failed (attempt {attempt + 1}/{MAX_RETRIES}), "
                        f"retrying in {delay}s: {e}"
                    )
                    time.sleep(delay)
                    delay *= BACKOFF_MULTIPLIER
                else:
                    logger.error(
                        f"Request failed after {MAX_RETRIES} attempts: {e}",
                        exc_info=True
                    )
        
        raise last_error

    # ---------- Google auth URL ----------
    def google_authorization_url(self, state: str) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Creates the URL users visit to authorize the application. Include
        a unique state parameter for CSRF protection.
        
        Args:
            state: Random state parameter for CSRF protection (min 8 chars)
        
        Returns:
            Complete authorization URL
        
        Raises:
            OAuthValidationError: If state parameter is invalid
            OAuthConfigError: If OAuth configuration is invalid
        
        Example:
            state = secrets.token_urlsafe(32)
            auth_url = service.google_authorization_url(state=state)
            # Store state in session for verification
        
        Security:
            - MUST validate state parameter on callback
            - State should be cryptographically random
            - Store state in session, not client-side
        """
        try:
            logger.debug(f"Generating Google authorization URL with state length: {len(state)}")
            
            # Validate state parameter
            self._validate_state(state)
            
            params = {
                "client_id": self.settings.GOOGLE_CLIENT_ID,
                "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": " ".join(self.settings.GOOGLE_SCOPES),
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
            }
            
            auth_url = GOOGLE_AUTH_URL + "?" + urlencode(params)
            
            logger.info(
                "Generated Google authorization URL",
                extra={
                    "scopes": len(self.settings.GOOGLE_SCOPES),
                    "redirect_uri": self.settings.GOOGLE_REDIRECT_URI
                }
            )
            
            return auth_url
            
        except OAuthValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to generate authorization URL: {e}", exc_info=True)
            raise OAuthConfigError(f"Failed to generate authorization URL: {e}")

    # ---------- Google token exchange ----------
    def exchange_google_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens.
        
        Exchanges the authorization code received from Google's OAuth callback
        for access and refresh tokens. Includes retry logic for network failures.
        
        Args:
            code: Authorization code from OAuth callback
        
        Returns:
            Token data including access_token, refresh_token, expires_in, etc.
        
        Raises:
            OAuthValidationError: If code is invalid
            OAuthTokenError: If token exchange fails
        
        Example:
            token_data = service.exchange_google_code_for_token(code="4/...")
            access_token = token_data["access_token"]
        """
        try:
            # Validate code
            if not code or not isinstance(code, str):
                logger.warning("Invalid authorization code provided")
                raise OAuthValidationError("code must be a non-empty string")
            
            if len(code) > 2000:
                logger.warning(f"Authorization code too long: {len(code)} characters")
                raise OAuthValidationError("code is invalid (too long)")
            
            logger.debug("Exchanging authorization code for tokens")
            
            payload = {
                "client_id": self.settings.GOOGLE_CLIENT_ID,
                "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
            }
            
            def make_request():
                r = self.http.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
                status = getattr(r, "status_code", 200)
                
                if status != 200:
                    error_text = getattr(r, "text", str(r))
                    logger.error(
                        f"Token exchange failed with status {status}",
                        extra={"status_code": status, "error": error_text}
                    )
                    raise OAuthTokenError(f"Token exchange failed (status {status}): {error_text}")
                
                return r.json()
            
            token_data = self._retry_request(make_request)
            
            # Validate token response
            if not isinstance(token_data, dict) or "access_token" not in token_data:
                logger.error(f"Invalid token response structure: {list(token_data.keys() if isinstance(token_data, dict) else [])}")
                raise OAuthTokenError("Invalid token response from Google")
            
            logger.info(
                "Successfully exchanged code for tokens",
                extra={
                    "has_refresh_token": "refresh_token" in token_data,
                    "expires_in": token_data.get("expires_in")
                }
            )
            
            return token_data
            
        except (OAuthValidationError, OAuthTokenError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error exchanging code for token: {e}", exc_info=True)
            raise OAuthTokenError(f"Failed to exchange code for token: {e}")

    def google_userinfo(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieve user information from Google using access token.
        
        Fetches the authenticated user's profile information including
        email, name, and Google ID. Includes retry logic for network failures.
        
        Args:
            access_token: Valid Google access token
        
        Returns:
            User info dict with fields: sub (Google ID), email, name, picture, etc.
        
        Raises:
            OAuthValidationError: If access_token is invalid
            OAuthUserInfoError: If user info retrieval fails
        
        Example:
            info = service.google_userinfo(access_token="ya29...")
            email = info["email"]
            google_id = info["sub"]
        """
        try:
            # Validate access token
            if not access_token or not isinstance(access_token, str):
                logger.warning("Invalid access token provided")
                raise OAuthValidationError("access_token must be a non-empty string")
            
            if len(access_token) > 2048:
                logger.warning(f"Access token too long: {len(access_token)} characters")
                raise OAuthValidationError("access_token is invalid (too long)")
            
            logger.debug("Fetching user info from Google")
            
            def make_request():
                headers = {"Authorization": f"Bearer {access_token}"}
                r = self.http.get(GOOGLE_USERINFO_URL, headers=headers, timeout=10)
                status = getattr(r, "status_code", 200)
                
                if status != 200:
                    error_text = getattr(r, "text", str(r))
                    logger.error(
                        f"User info retrieval failed with status {status}",
                        extra={"status_code": status, "error": error_text}
                    )
                    raise OAuthUserInfoError(f"User info retrieval failed (status {status}): {error_text}")
                
                return r.json()
            
            user_info = self._retry_request(make_request)
            
            # Validate response structure
            required_fields = ["sub", "email"]
            missing = [f for f in required_fields if f not in user_info]
            if missing:
                logger.error(f"Missing required fields in user info: {missing}")
                raise OAuthUserInfoError(f"Invalid user info response: missing {missing}")
            
            # Validate email format
            self._validate_email(user_info["email"])
            
            logger.info(
                "Successfully retrieved user info",
                extra={
                    "google_id": user_info["sub"],
                    "email": user_info["email"],
                    "verified": user_info.get("email_verified", False)
                }
            )
            
            return user_info
            
        except (OAuthValidationError, OAuthUserInfoError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error retrieving user info: {e}", exc_info=True)
            raise OAuthUserInfoError(f"Failed to retrieve user info: {e}")

    # ---------- Login / link / create ----------
    def process_google_login(self, *, code: str) -> Tuple[models.User, bool]:
        """
        Process Google OAuth login flow.
        
        Complete OAuth flow: exchange code for tokens, retrieve user info,
        create or link user account, and store tokens. Handles:
        - New user creation
        - Linking Google account to existing email
        - Existing OAuth user login
        
        Args:
            code: Authorization code from OAuth callback
        
        Returns:
            Tuple of (User model instance, is_new_user boolean)
        
        Raises:
            OAuthValidationError: If code is invalid
            OAuthTokenError: If token exchange fails
            OAuthUserInfoError: If user info retrieval fails
            OAuthError: If user creation/update fails
        
        Example:
            user, is_new = service.process_google_login(code="4/...")
            if is_new:
                # Send welcome email
                pass
        """
        try:
            logger.debug("Processing Google login flow")
            
            # Exchange code for tokens
            token_data = self.exchange_google_code_for_token(code)
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error("No access token in token response")
                raise OAuthTokenError("No access token received from Google")
            
            # Get user info
            info = self.google_userinfo(access_token)
            google_id = info.get("sub")
            email = info.get("email")
            name = info.get("name")
            email_verified = info.get("email_verified", False)
            
            if not google_id or not email:
                logger.error(f"Missing required user info fields")
                raise OAuthUserInfoError("Missing required user info fields (sub or email)")
            
            logger.debug(
                f"Retrieved user info",
                extra={"google_id": google_id, "email": email, "verified": email_verified}
            )
            
            # Process user account with transaction safety
            user, is_new = self._process_user_account(
                google_id=google_id,
                email=email,
                name=name,
                email_verified=email_verified
            )
            
            # Save tokens
            try:
                self.token_repo.upsert_token(
                    user_id=user.id,
                    provider="google",
                    token_data=token_data
                )
                logger.info(
                    f"Saved OAuth tokens for user {user.id}",
                    extra={"user_id": str(user.id), "provider": "google"}
                )
            except Exception as e:
                logger.error(f"Failed to save tokens for user {user.id}: {e}", exc_info=True)
                # Don't fail the login, just log the error
                # User can re-authenticate later
            
            logger.info(
                f"Google login processed successfully",
                extra={
                    "user_id": str(user.id),
                    "email": email,
                    "is_new": is_new
                }
            )
            
            return user, is_new
            
        except (OAuthValidationError, OAuthTokenError, OAuthUserInfoError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing Google login: {e}", exc_info=True)
            raise OAuthError(f"Failed to process Google login: {e}")

    def _process_user_account(
        self, *, google_id: str, email: str, name: Optional[str], email_verified: bool
    ) -> Tuple[models.User, bool]:
        """
        Create or update user account with transaction safety.
        
        Handles three scenarios:
        1. Existing OAuth user (by google_id) - update login time
        2. Existing user by email - link Google account
        3. New user - create account
        
        Args:
            google_id: Google user ID (sub claim)
            email: User email address
            name: User full name
            email_verified: Whether Google verified the email
        
        Returns:
            Tuple of (User model, is_new boolean)
        
        Raises:
            OAuthError: If database operations fail
        """
        try:
            is_new = False
            
            # Try to find user by Google ID first (existing OAuth user)
            user = self.db.query(models.User).filter(
                models.User.google_id == google_id
            ).first()
            
            if user:
                # Existing OAuth user - update last login
                logger.debug(f"Found existing OAuth user: {user.id}")
                try:
                    user.last_login_at = datetime.now(timezone.utc)
                    self.db.commit()
                    self.db.refresh(user)
                    logger.info(f"Updated last login for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to update last login: {e}", exc_info=True)
                    self.db.rollback()
                    raise OAuthError(f"Failed to update user login time: {e}")
            else:
                # Try to find user by email (link Google account)
                user = self.db.query(models.User).filter(
                    models.User.email == email
                ).first()
                
                if user:
                    # Existing user - link Google account
                    logger.debug(f"Linking Google account to existing user: {user.id}")
                    try:
                        user.google_id = google_id
                        user.is_oauth_user = True
                        if not user.email_verified_at and email_verified:
                            user.email_verified_at = datetime.now(timezone.utc)
                        user.last_login_at = datetime.now(timezone.utc)
                        self.db.commit()
                        self.db.refresh(user)
                        logger.info(f"Linked Google account to user {user.id}")
                    except Exception as e:
                        logger.error(f"Failed to link Google account: {e}", exc_info=True)
                        self.db.rollback()
                        raise OAuthError(f"Failed to link Google account: {e}")
                else:
                    # Create new user
                    logger.debug(f"Creating new OAuth user for email: {email}")
                    is_new = True
                    
                    try:
                        user = models.User(
                            id=uuid4(),
                            email=email,
                            full_name=name or email.split("@")[0],  # Fallback to email prefix
                            google_id=google_id,
                            is_oauth_user=True,
                            email_verified_at=datetime.now(timezone.utc) if email_verified else None,
                            last_login_at=datetime.now(timezone.utc),
                        )
                        self.db.add(user)
                        self.db.commit()
                        self.db.refresh(user)
                        logger.info(f"Created new OAuth user: {user.id}")
                    except Exception as e:
                        logger.error(f"Failed to create user: {e}", exc_info=True)
                        self.db.rollback()
                        
                        # Handle race condition - another request may have created the user
                        logger.debug("Checking for race condition in user creation")
                        user = self.db.query(models.User).filter(
                            models.User.email == email
                        ).first()
                        
                        if user:
                            logger.info(f"User was created by concurrent request: {user.id}")
                            is_new = False
                            # Link Google account if needed
                            if not user.google_id:
                                user.google_id = google_id
                                user.is_oauth_user = True
                                user.last_login_at = datetime.now(timezone.utc)
                                self.db.commit()
                                self.db.refresh(user)
                        else:
                            raise OAuthError(f"Failed to create user: {e}")
            
            return user, is_new
            
        except OAuthError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing user account: {e}", exc_info=True)
            try:
                self.db.rollback()
            except:
                pass
            raise OAuthError(f"Failed to process user account: {e}")

    # ---------- Refreshing ----------
    def refresh_google_token(self, *, user_id: UUID) -> Optional[str]:
        """
        Refresh Google access token using refresh token.
        
        Uses the stored refresh token to obtain a new access token when
        the current one expires. Includes retry logic for network failures.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            New access token string, or None if refresh fails
        
        Example:
            new_token = service.refresh_google_token(user_id=user_id)
            if not new_token:
                # User needs to re-authenticate
                pass
        
        Note:
            Returns None instead of raising exceptions to allow graceful
            handling of expired/revoked refresh tokens.
        """
        try:
            # Validate user_id
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                return None
            
            logger.debug(f"Refreshing Google token for user {user_id}")
            
            # Get stored token
            tok = self.token_repo.get_token(user_id=user_id, provider="google")
            if not tok:
                logger.warning(f"No token found for user {user_id}")
                return None
            
            refresh_token = getattr(tok, "refresh_token", None)
            if not refresh_token:
                logger.warning(f"No refresh token available for user {user_id}")
                return None
            
            # Request new access token
            payload = {
                "client_id": self.settings.GOOGLE_CLIENT_ID,
                "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
            
            def make_request():
                r = self.http.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
                status = getattr(r, "status_code", 200)
                
                if status != 200:
                    error_text = getattr(r, "text", str(r))
                    logger.warning(
                        f"Token refresh failed with status {status} for user {user_id}",
                        extra={"status_code": status, "error": error_text, "user_id": str(user_id)}
                    )
                    return None
                
                return r.json()
            
            try:
                data = self._retry_request(make_request)
            except Exception as e:
                logger.error(f"Failed to refresh token after retries for user {user_id}: {e}")
                return None
            
            if not data or "access_token" not in data:
                logger.warning(f"Invalid refresh response for user {user_id}")
                return None
            
            # Update stored token
            try:
                # Preserve refresh token if not included in response (Google may not return it)
                if "refresh_token" not in data and refresh_token:
                    data["refresh_token"] = refresh_token
                
                self.token_repo.upsert_token(
                    user_id=user_id,
                    provider="google",
                    token_data=data
                )
                logger.info(
                    f"Successfully refreshed token for user {user_id}",
                    extra={"user_id": str(user_id), "expires_in": data.get("expires_in")}
                )
            except Exception as e:
                logger.error(f"Failed to save refreshed token for user {user_id}: {e}", exc_info=True)
                # Still return the token even if saving failed
                # Application can use it for this session
            
            return data.get("access_token")
            
        except Exception as e:
            logger.error(
                f"Unexpected error refreshing token for user {user_id}: {e}",
                extra={"user_id": str(user_id)},
                exc_info=True
            )
            return None

    def get_valid_google_access_token(self, *, user_id: UUID) -> Optional[str]:
        """
        Get valid Google access token for user.
        
        Returns a valid access token, automatically refreshing it if expired.
        This is the primary method for getting tokens for API calls.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Valid access token string, or None if unavailable
        
        Example:
            token = service.get_valid_google_access_token(user_id=user_id)
            if token:
                # Make API call with token
                response = requests.get(
                    "https://www.googleapis.com/calendar/v3/calendars",
                    headers={"Authorization": f"Bearer {token}"}
                )
            else:
                # User needs to re-authenticate
                redirect_to_oauth_flow()
        
        Note:
            Returns None if:
            - No token stored
            - Token expired and no refresh token available
            - Refresh token is revoked/invalid
            - Network errors prevent refresh
        """
        try:
            # Validate user_id
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                return None
            
            logger.debug(f"Getting valid access token for user {user_id}")
            
            # Get stored token
            tok = self.token_repo.get_token(user_id=user_id, provider="google")
            if not tok:
                logger.debug(f"No token found for user {user_id}")
                return None
            
            # Check if current token is valid
            if self.token_repo.token_is_valid(tok):
                logger.debug(f"Using existing valid token for user {user_id}")
                return tok.access_token
            
            # Token expired - try to refresh
            logger.debug(f"Token expired for user {user_id}, attempting refresh")
            
            if not getattr(tok, "refresh_token", None):
                logger.warning(f"No refresh token available for user {user_id}")
                return None
            
            new_token = self.refresh_google_token(user_id=user_id)
            
            if new_token:
                logger.info(f"Successfully obtained valid token for user {user_id}")
            else:
                logger.warning(f"Failed to obtain valid token for user {user_id}")
            
            return new_token
            
        except Exception as e:
            logger.error(
                f"Unexpected error getting valid token for user {user_id}: {e}",
                extra={"user_id": str(user_id)},
                exc_info=True
            )
            return None

