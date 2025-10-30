"""
Reminders Google Calendar Integration Module

Handles Google Calendar connection checking, event fetching, and importing.
"""
from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body

from ....db.models import User
from ...deps import get_current_user
from ...deps import get_reminder_service
from ....domain.reminders.service import ReminderService
from .schemas import ReminderResponse
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/google/check-connection", response_model=dict)
async def check_google_connection(
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Check Google Calendar connection status.
    
    Verifies if user has authorized Google Calendar integration and tokens
    are valid.
    
    Args:
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        dict: {"connected": bool} indicating connection status
    
    Raises:
        HTTPException: 500 if check fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Checks only current user's connection
        - No sensitive token data exposed
    
    Notes:
        - Returns true if OAuth tokens valid and not expired
        - Returns false if not authorized or tokens expired
        - Used by frontend to show/hide calendar features
        - Does not trigger OAuth flow (just checks status)
    
    Example:
        GET /api/calendars/google/check-connection
        Response: {"connected": true}
    """
    return {"connected": await svc.google_connected(user_id=user.id)}


@router.get("/google/events")
async def get_google_calendar_events(
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    max_results: int = 100,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Retrieve events from Google Calendar.
    
    Fetches events from user's primary Google Calendar for display or import.
    Supports filtering by date range.
    
    Query Parameters:
        - time_min: ISO 8601 datetime string (optional, defaults to now)
        - time_max: ISO 8601 datetime string (optional, defaults to 1 month ahead)
        - max_results: Maximum number of events (default: 100, max: 2500)
    
    Args:
        time_min: Start of time range
        time_max: End of time range
        max_results: Maximum events to return
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        dict: Google Calendar API events response with items array
    
    Raises:
        HTTPException: 401 if Google Calendar not connected
        HTTPException: 500 if API call fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Requires Google Calendar authorization
        - Uses user's OAuth tokens for API calls
        - Only accesses primary calendar
    
    Notes:
        - Returns events in Google Calendar API format
        - Includes event IDs needed for import
        - Timezone handling per Google Calendar settings
        - Results sorted by start time
    
    Example:
        GET /api/calendars/google/events?time_min=2024-01-01T00:00:00Z&max_results=50
        Response: Google Calendar API events response
    """
    try:
        return await svc.list_google_events(
            user_id=user.id,
            time_min=time_min,
            time_max=time_max,
            max_results=max_results,
        )
    except Exception as e:
        logger.error(
            "Failed to fetch Google Calendar events",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reminders/import-google-event", response_model=ReminderResponse)
async def import_google_event(
    google_event_id: str = Body(..., embed=True),
    application_id: uuid.UUID | None = Body(None, embed=True),
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Import an event from Google Calendar as a reminder.
    
    Creates a reminder in Applytide from an existing Google Calendar event.
    Maintains bidirectional sync with the source event.
    
    Request Body:
        - google_event_id: Google Calendar event ID (required)
        - application_id: Optional UUID to link reminder to application
    
    Args:
        google_event_id: Google event ID to import
        application_id: Optional application linkage
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        ReminderResponse: Created reminder linked to Google event
    
    Raises:
        HTTPException: 401 if Google Calendar not connected
        HTTPException: 404 if event not found in Google Calendar
        HTTPException: 400 if event already imported
        HTTPException: 500 if import fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Requires Google Calendar authorization
        - User can only import from their own calendar
        - Application linkage validated if provided
    
    Notes:
        - Imports title, description, date from Google event
        - Maintains link to source event for bidirectional sync
        - Updates in Google Calendar can sync to Applytide
        - Useful for interview events scheduled by recruiters
        - Preserves Google Meet links if present
    
    Example:
        POST /api/calendars/reminders/import-google-event
        Request: {
            "google_event_id": "abc123xyz",
            "application_id": "550e8400-e29b-41d4-a716-446655440000"
        }
        Response: ReminderResponse object
    """
    try:
        return await svc.import_from_google_event(
            user_id=user.id,
            google_event_id=google_event_id,
            application_id=application_id,
        )
    except Exception as e:
        logger.error(
            "Failed to import Google Calendar event",
            extra={
                "user_id": str(user.id),
                "google_event_id": google_event_id,
                "error": str(e),
            },
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))
