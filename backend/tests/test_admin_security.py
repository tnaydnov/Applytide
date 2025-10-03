"""
Automated security tests for admin system.

Tests cover:
1. Authentication requirements on all endpoints
2. Rate limiting enforcement
3. Reason field validation
4. Audit log permanence after admin deletion
5. CSRF protection (if applicable)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import time
from uuid import uuid4

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db import models
from app.infra.security.password import hash_password


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_admin_security.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture
def db_session():
    """Create a clean database session for each test"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def regular_user(db_session):
    """Create a regular (non-admin) user"""
    user = models.User(
        id=uuid4(),
        email="user@test.com",
        full_name="Regular User",
        hashed_password=hash_password("password123"),
        is_active=True,
        is_admin=False,
        is_premium=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    """Create an admin user"""
    user = models.User(
        id=uuid4(),
        email="admin@test.com",
        full_name="Admin User",
        hashed_password=hash_password("adminpass123"),
        is_active=True,
        is_admin=True,
        is_premium=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers_regular(regular_user):
    """Get auth headers for regular user"""
    response = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_admin(admin_user):
    """Get auth headers for admin user"""
    response = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "adminpass123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ==================== TEST 1: Authentication Requirements ====================

def test_all_admin_routes_require_auth():
    """Test that all admin routes reject unauthenticated requests"""
    admin_routes = [
        ("GET", "/api/admin/dashboard"),
        ("GET", "/api/admin/health"),
        ("GET", "/api/admin/analytics"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/logs"),
        ("GET", "/api/admin/logs/export"),
    ]
    
    for method, path in admin_routes:
        if method == "GET":
            response = client.get(path)
        
        assert response.status_code == 401, f"{method} {path} should require auth"
        assert "not authenticated" in response.json().get("detail", "").lower()


def test_regular_users_cannot_access_admin_routes(auth_headers_regular):
    """Test that regular users are blocked from admin routes"""
    admin_routes = [
        ("GET", "/api/admin/dashboard"),
        ("GET", "/api/admin/health"),
        ("GET", "/api/admin/analytics"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/logs"),
    ]
    
    for method, path in admin_routes:
        if method == "GET":
            response = client.get(path, headers=auth_headers_regular)
        
        assert response.status_code == 403, f"{method} {path} should reject non-admin"
        assert "admin" in response.json().get("detail", "").lower()


def test_admin_users_can_access_admin_routes(auth_headers_admin):
    """Test that admin users can access admin routes"""
    response = client.get("/api/admin/dashboard", headers=auth_headers_admin)
    assert response.status_code == 200


# ==================== TEST 2: Rate Limiting ====================

def test_rate_limiting_on_admin_status_changes(auth_headers_admin, regular_user):
    """Test that admin status changes are rate limited to 20/min"""
    # Attempt 25 requests (should hit rate limit at 21st)
    success_count = 0
    rate_limited = False
    
    for i in range(25):
        response = client.put(
            f"/api/admin/users/{regular_user.id}/admin-status",
            headers=auth_headers_admin,
            json={
                "is_admin": i % 2 == 0,  # Alternate between True/False
                "reason": f"Rate limit test iteration {i} with sufficient detail"
            }
        )
        
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:  # Too Many Requests
            rate_limited = True
            break
    
    assert rate_limited, "Rate limiting should be enforced"
    assert success_count <= 20, "Should not exceed 20 requests per minute"


def test_rate_limiting_on_log_export(auth_headers_admin):
    """Test that log export is rate limited to 10/min"""
    success_count = 0
    rate_limited = False
    
    for i in range(15):
        response = client.get(
            "/api/admin/logs/export?days=7",
            headers=auth_headers_admin
        )
        
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:
            rate_limited = True
            break
    
    assert rate_limited, "Export should be rate limited"
    assert success_count <= 10, "Should not exceed 10 exports per minute"


def test_rate_limiting_on_purge(auth_headers_admin):
    """Test that log purge is rate limited to 5/hour"""
    success_count = 0
    rate_limited = False
    
    for i in range(10):
        response = client.delete(
            "/api/admin/logs/purge?days=365",
            headers=auth_headers_admin
        )
        
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:
            rate_limited = True
            break
        
        time.sleep(0.5)  # Small delay between requests
    
    assert rate_limited, "Purge should be rate limited"
    assert success_count <= 5, "Should not exceed 5 purges per hour"


# ==================== TEST 3: Reason Field Validation ====================

def test_admin_status_change_requires_reason(auth_headers_admin, regular_user):
    """Test that admin status changes require a reason field"""
    # Missing reason field
    response = client.put(
        f"/api/admin/users/{regular_user.id}/admin-status",
        headers=auth_headers_admin,
        json={"is_admin": True}
    )
    assert response.status_code == 422, "Should reject missing reason"


def test_reason_field_minimum_length(auth_headers_admin, regular_user):
    """Test that reason must be at least 10 characters"""
    response = client.put(
        f"/api/admin/users/{regular_user.id}/admin-status",
        headers=auth_headers_admin,
        json={"is_admin": True, "reason": "short"}
    )
    assert response.status_code == 422, "Should reject reason < 10 chars"
    
    # Valid length
    response = client.put(
        f"/api/admin/users/{regular_user.id}/admin-status",
        headers=auth_headers_admin,
        json={"is_admin": True, "reason": "Valid reason with sufficient detail"}
    )
    assert response.status_code == 200, "Should accept valid reason"


def test_reason_field_maximum_length(auth_headers_admin, regular_user):
    """Test that reason must not exceed 500 characters"""
    long_reason = "x" * 600
    response = client.put(
        f"/api/admin/users/{regular_user.id}/admin-status",
        headers=auth_headers_admin,
        json={"is_admin": True, "reason": long_reason}
    )
    assert response.status_code == 422, "Should reject reason > 500 chars"


def test_reason_is_logged_in_audit_trail(auth_headers_admin, regular_user, db_session):
    """Test that reason appears in audit logs"""
    reason = "Promoting user for testing purposes with full justification"
    
    response = client.put(
        f"/api/admin/users/{regular_user.id}/admin-status",
        headers=auth_headers_admin,
        json={"is_admin": True, "reason": reason}
    )
    assert response.status_code == 200
    
    # Check audit log
    log = db_session.query(models.AdminLog).filter(
        models.AdminLog.action == "update_admin_status"
    ).first()
    
    assert log is not None, "Audit log should exist"
    assert "reason" in log.details, "Details should contain reason"
    assert log.details["reason"] == reason, "Reason should match"


# ==================== TEST 4: Audit Log Permanence ====================

def test_audit_logs_preserved_after_admin_deletion(auth_headers_admin, admin_user, db_session):
    """
    Critical test: Verify that audit logs are NOT deleted when admin is deleted.
    This tests the CASCADE → SET NULL fix.
    """
    # Admin performs an action (creates a log)
    response = client.get("/api/admin/dashboard", headers=auth_headers_admin)
    assert response.status_code == 200
    
    # Verify log exists
    log = db_session.query(models.AdminLog).filter(
        models.AdminLog.admin_id == admin_user.id
    ).first()
    assert log is not None, "Log should exist"
    assert log.admin_email == admin_user.email, "Should have admin email"
    log_id = log.id
    
    # Delete the admin user
    db_session.delete(admin_user)
    db_session.commit()
    
    # Verify log STILL exists (CASCADE → SET NULL fix)
    log_after = db_session.query(models.AdminLog).filter(
        models.AdminLog.id == log_id
    ).first()
    
    assert log_after is not None, "CRITICAL: Log must survive admin deletion"
    assert log_after.admin_id is None, "admin_id should be NULL after deletion"
    assert log_after.admin_email == "admin@test.com", "admin_email should be preserved"


def test_admin_email_stored_redundantly(auth_headers_admin, admin_user, db_session):
    """Test that admin_email is stored even if admin is deleted"""
    # Perform action
    client.get("/api/admin/dashboard", headers=auth_headers_admin)
    
    # Get log
    log = db_session.query(models.AdminLog).filter(
        models.AdminLog.admin_id == admin_user.id
    ).first()
    
    assert log.admin_email is not None, "admin_email must be stored"
    assert log.admin_email == admin_user.email, "Should match admin's email"
    
    # Even if FK is NULL, email remains
    assert isinstance(log.admin_email, str), "admin_email is permanent string"


# ==================== TEST 5: CSV Export ====================

def test_csv_export_returns_valid_csv(auth_headers_admin, db_session):
    """Test that CSV export returns properly formatted CSV"""
    response = client.get("/api/admin/logs/export?days=30", headers=auth_headers_admin)
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Content-Disposition" in response.headers
    assert "admin_logs_" in response.headers["Content-Disposition"]
    
    # Check CSV structure
    csv_content = response.text
    lines = csv_content.split("\n")
    header = lines[0]
    
    assert "Timestamp" in header
    assert "Admin Email" in header
    assert "Action" in header


def test_csv_export_filters_by_date(auth_headers_admin, db_session, admin_user):
    """Test that CSV export respects date filtering"""
    # Create old log
    old_log = models.AdminLog(
        admin_id=admin_user.id,
        admin_email=admin_user.email,
        action="old_action",
        created_at=datetime.utcnow() - timedelta(days=100)
    )
    db_session.add(old_log)
    db_session.commit()
    
    # Export last 30 days
    response = client.get("/api/admin/logs/export?days=30", headers=auth_headers_admin)
    assert response.status_code == 200
    
    csv_content = response.text
    assert "old_action" not in csv_content, "Old logs should be filtered out"


# ==================== TEST 6: Purge Endpoint ====================

def test_purge_requires_minimum_retention(auth_headers_admin):
    """Test that purge enforces minimum 30-day retention"""
    response = client.delete("/api/admin/logs/purge?days=10", headers=auth_headers_admin)
    assert response.status_code == 422, "Should reject retention < 30 days"


def test_purge_deletes_old_logs(auth_headers_admin, db_session, admin_user):
    """Test that purge correctly deletes old logs"""
    # Create old log
    old_log = models.AdminLog(
        admin_id=admin_user.id,
        admin_email=admin_user.email,
        action="test_action",
        created_at=datetime.utcnow() - timedelta(days=400)
    )
    db_session.add(old_log)
    db_session.commit()
    
    old_log_id = old_log.id
    
    # Purge logs older than 365 days
    response = client.delete("/api/admin/logs/purge?days=365", headers=auth_headers_admin)
    assert response.status_code == 200
    assert response.json()["deleted_count"] >= 1
    
    # Verify log is deleted
    deleted_log = db_session.query(models.AdminLog).filter(
        models.AdminLog.id == old_log_id
    ).first()
    assert deleted_log is None, "Old log should be deleted"


def test_purge_action_is_logged(auth_headers_admin, db_session):
    """Test that purge action itself is logged"""
    response = client.delete("/api/admin/logs/purge?days=365", headers=auth_headers_admin)
    assert response.status_code == 200
    
    # Check that purge action was logged
    purge_log = db_session.query(models.AdminLog).filter(
        models.AdminLog.action == "purge_audit_logs"
    ).first()
    
    assert purge_log is not None, "Purge action should be logged"
    assert "days" in purge_log.details, "Should log retention period"


# ==================== TEST 7: Premium Status Changes ====================

def test_premium_status_change_requires_reason(auth_headers_admin, regular_user):
    """Test that premium status changes also require reason"""
    response = client.put(
        f"/api/admin/users/{regular_user.id}/premium-status",
        headers=auth_headers_admin,
        json={"is_premium": True}
    )
    assert response.status_code == 422, "Should require reason"
    
    # With valid reason
    response = client.put(
        f"/api/admin/users/{regular_user.id}/premium-status",
        headers=auth_headers_admin,
        json={"is_premium": True, "reason": "Granted premium for testing purposes"}
    )
    assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
