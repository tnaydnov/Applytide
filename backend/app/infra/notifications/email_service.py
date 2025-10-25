"""Email service for verification and password reset"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from ...config import settings
from ...infra.logging import get_logger
from .email_templates import (
    welcome_email,
    password_changed_email,
    account_deleted_email,
    reminder_email
)

logger = get_logger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.frontend_url = settings.FRONTEND_URL

    def _send_email(self, to_email: str, subject: str, html_content: str):
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_user and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            return True
        except Exception as e:
            logger.error("Failed to send email", extra={
                "to": to_email,
                "subject": subject,
                "error": str(e)
            }, exc_info=True)
            return False

    def send_verification_email(self, to_email: str, token: str):
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
    
    def send_welcome_email(self, to_email: str, name: str):
        """Send welcome email to new users"""
        html_content = welcome_email(name, to_email)
        return self._send_email(to_email, f"Welcome to Applytide, {name}! 🎉", html_content)
    
    def send_password_changed_email(self, to_email: str, name: str):
        """Send security alert when password is changed"""
        html_content = password_changed_email(name).replace(
            '{datetime}',
            datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')
        )
        return self._send_email(to_email, "Your Applytide Password Was Changed", html_content)
    
    def send_account_deleted_email(self, to_email: str, name: str):
        """Send confirmation after account deletion"""
        html_content = account_deleted_email(name)
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
        action_url: str
    ):
        """Send reminder email with dynamic urgency"""
        html_content = reminder_email(
            name=name,
            title=title,
            description=description,
            due_date=due_date,
            time_until=time_until,
            urgency=urgency,
            event_type=event_type,
            action_url=action_url
        )
        subject_prefix = {
            'now': '🚨 URGENT',
            'today': '⏰ TODAY',
            'tomorrow': '📅 TOMORROW',
            'week': '📌 THIS WEEK',
            'future': '🔔'
        }.get(urgency, '🔔')
        
        return self._send_email(to_email, f"{subject_prefix} Reminder: {title}", html_content)

email_service = EmailService()

