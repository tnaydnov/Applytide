"""Feedback API endpoints for beta user feedback"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import smtplib
from ..config import settings

router = APIRouter()

class FeedbackService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.support_email = settings.SUPPORT_EMAIL
        
    def send_feedback_email(self, name: str, email: str, feedback_type: str, message: str, screenshot_path: Optional[str] = None):
        """Send feedback email to support"""
        try:
            msg = MIMEMultipart()
            msg['Subject'] = f"[BETA FEEDBACK] {feedback_type.upper()}: New Feedback from {name or 'Anonymous'}"
            msg['From'] = self.from_email
            msg['To'] = self.support_email
            msg['Reply-To'] = email if email else self.from_email
            
            # Create email body
            feedback_types = {
                'bug': '🐛 Bug Report',
                'suggestion': '💡 Suggestion',
                'feature': '✨ Feature Request',
                'general': '💬 General Feedback',
                'other': '🤔 Other'
            }
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>New Beta Feedback</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .content {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                    .field {{ margin: 15px 0; }}
                    .label {{ font-weight: bold; color: #555; }}
                    .value {{ background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea; margin-top: 5px; }}
                    .message {{ background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; }}
                    .beta-badge {{ background: #ff6b35; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>🚀 New Beta Feedback Received</h2>
                    <span class="beta-badge">BETA</span>
                </div>
                
                <div class="content">
                    <div class="field">
                        <div class="label">Feedback Type:</div>
                        <div class="value">{feedback_types.get(feedback_type, feedback_type)}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">From:</div>
                        <div class="value">{name or 'Anonymous'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Email:</div>
                        <div class="value">{email or 'Not provided'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Message:</div>
                        <div class="message">{message}</div>
                    </div>
                    
                    {f'<div class="field"><div class="label">📎 Screenshot attached</div></div>' if screenshot_path else ''}
                </div>
                
                <div style="margin-top: 30px; padding: 15px; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #2196f3;">
                    <p><strong>💡 Quick Actions:</strong></p>
                    <ul>
                        <li>Reply directly to this email to respond to the user</li>
                        <li>Forward to the development team if it's a technical issue</li>
                        <li>Add to the feature roadmap if it's a great suggestion</li>
                    </ul>
                </div>
            </body>
            </html>
            """
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Attach screenshot if provided
            if screenshot_path and os.path.exists(screenshot_path):
                try:
                    with open(screenshot_path, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    filename = os.path.basename(screenshot_path)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {filename}',
                    )
                    msg.attach(part)
                except Exception as e:
                    print(f"Failed to attach screenshot: {e}")
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_user and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
                
            return True
        except Exception as e:
            print(f"Failed to send feedback email: {e}")
            return False

feedback_service = FeedbackService()

@router.post("/feedback")
async def submit_feedback(
    name: str = Form(""),
    email: str = Form(""),
    type: str = Form(...),
    message: str = Form(...),
    screenshot: Optional[UploadFile] = File(None)
):
    """Submit beta feedback with optional screenshot"""
    
    try:
        # Validate inputs
        if not message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        if type not in ['bug', 'suggestion', 'feature', 'general', 'other']:
            raise HTTPException(status_code=400, detail="Invalid feedback type")
        
        screenshot_path = None
        
        # Handle screenshot upload if provided
        if screenshot:
            # Validate file type
            if not screenshot.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Only image files are allowed")
            
            # Validate file size (5MB max)
            if screenshot.size > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size must be less than 5MB")
            
            # Create uploads directory if it doesn't exist
            upload_dir = "/tmp/feedback_uploads"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = screenshot.filename.split('.')[-1] if '.' in screenshot.filename else 'jpg'
            unique_filename = f"feedback_{uuid.uuid4().hex[:8]}.{file_extension}"
            screenshot_path = os.path.join(upload_dir, unique_filename)
            
            # Save file
            with open(screenshot_path, "wb") as buffer:
                content = await screenshot.read()
                buffer.write(content)
        
        # Send feedback email
        success = feedback_service.send_feedback_email(
            name=name.strip() if name else "",
            email=email.strip() if email else "",
            feedback_type=type,
            message=message.strip(),
            screenshot_path=screenshot_path
        )
        
        # Clean up uploaded file after sending email
        if screenshot_path and os.path.exists(screenshot_path):
            try:
                os.remove(screenshot_path)
            except Exception as e:
                print(f"Failed to clean up uploaded file: {e}")
        
        if success:
            return JSONResponse(
                status_code=200,
                content={"message": "Feedback submitted successfully"}
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send feedback")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Feedback submission error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")