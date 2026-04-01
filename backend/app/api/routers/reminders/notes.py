"""
Reminders Notes Module

Handles reminder notes CRUD operations for adding context to reminders.
"""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends

from ....db.models import User
from ...deps import get_current_user
from ...deps import get_reminder_service
from ....domain.reminders.service import ReminderService
from .schemas import ReminderNoteCreate, ReminderNoteOut

router = APIRouter()


@router.get("/{reminder_id}/notes", response_model=List[ReminderNoteOut])
def list_notes(
    reminder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    List all notes for a reminder.
    
    Retrieves all notes associated with a specific reminder. Notes provide additional
    context, meeting outcomes, or action items for reminders.
    
    Path Parameters:
        - reminder_id: UUID of the reminder
    
    Args:
        reminder_id: Reminder UUID
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        List[ReminderNoteOut]: List of notes with timestamps
    
    Raises:
        HTTPException: 404 if reminder not found or not owned by user
        HTTPException: 500 if retrieval fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only access notes for their own reminders
        - Ownership validation performed by service
    
    Notes:
        - Notes ordered by creation date (newest first)
        - Each note includes creation and update timestamps
        - Useful for tracking meeting outcomes or follow-ups
    
    Example:
        GET /api/calendars/reminders/550e8400-e29b-41d4-a716-446655440000/notes
        Response: Array of ReminderNoteOut objects
    """
    return svc.list_notes(user_id=user.id, reminder_id=reminder_id)


@router.post("/{reminder_id}/notes", response_model=ReminderNoteOut)
def create_note(
    reminder_id: uuid.UUID,
    payload: ReminderNoteCreate,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Create a note for a reminder.
    
    Adds a new note to a reminder for tracking additional information, meeting
    outcomes, or action items.
    
    Path Parameters:
        - reminder_id: UUID of the reminder
    
    Request Body:
        ReminderNoteCreate containing note body text
    
    Args:
        reminder_id: Reminder UUID
        payload: Note creation data
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        ReminderNoteOut: Created note with timestamps
    
    Raises:
        HTTPException: 404 if reminder not found or not owned by user
        HTTPException: 400 if validation fails
        HTTPException: 500 if creation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only add notes to their own reminders
        - Note automatically linked to reminder and user
    
    Notes:
        - Notes support markdown formatting
        - No length limit enforced (use responsibly)
        - Useful for recording interview feedback immediately
    
    Example:
        POST /api/calendars/reminders/550e8400.../notes
        Request: {"body": "Great interview! Discussed React and TypeScript."}
        Response: ReminderNoteOut object
    """
    return svc.create_note(user_id=user.id, reminder_id=reminder_id, body=payload.body)


@router.put("/reminder-notes/{note_id}", response_model=ReminderNoteOut)
def update_note(
    note_id: uuid.UUID,
    payload: ReminderNoteCreate,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Update an existing reminder note.
    
    Updates the body text of an existing note. Performs complete replacement
    of note content (not partial update).
    
    Path Parameters:
        - note_id: UUID of the note to update
    
    Request Body:
        ReminderNoteCreate containing updated body text
    
    Args:
        note_id: Note UUID
        payload: Updated note data
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        ReminderNoteOut: Updated note with new updated_at timestamp
    
    Raises:
        HTTPException: 404 if note not found or not owned by user
        HTTPException: 400 if validation fails
        HTTPException: 500 if update fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own notes
        - Ownership verification via service
    
    Notes:
        - Complete replacement of note body
        - Updated_at timestamp automatically updated
        - Original created_at preserved
        - Use to correct typos or add additional information
    
    Example:
        PUT /api/calendars/reminder-notes/550e8400...
        Request: {"body": "Updated: Technical round went very well!"}
        Response: Updated ReminderNoteOut object
    """
    return svc.update_note(user_id=user.id, note_id=note_id, body=payload.body)


@router.delete("/reminder-notes/{note_id}", status_code=204)
def delete_note(
    note_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Delete a reminder note.
    
    Permanently deletes a note from a reminder. This operation is irreversible.
    
    Path Parameters:
        - note_id: UUID of the note to delete
    
    Args:
        note_id: Note UUID
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        204 No Content on successful deletion
    
    Raises:
        HTTPException: 404 if note not found or not owned by user
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own notes
        - Ownership verification via service
    
    Notes:
        - Permanent deletion (no soft delete/recovery)
        - Does not affect the parent reminder
        - Returns 204 No Content on success
    
    Example:
        DELETE /api/calendars/reminder-notes/550e8400...
        Response: 204 No Content
    """
    svc.delete_note(user_id=user.id, note_id=note_id)
    return
