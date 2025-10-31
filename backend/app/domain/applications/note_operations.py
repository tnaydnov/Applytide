"""
Note Operations Service - Application Note Management

Handles all note-related operations for job applications including
creating and listing notes.

Notes are timestamped text entries for tracking information about
the application process (e.g., interview feedback, follow-up reminders).
"""
from __future__ import annotations
from typing import List
from uuid import UUID
from .repository import IApplicationRepo, INoteRepo
from .dto import NoteDTO
from .errors import ApplicationNotFound, BadRequest, NoteNotFound
from app.infra.logging import get_logger

logger = get_logger(__name__)


class NoteOperationsService:
    """
    Service for managing application notes.
    
    Handles creating and listing notes with proper authorization
    and validation. Verifies application ownership before operations.
    """
    
    def __init__(self, notes_repo: INoteRepo, apps_repo: IApplicationRepo):
        """
        Initialize with note and application repositories.
        
        Args:
            notes_repo: Repository for note persistence
            apps_repo: Repository for application ownership verification
        """
        if not notes_repo or not apps_repo:
            logger.error("NoteOperationsService initialized with None repositories")
            raise ValueError("Both notes_repo and apps_repo must be provided")
        
        self.notes = notes_repo
        self.apps = apps_repo
        logger.debug("NoteOperationsService initialized successfully")

    def _verify_ownership(self, app_id: UUID, user_id: UUID) -> None:
        """
        Verify user owns the application.
        
        Args:
            app_id: UUID of the application
            user_id: UUID of the user
        
        Raises:
            ApplicationNotFound: If application doesn't exist or user doesn't own it
        """
        try:
            self.apps.get_owned_app(app_id, user_id)
        except LookupError:
            logger.warning(
                f"Application {app_id} not found or not owned by user {user_id}"
            )
            raise ApplicationNotFound(f"Application {app_id} not found")

    def add_note(self, *, user_id: UUID, app_id: UUID, body: str) -> NoteDTO:
        """
        Add a note to an application.
        
        Notes are timestamped text entries for tracking information
        about the application process (e.g., interview feedback,
        follow-up reminders).
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            body: Content of the note
        
        Returns:
            Created NoteDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If note creation fails
        
        Example:
            note = service.add_note(
                user_id=user_id,
                app_id=app_id,
                body="Recruiter mentioned 2-week timeline"
            )
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(body, str) or not body:
                logger.warning(f"Invalid note body: {body}")
                raise ValueError("body must be a non-empty string")
            
            if len(body) > 5000:
                logger.warning(f"Note body too long: {len(body)} characters")
                raise ValueError("body must be 5000 characters or less")
            
            logger.debug(
                f"Adding note to application {app_id}",
                extra={"app_id": str(app_id), "body_length": len(body)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Create note
            try:
                note = self.notes.add(app_id, body)
                logger.info(
                    f"Added note to application {app_id}",
                    extra={
                        "app_id": str(app_id),
                        "note_id": str(note.id),
                        "body_length": len(body)
                    }
                )
                return note
            except Exception as e:
                logger.error(
                    f"Failed to add note to application {app_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to add note")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in add_note: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while adding note")

    def list_notes(self, *, user_id: UUID, app_id: UUID) -> List[NoteDTO]:
        """
        List all notes for an application (chronological order).
        
        Returns notes sorted by creation time, newest first.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
        
        Returns:
            List of NoteDTOs, sorted by created_at descending
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If listing fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            logger.debug(
                f"Listing notes for application {app_id}",
                extra={"app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Get notes
            try:
                notes = self.notes.list_for_app(app_id)
                logger.debug(
                    f"Retrieved {len(notes)} notes for application {app_id}",
                    extra={"app_id": str(app_id), "count": len(notes)}
                )
                return notes
            except Exception as e:
                logger.error(
                    f"Failed to list notes for application {app_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to list notes")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in list_notes: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while listing notes")

    def update_note(
        self, *, user_id: UUID, app_id: UUID, note_id: UUID, body: str
    ) -> NoteDTO:
        """
        Update an existing note's content.
        
        Updates the note body and sets updated_at timestamp.
        Verifies both application ownership and note existence.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            note_id: UUID of the note to update
            body: New content for the note
        
        Returns:
            Updated NoteDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            NoteNotFound: If note doesn't exist or doesn't belong to application
            BadRequest: If update fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(note_id, UUID):
                logger.warning(f"Invalid note_id type: {type(note_id)}")
                raise ValueError("note_id must be a UUID")
            
            if not isinstance(body, str) or not body:
                logger.warning(f"Invalid note body: {body}")
                raise ValueError("body must be a non-empty string")
            
            if len(body) > 5000:
                logger.warning(f"Note body too long: {len(body)} characters")
                raise ValueError("body must be 5000 characters or less")
            
            logger.debug(
                f"Updating note {note_id} for application {app_id}",
                extra={"app_id": str(app_id), "note_id": str(note_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Get note to verify it belongs to this application
            try:
                existing = self.notes.get(note_id)
                if existing.application_id != app_id:
                    logger.warning(
                        f"Note {note_id} doesn't belong to application {app_id}"
                    )
                    raise NoteNotFound(f"Note {note_id} not found")
            except LookupError:
                logger.warning(f"Note {note_id} not found")
                raise NoteNotFound(f"Note {note_id} not found")
            
            # Update note
            try:
                updated_note = self.notes.update(note_id, body)
                logger.info(
                    f"Updated note {note_id} for application {app_id}",
                    extra={
                        "app_id": str(app_id),
                        "note_id": str(note_id),
                        "body_length": len(body)
                    }
                )
                return updated_note
            except Exception as e:
                logger.error(
                    f"Failed to update note {note_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to update note")
                
        except (ValueError, ApplicationNotFound, NoteNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in update_note: {e}",
                extra={
                    "app_id": str(app_id),
                    "note_id": str(note_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while updating note")

    def delete_note(self, *, user_id: UUID, app_id: UUID, note_id: UUID) -> None:
        """
        Delete a note from an application.
        
        Permanently removes the note. Verifies both application
        ownership and note existence before deletion.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            note_id: UUID of the note to delete
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            NoteNotFound: If note doesn't exist or doesn't belong to application
            BadRequest: If deletion fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(note_id, UUID):
                logger.warning(f"Invalid note_id type: {type(note_id)}")
                raise ValueError("note_id must be a UUID")
            
            logger.debug(
                f"Deleting note {note_id} from application {app_id}",
                extra={"app_id": str(app_id), "note_id": str(note_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Get note to verify it belongs to this application
            try:
                existing = self.notes.get(note_id)
                if existing.application_id != app_id:
                    logger.warning(
                        f"Note {note_id} doesn't belong to application {app_id}"
                    )
                    raise NoteNotFound(f"Note {note_id} not found")
            except LookupError:
                logger.warning(f"Note {note_id} not found")
                raise NoteNotFound(f"Note {note_id} not found")
            
            # Delete note
            try:
                self.notes.delete(note_id)
                logger.info(
                    f"Deleted note {note_id} from application {app_id}",
                    extra={"app_id": str(app_id), "note_id": str(note_id)}
                )
            except Exception as e:
                logger.error(
                    f"Failed to delete note {note_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to delete note")
                
        except (ValueError, ApplicationNotFound, NoteNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in delete_note: {e}",
                extra={
                    "app_id": str(app_id),
                    "note_id": str(note_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while deleting note")
