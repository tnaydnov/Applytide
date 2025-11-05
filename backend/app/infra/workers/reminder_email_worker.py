"""
Enhanced Reminder Email Worker

This module implements a background worker that sends reminder email notifications
based on user-configured schedules with dynamic urgency and timezone support.

Features:
    - Multiple notification types: relative, specific, and recurring
    - Timezone-aware scheduling with user-specific timezones
    - Spam prevention (10-minute cooldown between notifications)
    - Dynamic urgency calculation (now, today, tomorrow, week, future)
    - 5-minute tolerance window for notification timing
    - Graceful error handling with transaction management
    - Comprehensive logging for monitoring and debugging

Notification Types:
    1. Relative: {"value": 1, "unit": "hour", "sent": false}
       - Sends notification X time before due date
    
    2. Specific: {"type": "specific", "datetime": "2025-10-25T19:00:00Z", "sent": false}
       - Sends notification at specific datetime
    
    3. Recurring: {"type": "recurring", "frequency": "daily", "time": "09:00", 
                   "start_days_before": 7, "last_sent": null}
       - Sends daily reminder at specific time within notification window

Configuration Constants:
    LOOP_SECONDS: 300 (5 minutes between worker checks)
    SPAM_PREVENTION_SECONDS: 600 (10 minutes cooldown)
    TIMING_TOLERANCE_SECONDS: 300 (5 minutes window)
    MAX_TITLE_LENGTH: 200
    MAX_DESCRIPTION_LENGTH: 5000
    MAX_TIMEZONE_LENGTH: 50
    MAX_EVENT_TYPE_LENGTH: 50

Usage:
    # Run as standalone worker
    python -m app.infra.workers.reminder_email_worker
    
    # Or import and use in worker process
    from app.infra.workers.reminder_email_worker import main_loop
    main_loop()

Security Notes:
    - All datetime operations use UTC timezone
    - Timezone conversions validated with ZoneInfo
    - SQL queries use SQLAlchemy ORM (no SQL injection risk)
    - Email sending delegated to email_service (HTML sanitization)
    - Database transactions with proper commit/rollback

Example Notification Schedule:
    {
        "type": "once",
        "times": [
            {"value": 1, "unit": "hour", "sent": false},
            {"type": "specific", "datetime": "2025-10-30T14:00:00Z", "sent": false}
        ]
    }
"""
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, DatabaseError
from ...db.session import SessionLocal
from ...db import models
from ...config import settings
from ...infra.notifications.email_service import email_service
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration Constants
LOOP_SECONDS = 300  # Check every 5 minutes
SPAM_PREVENTION_SECONDS = 600  # 10-minute cooldown
TIMING_TOLERANCE_SECONDS = 300  # 5-minute tolerance window
MAX_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 5000
MAX_TIMEZONE_LENGTH = 50
MAX_EVENT_TYPE_LENGTH = 50
MAX_URGENCY_LEVEL_LENGTH = 20

# Urgency level constants
URGENCY_NOW = 'now'
URGENCY_TODAY = 'today'
URGENCY_TOMORROW = 'tomorrow'
URGENCY_WEEK = 'week'
URGENCY_FUTURE = 'future'


# ===== CUSTOM EXCEPTIONS =====

class ReminderWorkerError(Exception):
    """Base exception for reminder worker errors"""
    pass


class ValidationError(ReminderWorkerError):
    """Raised when input validation fails"""
    pass


class NotificationError(ReminderWorkerError):
    """Raised when notification sending fails"""
    pass


class TimezoneError(ReminderWorkerError):
    """Raised when timezone operations fail"""
    pass


class DatabaseOperationError(ReminderWorkerError):
    """Raised when database operations fail"""
    pass


# ===== VALIDATION FUNCTIONS =====

def _validate_title(title: str) -> None:
    """
    Validate reminder title.
    
    Args:
        title: Reminder title to validate
        
    Raises:
        ValidationError: If title is invalid
    """
    if not title or not isinstance(title, str):
        raise ValidationError("Title must be a non-empty string")
    
    if len(title) > MAX_TITLE_LENGTH:
        raise ValidationError(f"Title exceeds maximum length of {MAX_TITLE_LENGTH}")


def _validate_description(description: Optional[str]) -> None:
    """
    Validate reminder description.
    
    Args:
        description: Reminder description to validate
        
    Raises:
        ValidationError: If description is invalid
    """
    if description is not None:
        if not isinstance(description, str):
            raise ValidationError("Description must be a string")
        
        if len(description) > MAX_DESCRIPTION_LENGTH:
            raise ValidationError(f"Description exceeds maximum length of {MAX_DESCRIPTION_LENGTH}")


def _validate_timezone(timezone_str: str) -> None:
    """
    Validate timezone string.
    
    Args:
        timezone_str: Timezone string (e.g., 'America/New_York')
        
    Raises:
        ValidationError: If timezone is invalid
    """
    if not timezone_str or not isinstance(timezone_str, str):
        raise ValidationError("Timezone must be a non-empty string")
    
    if len(timezone_str) > MAX_TIMEZONE_LENGTH:
        raise ValidationError(f"Timezone exceeds maximum length of {MAX_TIMEZONE_LENGTH}")
    
    try:
        ZoneInfo(timezone_str)
    except Exception:
        raise ValidationError(f"Invalid timezone: {timezone_str}")


def _validate_event_type(event_type: Optional[str]) -> None:
    """
    Validate event type.
    
    Args:
        event_type: Event type to validate
        
    Raises:
        ValidationError: If event type is invalid
    """
    if event_type is not None:
        if not isinstance(event_type, str):
            raise ValidationError("Event type must be a string")
        
        if len(event_type) > MAX_EVENT_TYPE_LENGTH:
            raise ValidationError(f"Event type exceeds maximum length of {MAX_EVENT_TYPE_LENGTH}")


def _validate_notification_time(notification_time: Dict[str, Any]) -> None:
    """
    Validate notification time structure.
    
    Args:
        notification_time: Notification time dictionary
        
    Raises:
        ValidationError: If notification time structure is invalid
    """
    if not isinstance(notification_time, dict):
        raise ValidationError("Notification time must be a dictionary")
    
    notification_type = notification_time.get('type')
    
    if notification_type == 'specific':
        if 'datetime' not in notification_time:
            raise ValidationError("Specific notification must have 'datetime' field")
    elif notification_type == 'recurring':
        if 'frequency' not in notification_time:
            raise ValidationError("Recurring notification must have 'frequency' field")
        if 'time' not in notification_time:
            raise ValidationError("Recurring notification must have 'time' field")
    else:
        # Relative notification (default)
        if 'value' not in notification_time or 'unit' not in notification_time:
            raise ValidationError("Relative notification must have 'value' and 'unit' fields")
        
        if not isinstance(notification_time['value'], (int, float)) or notification_time['value'] < 0:
            raise ValidationError("Notification value must be a non-negative number")
        
        if notification_time['unit'] not in ['minute', 'hour', 'day', 'week']:
            raise ValidationError("Notification unit must be 'minute', 'hour', 'day', or 'week'")


# ===== HELPER FUNCTIONS =====

def calculate_urgency(time_until_due: timedelta) -> str:
    """
    Calculate urgency level based on time remaining until due date.
    
    Args:
        time_until_due: Time delta until reminder is due
        
    Returns:
        str: Urgency level ('now', 'today', 'tomorrow', 'week', 'future')
        
    Raises:
        ValidationError: If time_until_due is not a timedelta
        
    Notes:
        - 'now': Already due or within next hour (≤0 seconds)
        - 'today': Within next 6 hours (≤6 hours)
        - 'tomorrow': Within next 24 hours (≤24 hours)
        - 'week': Within next 7 days (≤7 days)
        - 'future': More than 7 days away
    """
    if not isinstance(time_until_due, timedelta):
        raise ValidationError("time_until_due must be a timedelta object")
    
    total_seconds = time_until_due.total_seconds()
    
    logger.debug(
        "Calculating urgency",
        extra={"seconds_until_due": int(total_seconds)}
    )
    
    if total_seconds <= 0:
        return URGENCY_NOW
    elif total_seconds <= 6 * 3600:  # Within 6 hours
        return URGENCY_TODAY
    elif total_seconds <= 24 * 3600:  # Within 24 hours
        return URGENCY_TOMORROW
    elif total_seconds <= 7 * 24 * 3600:  # Within 7 days
        return URGENCY_WEEK
    else:
        return URGENCY_FUTURE


def format_time_until(time_until_due: timedelta) -> str:
    """
    Format time remaining in human-readable format.
    
    Args:
        time_until_due: Time delta until reminder is due
        
    Returns:
        str: Human-readable time string (e.g., "3 hours", "2 days")
        
    Raises:
        ValidationError: If time_until_due is not a timedelta
        
    Notes:
        - Returns "RIGHT NOW" if already due
        - Rounds down to nearest unit (e.g., 90 minutes → "1 hour")
        - Uses appropriate singular/plural forms
    """
    if not isinstance(time_until_due, timedelta):
        raise ValidationError("time_until_due must be a timedelta object")
    
    total_seconds = int(time_until_due.total_seconds())
    
    if total_seconds <= 0:
        return "RIGHT NOW"
    elif total_seconds < 3600:  # Less than 1 hour
        minutes = total_seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    elif total_seconds < 86400:  # Less than 1 day
        hours = total_seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''}"
    elif total_seconds < 604800:  # Less than 1 week
        days = total_seconds // 86400
        return f"{days} day{'s' if days != 1 else ''}"
    else:
        weeks = total_seconds // 604800
        return f"{weeks} week{'s' if weeks != 1 else ''}"


def _parse_iso_datetime(datetime_str: str) -> datetime:
    """
    Parse ISO format datetime string.
    
    Args:
        datetime_str: ISO format datetime string
        
    Returns:
        datetime: Parsed datetime object (timezone-aware)
        
    Raises:
        TimezoneError: If datetime parsing fails
    """
    try:
        from dateutil import parser as date_parser
        dt = date_parser.isoparse(datetime_str)
        
        # Make sure it's timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        return dt
    except Exception as e:
        raise TimezoneError(f"Failed to parse datetime '{datetime_str}': {str(e)}")


def _convert_to_user_timezone(dt: datetime, timezone_str: str) -> datetime:
    """
    Convert datetime to user's timezone.
    
    Args:
        dt: Datetime object to convert (assumed to be UTC if naive)
        timezone_str: Target timezone string (e.g., "Asia/Jerusalem")
        
    Returns:
        datetime: Converted datetime in user's timezone
        
    Raises:
        TimezoneError: If timezone conversion fails
    """
    try:
        # CRITICAL FIX: If datetime is naive (no timezone info), assume it's UTC
        # PostgreSQL DateTime(timezone=True) stores in UTC but SQLAlchemy might return naive datetime
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        user_tz = ZoneInfo(timezone_str)
        return dt.astimezone(user_tz)
    except Exception as e:
        raise TimezoneError(f"Failed to convert to timezone '{timezone_str}': {str(e)}")


def _within_time_window(now: datetime, target: datetime, tolerance_seconds: int = TIMING_TOLERANCE_SECONDS) -> bool:
    """
    Check if current time is within tolerance window of target time.
    
    Args:
        now: Current datetime
        target: Target datetime
        tolerance_seconds: Tolerance window in seconds (default: 300)
        
    Returns:
        bool: True if within tolerance window
    """
    time_diff = abs((now - target).total_seconds())
    return time_diff <= tolerance_seconds


def should_send_notification(
    reminder: models.Reminder,
    notification_time: dict,
    now: datetime
) -> bool:
    """
    Check if a specific notification should be sent based on timing and spam prevention.
    
    Supports multiple notification types:
    1. Relative: {"value": 1, "unit": "hour", "sent": false}
    2. Specific: {"type": "specific", "datetime": "2025-10-25T19:00:00Z", "sent": false}
    3. Recurring: {"type": "recurring", "frequency": "daily", "time": "09:00", 
                   "start_days_before": 7, "last_sent": null}
    
    Args:
        reminder: Reminder model instance
        notification_time: Notification configuration dictionary
        now: Current datetime (timezone-aware UTC)
        
    Returns:
        bool: True if notification should be sent
        
    Raises:
        ValidationError: If notification_time structure is invalid
        TimezoneError: If timezone operations fail
        
    Notes:
        - Enforces 10-minute spam prevention cooldown
        - Uses 5-minute tolerance window for timing
        - Handles timezone conversions for user-specific times
        - Prevents duplicate sends for recurring notifications
    """
    try:
        _validate_notification_time(notification_time)
    except ValidationError as e:
        logger.warning(
            "Invalid notification time structure",
            extra={"reminder_id": str(reminder.id), "error": str(e)}
        )
        return False
    
    if notification_time.get('sent', False):
        return False
    
    # SPAM PREVENTION: Check if we sent ANY notification recently (within last 10 minutes)
    # This prevents duplicate sends from parallel workers or repeated checks
    if reminder.last_notification_sent:
        time_since_last = (now - reminder.last_notification_sent).total_seconds()
        if time_since_last < SPAM_PREVENTION_SECONDS:
            logger.debug(
                f"Skipping notification - sent {int(time_since_last)}s ago",
                extra={"reminder_id": str(reminder.id)}
            )
            return False
    
    notification_type = notification_time.get('type')
    
    # Handle specific datetime notifications
    if notification_type == 'specific':
        specific_datetime_str = notification_time.get('datetime')
        if not specific_datetime_str:
            return False
        
        try:
            specific_datetime = _parse_iso_datetime(specific_datetime_str)
            return _within_time_window(now, specific_datetime)
            
        except TimezoneError as e:
            logger.error(
                "Failed to parse specific datetime",
                extra={
                    "reminder_id": str(reminder.id),
                    "datetime": specific_datetime_str,
                    "error": str(e)
                }
            )
            return False
    
    # Handle recurring daily reminders
    if notification_type == 'recurring':
        frequency = notification_time.get('frequency')
        if frequency != 'daily':
            logger.debug(
                "Unsupported recurring frequency",
                extra={"reminder_id": str(reminder.id), "frequency": frequency}
            )
            return False  # Only daily supported for now
        
        target_time_str = notification_time.get('time', '09:00')  # HH:MM format
        start_days_before = notification_time.get('start_days_before', 7)
        last_sent_str = notification_time.get('last_sent')
        
        # Check if we're within the notification window
        days_until_due = (reminder.due_date - now).total_seconds() / 86400
        if days_until_due > start_days_before or days_until_due < 0:
            return False  # Outside notification window
        
        # Parse target time
        try:
            hour, minute = map(int, target_time_str.split(':'))
            
            # Get user's timezone or default to UTC
            user_tz_str = reminder.user_timezone or 'UTC'
            now_local = _convert_to_user_timezone(now, user_tz_str)
            
            # Create target datetime for today in user's timezone
            target_today = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Check if we're within 5 minutes of target time
            if not _within_time_window(now_local, target_today):
                return False
            
            # Check if we already sent today (prevent multiple sends per day)
            if last_sent_str:
                try:
                    user_tz = ZoneInfo(user_tz_str)
                    last_sent = _parse_iso_datetime(last_sent_str).astimezone(user_tz)
                    # If last sent was today, don't send again
                    if last_sent.date() == now_local.date():
                        logger.debug(
                            "Recurring reminder already sent today",
                            extra={"reminder_id": str(reminder.id)}
                        )
                        return False
                except TimezoneError as e:
                    logger.warning(
                        "Failed to parse last_sent",
                        extra={"reminder_id": str(reminder.id), "error": str(e)}
                    )
            
            return True
            
        except (ValueError, TimezoneError) as e:
            logger.error(
                "Failed to process recurring notification",
                extra={"reminder_id": str(reminder.id), "error": str(e)},
                exc_info=True
            )
            return False
    
    # Handle traditional relative time notifications (default)
    value = notification_time.get('value', 0)
    unit = notification_time.get('unit', 'hour')
    
    # Calculate when this notification should be sent
    if unit == 'minute':
        delta = timedelta(minutes=value)
    elif unit == 'hour':
        delta = timedelta(hours=value)
    elif unit == 'day':
        delta = timedelta(days=value)
    elif unit == 'week':
        delta = timedelta(weeks=value)
    else:
        logger.warning(
            "Invalid notification unit",
            extra={"reminder_id": str(reminder.id), "unit": unit}
        )
        return False
    
    target_time = reminder.due_date - delta
    
    # Send if we're within 5 minutes of the target time
    return _within_time_window(now, target_time)


def send_reminder_notifications(db: Session):
    """
    Check database and send reminder email notifications for due reminders.
    
    Args:
        db: SQLAlchemy database session
        
    Raises:
        DatabaseOperationError: If database operations fail
        NotificationError: If notification sending fails (non-critical)
        
    Notes:
        - Queries reminders with email_notifications_enabled=True
        - Includes reminders up to 6 hours past due (for "now" urgency)
        - Updates notification schedule on successful send
        - Commits changes after each successful notification
        - Continues processing on individual notification errors
        - Comprehensive logging for monitoring
    """
    now = datetime.now(timezone.utc)
    
    logger.info("Checking for reminders to send notifications...")
    
    try:
        # Query reminders that have email notifications enabled and are in the future
        stmt = (
            select(models.Reminder, models.User)
            .join(models.User, models.Reminder.user_id == models.User.id)
            .where(
                models.Reminder.email_notifications_enabled == True,
                models.Reminder.due_date > now - timedelta(hours=6),  # Include recently past events (for "now" urgency)
                models.Reminder.notification_schedule != None
            )
        )
        
        results = db.execute(stmt).all()
        reminders_found = len(results)
        
        logger.info(
            f"Found {reminders_found} reminders with email notifications enabled",
            extra={"count": reminders_found}
        )
        
    except (SQLAlchemyError, DatabaseError) as e:
        logger.error(
            "Failed to query reminders",
            extra={"error": str(e)},
            exc_info=True
        )
        raise DatabaseOperationError(f"Failed to query reminders: {str(e)}")
    
    notifications_sent = 0
    notifications_failed = 0
    
    for reminder, user in results:
        try:
            logger.debug(
                f"Processing reminder: {reminder.title}",
                extra={
                    "reminder_id": str(reminder.id),
                    "user_id": str(user.id),
                    "due_date": str(reminder.due_date),
                    "email_enabled": reminder.email_notifications_enabled,
                    "schedule": reminder.notification_schedule
                }
            )
            
            # Validate reminder data
            try:
                _validate_title(reminder.title)
                _validate_description(reminder.description)
                if reminder.user_timezone:
                    _validate_timezone(reminder.user_timezone)
                if reminder.event_type:
                    _validate_event_type(reminder.event_type)
            except ValidationError as e:
                logger.warning(
                    "Invalid reminder data",
                    extra={"reminder_id": str(reminder.id), "error": str(e)}
                )
                continue
            
            schedule = reminder.notification_schedule or {}
            schedule_type = schedule.get('type', 'once')
            times = schedule.get('times', [])
            
            if not times:
                logger.debug(
                    "No notification times configured",
                    extra={"reminder_id": str(reminder.id)}
                )
                continue
            
            # Check if any notification should be sent
            for idx, notification_time in enumerate(times):
                try:
                    if should_send_notification(reminder, notification_time, now):
                        # Calculate time until due
                        time_until_due = reminder.due_date - now
                        urgency = calculate_urgency(time_until_due)
                        time_until_str = format_time_until(time_until_due)
                        
                        # Convert due_date to user's timezone for display
                        user_tz_str = reminder.user_timezone or 'UTC'
                        try:
                            due_date_local = _convert_to_user_timezone(reminder.due_date, user_tz_str)
                            due_date_str = due_date_local.strftime('%B %d, %Y at %I:%M %p')
                        except TimezoneError as e:
                            # Fallback to UTC if timezone conversion fails
                            logger.warning(
                                "Failed to convert timezone, using UTC",
                                extra={
                                    "reminder_id": str(reminder.id),
                                    "timezone": user_tz_str,
                                    "error": str(e)
                                }
                            )
                            due_date_str = reminder.due_date.strftime('%B %d, %Y at %I:%M %p UTC')
                        
                        # Build action URL - link to pipeline page with application highlighted
                        if reminder.application_id:
                            action_url = f"{settings.FRONTEND_URL}/pipeline?highlight={reminder.application_id}"
                        else:
                            action_url = f"{settings.FRONTEND_URL}/reminders"
                        
                        # Send email
                        try:
                            success = email_service.send_reminder_email(
                                to_email=user.email,
                                name=user.full_name or user.email.split('@')[0],
                                title=reminder.title,
                                description=reminder.description or "",
                                due_date=due_date_str,
                                time_until=time_until_str,
                                urgency=urgency,
                                event_type=reminder.event_type or 'general',
                                action_url=action_url
                            )
                        except Exception as e:
                            logger.error(
                                "Email service error",
                                extra={
                                    "reminder_id": str(reminder.id),
                                    "user_id": str(user.id),
                                    "error": str(e)
                                },
                                exc_info=True
                            )
                            notifications_failed += 1
                            continue
                        
                        if success:
                            # Mark this notification as sent
                            notification_type = times[idx].get('type')
                            
                            if notification_type == 'recurring':
                                # For recurring, update last_sent instead of marking sent
                                times[idx]['last_sent'] = now.isoformat()
                            else:
                                # For one-time notifications, mark as sent
                                times[idx]['sent'] = True
                            
                            try:
                                reminder.notification_schedule = {'type': schedule_type, 'times': times}
                                reminder.last_notification_sent = now
                                db.commit()
                                notifications_sent += 1
                                
                                logger.info(
                                    "Reminder notification sent successfully",
                                    extra={
                                        "reminder_id": str(reminder.id),
                                        "user_id": str(user.id),
                                        "urgency": urgency,
                                        "notification_type": notification_type or "relative"
                                    }
                                )
                            except (SQLAlchemyError, DatabaseError) as e:
                                db.rollback()
                                logger.error(
                                    "Failed to update reminder after sending notification",
                                    extra={
                                        "reminder_id": str(reminder.id),
                                        "error": str(e)
                                    },
                                    exc_info=True
                                )
                                notifications_failed += 1
                        else:
                            notifications_failed += 1
                            logger.error(
                                "Failed to send reminder notification",
                                extra={
                                    "reminder_id": str(reminder.id),
                                    "user_id": str(user.id)
                                }
                            )
                
                except (ValidationError, TimezoneError) as e:
                    logger.warning(
                        "Notification validation error",
                        extra={
                            "reminder_id": str(reminder.id),
                            "notification_index": idx,
                            "error": str(e)
                        }
                    )
                    continue
        
        except Exception as e:
            logger.error(
                "Error processing reminder notification",
                extra={
                    "reminder_id": str(reminder.id),
                    "error": str(e)
                },
                exc_info=True
            )
            continue
    
    logger.info(
        f"Notification processing complete",
        extra={
            "reminders_checked": reminders_found,
            "notifications_sent": notifications_sent,
            "notifications_failed": notifications_failed
        }
    )


def main_loop():
    """
    Main worker loop that continuously checks and sends reminder notifications.
    
    Runs indefinitely until KeyboardInterrupt (Ctrl+C) is received.
    
    Raises:
        KeyboardInterrupt: When user stops the worker
        
    Notes:
        - Checks for reminders every 5 minutes (LOOP_SECONDS)
        - Creates new database session for each iteration
        - Properly closes database sessions
        - Continues running even if errors occur
        - Logs all errors with full stack traces
    """
    logger.info("Reminder notification worker started")
    
    while True:
        try:
            db = SessionLocal()
            try:
                send_reminder_notifications(db)
            except DatabaseOperationError as e:
                logger.error(
                    "Database operation failed in worker loop",
                    extra={"error": str(e)},
                    exc_info=True
                )
            finally:
                db.close()
            
            logger.debug(f"Sleeping for {LOOP_SECONDS} seconds")
            time.sleep(LOOP_SECONDS)
        
        except KeyboardInterrupt:
            logger.info("Reminder notification worker stopped by user")
            break
        except Exception as e:
            logger.error(
                "Unexpected error in worker loop",
                extra={"error": str(e)},
                exc_info=True
            )
            time.sleep(LOOP_SECONDS)


if __name__ == "__main__":
    main_loop()
