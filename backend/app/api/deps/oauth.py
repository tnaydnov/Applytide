"""
OAuth service dependencies.

Provides dependency injection for external service authentication and token management.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.auth.oauth_service import OAuthService
from ...infra.repositories.oauth_sqlalchemy import OAuthTokenSQLARepo
from ...infra.http.requests_client import RequestsHTTPClient
from ...config import settings as _settings
from ...infra.logging import get_logger

logger = get_logger(__name__)


def get_oauth_service(db: Session = Depends(get_db)) -> OAuthService:
    """
    Provide OAuthService for external service authentication and token management.
    
    Constructs OAuthService with token repository, HTTP client, and application
    settings for managing OAuth2 flows with external services (Google Calendar, etc.).
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Returns:
        OAuthService: Configured service for OAuth operations
    
    Components:
        - OAuthTokenSQLARepo: Encrypted token storage and retrieval
        - RequestsHTTPClient: HTTP client for OAuth API calls
        - Settings: Application configuration (client IDs, secrets, redirect URLs)
    
    Features:
        - OAuth2 authorization code flow
        - Token storage and encryption
        - Automatic token refresh
        - Multiple provider support (Google, GitHub, etc.)
        - Token revocation
        - Connection status checking
    
    OAuth Flow:
        1. Generate authorization URL
        2. User authenticates with provider
        3. Exchange authorization code for tokens
        4. Store encrypted access and refresh tokens
        5. Automatically refresh when expired
        6. Revoke on disconnect
    
    Supported Providers:
        - Google (Calendar, Drive)
        - GitHub (planned)
        - LinkedIn (planned)
    
    Raises:
        Exception: If repository, HTTP client, or settings unavailable
    
    Performance:
        - Token refresh handled transparently
        - HTTP connections pooled
        - Tokens cached in memory
        - Minimal database queries
    
    Security:
        - Tokens encrypted at rest (AES-256)
        - PKCE flow for public clients
        - State parameter for CSRF protection
        - Refresh token rotation
        - Secure token transmission (HTTPS only)
        - Client secrets in environment variables
    
    Example:
        @router.get("/api/oauth/google/authorize")
        async def authorize_google(
            service: OAuthService = Depends(get_oauth_service),
            user: User = Depends(get_current_user)
        ):
            auth_url = await service.get_authorization_url(
                user_id=user.id,
                provider="google",
                scopes=["calendar.events"]
            )
            return {"authorization_url": auth_url}
    """
    try:
        logger.debug("Initializing OAuthService")
        
        repo = OAuthTokenSQLARepo(db)
        http = RequestsHTTPClient()
        
        service = OAuthService(
            token_repo=repo, 
            http=http, 
            settings=_settings, 
            db=db
        )
        
        logger.debug("OAuthService initialized successfully")
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize OAuthService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
