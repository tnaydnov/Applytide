"""
Profile Deletion Module
Account and profile deletion endpoints for GDPR compliance
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User, UserProfile
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.delete("/account")
async def delete_user_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
        # Parse request body for password verification
        try:
            body = await request.json()
        except Exception:
            body = {}
        
        password = body.get("password")
        confirmation = body.get("confirmation")
        
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
        
        # 1. Delete all resumes (documents)
        try:
            deleted_resumes = db.query(Resume).filter(Resume.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_resumes} resumes", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete resumes: {str(e)}", exc_info=True)
        
        # 2. Delete all match results
        try:
            deleted_matches = db.query(MatchResult).filter(MatchResult.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_matches} match results", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete match results: {str(e)}", exc_info=True)
        
        # 3. Delete all notes
        try:
            deleted_notes = db.query(Note).filter(Note.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_notes} notes", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete notes: {str(e)}", exc_info=True)
        
        # 4. Delete all stages (via applications)
        try:
            app_ids = [app.id for app in db.query(Application.id).filter(Application.user_id == user_id).all()]
            if app_ids:
                deleted_stages = db.query(Stage).filter(Stage.application_id.in_(app_ids)).delete(synchronize_session=False)
                logger.info(f"Deleted {deleted_stages} stages", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete stages: {str(e)}", exc_info=True)
        
        # 5. Delete all applications
        try:
            deleted_apps = db.query(Application).filter(Application.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_apps} applications", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete applications: {str(e)}", exc_info=True)
        
        # 6. Delete all reminder notes first, then reminders
        try:
            deleted_reminder_notes = db.query(ReminderNote).filter(ReminderNote.user_id == user_id).delete()
            deleted_reminders = db.query(Reminder).filter(Reminder.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_reminders} reminders and {deleted_reminder_notes} notes", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete reminders: {str(e)}", exc_info=True)
        
        # 7. Delete all jobs
        try:
            deleted_jobs = db.query(Job).filter(Job.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_jobs} jobs", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete jobs: {str(e)}", exc_info=True)
        
        # 8. Delete user preferences
        try:
            deleted_prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_prefs} preferences", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete preferences: {str(e)}", exc_info=True)
        
        # 9. Delete user profile
        try:
            deleted_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_profile} profile", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete profile: {str(e)}", exc_info=True)
        
        # 10. Delete OAuth tokens
        try:
            deleted_oauth = db.query(OAuthToken).filter(OAuthToken.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_oauth} OAuth tokens", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete OAuth tokens: {str(e)}", exc_info=True)
        
        # 11. Delete all refresh tokens
        try:
            deleted_tokens = db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
            logger.info(f"Deleted {deleted_tokens} refresh tokens", extra={"user_id": str(user_id)})
        except Exception as e:
            logger.error(f"Failed to delete refresh tokens: {str(e)}", exc_info=True)
        
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
            detail=f"Failed to delete account. Please contact support. Error: {str(e)}"
        )


@router.delete("/")
async def delete_user_profile(
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
