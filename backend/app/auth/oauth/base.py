from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session

from app.db import models


def save_oauth_token(
    db: Session,
    user_id: str,
    provider: str,
    token_data: Dict[str, Any]
) -> models.OAuthToken:
    """Save or update OAuth token for a user"""
    oauth_token = db.query(models.OAuthToken).filter(
        models.OAuthToken.user_id == user_id,
        models.OAuthToken.provider == provider
    ).first()
    
    # Calculate expiry time
    expires_in = token_data.get("expires_in")
    expires_at = None
    if expires_in:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    if oauth_token:
        # Update existing token
        oauth_token.access_token = token_data.get("access_token")
        if token_data.get("refresh_token"):  # Only update if provided
            oauth_token.refresh_token = token_data.get("refresh_token")
        oauth_token.expires_at = expires_at
        oauth_token.token_type = token_data.get("token_type")
        oauth_token.scope = token_data.get("scope")
        oauth_token.updated_at = datetime.now(timezone.utc)
    else:
        # Create new token record
        oauth_token = models.OAuthToken(
            user_id=user_id,
            provider=provider,
            access_token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            expires_at=expires_at,
            token_type=token_data.get("token_type"),
            scope=token_data.get("scope")
        )
        db.add(oauth_token)
    
    db.commit()
    db.refresh(oauth_token)
    return oauth_token


def get_oauth_token(
    db: Session, 
    user_id: str, 
    provider: str
) -> Optional[models.OAuthToken]:
    """Get the OAuth token for a user"""
    return db.query(models.OAuthToken).filter(
        models.OAuthToken.user_id == user_id,
        models.OAuthToken.provider == provider
    ).first()


def token_is_valid(token: models.OAuthToken) -> bool:
    """Check if a token is still valid"""
    if not token.expires_at:
        return False
    
    # Add a buffer of 5 minutes
    return token.expires_at > datetime.now(timezone.utc) + timedelta(minutes=5)