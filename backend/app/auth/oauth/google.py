import json
import os
from typing import Dict, Any, Optional, Tuple
import uuid

import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.db import models
from app.auth.oauth.base import save_oauth_token, get_oauth_token, token_is_valid
from app.core.security import get_random_string
from app.auth import tokens
from datetime import datetime, timezone
from urllib.parse import urlencode

# OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3"


def get_authorization_url(state: str = None) -> str:
    """
    Generate the Google OAuth authorization URL
    """
    if not state:
        state = get_random_string(32)
        
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(settings.GOOGLE_SCOPES),
        "access_type": "offline",  # For refresh token
        "prompt": "consent",  # Always show consent screen
        "state": state
    }
    
    auth_url = GOOGLE_AUTH_URL + "?" + urlencode(params)
    return auth_url


async def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access and refresh tokens
    """
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI
    }
    
    response = requests.post(GOOGLE_TOKEN_URL, data=payload)
    if response.status_code != 200:
        raise Exception(f"Failed to get token: {response.text}")
    
    return response.json()


async def get_google_user_info(access_token: str) -> Dict[str, Any]:
    """
    Get Google user profile information using the access token
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(GOOGLE_USERINFO_URL, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get user info: {response.text}")
    
    return response.json()


async def process_google_login(db: Session, code: str) -> Tuple[models.User, bool]:
    """
    Process Google login/signup
    Returns (user, is_new_user)
    """
    # Exchange code for tokens
    token_data = await exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    
    # Get user information
    user_info = await get_google_user_info(access_token)
    google_id = user_info.get("sub")  # Google's user ID
    email = user_info.get("email")
    name = user_info.get("name")
    
    # Check if user exists by Google ID
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    
    # If not found by Google ID, try email
    is_new_user = False
    if not user:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            # Link existing account
            user.google_id = google_id
            user.is_oauth_user = True
            if not user.email_verified_at:
                user.email_verified_at = datetime.now(timezone.utc)
            db.commit()  # Commit here to ensure user is updated before saving token
        else:
            # Create new user
            is_new_user = True
            user = models.User(
                id=uuid.uuid4(),
                email=email,
                full_name=name,
                google_id=google_id,
                is_oauth_user=True,
                email_verified_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.commit()  # Commit here to ensure user exists before saving token
            db.refresh(user)  # Refresh to get the database-generated values
            
    # Save tokens
    try:
        save_oauth_token(db, str(user.id), "google", token_data)  # Convert UUID to string
        db.commit()
    except Exception as e:
        print(f"Error saving OAuth token: {e}")
        # Continue anyway since the user is created/updated
        
    return user, is_new_user


async def refresh_google_token(db: Session, user_id: uuid.UUID) -> Optional[str]:
    """
    Refresh the Google access token using the refresh token
    Returns the new access token
    """
    oauth_token = get_oauth_token(db, user_id, "google")
    if not oauth_token or not oauth_token.refresh_token:
        return None
        
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": oauth_token.refresh_token,
        "grant_type": "refresh_token"
    }
    
    response = requests.post(GOOGLE_TOKEN_URL, data=payload)
    if response.status_code != 200:
        return None
        
    token_data = response.json()
    # Note: The response might not include a new refresh token
    
    save_oauth_token(db, user_id, "google", token_data)
    return token_data.get("access_token")


async def get_valid_google_token(db: Session, user_id: uuid.UUID) -> Optional[str]:
    """
    Get a valid Google access token, refreshing if necessary
    """
    oauth_token = get_oauth_token(db, user_id, "google")
    
    if not oauth_token:
        return None
        
    if token_is_valid(oauth_token):
        return oauth_token.access_token
    
    # Token expired, try to refresh
    if oauth_token.refresh_token:
        return await refresh_google_token(db, user_id)
        
    return None