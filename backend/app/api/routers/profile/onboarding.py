"""
Profile Onboarding Module
Welcome modal and onboarding status tracking endpoints
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User
from ....infra.logging import get_logger
from .schemas import WelcomeModalStatusResponse

router = APIRouter()
logger = get_logger(__name__)


@router.get("/welcome-modal-status", response_model=WelcomeModalStatusResponse)
async def get_welcome_modal_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user has seen the welcome modal.
    
    Returns the user's welcome modal status, indicating whether they have completed
    the initial onboarding flow. Used by frontend to determine if welcome modal
    should be displayed on login.
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        WelcomeModalStatusResponse: Welcome modal status containing:
            - has_seen_welcome_modal: Boolean indicating if modal was seen
            - welcome_modal_seen_at: Timestamp when modal was first seen (nullable)
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only check their own welcome modal status
    
    Notes:
        - Status stored directly on User model
        - welcome_modal_seen_at is None if modal never shown
        - Frontend uses this to skip modal for returning users
        - Part of user onboarding flow
        - No error handling needed (always returns user's current status)
    
    Example:
        GET /api/profile/welcome-modal-status
        Response:
        {
            "has_seen_welcome_modal": true,
            "welcome_modal_seen_at": "2025-10-29T12:00:00Z"
        }
    """
    return {
        "has_seen_welcome_modal": current_user.has_seen_welcome_modal,
        "welcome_modal_seen_at": current_user.welcome_modal_seen_at
    }


@router.post("/welcome-modal-seen")
async def mark_welcome_modal_seen(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark that user has seen the welcome modal.
    
    Updates the user's welcome modal status to indicate they have completed the
    initial onboarding flow. Called by frontend after user dismisses welcome modal.
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Updated status containing:
            - message: Success message
            - has_seen_welcome_modal: Boolean (always True after update)
            - welcome_modal_seen_at: Timestamp when modal was marked as seen
    
    Raises:
        HTTPException: 500 if database update fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own welcome modal status
        - Idempotent operation (safe to call multiple times)
    
    Notes:
        - Sets has_seen_welcome_modal to True
        - Records current UTC timestamp
        - Commits transaction immediately
        - Rolls back on error to maintain data integrity
        - Logs completion with info level for analytics
        - Frontend should call this when user dismisses welcome modal
    
    Example:
        POST /api/profile/welcome-modal-seen
        Response:
        {
            "message": "Welcome modal status updated",
            "has_seen_welcome_modal": true,
            "welcome_modal_seen_at": "2025-10-29T12:00:00Z"
        }
    """
    try:
        current_user.has_seen_welcome_modal = True
        current_user.welcome_modal_seen_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info("Welcome modal marked as seen", extra={
            "user_id": current_user.id,
            "seen_at": current_user.welcome_modal_seen_at.isoformat()
        })
        
        return {
            "message": "Welcome modal status updated",
            "has_seen_welcome_modal": True,
            "welcome_modal_seen_at": current_user.welcome_modal_seen_at
        }
        
    except Exception as e:
        db.rollback()
        logger.error("Failed to update welcome modal status", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update welcome modal status")
