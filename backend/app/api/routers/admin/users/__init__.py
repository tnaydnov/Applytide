"""
Admin User Management - Main Router Aggregation

Aggregates all user management sub-routers into a single router.
This modular structure keeps individual files focused and maintainable.

Structure:
- management.py: Core CRUD (list, get, delete) - ~350 lines
- privileges.py: Premium & role management - ~200 lines
- security.py: Session revocation - ~120 lines
- data.py: Data access (applications, jobs, activity) - ~330 lines
- bans.py: Ban management (email & IP blocking) - ~700 lines

All routes are prefixed with /users and require admin authentication.
"""
from fastapi import APIRouter
from . import management, privileges, security, data, bans

# Create main router
router = APIRouter(prefix="/users", tags=["admin-users"])

# Include all sub-routers
router.include_router(management.router)
router.include_router(privileges.router)
router.include_router(security.router)
router.include_router(data.router)
router.include_router(bans.router)
