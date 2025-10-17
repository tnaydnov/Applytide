"""Applications router - refactored modular implementation."""
from __future__ import annotations
from fastapi import APIRouter
from . import crud, queries, stages, notes, attachments

# Create main router
router = APIRouter(prefix="/api/applications", tags=["applications"])

# Include all sub-routers
# CRUD operations
router.include_router(crud.router)

# Query endpoints
router.include_router(queries.router)

# Stage management
router.include_router(stages.router)

# Note management
router.include_router(notes.router)

# Attachment management
router.include_router(attachments.router)

# Export main router
__all__ = ['router']
