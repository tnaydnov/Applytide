"""
Google OAuth Integration Module (Main Entry Point)

This module provides complete OAuth 2.0 integration with Google, including:
- Authorization URL generation
- Token exchange (authorization code → access/refresh tokens)
- Token lifecycle management (refresh, validation, expiration)
- User info retrieval
- High-level login flow for new and returning users

This file serves as the main entry point and re-exports all functionality
from split submodules for better organization and maintainability.

Submodules:
    - oauth_tokens.py: Token management (storage, validation, refresh helpers)
    - oauth_flow.py: OAuth flow operations (authorization, login, user info)

Features:
    - Automatic token refresh when expired
    - 5-minute expiration buffer for safety
    - Legal agreement tracking for new users
    - Database persistence of OAuth tokens
    - Comprehensive error handling and logging

OAuth Flow:
    1. User clicks "Login with Google"
    2. App redirects to get_google_authorization_url() with state
    3. User authorizes on Google's consent screen
    4. Google redirects back with authorization code
    5. App calls process_google_login(code) to exchange for tokens
    6. Tokens saved to database, user logged in

Token Lifecycle:
    - Access tokens expire after ~1 hour
    - Refresh tokens persist until revoked
    - Tokens automatically refreshed when expired (5 min buffer)
    - Use get_valid_google_token() to always get valid token

Architecture:
    - OAuthService: Main service class (stateful, holds DB session)
    - Helper functions: Token validation, storage, expiration calculation
    - Convenience function: get_valid_google_token() for quick access

Usage Example:
    from app.infra.external.google_oauth import OAuthService, get_valid_google_token
    
    # Generate authorization URL
    service = OAuthService(db)
    url = service.get_google_authorization_url(state="random123")
    # Redirect user to URL
    
    # Handle callback
    user, is_new = service.process_google_login(code="auth_code")
    if is_new:
        print(f"Welcome new user: {user.email}")
    else:
        print(f"Welcome back: {user.email}")
    
    # Get valid token (with automatic refresh)
    token = get_valid_google_token(db, user.id)
    if token:
        # Use token for Google API calls
        pass

Security:
    - Tokens stored in database (encrypted at rest if DB encryption enabled)
    - Access tokens not logged (privacy)
    - State parameter prevents CSRF attacks
    - HTTPS required for redirect URIs (production)

API Limits:
    - Google OAuth: 10,000 requests/day (free tier)
    - Rate limiting: 100 requests/100 seconds per user

Error Handling:
    - HTTP 400: Invalid authorization code or redirect URI
    - HTTP 401: Invalid client credentials
    - Network errors: Timeout, connection failure
    - Database errors: Constraint violations, connection issues

Author: ApplyTide Team
Last Updated: 2025-01-18
"""

# Re-export OAuth flow operations
from .oauth_flow import OAuthService

# Re-export token management functions
from .oauth_tokens import (
    get_valid_google_token,
    TOKEN_EXPIRY_BUFFER_MINUTES,
    # Private helper functions (for internal use by oauth_flow)
    _calc_expires_at,
    _save_oauth_token,
    _get_oauth_token,
    _token_is_valid,
)

# Google OAuth API endpoints
from .google_urls import (
    GOOGLE_AUTH_URL,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
    GOOGLE_CALENDAR_URL,
)

# Export public API
__all__ = [
    # Main service class
    'OAuthService',
    # Convenience functions
    'get_valid_google_token',
    # Constants
    'TOKEN_EXPIRY_BUFFER_MINUTES',
    'GOOGLE_AUTH_URL',
    'GOOGLE_TOKEN_URL',
    'GOOGLE_USERINFO_URL',
    'GOOGLE_CALENDAR_URL',
]
