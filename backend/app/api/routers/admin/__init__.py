"""
Admin routers - aggregates all admin sub-routers.
"""
from fastapi import APIRouter
from app.api.routers.admin import dashboard, users, errors, sessions, system, llm_usage, security

# Main admin router
router = APIRouter(prefix="/admin", tags=["admin"])

# Include sub-routers
router.include_router(dashboard.router)
router.include_router(users.router)
router.include_router(errors.router)
router.include_router(sessions.router)
router.include_router(system.router)
router.include_router(llm_usage.router)
router.include_router(security.router)
