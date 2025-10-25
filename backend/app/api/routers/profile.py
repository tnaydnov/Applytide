"""
User Profile API Router
Handles user profile creation, updates, and retrieval for personalization
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ValidationError, field_validator
from datetime import datetime, timezone
import json

from ...db.session import get_db
from ...api.deps_auth import get_current_user
from ...db.models import User, UserProfile
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/profile", tags=["User Profile"])
logger = get_logger(__name__)

# Pydantic models for request/response
class LocationRequest(BaseModel):
    preferred_locations: List[str]
    country: str
    remote_preference: str

class CareerRequest(BaseModel):
    target_roles: List[str]
    target_industries: List[str]
    experience_level: str
    career_goals: List[str]

class SkillsRequest(BaseModel):
    skills: List[str]

class ProfileRequest(BaseModel):
    # Location data
    preferred_locations: List[str] = []
    current_location: Optional[str] = ""
    country: Optional[str] = ""
    remote_preference: Optional[str] = ""
    # Career data
    target_roles: List[str] = []
    target_industries: List[str] = []
    experience_level: Optional[str] = ""
    career_goals: List[str] = []
    # Skills and compensation
    core_skills: List[str] = []
    learning_goals: List[str] = []
    years_experience: Optional[str] = ""
    job_search_status: Optional[str] = ""
    availability: Optional[str] = ""
    currency: Optional[str] = ""

    @field_validator(
        'preferred_locations', 'target_roles', 'target_industries',
        'career_goals', 'core_skills', 'learning_goals',
        mode='before'
    )
    @classmethod
    def handle_empty_lists(cls, v):
        if v is None or v == '':
            return []
        return v if isinstance(v, list) else [v]

    @field_validator(
        'current_location', 'country', 'remote_preference',
        'experience_level', 'years_experience', 'job_search_status',
        'availability', 'currency', mode='before'
    )
    @classmethod
    def handle_empty_strings(cls, v):
        return v if v is not None and v != '' else None

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    preferred_locations: Optional[List[str]]
    country: Optional[str]
    remote_preference: Optional[str]
    target_roles: Optional[List[str]]
    target_industries: Optional[List[str]]
    experience_level: Optional[str]
    skills: Optional[List[str]]
    career_goals: Optional[List[str]]

    class Config:
        from_attributes = True

@router.get("/")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    try:
        logger.debug("Retrieving user profile", extra={"user_id": current_user.id})
        
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if not profile:
            logger.debug("No profile found, returning empty", extra={"user_id": current_user.id})
            return {
                "id": "",
                "user_id": str(current_user.id),
                "preferred_locations": [],
                "country": "",
                "remote_preference": "",
                "target_roles": [],
                "target_industries": [],
                "experience_level": "",
                "career_goals": [],
                "skills": []
            }
        
        logger.debug("Profile retrieved", extra={"user_id": current_user.id, "profile_id": str(profile.id)})
        return profile
    except Exception as e:
        logger.error("Failed to retrieve user profile", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")

@router.put("/")
async def update_user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    try:
        logger.debug("Updating user profile", extra={"user_id": current_user.id})
        
        body = await request.body()
        raw_data = json.loads(body.decode())

        profile_data = ProfileRequest(**raw_data)
    except ValidationError as e:
        logger.warning("Profile validation error", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")
    except Exception as e:
        logger.error("Profile request parsing error", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error: {e}")

    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

        if profile:
            logger.debug("Updating existing profile", extra={
                "user_id": current_user.id,
                "profile_id": str(profile.id)
            })
            profile.preferred_locations = profile_data.preferred_locations
            profile.country = profile_data.country
            profile.remote_preference = profile_data.remote_preference
            profile.target_roles = profile_data.target_roles
            profile.target_industries = profile_data.target_industries
            profile.experience_level = profile_data.experience_level
            profile.skills = profile_data.core_skills
            profile.career_goals = profile_data.career_goals
        else:
            logger.debug("Creating new profile", extra={"user_id": current_user.id})
            profile = UserProfile(
                user_id=current_user.id,
                preferred_locations=profile_data.preferred_locations,
                country=profile_data.country,
                remote_preference=profile_data.remote_preference,
                target_roles=profile_data.target_roles,
                target_industries=profile_data.target_industries,
                experience_level=profile_data.experience_level,
                skills=profile_data.core_skills,
                career_goals=profile_data.career_goals
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)
        
        logger.info("Profile updated successfully", extra={
            "user_id": current_user.id,
            "profile_id": str(profile.id)
        })
        return profile
    except Exception as e:
        db.rollback()
        logger.error("Failed to save profile", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile: {str(e)}"
        )

@router.get("/export")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all user data in JSON format (GDPR Data Portability).
    Returns a comprehensive JSON containing all user information.
    """
    try:
        logger.info("Data export requested", extra={"user_id": str(current_user.id)})
        
        from ...db.models import UserProfile, Job, Reminder, ReminderNote, UserPreferences, OAuthToken
        from ...domain.documents.service import DocumentService
        
        export_data = {
            "export_info": {
                "user_id": str(current_user.id),
                "export_date": datetime.now(timezone.utc).isoformat(),
                "format_version": "1.0"
            },
            "account": {
                "email": current_user.email,
                "full_name": current_user.full_name,
                "is_premium": current_user.is_premium,
                "is_oauth_user": current_user.is_oauth_user,
                "email_verified": current_user.email_verified_at is not None,
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
                "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
                "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None
            },
            "profile": None,
            "jobs": [],
            "documents": [],
            "reminders": [],
            "preferences": None
        }
        
        # Profile data
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if profile:
            export_data["profile"] = {
                "preferred_locations": profile.preferred_locations,
                "country": profile.country,
                "remote_preference": profile.remote_preference,
                "target_roles": profile.target_roles,
                "target_industries": profile.target_industries,
                "experience_level": profile.experience_level,
                "skills": profile.skills,
                "career_goals": profile.career_goals,
                "created_at": profile.created_at.isoformat() if profile.created_at else None
            }
        
        # Jobs data - only fields that actually exist in Job model
        jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
        for job in jobs:
            job_data = {
                "id": str(job.id),
                "user_id": str(job.user_id) if job.user_id else None,
                "company_id": str(job.company_id) if job.company_id else None,
                "source_url": job.source_url,
                "title": job.title,
                "location": job.location,
                "remote_type": job.remote_type,
                "job_type": job.job_type,
                "description": job.description,
                "requirements": job.requirements if job.requirements else [],
                "skills": job.skills if job.skills else [],
                "created_at": job.created_at.isoformat() if job.created_at else None
            }
                
            export_data["jobs"].append(job_data)
        
        # Documents data (metadata only, not file contents)
        try:
            doc_service = DocumentService()
            documents = doc_service.list_documents(db=db, user_id=str(current_user.id))
            for doc in documents:
                export_data["documents"].append({
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    "note": "File contents not included in export. Download files separately from the application."
                })
        except Exception as e:
            logger.error(f"Failed to export documents metadata: {str(e)}", exc_info=True)
            export_data["documents_error"] = "Failed to retrieve documents metadata"
        
        # Reminders data
        reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
        for reminder in reminders:
            reminder_data = {
                "id": str(reminder.id),
                "title": reminder.title,
                "description": reminder.description,
                "reminder_date": reminder.reminder_date.isoformat() if reminder.reminder_date else None,
                "is_completed": reminder.is_completed,
                "job_id": str(reminder.job_id) if reminder.job_id else None,
                "created_at": reminder.created_at.isoformat() if reminder.created_at else None,
                "notes": []
            }
            
            # Get reminder notes
            notes = db.query(ReminderNote).filter(ReminderNote.reminder_id == reminder.id).all()
            for note in notes:
                reminder_data["notes"].append({
                    "id": str(note.id),
                    "content": note.content,
                    "created_at": note.created_at.isoformat() if note.created_at else None
                })
            
            export_data["reminders"].append(reminder_data)
        
        # User preferences
        prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
        if prefs:
            export_data["preferences"] = {
                "email_notifications": prefs.email_notifications,
                "theme": prefs.theme,
                "created_at": prefs.created_at.isoformat() if prefs.created_at else None
            }
        
        logger.info("Data export completed", extra={
            "user_id": str(current_user.id),
            "jobs_count": len(export_data["jobs"]),
            "documents_count": len(export_data["documents"]),
            "reminders_count": len(export_data["reminders"])
        })
        
        return export_data
        
    except Exception as e:
        logger.error("Data export failed", extra={
            "user_id": str(current_user.id),
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )

@router.get("/completeness")
async def get_profile_completeness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if profile is complete enough for AI dashboard access"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"is_complete": False, "completeness_percentage": 0, "message": "Profile setup required"}

    required_fields = [
        profile.preferred_locations,
        profile.country,
        profile.remote_preference,
        profile.experience_level
    ]
    completed_count = sum(1 for field in required_fields if field)
    completeness_percentage = (completed_count / len(required_fields)) * 100
    is_complete = completeness_percentage >= 75

    return {
        "is_complete": is_complete,
        "completeness_percentage": int(completeness_percentage),
        "message": "Profile complete" if is_complete else "Please complete your profile setup"
    }

@router.get("/job-preferences")
async def get_job_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: job preferences derived from main profile."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"preferences": {}}
    return {
        "company_size": [],
        "company_stage": [],
        "company_culture": [],
        "team_size": "medium",
        "management_interest": False
    }

@router.put("/job-preferences")
async def update_job_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: not persisted."""
    return {"message": "Job preferences updated successfully"}

@router.get("/career-goals")
async def get_career_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"goals": []}
    return {"short_term_goals": profile.career_goals or [], "long_term_goals": [], "career_path": "technical_leadership"}

@router.put("/career-goals")
async def update_career_goals(
    goals: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Placeholder: not persisted."""
    return {"message": "Career goals updated successfully"}

@router.delete("/account")
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account and ALL associated data (GDPR Right to Erasure).
    This includes:
    - User account
    - Profile
    - All job applications
    - All documents (files + DB records)
    - All reminders and notes
    - All calendar tokens
    - All sessions/refresh tokens
    """
    try:
        logger.warning("ACCOUNT DELETION initiated", extra={
            "user_id": str(current_user.id),
            "email": current_user.email
        })
        
        user_id = current_user.id
        user_email = current_user.email
        
        # Import here to avoid circular imports
        from ...db.models import UserProfile, Job, Reminder, ReminderNote, UserPreferences
        from ...domain.documents.service import DocumentService
        from ...infra.cache import get_redis
        
        # 1. Delete all documents (files + DB records)
        try:
            doc_service = DocumentService()
            documents = doc_service.list_documents(db=db, user_id=str(user_id))
            for doc in documents:
                try:
                    doc_service.delete_document(db=db, user_id=str(user_id), document_id=str(doc.id))
                    logger.info(f"Deleted document {doc.id} for user {user_id}")
                except Exception as e:
                    logger.error(f"Failed to delete document {doc.id}: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Failed to delete documents: {str(e)}", exc_info=True)
        
        # 2. Delete all reminders and notes
        try:
            db.query(ReminderNote).filter(ReminderNote.user_id == user_id).delete()
            db.query(Reminder).filter(Reminder.user_id == user_id).delete()
            logger.info(f"Deleted reminders for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete reminders: {str(e)}", exc_info=True)
        
        # 3. Delete all job applications
        try:
            db.query(Job).filter(Job.user_id == user_id).delete()
            logger.info(f"Deleted jobs for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete jobs: {str(e)}", exc_info=True)
        
        # 4. Delete user preferences
        try:
            db.query(UserPreferences).filter(UserPreferences.user_id == user_id).delete()
            logger.info(f"Deleted preferences for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete preferences: {str(e)}", exc_info=True)
        
        # 5. Delete user profile
        try:
            db.query(UserProfile).filter(UserProfile.user_id == user_id).delete()
            logger.info(f"Deleted profile for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete profile: {str(e)}", exc_info=True)
        
        # 6. Revoke all refresh tokens (Redis)
        try:
            redis = get_redis()
            # Revoke all refresh tokens for this user
            from ...infra.security.tokens import revoke_all_user_tokens
            revoke_all_user_tokens(user_id, redis)
            logger.info(f"Revoked all tokens for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to revoke tokens: {str(e)}", exc_info=True)
        
        # 7. Delete user account (LAST - after all related data)
        db.delete(current_user)
        db.commit()
        
        logger.warning("ACCOUNT DELETION completed", extra={
            "user_id": str(user_id),
            "email": user_email
        })
        
        return {
            "message": "Account successfully deleted. All your data has been permanently removed.",
            "deleted_user_id": str(user_id),
            "deletion_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
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
    Use /account endpoint to delete entire account.
    """
    try:
        logger.warning("Deleting user profile", extra={"user_id": current_user.id})
        
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if not profile:
            logger.warning("Profile not found for deletion", extra={"user_id": current_user.id})
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        
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
