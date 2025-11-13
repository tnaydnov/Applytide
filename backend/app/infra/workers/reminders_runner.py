"""
Reminders Worker Module

This module provides a background worker that continuously monitors and sends
reminder notifications for upcoming interviews and follow-up actions.

Features:
    - Upcoming interview notifications (24-hour window)
    - Follow-up reminders for applied positions (3+ days)
    - Email reminder notifications via worker
    - Comprehensive error handling with graceful degradation
    - Detailed logging for worker operations
    - Automatic database session cleanup

The worker runs in an infinite loop, checking for reminders every 60 seconds.

Constants:
    FOLLOW_UP_DAYS: Days after application to send follow-up reminder (3)
    LOOP_SECONDS: Seconds between reminder checks (60)
    INTERVIEW_WINDOW_HOURS: Hours in advance to notify about interviews (24)

Example:
    >>> from app.infra.workers.reminders_runner import main_loop
    >>> 
    >>> # Run worker (blocks indefinitely)
    >>> main_loop()
    
Usage:
    Run as background process:
    $ python -m app.infra.workers.reminders_runner
"""

from __future__ import annotations
import logging
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from ...db.session import SessionLocal
from ...db import models
from ...config import settings
from ...infra.notifications.email_service import email_service

# Import the reminder email worker function
from .reminder_email_worker import send_reminder_notifications

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration Constants
# ============================================================================

# Reminder timing
FOLLOW_UP_DAYS = 3  # Send follow-up reminder after 3 days
LOOP_SECONDS = 60  # Check for reminders every 60 seconds
INTERVIEW_WINDOW_HOURS = 24  # Notify 24 hours before interview

# Email retry settings
MAX_EMAIL_RETRIES = 3
EMAIL_RETRY_DELAY = 5  # seconds

# ============================================================================
# Helper Functions
# ============================================================================

def _utcnow() -> datetime:
    """
    Get current UTC datetime with timezone info.
    
    Returns:
        Timezone-aware current UTC datetime
    """
    return datetime.now(timezone.utc)

def _safe_close_db(db) -> None:
    """
    Safely close database session, suppressing errors.
    
    Args:
        db: Database session to close
    """
    if db:
        try:
            db.close()
        except Exception as e:
            logger.warning(f"Failed to close database session: {e}")

# ============================================================================
# Reminder Check Functions
# ============================================================================

def check_upcoming_interviews(db) -> int:
    """
    Check for upcoming interviews and send email notifications.
    
    Finds all stages with scheduled interviews in the next 24 hours
    and sends email notifications to users.
    
    Args:
        db: Database session
        
    Returns:
        Number of interview notifications sent
        
    Notes:
        - Suppresses individual email errors (continues with remaining)
        - Logs each email attempt
        - Includes application URL in email
    """
    # EMERGENCY STOP: Disable interview emails - missing reminder_sent_at field causes infinite loop
    logger.warning("⚠️ INTERVIEW REMINDERS TEMPORARILY DISABLED - Missing reminder_sent_at field in Stage model")
    return 0
    
    try:
        now = _utcnow()
        soon = now + timedelta(hours=INTERVIEW_WINDOW_HOURS)
        
        logger.debug(
            "Checking for upcoming interviews",
            extra={
                "window_start": now.isoformat(),
                "window_end": soon.isoformat(),
            }
        )
        
        # Query stages with upcoming interviews
        try:
            stmt = (
                select(models.Stage, models.Application, models.User)
                .join(models.Application, models.Stage.application_id == models.Application.id)
                .join(models.User, models.Application.user_id == models.User.id)
                .where(
                    models.Stage.scheduled_at != None,  # noqa: E711
                    models.Stage.scheduled_at.between(now, soon)
                )
            )
            results = db.execute(stmt).all()
        except SQLAlchemyError as e:
            logger.error(
                "Failed to query upcoming interviews",
                exc_info=True,
                extra={"error": str(e)}
            )
            return 0
        
        sent_count = 0
        
        # Send email for each upcoming interview
        for stage, app, user in results:
            try:
                url = f"{settings.APP_BASE_URL}/applications/{app.id}"
                
                logger.debug(
                    "Sending interview reminder",
                    extra={
                        "user_email": user.email,
                        "stage_name": stage.name,
                        "application_id": str(app.id),
                        "scheduled_at": stage.scheduled_at.isoformat(),
                    }
                )
                
                email_service._send_email(
                    to_email=user.email,
                    subject=f"Interview coming up: {stage.name}",
                    html_content=f"<p>You have '{stage.name}' scheduled soon.</p>"
                                f"<p>Open: <a href='{url}'>{url}</a></p>"
                )
                
                sent_count += 1
                
                logger.info(
                    "Interview reminder sent",
                    extra={
                        "user_email": user.email,
                        "stage_name": stage.name,
                        "application_id": str(app.id),
                    }
                )
                
            except Exception as e:
                # Log error but continue with other reminders
                logger.error(
                    "Failed to send interview reminder",
                    exc_info=True,
                    extra={
                        "user_email": user.email if user else None,
                        "stage_name": stage.name if stage else None,
                        "error": str(e),
                    }
                )
                continue
        
        logger.info(
            "Upcoming interview check complete",
            extra={
                "total_found": len(results),
                "emails_sent": sent_count,
            }
        )
        
        return sent_count
        
    except Exception as e:
        logger.error(
            "Unexpected error in check_upcoming_interviews",
            exc_info=True,
            extra={"error": str(e)}
        )
        return 0

def check_followups(db) -> int:
    """
    Check for applications needing follow-up and send reminders.
    
    Finds all applications in "Applied" status that are 3+ days old
    and sends follow-up reminder emails to users.
    
    Args:
        db: Database session
        
    Returns:
        Number of follow-up reminders sent
        
    Notes:
        - Only checks "Applied" status applications
        - Suppresses individual email errors (continues with remaining)
        - Logs each email attempt
        - Includes application URL in email
    """
    # EMERGENCY STOP: Disable follow-up emails - missing tracking field causes infinite loop
    logger.warning("⚠️ FOLLOW-UP REMINDERS TEMPORARILY DISABLED - Missing follow_up_sent_at field in Application model")
    return 0
    
    try:
        cutoff = _utcnow() - timedelta(days=FOLLOW_UP_DAYS)
        
        logger.debug(
            "Checking for follow-up reminders",
            extra={
                "cutoff_date": cutoff.isoformat(),
                "days": FOLLOW_UP_DAYS,
            }
        )
        
        # Query applications needing follow-up
        try:
            stmt = (
                select(models.Application, models.User)
                .join(models.User, models.Application.user_id == models.User.id)
                .where(
                    models.Application.status == "Applied",
                    models.Application.created_at < cutoff
                )
            )
            results = db.execute(stmt).all()
        except SQLAlchemyError as e:
            logger.error(
                "Failed to query follow-up applications",
                exc_info=True,
                extra={"error": str(e)}
            )
            return 0
        
        sent_count = 0
        
        # Send email for each application needing follow-up
        for app, user in results:
            try:
                url = f"{settings.APP_BASE_URL}/applications/{app.id}"
                
                logger.debug(
                    "Sending follow-up reminder",
                    extra={
                        "user_email": user.email,
                        "application_id": str(app.id),
                        "created_at": app.created_at.isoformat(),
                    }
                )
                
                email_service._send_email(
                    to_email=user.email,
                    subject="Time to follow up",
                    html_content=f"<p>It's been {FOLLOW_UP_DAYS}+ days since you applied. "
                                f"Consider following up.</p>"
                                f"<p>Open: <a href='{url}'>{url}</a></p>"
                )
                
                sent_count += 1
                
                logger.info(
                    "Follow-up reminder sent",
                    extra={
                        "user_email": user.email,
                        "application_id": str(app.id),
                    }
                )
                
            except Exception as e:
                # Log error but continue with other reminders
                logger.error(
                    "Failed to send follow-up reminder",
                    exc_info=True,
                    extra={
                        "user_email": user.email if user else None,
                        "application_id": str(app.id) if app else None,
                        "error": str(e),
                    }
                )
                continue
        
        logger.info(
            "Follow-up check complete",
            extra={
                "total_found": len(results),
                "emails_sent": sent_count,
            }
        )
        
        return sent_count
        
    except Exception as e:
        logger.error(
            "Unexpected error in check_followups",
            exc_info=True,
            extra={"error": str(e)}
        )
        return 0

# ============================================================================
# Main Worker Loop
# ============================================================================

def main_loop() -> None:
    """
    Main reminder worker loop.
    
    Runs indefinitely, checking for reminders every LOOP_SECONDS (60s).
    Each iteration:
    1. Creates database session
    2. Checks for upcoming interviews
    3. Checks for follow-up reminders
    4. Sends reminder email notifications
    5. Closes database session
    6. Sleeps for LOOP_SECONDS
    
    The loop continues even if individual checks fail, ensuring the worker
    remains operational.
    
    Notes:
        - Blocks indefinitely (run as background process)
        - Handles database errors gracefully
        - Logs all operations for monitoring
        - Automatically closes database sessions
        - Sleeps between iterations to avoid overload
        
    Example:
        >>> # Run as main program
        >>> if __name__ == "__main__":
        ...     main_loop()
    """
    logger.info("Starting reminder worker with email notifications...")
    
    iteration = 0
    
    while True:
        iteration += 1
        db = None
        
        try:
            logger.debug(
                "Starting reminder check iteration",
                extra={"iteration": iteration}
            )
            
            # Create database session
            try:
                db = SessionLocal()
            except Exception as e:
                logger.error(
                    "Failed to create database session, skipping iteration",
                    exc_info=True,
                    extra={
                        "iteration": iteration,
                        "error": str(e),
                    }
                )
                time.sleep(LOOP_SECONDS)
                continue
            
            # Check for upcoming interviews
            interview_count = 0
            try:
                interview_count = check_upcoming_interviews(db)
            except Exception as e:
                logger.error(
                    "Interview check failed",
                    exc_info=True,
                    extra={
                        "iteration": iteration,
                        "error": str(e),
                    }
                )
            
            # Check for follow-ups
            followup_count = 0
            try:
                followup_count = check_followups(db)
            except Exception as e:
                logger.error(
                    "Follow-up check failed",
                    exc_info=True,
                    extra={
                        "iteration": iteration,
                        "error": str(e),
                    }
                )
            
            # Send reminder email notifications
            try:
                send_reminder_notifications(db)
            except Exception as e:
                logger.error(
                    "Reminder notification worker failed",
                    exc_info=True,
                    extra={
                        "iteration": iteration,
                        "error": str(e),
                    }
                )
            
            logger.info(
                "Reminder check iteration complete",
                extra={
                    "iteration": iteration,
                    "interview_reminders": interview_count,
                    "followup_reminders": followup_count,
                }
            )
            
        except Exception as e:
            # Catch-all for unexpected errors
            logger.error(
                "Worker error in main loop",
                exc_info=True,
                extra={
                    "iteration": iteration,
                    "error": str(e),
                }
            )
        finally:
            # Always close database session
            _safe_close_db(db)
        
        # Sleep until next iteration
        logger.debug(f"Sleeping for {LOOP_SECONDS} seconds")
        time.sleep(LOOP_SECONDS)

# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    main_loop()
