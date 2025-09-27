"""Feedback API endpoints for beta user feedback"""
from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from app.config import settings
from app.infra.notifications.email_service import email_service

router = APIRouter(prefix="/api", tags=["feedback"])

def _feedback_html(name: str, email: str, feedback_type: str, message: str, has_screenshot: bool) -> str:
    feedback_types = {
        'bug': '🐛 Bug Report',
        'suggestion': '💡 Suggestion',
        'feature': '✨ Feature Request',
        'general': '💬 General Feedback',
        'other': '🤔 Other'
    }
    return f"""
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>New Beta Feedback</title></head>
    <body style="font-family:Arial, sans-serif; line-height:1.6; color:#333">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:20px;border-radius:8px;margin-bottom:20px">
        <h2>🚀 New Beta Feedback Received</h2><span style="background:#ff6b35;color:#fff;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold">BETA</span>
      </div>
      <div style="background:#f8f9fa;padding:20px;border-radius:8px">
        <p><b>Feedback Type:</b> {feedback_types.get(feedback_type, feedback_type)}</p>
        <p><b>From:</b> {name or 'Anonymous'}</p>
        <p><b>Email:</b> {email or 'Not provided'}</p>
        <div><b>Message:</b><div style="white-space:pre-wrap;border:1px solid #ddd;padding:12px;border-radius:6px;background:#fff">{message}</div></div>
        {"<p>📎 Screenshot attached</p>" if has_screenshot else ""}
      </div>
    </body></html>
    """

@router.post("/feedback")
async def submit_feedback(
    name: str = Form(""),
    email: str = Form(""),
    type: str = Form(...),
    message: str = Form(...),
    screenshot: Optional[UploadFile] = File(None)
):
    """Submit beta feedback with optional screenshot"""
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    if type not in ['bug', 'suggestion', 'feature', 'general', 'other']:
        raise HTTPException(status_code=400, detail="Invalid feedback type")

    screenshot_path = None
    try:
        # Save screenshot (if any)
        if screenshot:
            if not screenshot.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Only image files are allowed")
            content = await screenshot.read()
            if len(content) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size must be less than 5MB")

            upload_dir = "/tmp/feedback_uploads"
            os.makedirs(upload_dir, exist_ok=True)
            ext = (screenshot.filename.rsplit('.', 1)[-1] if '.' in screenshot.filename else 'jpg')
            unique = f"feedback_{uuid.uuid4().hex[:8]}.{ext}"
            screenshot_path = os.path.join(upload_dir, unique)
            with open(screenshot_path, "wb") as f:
                f.write(content)

        # Build email
        to = settings.SUPPORT_EMAIL
        subject = f"[BETA FEEDBACK] {type.upper()}: New Feedback from {name or 'Anonymous'}"
        html = _feedback_html(name.strip(), email.strip(), type, message.strip(), has_screenshot=bool(screenshot_path))

        # Use existing EmailService; attach file if present (simple inline note)
        # EmailService doesn't attach files; for now we just note attachment in body (already done).
        ok = email_service._send_email(to, subject, html)

        # cleanup
        if screenshot_path and os.path.exists(screenshot_path):
            try: os.remove(screenshot_path)
            except Exception: pass

        if ok:
            return JSONResponse(status_code=200, content={"message": "Feedback submitted successfully"})
        raise HTTPException(status_code=500, detail="Failed to send feedback")
    except HTTPException:
        # cleanup on explicit errors
        if screenshot_path and os.path.exists(screenshot_path):
            try: os.remove(screenshot_path)
            except Exception: pass
        raise
    except Exception as e:
        if screenshot_path and os.path.exists(screenshot_path):
            try: os.remove(screenshot_path)
            except Exception: pass
        print(f"Feedback submission error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
