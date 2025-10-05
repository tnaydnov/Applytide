# backend/app/domain/admin/email_service.py
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .email_dto import EmailStatsDTO, TestEmailRequest
from .service import AdminService
from ...config import settings
from ...infra.notifications.email_service import EmailService


class EmailAdminService:
    """
    Admin service for email system monitoring
    
    Note: This is a simplified implementation since we don't have
    an email_logs table. It provides SMTP config checking and test emails.
    
    To add full email logging, you would need to:
    1. Create email_logs table migration
    2. Add EmailLog model to models.py
    3. Create email_repository.py with log queries
    4. Update EmailService to log all sends
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
        
    async def get_email_stats(self) -> EmailStatsDTO:
        """
        Get email system statistics
        
        Since we don't have email logging, this returns config status
        """
        # Check if SMTP is configured
        smtp_configured = bool(
            settings.SMTP_HOST and 
            settings.SMTP_PORT and 
            settings.FROM_EMAIL
        )
        
        # Check for recent test emails in audit logs
        from sqlalchemy import select, func
        from ...db import models
        
        result = await self.db.execute(
            select(
                func.count(models.AdminAction.id).label('test_count'),
                func.max(models.AdminAction.created_at).label('last_test')
            ).where(
                models.AdminAction.action == 'test_email_sent',
                models.AdminAction.created_at >= datetime.utcnow() - timedelta(days=1)
            )
        )
        row = result.first()
        
        return EmailStatsDTO(
            smtp_configured=smtp_configured,
            smtp_host=settings.SMTP_HOST if smtp_configured else None,
            smtp_port=settings.SMTP_PORT if smtp_configured else None,
            from_email=settings.FROM_EMAIL if smtp_configured else None,
            last_test_sent_at=row.last_test if row and row.last_test else None,
            test_emails_sent_today=row.test_count if row and row.test_count else 0
        )
    
    async def send_test_email(
        self,
        to_email: str,
        subject: str,
        message: str,
        admin_id: str,
        justification: str
    ) -> bool:
        """
        Send a test email
        
        Args:
            to_email: Recipient email
            subject: Email subject
            message: Email message body
            admin_id: ID of admin sending test
            justification: Reason for sending test
            
        Returns:
            True if email sent successfully
        """
        # Create HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 24px; font-weight: bold;">AT</span>
                    </div>
                    <h1 style="color: #333; margin: 0;">{subject}</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <p style="white-space: pre-wrap;">{message}</p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>This is a test email sent from Applytide Admin Dashboard</p>
                    <p>Sent at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p><strong>Applytide</strong><br>
                        Web: <a href="https://applytide.com">applytide.com</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email
        success = self.email_service._send_email(to_email, subject, html_content)
        
        # Log the action
        await AdminService.log_action(
            self.db,
            admin_id=admin_id,
            action="test_email_sent" if success else "test_email_failed",
            entity_type="email",
            entity_id=to_email,
            justification=justification,
            metadata={
                "to_email": to_email,
                "subject": subject,
                "success": success
            }
        )
        
        return success
    
    async def get_email_activity(self, days: int = 7) -> dict:
        """
        Get email-related activity from audit logs
        
        Since we don't have email_logs table, we check audit logs
        for email-related admin actions
        """
        from sqlalchemy import select, func
        from ...db import models
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        result = await self.db.execute(
            select(
                models.AdminAction.action,
                func.count(models.AdminAction.id).label('count')
            ).where(
                models.AdminAction.action.in_([
                    'test_email_sent',
                    'test_email_failed'
                ]),
                models.AdminAction.created_at >= cutoff_date
            ).group_by(
                models.AdminAction.action
            )
        )
        
        activity = {row.action: row.count for row in result}
        
        return {
            "test_emails_sent": activity.get('test_email_sent', 0),
            "test_emails_failed": activity.get('test_email_failed', 0),
            "total_attempts": sum(activity.values()),
            "success_rate": (
                activity.get('test_email_sent', 0) / sum(activity.values()) * 100
                if sum(activity.values()) > 0 else 0
            )
        }
