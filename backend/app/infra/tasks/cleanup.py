from datetime import datetime, timezone
from app.db.session import get_db
from app.db import models

def cleanup_expired_sessions():
    """Remove expired sessions from the database"""
    db = next(get_db())
    try:
        now = datetime.now(timezone.utc)
        deleted = db.query(models.UserSession).filter(models.UserSession.expires_at < now).delete()
        db.commit()
        print(f"Removed {deleted} expired sessions")
    except Exception as e:
        print(f"Error cleaning up expired sessions: {e}")
        db.rollback()
    finally:
        db.close()
