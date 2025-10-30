"""
Documents API Router Package

Aggregates all document-related API endpoints into a single router.
Organized into functional modules for better maintainability:
- upload: Document upload with security validation
- management: CRUD operations (list, get, delete, status updates)
- analysis: ATS analysis and optimization
- templates: Template catalog
- export: Download and preview
- generation: AI-powered cover letter generation
"""
from fastapi import APIRouter

from .upload import router as upload_router
from .management import router as management_router
from .analysis import router as analysis_router
from .templates import router as templates_router
from .export import router as export_router
from .generation import router as generation_router
from .schemas import (
    DocumentType,
    DocumentStatus,
    DocumentResponse,
    DocumentListResponse,
    DocumentAnalysis,
    DocumentOptimizationRequest,
    DocumentTemplate,
    TemplateListResponse,
    CoverLetterRequest,
)

# Create main documents router with prefix
router = APIRouter(prefix="/api/documents", tags=["documents"])

# Include all sub-routers
router.include_router(upload_router)
router.include_router(management_router)
router.include_router(analysis_router)
router.include_router(templates_router)
router.include_router(export_router)
router.include_router(generation_router)

# Export router and schemas for main app
__all__ = [
    "router",
    "DocumentType",
    "DocumentStatus",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentAnalysis",
    "DocumentOptimizationRequest",
    "DocumentTemplate",
    "TemplateListResponse",
    "CoverLetterRequest",
]
