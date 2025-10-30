"""
Document Templates Module

Handles listing and retrieval of document templates.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ....db.session import get_db
from .schemas import DocumentType, DocumentTemplate, TemplateListResponse
from ...deps import get_document_service
from ....domain.documents.service import DocumentService

router = APIRouter()


@router.get("/templates/", response_model=TemplateListResponse)
def list_templates(
    category: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    svc: DocumentService = Depends(get_document_service),
):
    """
    List available document templates.
    
    Retrieves catalog of pre-built document templates including resumes, cover letters,
    and portfolios. Templates can be filtered by category and document type.
    
    Query Parameters:
        - category: Filter by template category (optional)
        - document_type: Filter by document type (resume/cover_letter/portfolio)
    
    Args:
        category: Optional category filter (e.g., "professional", "creative", "technical")
        document_type: Optional document type filter
        svc: Document service from dependency injection
    
    Returns:
        TemplateListResponse: Template catalog containing:
            - templates: List of DocumentTemplate objects with:
                - id: Template UUID
                - name: Template display name
                - description: Template description
                - type: Document type
                - category: Template category
                - preview_url: Optional preview image URL
                - template_data: Template structure data
                - is_premium: Whether template requires premium
            - categories: List of all available categories
            - total: Total number of templates
    
    Security:
        - No authentication required (public catalog)
        - Premium templates flagged but visible to all
        - Template access controlled at usage time
    
    Notes:
        - Templates organized by category: professional, creative, technical, modern, traditional
        - Document types: resume, cover_letter, portfolio
        - Premium templates require premium subscription to use
        - Templates include placeholder content and formatting
        - Preview URLs point to template screenshots
        - Template data contains structure/schema for rendering
        - Filtering combines category and document_type with AND logic
        - Empty filters return all templates
    
    Example:
        GET /api/documents/templates/?category=professional&document_type=resume
        Response:
        {
            "templates": [
                {
                    "id": "template-uuid",
                    "name": "Professional Resume",
                    "description": "Clean, ATS-friendly resume template",
                    "type": "resume",
                    "category": "professional",
                    "preview_url": "https://...",
                    "is_premium": false
                }
            ],
            "categories": ["professional", "creative", "technical"],
            "total": 15
        }
    """
    templates = svc.get_document_templates(category=category)
    if document_type:
        templates = [t for t in templates if t["type"] == document_type.value]
    objects = [
        DocumentTemplate(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            type=document_type or DocumentType(t["type"]),
            category=t["category"],
            preview_url=t.get("preview_url"),
            template_data={},
            is_premium=t.get("is_premium", False),
        )
        for t in templates
    ]
    cats = list({t["category"] for t in templates})
    return TemplateListResponse(templates=objects, categories=cats, total=len(objects))
