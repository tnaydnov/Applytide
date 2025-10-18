"""Applications router - refactored modular implementation."""
from __future__ import annotations
from fastapi import APIRouter
from . import crud, queries, stages, notes, attachments

# Create main router with prefix and tags (like auth router)
router = APIRouter(prefix="/api/applications", tags=["applications"])

# Include all sub-routers WITHOUT prefix (they inherit from main router)
# IMPORTANT: Specific routes MUST be registered before generic path parameters
# Query endpoints (has /cards, /statuses, /with-stages - specific paths)
router.include_router(queries.router)

# Stage management (has /{app_id}/stages/* - specific paths)
router.include_router(stages.router)

# Note management (has /{app_id}/notes/* - specific paths)
router.include_router(notes.router)

# Attachment management (has /{app_id}/attachments/* - specific paths)
router.include_router(attachments.router)

# CRUD operations (has /{app_id} - generic path, must be LAST)
router.include_router(crud.router)

# Export main router
__all__ = ['router']
