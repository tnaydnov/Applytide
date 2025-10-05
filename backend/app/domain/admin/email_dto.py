# backend/app/domain/admin/email_dto.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EmailStatsDTO(BaseModel):
    """Email system statistics"""
    smtp_configured: bool
    smtp_host: Optional[str]
    smtp_port: Optional[int]
    from_email: Optional[str]
    # Since we don't have email logging table, we'll show config status
    last_test_sent_at: Optional[datetime]
    test_emails_sent_today: int


class TestEmailRequest(BaseModel):
    """Request to send test email"""
    to_email: str
    subject: str = "Applytide Admin Test Email"
    message: str = "This is a test email from the admin dashboard."
