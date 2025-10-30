"""
Core Authentication Router Aggregation

Combines login, token refresh, and logout endpoints into a single router.
This modular structure improves maintainability and testability.

Endpoints:
- POST /login - Email/password authentication
- POST /refresh - Access token renewal
- POST /logout - Single device logout
- POST /logout_all - All devices logout
"""
from fastapi import APIRouter

from .login import router as login_router
from .refresh import router as refresh_router
from .logout import router as logout_router

# Create main router for core auth endpoints
router = APIRouter()

# Include all sub-routers
router.include_router(login_router, tags=["auth"])
router.include_router(refresh_router, tags=["auth"])
router.include_router(logout_router, tags=["auth"])
