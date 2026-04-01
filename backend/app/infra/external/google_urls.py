"""
Google OAuth URL constants - single source of truth.

Import these from here to avoid circular imports between
google_oauth.py, oauth_flow.py, and oauth_service.py.
"""

GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL: str = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR_URL: str = "https://www.googleapis.com/calendar/v3"
