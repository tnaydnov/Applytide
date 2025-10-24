"""
Test script to verify single-session-per-device logic.
This script simulates multiple logins from the same device and verifies
that only one session remains active.
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from app.db.session import get_db_session
from app.db.models import RefreshToken, User
from app.infra.security.tokens import create_refresh_token
from datetime import datetime, timezone
import uuid

def test_single_session_per_device():
    """Test that creating a new session revokes old sessions from same device."""
    
    with get_db_session() as db:
        # Find a test user (or use your email)
        user = db.query(User).filter(User.email == "tnaydnov@gmail.com").first()
        
        if not user:
            print("❌ User not found. Update the email in the test script.")
            return False
        
        user_id = str(user.id)
        test_user_agent = "TestBrowser/1.0 (Test Device)"
        
        print(f"Testing with user: {user.email}")
        print(f"User ID: {user_id}")
        
        # Clean up any existing test sessions
        db.query(RefreshToken).filter(
            RefreshToken.user_id == uuid.UUID(user_id),
            RefreshToken.user_agent == test_user_agent
        ).delete()
        db.commit()
        
        # Simulate 3 logins from the same device
        print("\n--- Simulating 3 logins from same device ---")
        
        for i in range(1, 4):
            print(f"\nLogin #{i}:")
            token, family = create_refresh_token(
                user_id=user_id,
                user_agent=test_user_agent,
                ip_address="192.168.1.100",
                extended=False
            )
            print(f"  Created token with family: {family}")
            
            # Count active sessions from this device
            active_count = db.query(RefreshToken).filter(
                RefreshToken.user_id == uuid.UUID(user_id),
                RefreshToken.user_agent == test_user_agent,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(timezone.utc)
            ).count()
            
            print(f"  Active sessions from this device: {active_count}")
            
            if active_count != 1:
                print(f"❌ FAILED: Expected 1 active session, found {active_count}")
                return False
        
        print("\n✅ SUCCESS: Only 1 active session maintained across multiple logins")
        
        # Verify the revoked sessions exist
        revoked_count = db.query(RefreshToken).filter(
            RefreshToken.user_id == uuid.UUID(user_id),
            RefreshToken.user_agent == test_user_agent,
            RefreshToken.revoked_at.isnot(None)
        ).count()
        
        print(f"✅ Found {revoked_count} revoked sessions (as expected)")
        
        # Clean up
        db.query(RefreshToken).filter(
            RefreshToken.user_id == uuid.UUID(user_id),
            RefreshToken.user_agent == test_user_agent
        ).delete()
        db.commit()
        
        return True

if __name__ == "__main__":
    try:
        success = test_single_session_per_device()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
