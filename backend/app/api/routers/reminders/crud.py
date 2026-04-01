"""
Reminders CRUD Module

Handles reminder create, read, update, delete operations with Google Calendar sync.
"""
from __future__ import annotations
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query

from ....db.models import User
from ...deps import get_current_user
from ...deps import get_reminder_service
from ....domain.reminders.service import ReminderService
from .schemas import ReminderCreate, ReminderUpdate, ReminderResponse
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Create a new reminder with optional Google Calendar integration.
    
    Creates a reminder (calendar event) with optional Google Calendar sync, Meet link
    generation, and email notifications. Primary endpoint for scheduling interviews,
    follow-ups, and deadlines.
    
    Request Body:
        ReminderCreate with:
        - title: Event title (required)
        - description: Event description (optional)
        - due_date: Event datetime (required, timezone-aware)
        - application_id: Link to application (optional)
        - create_google_event: Sync to Google Calendar (default: true)
        - add_meet_link: Generate Google Meet link (default: false)
        - email_notifications_enabled: Enable email reminders (default: false)
        - notification_schedule: Custom notification timing (optional)
        - event_type: Event category (default: "general")
        - timezone_str: User timezone (default: "UTC")
    
    Args:
        reminder: Reminder creation data
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        ReminderResponse: Created reminder with Google Calendar details if synced
    
    Raises:
        HTTPException: 400 if validation fails (invalid date, missing required fields)
        HTTPException: 401 if Google Calendar sync requested but not authorized
        HTTPException: 500 if creation or sync fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Reminder automatically linked to current user
        - Google Calendar authorization validated if sync enabled
        - Application linkage validated if provided
    
    Notes:
        - Google Calendar sync creates event in user's primary calendar
        - Meet links only generated if Google Calendar sync enabled
        - Email notifications scheduled per notification_schedule
        - Timezone handling ensures correct display in user's locale
        - Event_type used for notification template selection
        - Logs creation for analytics and debugging
    
    Example:
        POST /api/calendars/reminders
        Request:
        {
            "title": "Technical Interview - Google",
            "description": "System design round",
            "due_date": "2024-06-15T14:00:00Z",
            "add_meet_link": true,
            "email_notifications_enabled": true,
            "notification_schedule": {"24h": true, "1h": true},
            "event_type": "interview"
        }
        Response: ReminderResponse with meet_url and google_event_id
    """
    try:
        logger.info(
            "Creating reminder with email notifications",
            extra={
                "user_id": str(user.id),
                "email_enabled": reminder.email_notifications_enabled,
                "event_type": reminder.event_type,
                "has_schedule": reminder.notification_schedule is not None,
                "application_id": str(reminder.application_id) if reminder.application_id else None,
                "ai_prep_requested": reminder.ai_prep_tips_enabled,
                "user_plan": user.subscription_plan,
                "user_status": user.subscription_status,
                "has_interview_prep_access": user.has_feature_access('interview_prep'),
            },
        )
        return await svc.create_reminder(
            user_id=user.id,
            title=reminder.title,
            description=reminder.description,
            due_date=reminder.due_date,
            application_id=reminder.application_id,
            create_google_event=reminder.create_google_event,
            add_meet_link=reminder.add_meet_link,
            calendar_id="primary",
            timezone_str=reminder.timezone_str,
            # Email notification fields
            email_notifications_enabled=reminder.email_notifications_enabled,
            notification_schedule=reminder.notification_schedule,
            event_type=reminder.event_type,
            user_timezone=reminder.user_timezone,
            # AI prep tips (Pro/Premium feature)
            ai_prep_tips_enabled=reminder.ai_prep_tips_enabled if user.has_feature_access('interview_prep') else False,
        )
    except Exception as e:
        logger.error(
            "Failed to create reminder",
            extra={"user_id": str(user.id), "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to fetch reminders")


@router.get("/", response_model=List[ReminderResponse])
async def get_reminders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    List all reminders for the current user.
    
    Retrieves paginated list of user's reminders with all details including
    Google Calendar integration status and notification settings.
    
    Query Parameters:
        - skip: Number of records to skip (pagination offset, default: 0)
        - limit: Maximum records to return (pagination size, default: 100, max: 1000)
    
    Args:
        skip: Pagination offset
        limit: Page size
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        List[ReminderResponse]: List of reminders with all details
    
    Raises:
        HTTPException: 500 if retrieval fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User only sees their own reminders
        - Automatic user_id filtering by service
    
    Notes:
        - Results sorted by due_date ascending (soonest first)
        - Includes past reminders (for history tracking)
        - Shows Google Calendar sync status via google_event_id
        - Shows email notification configuration
        - Pagination for performance with large reminder lists
    
    Example:
        GET /api/calendars/reminders?skip=0&limit=50
        Response: Array of ReminderResponse objects
    """
    return await svc.list_reminders(user_id=user.id, skip=skip, limit=limit)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    patch: ReminderUpdate,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Update an existing reminder (partial update).
    
    Updates specific fields of a reminder with PATCH semantics (only provided
    fields updated). Syncs changes to Google Calendar if event linked.
    
    Path Parameters:
        - reminder_id: UUID of the reminder to update
    
    Request Body:
        ReminderUpdate with optional fields:
        - title: New title
        - description: New description
        - due_date: New datetime
        - application_id: New or removed application link
        - email_notifications_enabled: Toggle notifications
        - notification_schedule: Updated notification timing
        - event_type: Updated event category
        - timezone_str: Updated timezone
    
    Args:
        reminder_id: Reminder UUID
        patch: Partial update data (only provided fields updated)
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        ReminderResponse: Updated reminder with new updated_at timestamp
    
    Raises:
        HTTPException: 404 if reminder not found or not owned by user
        HTTPException: 400 if validation fails
        HTTPException: 500 if update or Google sync fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own reminders
        - Ownership verification by service
        - Application linkage validated if changed
    
    Notes:
        - Partial update (PATCH semantics) - only provided fields changed
        - Syncs to Google Calendar if google_event_id present
        - Email notifications rescheduled if due_date changed
        - Timezone changes affect notification delivery time
        - Updated_at timestamp automatically updated
    
    Example:
        PATCH /api/calendars/reminders/550e8400...
        Request: {
            "title": "Updated: Final Interview Round",
            "due_date": "2024-06-16T15:00:00Z"
        }
        Response: Updated ReminderResponse object
    """
    data = patch.model_dump(exclude_none=True)
    tz = data.pop("timezone_str", "UTC")
    return await svc.update_reminder(
        user_id=user.id,
        reminder_id=reminder_id,
        patch=data,
        timezone_str=tz,
    )


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: ReminderService = Depends(get_reminder_service),
):
    """
    Delete a reminder.
    
    Permanently deletes a reminder from Applytide. Optionally deletes from
    Google Calendar if synced. This operation is irreversible.
    
    Path Parameters:
        - reminder_id: UUID of the reminder to delete
    
    Args:
        reminder_id: Reminder UUID
        user: Authenticated user from dependency injection
        svc: Reminder service from dependency injection
    
    Returns:
        204 No Content on successful deletion
    
    Raises:
        HTTPException: 404 if reminder not found or not owned by user
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own reminders
        - Ownership verification by service
    
    Notes:
        - Permanent deletion (no soft delete/recovery)
        - Associated notes also deleted (cascade)
        - Google Calendar event deleted if google_event_id present
        - Scheduled email notifications cancelled
        - Returns 204 No Content on success
    
    Example:
        DELETE /api/calendars/reminders/550e8400...
        Response: 204 No Content
    """
    await svc.delete_reminder(user_id=user.id, reminder_id=reminder_id)
    return
