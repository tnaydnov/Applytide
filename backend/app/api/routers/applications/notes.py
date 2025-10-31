"""
Application Note Management Endpoints

Handles note-taking for applications:
- Add notes to applications
- List all notes for an application

All endpoints require user authentication and ownership verification.
Notes allow users to record thoughts, reminders, and context about applications.
"""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ...deps import get_current_user
from ....db import models
from ...schemas.applications import NoteCreate, NoteUpdate, NoteOut
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event, logger

router = APIRouter()


@router.post("/{app_id}/notes", response_model=NoteOut)
def add_note(
    app_id: uuid.UUID,
    payload: NoteCreate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Add a note to an application.
    
    Creates a text note for recording thoughts, reminders, or
    context about the application. Useful for tracking conversation
    details, follow-up actions, or personal observations.
    
    Path Parameters:
        app_id (UUID): ID of the application to add note to
        
    Request Body:
        body (str): Note content (markdown supported)
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        NoteOut: Created note object with:
            - id: Note UUID
            - application_id: Parent application UUID
            - body: Note content
            - created_at: Creation timestamp
            - updated_at: Last update timestamp
            
    Raises:
        HTTPException: 404 if application not found or access denied
        HTTPException: 500 if note cannot be created
        
    Security:
        Requires user authentication
        Only allows adding notes to user's own applications
        
    Notes:
        - Notes are ordered by created_at (newest first)
        - Markdown formatting supported in body
        - Broadcasts 'note_added' WebSocket event
        - Use for: interview notes, follow-up reminders, observations
        
    Example:
        POST /api/applications/123e4567-e89b-12d3-a456-426614174000/notes
        Body: {"body": "Great conversation about React - mentioned new project"}
    """
    try:
        logger.debug(
            "Adding note to application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_length": len(payload.body)
            }
        )
        
        n = svc.add_note(
            user_id=current_user.id,
            app_id=app_id,
            body=payload.body
        )
        
        logger.info(
            "Note added successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(n.id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("note_added", str(app_id))
        
        return NoteOut(**n.__dict__)
        
    except Exception as e:
        logger.error(
            "Failed to add note",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to add note"
        )


@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve all notes for an application.
    
    Returns complete note history for the application,
    ordered chronologically for timeline display.
    
    Path Parameters:
        app_id (UUID): ID of the application whose notes to retrieve
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[NoteOut]: List of note objects ordered by created_at
        
    Raises:
        HTTPException: 404 if application not found or access denied
        HTTPException: 500 if notes cannot be retrieved
        
    Security:
        Requires user authentication
        Only returns notes from user's own applications
        
    Notes:
        - Notes ordered by creation date
        - Returns empty list if no notes exist
        - Use for: activity timelines, context review
        
    Example:
        GET /api/applications/123e4567-e89b-12d3-a456-426614174000/notes
        Returns all notes for the application
    """
    try:
        logger.debug(
            "Listing application notes",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        items = svc.list_notes(user_id=current_user.id, app_id=app_id)
        
        logger.debug(
            "Notes retrieved",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_count": len(items)
            }
        )
        
        return [NoteOut(**i.__dict__) for i in items]
        
    except Exception as e:
        logger.error(
            "Failed to list notes",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notes"
        )


@router.patch("/{app_id}/notes/{note_id}", response_model=NoteOut)
def update_note(
    app_id: uuid.UUID,
    note_id: uuid.UUID,
    payload: NoteUpdate,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing note's content.
    
    Modifies the note body and updates the timestamp.
    Verifies user owns the application and note belongs to application.
    
    Path Parameters:
        app_id (UUID): ID of the application containing the note
        note_id (UUID): ID of the note to update
        
    Request Body:
        body (str): New note content (markdown supported)
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        NoteOut: Updated note object with:
            - id: Note UUID
            - application_id: Parent application UUID
            - body: Updated note content
            - created_at: Original creation timestamp
            - updated_at: Update timestamp
            
    Raises:
        HTTPException: 404 if application or note not found
        HTTPException: 500 if update fails
        
    Security:
        Requires user authentication
        Only allows updating notes in user's own applications
        Verifies note belongs to specified application
        
    Notes:
        - Preserves original created_at timestamp
        - Updates updated_at to current time
        - Broadcasts 'note_updated' WebSocket event
        
    Example:
        PATCH /api/applications/{app_id}/notes/{note_id}
        Body: {"body": "Updated note content"}
    """
    try:
        logger.debug(
            "Updating note",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id)
            }
        )
        
        n = svc.update_note(
            user_id=current_user.id,
            app_id=app_id,
            note_id=note_id,
            body=payload.body
        )
        
        logger.info(
            "Note updated successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("note_updated", str(app_id))
        
        return NoteOut(**n.__dict__)
        
    except Exception as e:
        logger.error(
            "Failed to update note",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application or note not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to update note"
        )


@router.delete("/{app_id}/notes/{note_id}")
def delete_note(
    app_id: uuid.UUID,
    note_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete a note from an application.
    
    Permanently removes the note. This action cannot be undone.
    
    Path Parameters:
        app_id (UUID): ID of the application containing the note
        note_id (UUID): ID of the note to delete
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        dict: Success confirmation message
            
    Raises:
        HTTPException: 404 if application or note not found
        HTTPException: 500 if deletion fails
        
    Security:
        Requires user authentication
        Only allows deleting notes from user's own applications
        Verifies note belongs to specified application
        
    Notes:
        - **PERMANENT ACTION** - Cannot be undone
        - Broadcasts 'note_deleted' WebSocket event
        
    Example:
        DELETE /api/applications/{app_id}/notes/{note_id}
        Returns: {"message": "Note deleted successfully"}
    """
    try:
        logger.debug(
            "Deleting note",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id)
            }
        )
        
        svc.delete_note(
            user_id=current_user.id,
            app_id=app_id,
            note_id=note_id
        )
        
        logger.info(
            "Note deleted successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("note_deleted", str(app_id))
        
        return {"message": "Note deleted successfully"}
        
    except Exception as e:
        logger.error(
            "Failed to delete note",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "note_id": str(note_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application or note not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete note"
        )
