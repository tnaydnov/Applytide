"""
Application service dependencies.

Provides dependency injection for job application tracking.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.applications.service import ApplicationService
from ...infra.repositories.applications_sqlalchemy import (
    ApplicationSQLARepository, StageSQLARepository, NoteSQLARepository, AttachmentSQLARepository
)
from ...infra.files.attachment_store import AttachmentStore
from ...infra.logging import get_logger
from .documents import get_document_service
from ...domain.documents.service import DocumentService

logger = get_logger(__name__)


def get_application_service(
    db: Session = Depends(get_db),
    doc_service: DocumentService = Depends(get_document_service),
) -> ApplicationService:
    """
    Provide ApplicationService with application tracking and attachment management.
    
    Constructs ApplicationService with all required repositories and integrates
    with DocumentService for resume/cover letter handling.
    
    Args:
        db: Database session from FastAPI dependency injection
        doc_service: DocumentService for resume and cover letter operations
    
    Returns:
        ApplicationService: Configured service for application operations
    
    Components:
        - ApplicationSQLARepository: Job application persistence
        - StageSQLARepository: Application stage tracking
        - NoteSQLARepository: Application notes management
        - AttachmentSQLARepository: Attachment metadata storage
        - AttachmentStore: Filesystem attachment storage
        - DocumentService: Resume and cover letter handling
    
    Features:
        - Application CRUD operations
        - Multi-stage workflow (applied, interviewing, offered, etc.)
        - Notes and timeline tracking
        - File attachments (resumes, cover letters, references)
        - Status updates and history
        - Integration with job and document services
    
    Workflow Stages:
        - saved: Job saved for later
        - applied: Application submitted
        - interviewing: In interview process
        - offered: Received job offer
        - rejected: Application rejected
        - accepted: Offer accepted
        - withdrawn: Application withdrawn
    
    Raises:
        Exception: If repository or service construction fails
    
    Performance:
        - All repositories share database session
        - Attachments stored on filesystem (not in DB)
        - Lazy loading for related entities
        - Batch operations for bulk updates
    
    Security:
        - User ownership enforced at service layer
        - File paths validated
        - Attachment size limits applied
        - XSS prevention in notes
    
    Example:
        @router.post("/api/applications")
        async def create_application(
            data: ApplicationCreate,
            service: ApplicationService = Depends(get_application_service),
            user: User = Depends(get_current_user)
        ):
            return await service.create_application(user.id, data)
    """
    try:
        logger.debug("Initializing ApplicationService")
        
        apps = ApplicationSQLARepository(db)
        stages = StageSQLARepository(db)
        notes = NoteSQLARepository(db)
        atts = AttachmentSQLARepository(db)
        store = AttachmentStore()
        
        service = ApplicationService(
            apps=apps, 
            stages=stages, 
            notes=notes, 
            attachments=atts,
            attach_store=store, 
            doc_service=doc_service, 
            db_session=db
        )
        
        logger.debug("ApplicationService initialized successfully")
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize ApplicationService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
