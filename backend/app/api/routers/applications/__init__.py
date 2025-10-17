"""Applications router - refactored modular implementation."""
from __future__ import annotations
from fastapi import APIRouter
from . import crud, queries, stages, notes, attachments

# Create main router
router = APIRouter(prefix="/api/applications", tags=["applications"])

# Include all sub-routers with empty prefix (inherits main router's prefix)
# CRUD operations
router.include_router(crud.router, prefix="")

# Query endpoints
router.include_router(queries.router, prefix="")

# Stage management
router.include_router(stages.router, prefix="")

# Note management
router.include_router(notes.router, prefix="")

# Attachment management
router.include_router(attachments.router, prefix="")

# Export main router
__all__ = ['router']
