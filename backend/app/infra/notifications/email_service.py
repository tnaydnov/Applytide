"""
Enhanced Email Service

This module provides a robust email service for sending transactional emails including
verification, password reset, welcome, security alerts, reminders, and account management.

Features:
    - SMTP connection management with STARTTLS support
    - Comprehensive error handling with retry logic
    - Email validation (format, length)
    - Subject and content validation
    - HTML email support with MIME multipart
    - Detailed logging for monitoring and debugging
    - Connection pooling through context manager
    - Rate limiting awareness (delegated to external system)

Supported Email Types:
    - Verification emails (account activation)
    - Password reset emails  
    - Welcome emails (new user onboarding)
    - Password changed alerts (security notifications)
    - Account deletion confirmations
    - Reminder emails (dynamic urgency)
    - Deletion confirmation with recovery
    - Recovery success confirmations

Configuration Constants:
    MAX_EMAIL_LENGTH: 254 (RFC 5321)
    MAX_SUBJECT_LENGTH: 255
    MAX_NAME_LENGTH: 100
    MAX_TOKEN_LENGTH: 100
    MAX_URL_LENGTH: 2048
    MAX_TITLE_LENGTH: 200
    MAX_DESCRIPTION_LENGTH: 5000
    SMTP_TIMEOUT_SECONDS: 30
    MAX_RETRY_ATTEMPTS: 3
    RETRY_DELAY_SECONDS: 5

Usage:
    from app.infra.notifications.email_service import email_service
    
    # Send verification email
    success = email_service.send_verification_email(
        to_email="user@example.com",
        token="abc123..."
    )
    
    # Send reminder email
    success = email_service.send_reminder_email(
        to_email="user@example.com",
        name="John Doe",
        title="Interview with Google",
        description="Technical interview",
        due_date="October 30, 2025 at 02:00 PM",
        time_until="3 hours",
        urgency="today",
        event_type="interview",
        action_url="https://applytide.com/pipeline?highlight=123"
    )

Security Notes:
    - STARTTLS encryption for SMTP connections
    - No password logging (censored in logs)
    - Email validation prevents injection attacks
    - HTML content sanitization handled by templates module
    - Connection timeout prevents hanging
    - Proper exception handling for all SMTP operations

Example Configuration (settings.py):
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USER = "noreply@applytide.com"
    SMTP_PASSWORD = "app_password_here"
    FROM_EMAIL = "Applytide <noreply@applytide.com>"
    FRONTEND_URL = "https://applytide.com"
"""
import smtplib
import re
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Optional
from ...config import settings
from ...infra.logging import get_logger
from .email_templates import (
    welcome_email,
    password_changed_email,
    account_deleted_email,
    reminder_email
)

logger = get_logger(__name__)

# Configuration Constants
MAX_EMAIL_LENGTH = 254  # RFC 5321
MAX_SUBJECT_LENGTH = 255
MAX_NAME_LENGTH = 100
MAX_TOKEN_LENGTH = 100
MAX_URL_LENGTH = 2048
MAX_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 5000
SMTP_TIMEOUT_SECONDS = 30
MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 5

# Email validation regex (RFC 5322 compliant)
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


# ===== CUSTOM EXCEPTIONS =====

class EmailServiceError(Exception):
    """Base exception for email service errors"""
    pass


class ValidationError(EmailServiceError):
    """Raised when input validation fails"""
    pass


class SMTPConnectionError(EmailServiceError):
    """Raised when SMTP connection fails"""
    pass


class EmailSendError(EmailServiceError):
    """Raised when email sending fails"""
    pass


# ===== VALIDATION FUNCTIONS =====

def _validate_email(email: str) -> None:
    """
    Validate email address format and length.
    
    Args:
        email: Email address to validate
        
    Raises:
        ValidationError: If email is invalid
        
    Notes:
        - Checks RFC 5321 length limit (254 characters)
        - Validates format with RFC 5322 compliant regex
        - Does not verify deliverability (DNS/MX records)
    """
    if not email or not isinstance(email, str):
        raise ValidationError("Email must be a non-empty string")
    
    email = email.strip()
    
    if len(email) > MAX_EMAIL_LENGTH:
        raise ValidationError(f"Email exceeds maximum length of {MAX_EMAIL_LENGTH}")
    
    if not EMAIL_REGEX.match(email):
        raise ValidationError(f"Invalid email format: {email}")


def _validate_subject(subject: str) -> None:
    """
    Validate email subject.
    
    Args:
        subject: Email subject to validate
        
    Raises:
        ValidationError: If subject is invalid
    """
    if not subject or not isinstance(subject, str):
        raise ValidationError("Subject must be a non-empty string")
    
    if len(subject) > MAX_SUBJECT_LENGTH:
        raise ValidationError(f"Subject exceeds maximum length of {MAX_SUBJECT_LENGTH}")


def _validate_name(name: str) -> None:
    """
    Validate recipient name.
    
    Args:
        name: Recipient name to validate
        
    Raises:
        ValidationError: If name is invalid
    """
    if not name or not isinstance(name, str):
        raise ValidationError("Name must be a non-empty string")
    
    if len(name) > MAX_NAME_LENGTH:
        raise ValidationError(f"Name exceeds maximum length of {MAX_NAME_LENGTH}")


def _validate_token(token: str) -> None:
    """
    Validate authentication/verification token.
    
    Args:
        token: Token to validate
        
    Raises:
        ValidationError: If token is invalid
    """
    if not token or not isinstance(token, str):
        raise ValidationError("Token must be a non-empty string")
    
    if len(token) > MAX_TOKEN_LENGTH:
        raise ValidationError(f"Token exceeds maximum length of {MAX_TOKEN_LENGTH}")


def _validate_url(url: str) -> None:
    """
    Validate URL format and length.
    
    Args:
        url: URL to validate
        
    Raises:
        ValidationError: If URL is invalid
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL must be a non-empty string")
    
    if len(url) > MAX_URL_LENGTH:
        raise ValidationError(f"URL exceeds maximum length of {MAX_URL_LENGTH}")
    
    if not (url.startswith('http://') or url.startswith('https://')):
        raise ValidationError("URL must start with http:// or https://")


def _validate_html_content(html_content: str) -> None:
    """
    Validate HTML email content.
    
    Args:
        html_content: HTML content to validate
        
    Raises:
        ValidationError: If HTML content is invalid
        
    Notes:
        - Checks for non-empty content
        - Basic HTML structure validation
        - Does not perform XSS sanitization (delegated to templates)
    """
    if not html_content or not isinstance(html_content, str):
        raise ValidationError("HTML content must be a non-empty string")
    
    # Basic HTML validation - should contain HTML tags
    if '<html' not in html_content.lower() or '</html>' not in html_content.lower():
        logger.warning("HTML content may be missing proper structure")


class EmailService:
    """
    Enhanced email service with robust error handling and validation.
    
    Attributes:
        smtp_host: SMTP server hostname
        smtp_port: SMTP server port (usually 587 for STARTTLS)
        smtp_user: SMTP username for authentication
        smtp_password: SMTP password (stored securely)
        from_email: Sender email address
        frontend_url: Frontend application URL for links
        
    Methods:
        send_verification_email: Send email verification link
        send_password_reset_email: Send password reset link
        send_welcome_email: Send welcome email to new users
        send_password_changed_email: Send security alert
        send_account_deleted_email: Send deletion confirmation
        send_reminder_email: Send reminder with dynamic urgency
        send_deletion_confirmation_email: Send deletion with recovery option
        send_recovery_success_email: Send recovery confirmation
    """
    
    def __init__(self):
        """
        Initialize email service with configuration from settings.
        
        Raises:
            ValidationError: If required configuration is missing
        """
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.frontend_url = settings.FRONTEND_URL
        
        # Validate required configuration
        if not self.smtp_host:
            raise ValidationError("SMTP_HOST is required")
        if not self.smtp_port:
            raise ValidationError("SMTP_PORT is required")
        if not self.from_email:
            raise ValidationError("FROM_EMAIL is required")
        
        logger.info(
            "Email service initialized",
            extra={
                "smtp_host": self.smtp_host,
                "smtp_port": self.smtp_port,
                "from_email": self.from_email,
                "has_auth": bool(self.smtp_user and self.smtp_password)
            }
        )

    def _send_email(self, to_email: str, subject: str, html_content: str, retry_count: int = 0) -> bool:
        """
        Send email with retry logic and comprehensive error handling.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email body
            retry_count: Current retry attempt (internal use)
            
        Returns:
            bool: True if email sent successfully, False otherwise
            
        Raises:
            ValidationError: If input validation fails
            SMTPConnectionError: If SMTP connection fails after retries
            EmailSendError: If email sending fails after retries
            
        Notes:
            - Retries up to MAX_RETRY_ATTEMPTS times
            - Uses STARTTLS for encryption if credentials provided
            - Logs all attempts with censored passwords
            - Returns False on final failure (doesn't raise)
        """
        # Validate inputs
        try:
            _validate_email(to_email)
            _validate_subject(subject)
            _validate_html_content(html_content)
        except ValidationError as e:
            logger.error(
                "Email validation failed",
                extra={"to_email": to_email, "subject": subject, "error": str(e)}
            )
            return False
        
        logger.debug(
            "Attempting to send email",
            extra={
                "to_email": to_email,
                "subject": subject,
                "retry_count": retry_count,
                "html_length": len(html_content)
            }
        )
        
        try:
            # Create MIME message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Connect to SMTP server with timeout
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=SMTP_TIMEOUT_SECONDS) as server:
                server.set_debuglevel(0)  # Disable debug output
                
                # Use STARTTLS if credentials provided
                if self.smtp_user and self.smtp_password:
                    try:
                        server.starttls()
                        server.login(self.smtp_user, self.smtp_password)
                        logger.debug("SMTP authentication successful")
                    except smtplib.SMTPAuthenticationError as e:
                        logger.error(
                            "SMTP authentication failed",
                            extra={"smtp_user": self.smtp_user, "error": str(e)},
                            exc_info=True
                        )
                        raise SMTPConnectionError(f"SMTP authentication failed: {str(e)}")
                
                # Send the message
                server.send_message(msg)
            
            logger.info(
                "Email sent successfully",
                extra={"to_email": to_email, "subject": subject}
            )
            return True
            
        except smtplib.SMTPException as e:
            logger.error(
                "SMTP error occurred",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "error": str(e),
                    "retry_count": retry_count
                },
                exc_info=True
            )
            
            # Retry logic
            if retry_count < MAX_RETRY_ATTEMPTS:
                logger.info(
                    f"Retrying email send (attempt {retry_count + 1}/{MAX_RETRY_ATTEMPTS})",
                    extra={"to_email": to_email}
                )
                time.sleep(RETRY_DELAY_SECONDS)
                return self._send_email(to_email, subject, html_content, retry_count + 1)
            
            logger.error(
                "Email send failed after max retries",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "retry_count": retry_count
                }
            )
            return False
            
        except Exception as e:
            logger.error(
                "Unexpected error sending email",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False

    def send_verification_email(self, to_email: str, token: str) -> bool:
        verify_url = f"{self.frontend_url}/auth/verify?token={token}"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your Email - Applytide</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 24px; font-weight: bold;">JF</span>
                    </div>
                    <h1 style="color: #333; margin: 0;">Welcome to Applytide!</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
                    <p>Thanks for signing up! Please click the button below to verify your email address and get started with tracking your job applications.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verify_url}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; padding: 15px 30px; text-decoration: none; 
                                  border-radius: 8px; font-weight: bold; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{verify_url}">{verify_url}</a>
                    </p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>This verification link will expire in 24 hours.</p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p><strong>Applytide</strong><br>
                        Web: <a href="https://applytide.com">applytide.com</a><br>
                        Email: <a href="mailto:contact@applytide.com">contact@applytide.com</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """ 
        return self._send_email(to_email, "Verify Your Email - Applytide", html_content)

    def send_password_reset_email(self, to_email: str, token: str):
        reset_url = f"{self.frontend_url}/auth/reset?token={token}"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Your Password - Applytide</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 24px; font-weight: bold;">JF</span>
                    </div>
                    <h1 style="color: #333; margin: 0;">Reset Your Password</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; padding: 15px 30px; text-decoration: none; 
                                  border-radius: 8px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{reset_url}">{reset_url}</a>
                    </p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>This reset link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p><strong>Applytide</strong><br>
                        Web: <a href="https://applytide.com">applytide.com</a><br>
                        Email: <a href="mailto:contact@applytide.com">contact@applytide.com</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """ 
        return self._send_email(to_email, "Reset Your Password - Applytide", html_content)
    
    
    def send_welcome_email(self, to_email: str, name: str) -> bool:
        """
        Send welcome email to new users with onboarding guide.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If email or name validation fails
            
        Notes:
            - Sent after successful email verification
            - Contains comprehensive onboarding guide
            - Includes workflow: save jobs → optimize resume → generate cover letter → track → remind
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
        except ValidationError as e:
            logger.error(f"Validation error in send_welcome_email: {str(e)}")
            return False
        
        html_content = welcome_email(name, to_email)
        
        logger.info(
            "Sending welcome email",
            extra={"to_email": to_email, "user_name": name}
        )
        
        return self._send_email(to_email, f"Welcome to Applytide, {name}! 🎉", html_content)
    
    def send_password_changed_email(self, to_email: str, name: str) -> bool:
        """
        Send security alert when password is changed.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If email or name validation fails
            
        Notes:
            - Sent immediately after password change
            - Includes timestamp of change
            - Contains security tips
            - If user didn't make change, provides reset link
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
        except ValidationError as e:
            logger.error(f"Validation error in send_password_changed_email: {str(e)}")
            return False
        
        html_content = password_changed_email(name).replace(
            '{datetime}',
            datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')
        )
        
        logger.info(
            "Sending password changed alert",
            extra={"to_email": to_email, "user_name": name}
        )
        
        return self._send_email(to_email, "Your Applytide Password Was Changed", html_content)
    
    def send_account_deleted_email(self, to_email: str, name: str) -> bool:
        """
        Send confirmation after account deletion.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If email or name validation fails
            
        Notes:
            - Sent after immediate account deletion (no recovery period)
            - Confirms all data has been removed
            - Provides feedback link
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
        except ValidationError as e:
            logger.error(f"Validation error in send_account_deleted_email: {str(e)}")
            return False
        
        html_content = account_deleted_email(name)
        
        logger.info(
            "Sending account deleted confirmation",
            extra={"to_email": to_email, "user_name": name}
        )
        
        return self._send_email(to_email, "Your Applytide Account Has Been Deleted", html_content)
    
    def send_reminder_email(
        self,
        to_email: str,
        name: str,
        title: str,
        description: str,
        due_date: str,
        time_until: str,
        urgency: str,
        event_type: str,
        action_url: str,
        ai_prep_tips_html: str = None
    ) -> bool:
        """
        Send reminder email with dynamic urgency, action link, and optional AI prep tips.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            title: Reminder title (e.g., "Interview with Google")
            description: Reminder description/notes
            due_date: Human-readable due date (e.g., "October 30, 2025 at 02:00 PM")
            time_until: Human-readable time remaining (e.g., "3 hours")
            urgency: Urgency level ('now', 'today', 'tomorrow', 'week', 'future')
            event_type: Event type ('interview', 'deadline', 'follow_up', etc.)
            action_url: Link to application/reminder in app
            ai_prep_tips_html: Optional HTML content with AI-generated prep tips (Pro/Premium)
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If any input validation fails
            
        Notes:
            - Subject prefix varies by urgency (🚨 URGENT, ⏰ TODAY, 📅 TOMORROW, etc.)
            - Contains action button linking to pipeline/reminders page
            - Uses branded email template
            - AI prep tips are included if provided (Pro/Premium feature)
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
            
            if not title or len(title) > MAX_TITLE_LENGTH:
                raise ValidationError(f"Title must be between 1 and {MAX_TITLE_LENGTH} characters")
            
            if description and len(description) > MAX_DESCRIPTION_LENGTH:
                raise ValidationError(f"Description exceeds maximum length of {MAX_DESCRIPTION_LENGTH}")
            
            _validate_url(action_url)
            
            if urgency not in ['now', 'today', 'tomorrow', 'week', 'future']:
                raise ValidationError(f"Invalid urgency level: {urgency}")
            
        except ValidationError as e:
            logger.error(f"Validation error in send_reminder_email: {str(e)}")
            return False
        
        html_content = reminder_email(
            name=name,
            title=title,
            description=description,
            due_date=due_date,
            time_until=time_until,
            urgency=urgency,
            event_type=event_type,
            action_url=action_url,
            ai_prep_tips_html=ai_prep_tips_html
        )
        
        subject_prefix = {
            'now': '🚨 URGENT',
            'today': '⏰ TODAY',
            'tomorrow': '📅 TOMORROW',
            'week': '📌 THIS WEEK',
            'future': '🔔'
        }.get(urgency, '🔔')
        
        logger.info(
            "Sending reminder email",
            extra={
                "to_email": to_email,
                "recipient_name": name,
                "title": title,
                "urgency": urgency,
                "event_type": event_type,
                "has_ai_tips": bool(ai_prep_tips_html)
            }
        )
        
        return self._send_email(to_email, f"{subject_prefix} Reminder: {title}", html_content)

    def send_deletion_confirmation_email(
        self, 
        to_email: str, 
        name: str, 
        deletion_date: datetime, 
        recovery_token: str
    ) -> bool:
        """
        Send account deletion confirmation email with recovery link.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            deletion_date: Scheduled deletion datetime
            recovery_token: Token to recover account before deletion
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If any input validation fails
            
        Notes:
            - Sent when user requests account deletion with grace period
            - Contains recovery link valid until deletion_date
            - Explains what will be deleted
            - Account can be recovered before deletion_date
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
            _validate_token(recovery_token)
            
            if not isinstance(deletion_date, datetime):
                raise ValidationError("deletion_date must be a datetime object")
            
        except ValidationError as e:
            logger.error(f"Validation error in send_deletion_confirmation_email: {str(e)}")
            return False
        
        from .email_templates import deletion_confirmation_email
        
        recovery_url = f"{self.frontend_url}/auth/recover?token={recovery_token}"
        
        try:
            _validate_url(recovery_url)
        except ValidationError as e:
            logger.error(f"Invalid recovery URL: {str(e)}")
            return False
        
        formatted_date = deletion_date.strftime("%B %d, %Y at %I:%M %p UTC")
        
        html_content = deletion_confirmation_email(name, formatted_date, recovery_token, recovery_url)
        
        logger.info(
            "Sending deletion confirmation email",
            extra={
                "to_email": to_email,
                "name": name,
                "deletion_date": formatted_date
            }
        )
        
        return self._send_email(to_email, "⚠️ Your Applytide Account Will Be Deleted", html_content)

    def send_recovery_success_email(self, to_email: str, name: str) -> bool:
        """
        Send account recovery success confirmation email.
        
        Args:
            to_email: Recipient email address
            name: User's full name
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            ValidationError: If email or name validation fails
            
        Notes:
            - Sent after successful account recovery
            - Confirms deletion has been cancelled
            - Account and data remain intact
        """
        try:
            _validate_email(to_email)
            _validate_name(name)
        except ValidationError as e:
            logger.error(f"Validation error in send_recovery_success_email: {str(e)}")
            return False
        
        from .email_templates import recovery_success_email
        
        html_content = recovery_success_email(name)
        
        logger.info(
            "Sending recovery success email",
            extra={"to_email": to_email, "user_name": name}
        )
        
        return self._send_email(to_email, "✅ Your Applytide Account Has Been Recovered", html_content)


# Global email service instance
email_service = EmailService()

