"""
Profile Deletion Module
Account and profile deletion endpoints for GDPR compliance
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User, UserProfile
from ....infra.logging import get_logger
from ...schemas.common import MessageResponse, AccountDeletionResponse

router = APIRouter()
logger = get_logger(__name__)


class DeleteAccountRequest(BaseModel):
    """Schema for account deletion request body."""
    password: Optional[str] = Field(None, min_length=1, max_length=500)
    confirmation: Optional[str] = Field(None, max_length=10)


@router.post("/cancel-deletion", response_model=MessageResponse)
def cancel_account_deletion(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending account deletion.

    Clears deletion_scheduled_at, deleted_at, and deletion_recovery_token
    so the account remains active.

    Returns:
        dict with success message

    Raises:
        400 if no deletion is pending
    """
    if not current_user.deletion_scheduled_at and not current_user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No deletion is pending for this account",
        )

    current_user.deleted_at = None
    current_user.deletion_scheduled_at = None
    current_user.deletion_recovery_token = None
    db.commit()

    logger.info(
        "Account deletion cancelled",
        extra={"user_id": str(current_user.id), "email": current_user.email},
    )
    return {"message": "Account deletion has been cancelled. Your account is active."}


@router.delete("/account", response_model=AccountDeletionResponse)
def delete_user_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    body: DeleteAccountRequest = DeleteAccountRequest(),
):
    """
    Delete user account and ALL associated data (GDPR Right to Erasure).
    
    Permanently deletes the user account and all associated data from the system.
    This operation is irreversible and implements GDPR Article 17 (Right to Erasure).
    
    Deletes the following data:
    - User account
    - User profile
    - All job applications and stages
    - All notes and match results
    - All documents (database records, file cleanup recommended separately)
    - All reminders and reminder notes
    - All saved jobs
    - All user preferences
    - All OAuth tokens
    - All sessions and refresh tokens
    
    Request Body (optional):
        - password: Required for non-OAuth users for security verification
        - confirmation: Must be exactly "DELETE" to confirm (optional for backward compatibility)
    
    Args:
        request: FastAPI request object for body parsing
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Deletion confirmation containing:
            - message: Success message
            - deleted_user_id: UUID of deleted user
            - deletion_timestamp: ISO timestamp of deletion
    
    Raises:
        HTTPException: 400 if confirmation text is incorrect
        HTTPException: 400 if password is missing (non-OAuth users)
        HTTPException: 401 if password is incorrect
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Non-OAuth users must provide password verification
        - Optional confirmation text "DELETE" for extra safety
        - Comprehensive audit logging (warning level)
        - All sensitive data permanently removed
    
    Notes:
        - Operation is irreversible - no recovery possible
        - Sends confirmation email after successful deletion
        - Email failure doesn't fail the deletion operation
        - Uses database transaction for atomicity
        - Rolls back on any error to maintain data integrity
        - Deletion order important: children first, then parent records
        - File cleanup should be handled separately by background job
        - OAuth tokens revoked to prevent unauthorized access
        - All sessions invalidated immediately
    
    Example:
        DELETE /api/profile/account
        Request:
        {
            "password": "user_password",
            "confirmation": "DELETE"
        }
        Response:
        {
            "message": "Account successfully deleted. All your data has been permanently removed.",
            "deleted_user_id": "uuid-here",
            "deletion_timestamp": "2025-10-29T12:00:00Z"
        }
    """
    try:
        password = body.password
        confirmation = body.confirmation
        
        # Verify confirmation text (if provided)
        if confirmation and confirmation != "DELETE":
            logger.warning("Account deletion failed: Invalid confirmation", extra={
                "user_id": current_user.id
            })
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must type DELETE exactly to confirm deletion"
            )
        
        # For non-OAuth users, require password verification
        if not current_user.is_oauth_user:
            if not password:
                logger.warning("Account deletion failed: Missing password", extra={
                    "user_id": current_user.id
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is required for security verification"
                )
            
            # Verify password
            from ....infra.security.passwords import verify_password
            if not verify_password(password, current_user.password_hash):
                logger.warning("Account deletion failed: Incorrect password", extra={
                    "user_id": current_user.id
                })
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password"
                )
        
        logger.warning("ACCOUNT DELETION initiated", extra={
            "user_id": str(current_user.id),
            "email": current_user.email,
            "is_oauth_user": current_user.is_oauth_user
        })
        
        # Store user info before deletion
        user_id = current_user.id
        user_email = current_user.email
        user_name = current_user.full_name
        
        # Import models for deletion
        from ....db.models import (
            UserProfile, Job, Reminder, ReminderNote, UserPreferences, 
            OAuthToken, Resume, Application, Stage, Note, MatchResult, RefreshToken
        )
        
        # Delete all child records first (order matters for foreign key constraints)
        # All deletes run in a single transaction — any failure triggers
        # full rollback in the outer except block (atomicity guaranteed).
        
        deletion_stats: dict[str, int] = {}
        
        # 1. Delete all resumes (documents)
        deletion_stats["resumes"] = db.query(Resume).filter(Resume.user_id == user_id).delete()
        
        # 2. Delete all match results
        deletion_stats["match_results"] = db.query(MatchResult).filter(MatchResult.user_id == user_id).delete()
        
        # 3. Delete all notes
        deletion_stats["notes"] = db.query(Note).filter(Note.user_id == user_id).delete()
        
        # 4. Delete all stages (via applications)
        app_ids = [app.id for app in db.query(Application.id).filter(Application.user_id == user_id).all()]
        if app_ids:
            deletion_stats["stages"] = db.query(Stage).filter(Stage.application_id.in_(app_ids)).delete(synchronize_session=False)
        else:
            deletion_stats["stages"] = 0
        
        # 5. Delete all applications
        deletion_stats["applications"] = db.query(Application).filter(Application.user_id == user_id).delete()
        
        # 6. Delete all reminder notes first, then reminders
        deletion_stats["reminder_notes"] = db.query(ReminderNote).filter(ReminderNote.user_id == user_id).delete()
        deletion_stats["reminders"] = db.query(Reminder).filter(Reminder.user_id == user_id).delete()
        
        # 7. Delete all jobs
        deletion_stats["jobs"] = db.query(Job).filter(Job.user_id == user_id).delete()
        
        # 8. Delete user preferences
        deletion_stats["preferences"] = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).delete()
        
        # 9. Delete user profile
        deletion_stats["profile"] = db.query(UserProfile).filter(UserProfile.user_id == user_id).delete()
        
        # 10. Delete OAuth tokens
        deletion_stats["oauth_tokens"] = db.query(OAuthToken).filter(OAuthToken.user_id == user_id).delete()
        
        # 11. Delete all refresh tokens
        deletion_stats["refresh_tokens"] = db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
        
        logger.info("Child records deleted", extra={
            "user_id": str(user_id),
            "deletion_stats": deletion_stats,
        })
        
        # 12. Delete user account (LAST - after all related data)
        db.delete(current_user)
        db.commit()
        
        logger.warning("ACCOUNT DELETION completed", extra={
            "user_id": str(user_id),
            "email": user_email
        })
        
        # Send account deletion confirmation email (non-blocking, after commit)
        try:
            from ....infra.notifications.email_service import email_service
            email_service.send_account_deleted_email(
                user_email,
                user_name or user_email.split('@')[0]
            )
            logger.info("Account deletion email sent", extra={"email": user_email})
        except Exception as e:
            # Log but don't fail deletion (account is already deleted)
            logger.error(f"Failed to send deletion email: {str(e)}", exc_info=True)
        
        return {
            "message": "Account successfully deleted. All your data has been permanently removed.",
            "deleted_user_id": str(user_id),
            "deletion_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("ACCOUNT DELETION failed", extra={
            "user_id": str(current_user.id),
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please contact support."
        )


@router.delete("/", response_model=MessageResponse)
def delete_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user profile only (keeps account active).
    
    Deletes only the user profile while keeping the account and other data intact.
    Use the /account endpoint to delete the entire account.
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException: 404 if profile not found
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own profile
        - Does not require password (non-destructive operation)
    
    Notes:
        - Only deletes profile data, not account or other records
        - Account remains active and accessible
        - User can create new profile after deletion
        - Jobs, applications, documents remain intact
        - Use for profile reset without losing application data
        - Logs profile deletion with warning level
    
    Example:
        DELETE /api/profile/
        Response:
        {
            "message": "Profile deleted successfully"
        }
    """
    try:
        logger.warning("Deleting user profile", extra={"user_id": current_user.id})
        
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        
        if not profile:
            logger.warning("Profile not found for deletion", extra={"user_id": current_user.id})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        profile_id = str(profile.id)
        db.delete(profile)
        db.commit()
        
        logger.warning("Profile deleted successfully", extra={
            "user_id": current_user.id,
            "profile_id": profile_id
        })
        
        return {"message": "Profile deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Failed to delete profile", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete profile")
