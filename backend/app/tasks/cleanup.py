from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models

def cleanup_expired_sessions():
    """Remove expired sessions from the database"""
    db = next(get_db())
    try:
        # Find and delete expired sessions
        now = datetime.now(timezone.utc)
        expired = db.query(models.UserSession).filter(
            models.UserSession.expires_at < now
        ).delete()
        
        db.commit()
        print(f"Removed {expired} expired sessions")
    except Exception as e:
        print(f"Error cleaning up expired sessions: {e}")
        db.rollback()
    finally:
        db.close()