"""
Jobs API Router Package

Aggregates all job-related API endpoints into a single router.
Organized into functional modules for better maintainability:
- crud: Basic CRUD operations (create, read, update, delete)
- listing: Job listing with filtering and pagination
- search: Advanced search with relevance scoring and suggestions
- manual: Manual job creation from extension and user input
"""
from fastapi import APIRouter

from .crud import router as crud_router
from .listing import router as listing_router
from .search import router as search_router
from .manual import router as manual_router
from .schemas import (
    JobCreate,
    ManualJobCreate,
    JobOut,
    JobSearchOut,
)

# Create main jobs router
router = APIRouter()

# Include all sub-routers
router.include_router(crud_router, tags=["jobs"])
router.include_router(listing_router, tags=["jobs"])
router.include_router(search_router, tags=["jobs"])
router.include_router(manual_router, tags=["jobs"])

# Export router and schemas for main app
__all__ = [
    "router",
    "JobCreate",
    "ManualJobCreate",
    "JobOut",
    "JobSearchOut",
]
