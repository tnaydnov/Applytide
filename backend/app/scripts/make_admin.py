"""
Script to promote a user to admin role.
Usage: python -m app.scripts.make_admin <email>
"""
import sys
from app.db.session import SessionLocal
from app.db.models import User


def make_admin(email: str):
    """Promote user to admin role."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        if user.role == "admin":
            print(f"✓ User '{email}' is already an admin")
            return True
        
        user.role = "admin"
        db.commit()
        print(f"✓ User '{email}' promoted to admin successfully!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.scripts.make_admin <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    success = make_admin(email)
    sys.exit(0 if success else 1)
