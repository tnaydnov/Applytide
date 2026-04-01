"""
Auth router barrel export.

This module combines all auth-related routers into a single router
to maintain backward compatibility with existing imports.

All authentication endpoints are organized by feature:
- tokens.py: Extension and WebSocket tokens
- registration.py: User registration and email verification
- core.py: Login, refresh, logout
- password.py: Password reset flows
- profile.py: User profile and preferences
- avatar.py: Avatar upload
- oauth.py: Google OAuth integration
- sessions.py: Active session management
- activity.py: User activity log
- security.py: Security settings overview
- twofa.py: Two-factor authentication (TOTP)
"""
from fastapi import APIRouter

from . import tokens, registration, core, password, profile, avatar, oauth
from . import sessions, activity, security, twofa

# Create main auth router with prefix and tags
router = APIRouter(prefix="/auth", tags=["auth"])

# Include all sub-routers
router.include_router(tokens.router)
router.include_router(registration.router)
router.include_router(core.router)
router.include_router(password.router)
router.include_router(profile.router)
router.include_router(avatar.router)
router.include_router(oauth.router)
router.include_router(sessions.router)
router.include_router(activity.router)
router.include_router(security.router)
router.include_router(twofa.router)

# Re-export router for backward compatibility
__all__ = ["router"]
