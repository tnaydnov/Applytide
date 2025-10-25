"""
Enhanced Reminder Email Worker
Sends reminder emails based on user-configured schedules with dynamic urgency
"""
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.orm import Session
from ...db.session import SessionLocal
from ...db import models
from ...config import settings
from ...infra.notifications.email_service import email_service
from ...infra.logging import get_logger

logger = get_logger(__name__)

LOOP_SECONDS = 300  # Check every 5 minutes


def calculate_urgency(time_until_due: timedelta) -> str:
    """
    Calculate urgency level based on time remaining
    Returns: 'now', 'today', 'tomorrow', 'week', 'future'
    """
    total_seconds = time_until_due.total_seconds()
    
    if total_seconds <= 0:
        return 'now'
    elif total_seconds <= 6 * 3600:  # Within 6 hours
        return 'today'
    elif total_seconds <= 24 * 3600:  # Within 24 hours
        return 'tomorrow'
    elif total_seconds <= 7 * 24 * 3600:  # Within 7 days
        return 'week'
    else:
        return 'future'


def format_time_until(time_until_due: timedelta) -> str:
    """Format time remaining in human-readable format"""
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


def should_send_notification(
    reminder: models.Reminder,
    notification_time: dict,
    now: datetime
) -> bool:
    """
    Check if a specific notification should be sent
    Supports multiple notification types:
    1. Relative: {"value": 1, "unit": "hour", "sent": false}
    2. Specific: {"type": "specific", "datetime": "2025-10-25T19:00:00Z", "sent": false}
    3. Recurring: {"type": "recurring", "frequency": "daily", "time": "09:00", "start_days_before": 7, "last_sent": null}
    """
    if notification_time.get('sent', False):
        return False
    
    # SPAM PREVENTION: Check if we sent ANY notification recently (within last 10 minutes)
    # This prevents duplicate sends from parallel workers or repeated checks
    if reminder.last_notification_sent:
        time_since_last = (now - reminder.last_notification_sent).total_seconds()
        if time_since_last < 600:  # 10 minutes
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
            # Parse the specific datetime (should be in ISO format)
            from dateutil import parser as date_parser
            specific_datetime = date_parser.isoparse(specific_datetime_str)
            
            # Make sure it's timezone-aware
            if specific_datetime.tzinfo is None:
                specific_datetime = specific_datetime.replace(tzinfo=timezone.utc)
            
            # Send if we're within 5 minutes of the target time
            time_diff = abs((now - specific_datetime).total_seconds())
            return time_diff <= 300  # 5 minutes tolerance
            
        except Exception as e:
            logger.error(f"Failed to parse specific datetime {specific_datetime_str}: {e}")
            return False
    
    # Handle recurring daily reminders
    if notification_type == 'recurring':
        frequency = notification_time.get('frequency')
        if frequency != 'daily':
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
            user_tz = ZoneInfo(user_tz_str)
            
            # Convert current time to user's timezone
            now_local = now.astimezone(user_tz)
            
            # Create target datetime for today in user's timezone
            target_today = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Check if we're within 5 minutes of target time
            time_diff = abs((now_local - target_today).total_seconds())
            within_window = time_diff <= 300  # 5 minutes tolerance
            
            if not within_window:
                return False
            
            # Check if we already sent today (prevent multiple sends per day)
            if last_sent_str:
                try:
                    from dateutil import parser as date_parser
                    last_sent = date_parser.isoparse(last_sent_str).astimezone(user_tz)
                    # If last sent was today, don't send again
                    if last_sent.date() == now_local.date():
                        logger.debug(f"Recurring reminder already sent today")
                        return False
                except Exception as e:
                    logger.warning(f"Failed to parse last_sent: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process recurring notification: {e}")
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
        return False
    
    target_time = reminder.due_date - delta
    
    # Send if we're within 5 minutes of the target time
    time_diff = abs((now - target_time).total_seconds())
    return time_diff <= 300  # 5 minutes tolerance


def send_reminder_notifications(db: Session):
    """Check and send reminder email notifications"""
    now = datetime.now(timezone.utc)
    
    logger.info("Checking for reminders to send notifications...")
    
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
    
    reminders_found = 0
    for reminder, user in db.execute(stmt).all():
        reminders_found += 1
        try:
            logger.info(
                f"Processing reminder: {reminder.title}",
                extra={
                    "reminder_id": str(reminder.id),
                    "due_date": str(reminder.due_date),
                    "email_enabled": reminder.email_notifications_enabled,
                    "schedule": reminder.notification_schedule
                }
            )
            
            schedule = reminder.notification_schedule or {}
            schedule_type = schedule.get('type', 'once')
            times = schedule.get('times', [])
            
            # Check if any notification should be sent
            for idx, notification_time in enumerate(times):
                if should_send_notification(reminder, notification_time, now):
                    # Calculate time until due
                    time_until_due = reminder.due_date - now
                    urgency = calculate_urgency(time_until_due)
                    time_until_str = format_time_until(time_until_due)
                    
                    # Convert due_date to user's timezone for display
                    user_tz_str = reminder.user_timezone or 'UTC'
                    try:
                        user_tz = ZoneInfo(user_tz_str)
                        due_date_local = reminder.due_date.astimezone(user_tz)
                        due_date_str = due_date_local.strftime('%B %d, %Y at %I:%M %p')
                    except Exception as e:
                        # Fallback to UTC if timezone conversion fails
                        logger.warning(f"Failed to convert timezone {user_tz_str}: {e}")
                        due_date_str = reminder.due_date.strftime('%B %d, %Y at %I:%M %p UTC')
                    
                    # Build action URL - link to pipeline page with application highlighted
                    if reminder.application_id:
                        action_url = f"{settings.FRONTEND_URL}/pipeline?highlight={reminder.application_id}"
                    else:
                        action_url = f"{settings.FRONTEND_URL}/reminders"
                    
                    # Send email
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
                    
                    if success:
                        # Mark this notification as sent
                        notification_type = times[idx].get('type')
                        
                        if notification_type == 'recurring':
                            # For recurring, update last_sent instead of marking sent
                            times[idx]['last_sent'] = now.isoformat()
                        else:
                            # For one-time notifications, mark as sent
                            times[idx]['sent'] = True
                        
                        reminder.notification_schedule = {'type': schedule_type, 'times': times}
                        reminder.last_notification_sent = now
                        db.commit()
                        
                        logger.info(
                            "Reminder notification sent",
                            extra={
                                "reminder_id": str(reminder.id),
                                "user_id": str(user.id),
                                "urgency": urgency,
                                "notification_type": notification_type or "relative"
                            }
                        )
                    else:
                        logger.error(
                            "Failed to send reminder notification",
                            extra={
                                "reminder_id": str(reminder.id),
                                "user_id": str(user.id)
                            }
                        )
        
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
    
    logger.info(f"Processed {reminders_found} reminders with email notifications enabled")


def main_loop():
    """Main worker loop"""
    logger.info("Reminder notification worker started")
    
    while True:
        try:
            db = SessionLocal()
            try:
                send_reminder_notifications(db)
            finally:
                db.close()
            
            time.sleep(LOOP_SECONDS)
        
        except KeyboardInterrupt:
            logger.info("Reminder notification worker stopped")
            break
        except Exception as e:
            logger.error(
                "Reminder notification worker error",
                extra={"error": str(e)},
                exc_info=True
            )
            time.sleep(LOOP_SECONDS)


if __name__ == "__main__":
    main_loop()
