"""
Email Templates for Applytide - React Email Service Integration
All templates now use the React Email microservice for consistent, modern designs
"""
from typing import Optional, Dict, Any
from .email_renderer import email_renderer
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def welcome_email(name: str, email: str) -> str:
    """Welcome email for new users using React Email service"""
    try:
        html = email_renderer.render_template('WelcomeEmail', {'name': name})
        if html:
            logger.info(f" Rendered welcome email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render welcome email: {e}")
        raise


def password_changed_email(name: str, user_timezone: str = 'UTC') -> str:
    """Security alert when password is changed using React Email service"""
    try:
        from datetime import datetime, timezone
        from zoneinfo import ZoneInfo
        
        # Get current time in user's timezone
        now_utc = datetime.now(timezone.utc)
        try:
            user_tz = ZoneInfo(user_timezone)
            now_local = now_utc.astimezone(user_tz)
            formatted_time = now_local.strftime('%B %d, %Y at %I:%M %p')
        except Exception as tz_error:
            logger.warning(f"Invalid timezone {user_timezone}, using UTC: {tz_error}")
            formatted_time = now_utc.strftime('%B %d, %Y at %I:%M %p UTC')
        
        html = email_renderer.render_template('PasswordChangedEmail', {
            'name': name,
            'changedAt': formatted_time
        })
        if html:
            logger.info(f" Rendered password changed email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render password changed email: {e}")
        raise


def account_deleted_email(name: str) -> str:
    """Confirmation email after account deletion using React Email service"""
    try:
        html = email_renderer.render_template('AccountDeletedEmail', {'name': name})
        if html:
            logger.info(f" Rendered account deleted email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render account deleted email: {e}")
        raise


def reminder_email(
    name: str, title: str, description: str, due_date: str, time_until: str,
    urgency: str, event_type: str, action_url: str, ai_prep_tips: Optional[Dict[str, Any]] = None
) -> str:
    """Render reminder email using React Email service"""
    try:
        html = email_renderer.render_template('ReminderEmail', {
            'name': name, 'title': title, 'description': description, 'dueDate': due_date,
            'timeUntil': time_until, 'urgency': urgency, 'eventType': event_type,
            'actionUrl': action_url, 'aiPrepTips': ai_prep_tips
        })
        if html:
            logger.info(f" Rendered reminder email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render reminder email: {e}")
        raise


def verify_email(verify_url: str) -> str:
    """Email verification template using React Email service"""
    try:
        html = email_renderer.render_template('VerifyEmailTemplate', {
            'verifyUrl': verify_url
        })
        if html:
            logger.info(f" Rendered verification email via React Email service")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render verification email: {e}")
        raise


def password_reset_email(reset_url: str) -> str:
    """Password reset email template using React Email service"""
    try:
        html = email_renderer.render_template('PasswordResetEmail', {
            'resetUrl': reset_url
        })
        if html:
            logger.info(f" Rendered password reset email via React Email service")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render password reset email: {e}")
        raise


# Legacy alias for compatibility
reminder_email_react = reminder_email


