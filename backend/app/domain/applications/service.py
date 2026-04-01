"""
Application Service - Facade for Job Application Operations

Coordinates application, stage, note, and attachment operations through
specialized service modules. This facade simplifies the interface for
clients while maintaining separation of concerns internally.

Architecture:
- ApplicationOperationsService: Core application CRUD
- StageOperationsService: Stage management
- NoteOperationsService: Note management
- AttachmentOperationsService: File attachment handling

This service acts as a thin delegation layer, routing calls to the
appropriate specialized service.

Example:
    service = ApplicationService(apps_repo, stages_repo, notes_repo, ...)
    app = service.create_or_update(user_id=user_id, job_id=job_id, ...)
"""
from __future__ import annotations
from typing import Optional, List, Tuple
from uuid import UUID
from .repository import IApplicationRepo, IStageRepo, INoteRepo, IAttachmentRepo
from .dto import ApplicationDTO, StageDTO, NoteDTO, AttachmentDTO, CardRowDTO
from .application_operations import ApplicationOperationsService
from .stage_operations import StageOperationsService
from .note_operations import NoteOperationsService
from .attachment_operations import (
    AttachmentOperationsService,
    AttachmentPort,
    DocumentServicePort
)
from app.domain.logging import get_logger

logger = get_logger(__name__)


class ApplicationService:
    """
    Facade service coordinating all application-related operations.
    
    Delegates to specialized services for:
    - Applications (CRUD, queries, archiving)
    - Stages (tracking application progress)
    - Notes (timestamped text entries)
    - Attachments (file management)
    """
    
    def __init__(
        self,
        apps: IApplicationRepo,
        stages: IStageRepo,
        notes: INoteRepo,
        attachments: IAttachmentRepo,
        attach_store: AttachmentPort,
        doc_service: DocumentServicePort,
        db_session,
    ):
        """
        Initialize facade with all required dependencies.
        
        Creates specialized service instances for each concern area.
        
        Args:
            apps: Application repository
            stages: Stage repository
            notes: Note repository
            attachments: Attachment repository
            attach_store: File storage adapter
            doc_service: Document service integration
            db_session: Database session
        """
        if not all([apps, stages, notes, attachments, attach_store, doc_service, db_session]):
            logger.error("ApplicationService initialized with None dependencies")
            raise ValueError("All dependencies must be provided")
        
        # Initialize specialized services
        self._app_ops = ApplicationOperationsService(apps)
        self._stage_ops = StageOperationsService(stages, apps)
        self._note_ops = NoteOperationsService(notes, apps)
        self._attach_ops = AttachmentOperationsService(
            attachments, apps, attach_store, doc_service, db_session
        )
        
        logger.debug("ApplicationService facade initialized successfully")

    # ==============================================================================
    # Application Operations (delegated to ApplicationOperationsService)
    # ==============================================================================

    def create_or_update(
        self, *, 
        user_id: UUID, 
        job_id: UUID, 
        resume_id: Optional[UUID], 
        status: Optional[str], 
        source: Optional[str]
    ) -> ApplicationDTO:
        """Create or update application (deduplicates by user+job)."""
        app = self._app_ops.create_or_update(
            user_id=user_id,
            job_id=job_id,
            resume_id=resume_id,
            status=status,
            source=source
        )
        
        # Create initial "Applied" stage for new applications (best-effort)
        try:
            existing_stages = self._stage_ops.list_stages(
                user_id=user_id, app_id=app.id
            )
            if not existing_stages:
                initial_status = status or "Applied"
                if initial_status == "Saved":
                    initial_status = "Applied"
                self._stage_ops.create_stage_for_status_change(
                    app_id=app.id,
                    status=initial_status
                )
        except Exception as e:
            logger.warning(f"Failed to create initial stage: {e}")
        
        return app

    def list_paginated(
        self, *,
        user_id: UUID,
        status: Optional[str],
        q: str,
        sort: str,
        order: str,
        page: int,
        page_size: int,
        show_archived: bool = False
    ) -> Tuple[List[ApplicationDTO], int]:
        """Get paginated list with filtering and sorting."""
        return self._app_ops.list_paginated(
            user_id=user_id,
            status=status,
            q=q,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
            show_archived=show_archived
        )

    def get_used_statuses(self, *, user_id: UUID) -> List[str]:
        """Get all statuses currently in use by user's applications."""
        return self._app_ops.get_used_statuses(user_id=user_id)

    def list_cards(
        self, *, 
        user_id: UUID, 
        status: Optional[str], 
        show_archived: bool = False
    ) -> List[CardRowDTO]:
        """Get lightweight card DTOs for kanban/board views."""
        return self._app_ops.list_cards(
            user_id=user_id,
            status=status,
            show_archived=show_archived
        )

    def get_owned_app(self, *, app_id: UUID, user_id: UUID) -> ApplicationDTO:
        """Get application with ownership verification (security guard)."""
        return self._app_ops.get_owned_app(app_id=app_id, user_id=user_id)

    def update_status(self, *, user_id: UUID, app_id: UUID, new_status: str) -> ApplicationDTO:
        """
        Update application status.
        
        Also creates a stage entry for tracking. Delegates stage creation
        to StageOperationsService.
        """
        # Update status
        app = self._app_ops.update_status(
            user_id=user_id,
            app_id=app_id,
            new_status=new_status
        )
        
        # Create stage entry (best-effort)
        try:
            self._stage_ops.create_stage_for_status_change(
                app_id=app_id,
                status=new_status
            )
        except Exception as e:
            logger.warning(f"Failed to create stage for status change: {e}")
        
        return app

    def delete(self, *, user_id: UUID, app_id: UUID) -> None:
        """Delete application (cascade deletes stages, notes, attachments)."""
        return self._app_ops.delete(user_id=user_id, app_id=app_id)

    def list_with_stages(self, *, user_id: UUID) -> list[dict]:
        """List applications with embedded stages for dashboard views."""
        return self._app_ops.list_with_stages(user_id=user_id)

    def get_detail(self, *, user_id: UUID, app_id: UUID):
        """Get comprehensive detail view (app + job + resume + stages + notes + attachments)."""
        return self._app_ops.get_detail(user_id=user_id, app_id=app_id)

    def toggle_archive(self, *, user_id: UUID, app_id: UUID) -> ApplicationDTO:
        """Toggle archive status (hides from active views but preserves data)."""
        return self._app_ops.toggle_archive(user_id=user_id, app_id=app_id)

    # ==============================================================================
    # Stage Operations (delegated to StageOperationsService)
    # ==============================================================================

    def add_stage(
        self, *,
        user_id: UUID,
        app_id: UUID,
        name: str,
        scheduled_at=None,
        outcome=None,
        notes=None
    ) -> StageDTO:
        """Add new stage to track application progress."""
        return self._stage_ops.add_stage(
            user_id=user_id,
            app_id=app_id,
            name=name,
            scheduled_at=scheduled_at,
            outcome=outcome,
            notes=notes
        )

    def list_stages(self, *, user_id: UUID, app_id: UUID) -> List[StageDTO]:
        """List all stages for an application (chronological order)."""
        return self._stage_ops.list_stages(user_id=user_id, app_id=app_id)

    def update_stage_partial(
        self, *,
        user_id: UUID,
        app_id: UUID,
        stage_id: UUID,
        name=None,
        scheduled_at=None,
        outcome=None,
        notes=None
    ) -> StageDTO:
        """Update stage fields (only provided fields are updated)."""
        return self._stage_ops.update_stage_partial(
            user_id=user_id,
            app_id=app_id,
            stage_id=stage_id,
            name=name,
            scheduled_at=scheduled_at,
            outcome=outcome,
            notes=notes
        )

    def delete_stage(self, *, user_id: UUID, app_id: UUID, stage_id: UUID) -> None:
        """Delete a stage permanently."""
        return self._stage_ops.delete_stage(
            user_id=user_id,
            app_id=app_id,
            stage_id=stage_id
        )

    # ==============================================================================
    # Note Operations (delegated to NoteOperationsService)
    # ==============================================================================

    def add_note(self, *, user_id: UUID, app_id: UUID, body: str) -> NoteDTO:
        """Add timestamped text note to application."""
        return self._note_ops.add_note(user_id=user_id, app_id=app_id, body=body)

    def list_notes(self, *, user_id: UUID, app_id: UUID) -> List[NoteDTO]:
        """List all notes for application (newest first)."""
        return self._note_ops.list_notes(user_id=user_id, app_id=app_id)

    def update_note(
        self, *, user_id: UUID, app_id: UUID, note_id: UUID, body: str
    ) -> NoteDTO:
        """Update an existing note's content."""
        return self._note_ops.update_note(
            user_id=user_id, app_id=app_id, note_id=note_id, body=body
        )

    def delete_note(self, *, user_id: UUID, app_id: UUID, note_id: UUID) -> None:
        """Delete a note permanently."""
        return self._note_ops.delete_note(
            user_id=user_id, app_id=app_id, note_id=note_id
        )

    # ==============================================================================
    # Attachment Operations (delegated to AttachmentOperationsService)
    # ==============================================================================

    def list_attachments(self, *, user_id: UUID, app_id: UUID) -> List[AttachmentDTO]:
        """List all file attachments for application."""
        return self._attach_ops.list_attachments(user_id=user_id, app_id=app_id)

    def get_attachment(self, *, user_id: UUID, app_id: UUID, attachment_id: UUID) -> AttachmentDTO:
        """Get specific attachment with ownership verification."""
        return self._attach_ops.get_attachment(
            user_id=user_id,
            app_id=app_id,
            attachment_id=attachment_id
        )

    async def upload_attachment(
        self, *,
        user_id: UUID,
        app_id: UUID,
        file,
        document_type: Optional[str]
    ) -> AttachmentDTO:
        """Upload file attachment to application."""
        return await self._attach_ops.upload_attachment(
            user_id=user_id,
            app_id=app_id,
            file=file,
            document_type=document_type
        )

    def attach_from_document(
        self, *,
        user_id: UUID,
        app_id: UUID,
        document_id: str,
        document_type: Optional[str]
    ):
        """Attach existing document from document service."""
        return self._attach_ops.attach_from_document(
            user_id=user_id,
            app_id=app_id,
            document_id=document_id,
            document_type=document_type
        )

    def delete_attachment(
        self, *,
        user_id: UUID,
        app_id: UUID,
        attachment_id: UUID
    ) -> None:
        """Delete attachment and file (best-effort file deletion)."""
        return self._attach_ops.delete_attachment(
            user_id=user_id,
            app_id=app_id,
            attachment_id=attachment_id
        )
