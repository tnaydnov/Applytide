"""
Document Schemas Module

Pydantic models for document-related API requests and responses.
Re-exports schemas from the main schemas.documents module for convenience.
"""
from __future__ import annotations

# Re-export all document schemas
from ...schemas.documents import (
    DocumentType,
    DocumentStatus,
    DocumentResponse,
    DocumentListResponse,
    DocumentOptimizationRequest,
    DocumentAnalysis,
    TemplateListResponse,
    DocumentTemplate,
    CoverLetterRequest,
)

__all__ = [
    "DocumentType",
    "DocumentStatus",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentOptimizationRequest",
    "DocumentAnalysis",
    "TemplateListResponse",
    "DocumentTemplate",
    "CoverLetterRequest",
]
