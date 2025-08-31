import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from ..db.session import SessionLocal
from ..db import models
from ..config import settings
from ..services.emailer import send_email

FOLLOW_UP_DAYS = 3  # remind if Applied and no stages after 3 days
LOOP_SECONDS = 60   # check every minute

def _utcnow(): return datetime.now(timezone.utc)

def check_upcoming_interviews(db):
    now = _utcnow()
    soon = now + timedelta(days=1)
    j = select(models.Stage, models.Application, models.User).join(
        models.Application, models.Stage.application_id == models.Application.id
    ).join(
        models.User, models.Application.user_id == models.User.id
    ).where(
        models.Stage.scheduled_at != None,   # noqa: E711
        models.Stage.scheduled_at.between(now, soon)
    )
    for stage, app, user in db.execute(j).all():
        url = f"{settings.APP_BASE_URL}/applications/{app.id}"
        try:
            send_email(
                to=user.email,
                subject=f"Interview coming up: {stage.name}",
                body=f"You have '{stage.name}' scheduled soon.\nOpen: {url}\n"
            )
        except Exception:
            pass

def check_followups(db):
    cutoff = _utcnow() - timedelta(days=FOLLOW_UP_DAYS)
    # applications in Applied with no stages and older than cutoff
    stmt = select(models.Application, models.User).join(
        models.User, models.Application.user_id == models.User.id
    ).where(
        models.Application.status == "Applied",
        models.Application.created_at < cutoff
    )
    for app, user in db.execute(stmt).all():
        url = f"{settings.APP_BASE_URL}/applications/{app.id}"
        try:
            send_email(
                to=user.email,
                subject="Time to follow up",
                body=f"It's been {FOLLOW_UP_DAYS}+ days since you applied. Consider following up.\nOpen: {url}\n"
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
