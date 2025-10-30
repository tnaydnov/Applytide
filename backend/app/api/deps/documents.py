"""
Document service dependencies.

Provides dependency injection for document management with AI generation.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from typing import AsyncGenerator
from pathlib import Path
from ...db.session import get_db
from ...domain.documents.service import DocumentService
from ...domain.documents.ports import TextExtractor as TextExtractorPort, DocumentStore as DocumentStorePort
from ...infra.extractors.pdf_extractor import PDFExtractor
from ...infra.extractors.text_extractor import TextExtractor as TextExtractorImpl
from ...infra.files.document_store import DocumentStore as FSDocumentStore
from ...infra.logging import get_logger

logger = get_logger(__name__)


async def get_document_service(db: Session = Depends(get_db)) -> AsyncGenerator[DocumentService, None]:
    """
    Provide DocumentService with PDF extraction, text processing, and AI generation.
    
    Async generator that constructs DocumentService and ensures proper cleanup of
    resources (AI service connections) after request completion.
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Yields:
        DocumentService: Configured service for document operations
    
    Components:
        - PDFExtractor: Extract text from PDF resumes
        - TextExtractorImpl: General text extraction with PDF support
        - FSDocumentStore: Filesystem-based document storage
        - DocumentService: Orchestrates document operations
    
    Features:
        - Resume upload and text extraction
        - AI-powered cover letter generation
        - Document storage and retrieval
        - Format validation (PDF support)
        - Metadata management
    
    Lifecycle:
        - Service created at request start
        - AI service initialized lazily on first use
        - Proper cleanup in finally block (closes AI connections)
        - Database session managed by parent dependency
    
    Storage:
        - Root directory: /app/uploads/documents
        - Files organized by user ID
        - Atomic write operations
        - Automatic directory creation
    
    Raises:
        Exception: If service construction or cleanup fails
    
    Performance:
        - AI service connections pooled when possible
        - PDF extraction optimized for text extraction
        - Filesystem operations async where supported
    
    Security:
        - File paths validated to prevent traversal
        - User isolation enforced
        - File size limits applied
        - Content type validation
    
    Example:
        @router.post("/api/documents/resume")
        async def upload_resume(
            file: UploadFile,
            service: DocumentService = Depends(get_document_service),
            user: User = Depends(get_current_user)
        ):
            return await service.upload_resume(user.id, file)
    """
    try:
        logger.debug("Initializing DocumentService")
        
        pdf_extractor = PDFExtractor()
        extractor: TextExtractorPort = TextExtractorImpl(pdf_extractor=pdf_extractor)
        store: DocumentStorePort = FSDocumentStore(root=Path("/app/uploads/documents"))

        svc = DocumentService(store=store, extractor=extractor, db_session=db)
        
        logger.debug("DocumentService initialized successfully")
        
        try:
            yield svc
        finally:
            # Clean up AI service if it exists
            logger.debug("Cleaning up DocumentService resources")
            if hasattr(svc, 'ai_cover_letter_service') and svc.ai_cover_letter_service:
                try:
                    await svc.ai_cover_letter_service.aclose()
                    logger.debug("AI cover letter service closed successfully")
                except Exception as cleanup_err:
                    logger.warning(
                        "Failed to close AI cover letter service",
                        extra={"error": str(cleanup_err)}
                    )
                    
    except Exception as e:
        logger.error(
            "Failed to initialize or cleanup DocumentService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
