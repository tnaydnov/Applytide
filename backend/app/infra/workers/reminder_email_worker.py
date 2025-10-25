"""
Enhanced Reminder Email Worker
Sends reminder emails based on user-configured schedules with dynamic urgency
"""
import time
from datetime import datetime, timedelta, timezone
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
    notification_time format: {"value": 1, "unit": "hour", "sent": false}
    """
    if notification_time.get('sent', False):
        return False
    
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
    
    for reminder, user in db.execute(stmt).all():
        try:
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
                    
                    # Format due date
                    due_date_str = reminder.due_date.strftime('%B %d, %Y at %I:%M %p')
                    
                    # Build action URL
                    if reminder.application_id:
                        action_url = f"{settings.FRONTEND_URL}/applications/{reminder.application_id}"
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
                        times[idx]['sent'] = True
                        reminder.notification_schedule = {'type': schedule_type, 'times': times}
                        reminder.last_notification_sent = now
                        db.commit()
                        
                        logger.info(
                            "Reminder notification sent",
                            extra={
                                "reminder_id": str(reminder.id),
                                "user_id": str(user.id),
                                "urgency": urgency
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
