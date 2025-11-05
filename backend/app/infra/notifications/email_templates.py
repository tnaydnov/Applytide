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


def password_changed_email(name: str) -> str:
    """Security alert when password is changed using React Email service"""
    try:
        html = email_renderer.render_template('PasswordChangedEmail', {
            'name': name,
            'changedAt': datetime.now().strftime('%B %d, %Y at %I:%M %p %Z')
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


def deletion_confirmation_email(name: str, deletion_date: str, recovery_token: str, recovery_url: str) -> str:
    """Account deletion confirmation with 7-day recovery period using React Email service"""
    try:
        html = email_renderer.render_template('DeletionConfirmationEmail', {
            'name': name, 'deletionDate': deletion_date, 'recoveryUrl': recovery_url
        })
        if html:
            logger.info(f" Rendered deletion confirmation email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render deletion confirmation email: {e}")
        raise


def recovery_success_email(name: str) -> str:
    """Account recovery success confirmation using React Email service"""
    try:
        html = email_renderer.render_template('RecoverySuccessEmail', {'name': name})
        if html:
            logger.info(f" Rendered recovery success email via React Email service for {name}")
            return html
        else:
            raise Exception("Empty HTML returned from React Email service")
    except Exception as e:
        logger.error(f" Failed to render recovery success email: {e}")
        raise


# Legacy alias for compatibility
reminder_email_react = reminder_email
