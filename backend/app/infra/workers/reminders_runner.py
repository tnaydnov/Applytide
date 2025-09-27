import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from ...db.session import SessionLocal
from ...db import models
from ...config import settings
from ...infra.notifications.email_service import email_service

FOLLOW_UP_DAYS = 3
LOOP_SECONDS = 60

def _utcnow(): return datetime.now(timezone.utc)

def check_upcoming_interviews(db):
    now = _utcnow()
    soon = now + timedelta(days=1)
    stmt = (
        select(models.Stage, models.Application, models.User)
        .join(models.Application, models.Stage.application_id == models.Application.id)
        .join(models.User, models.Application.user_id == models.User.id)
        .where(
            models.Stage.scheduled_at != None,  # noqa: E711
            models.Stage.scheduled_at.between(now, soon)
        )
    )
    for stage, app, user in db.execute(stmt).all():
        url = f"{settings.APP_BASE_URL}/applications/{app.id}"
        try:
            email_service._send_email(
                to_email=user.email,
                subject=f"Interview coming up: {stage.name}",
                html_content=f"<p>You have '{stage.name}' scheduled soon.</p><p>Open: <a href='{url}'>{url}</a></p>"
            )
        except Exception:
            pass

def check_followups(db):
    cutoff = _utcnow() - timedelta(days=FOLLOW_UP_DAYS)
    stmt = (
        select(models.Application, models.User)
        .join(models.User, models.Application.user_id == models.User.id)
        .where(
            models.Application.status == "Applied",
            models.Application.created_at < cutoff
        )
    )
    for app, user in db.execute(stmt).all():
        url = f"{settings.APP_BASE_URL}/applications/{app.id}"
        try:
            email_service._send_email(
                to_email=user.email,
                subject="Time to follow up",
                html_content=f"<p>It's been {FOLLOW_UP_DAYS}+ days since you applied. Consider following up.</p>"
                             f"<p>Open: <a href='{url}'>{url}</a></p>"
            )
        except Exception:
            pass

def main_loop():
    while True:
        try:
            db = SessionLocal()
            check_upcoming_interviews(db)
            check_followups(db)
        except Exception:
            pass
        finally:
            try: db.close()
            except: pass
        time.sleep(LOOP_SECONDS)

if __name__ == "__main__":
    main_loop()
