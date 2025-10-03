"""
Script to make a user an admin.

Usage:
    python make_admin.py user@example.com
    python make_admin.py user@example.com --remove  # Remove admin status
"""

import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import SessionLocal
from app.db import models


def make_admin(email: str, remove: bool = False):
    """Make a user an admin or remove admin status"""
    db = SessionLocal()
    try:
        # Find user
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            print(f"\nAvailable users:")
            users = db.query(models.User).limit(10).all()
            for u in users:
                admin_badge = "👑 ADMIN" if u.is_admin else ""
                print(f"  - {u.email} {admin_badge}")
            return False
        
        # Check current status
        if remove:
            if not user.is_admin:
                print(f"ℹ️  {email} is not an admin")
                return True
            
            user.is_admin = False
            db.commit()
            print(f"✅ Successfully removed admin status from {email}")
            return True
        else:
            if user.is_admin:
                print(f"ℹ️  {email} is already an admin")
                return True
            
            user.is_admin = True
            db.commit()
            print(f"✅ Successfully made {email} an admin!")
            print(f"\n🎉 You can now access the admin dashboard at:")
            print(f"   http://localhost:3000/admin")
            return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()


def list_admins():
    """List all admin users"""
    db = SessionLocal()
    try:
        admins = db.query(models.User).filter(models.User.is_admin == True).all()
        
        if not admins:
            print("No admin users found.")
            return
        
        print(f"\n👑 Admin Users ({len(admins)}):")
        print("-" * 60)
        for admin in admins:
            premium = "💎 Premium" if admin.is_premium else ""
            print(f"  - {admin.email} {premium}")
            print(f"    ID: {admin.id}")
            print(f"    Name: {admin.full_name or 'N/A'}")
            print()
        
    finally:
        db.close()


def show_usage():
    """Show usage instructions"""
    print("""
Usage:
    python make_admin.py <email>              # Make user an admin
    python make_admin.py <email> --remove     # Remove admin status
    python make_admin.py --list               # List all admins
    python make_admin.py --help               # Show this help

Examples:
    python make_admin.py john@example.com
    python make_admin.py jane@example.com --remove
    python make_admin.py --list
""")


if __name__ == "__main__":
    if len(sys.argv) < 2 or "--help" in sys.argv:
        show_usage()
        sys.exit(0)
    
    if "--list" in sys.argv:
        list_admins()
        sys.exit(0)
    
    email = sys.argv[1]
    remove = "--remove" in sys.argv
    
    success = make_admin(email, remove=remove)
    sys.exit(0 if success else 1)
