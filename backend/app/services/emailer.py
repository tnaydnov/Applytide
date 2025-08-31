import smtplib
from email.message import EmailMessage
from ..config import settings

def send_email(to: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
        s.send_message(msg)
