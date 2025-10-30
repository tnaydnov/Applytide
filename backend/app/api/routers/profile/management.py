"""
Profile Management Module
Core profile CRUD operations: get, create, update, and export
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import ValidationError
from datetime import datetime, timezone
import json

from ....db.session import get_db
from ....api.deps import get_current_user
from ....db.models import User, UserProfile
from ....infra.logging import get_logger
from .schemas import ProfileRequest

router = APIRouter()
logger = get_logger(__name__)


@router.get("/")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile.
    
    Retrieves the complete profile for the authenticated user. If no profile exists,
    returns an empty profile structure with default values.
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Complete profile data including:
            - id: Profile ID (empty string if no profile)
            - user_id: User's UUID
            - preferred_locations: List of preferred work locations
            - country: User's country
            - remote_preference: Remote work preference
            - target_roles: List of target job roles
            - target_industries: List of target industries
            - experience_level: Experience level string
            - career_goals: List of career goals
            - skills: List of skills
    
    Raises:
        HTTPException: 500 if database query fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only access their own profile
    
    Notes:
        - Returns empty profile structure if user has no profile yet
        - Safe to call even for new users without profiles
        - Used by frontend to populate profile forms
    
    Example:
        GET /api/profile/
        Response:
        {
            "id": "uuid-here",
            "user_id": "user-uuid",
            "preferred_locations": ["New York", "Remote"],
            "country": "USA",
            "remote_preference": "hybrid",
            "target_roles": ["Software Engineer"],
            "target_industries": ["Tech"],
            "experience_level": "mid",
            "career_goals": ["Lead team"],
            "skills": ["Python", "FastAPI"]
        }
    """
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
        
        logger.debug("Profile retrieved", extra={
            "user_id": current_user.id,
            "profile_id": str(profile.id)
        })
        
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
    """
    Create or update user profile.
    
    Updates existing profile or creates new one if it doesn't exist. Accepts complete
    profile data and validates all fields before saving.
    
    Request Body:
        ProfileRequest containing:
            - preferred_locations: List of preferred work locations
            - current_location: Current location string
            - country: Country code or name
            - remote_preference: Remote work preference (onsite/hybrid/remote)
            - target_roles: List of target job roles
            - target_industries: List of target industries
            - experience_level: Experience level (entry/mid/senior/etc)
            - career_goals: List of career goals
            - core_skills: List of technical skills
            - learning_goals: List of skills to learn
            - years_experience: Years of experience string
            - job_search_status: Current job search status
            - availability: Availability string
            - currency: Preferred currency
    
    Args:
        request: FastAPI request object for body parsing
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        UserProfile: Updated or newly created profile object
    
    Raises:
        HTTPException: 422 if validation fails
        HTTPException: 400 if request parsing fails
        HTTPException: 500 if database operation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own profile
        - Input validation via Pydantic model
    
    Notes:
        - Creates profile if it doesn't exist (upsert operation)
        - Validates all fields against ProfileRequest schema
        - Commits transaction and refreshes object before returning
        - Logs profile_id for both create and update operations
    
    Example:
        PUT /api/profile/
        Request:
        {
            "preferred_locations": ["San Francisco", "Remote"],
            "country": "USA",
            "remote_preference": "remote",
            "target_roles": ["Senior Engineer"],
            "experience_level": "senior",
            "core_skills": ["Python", "React"]
        }
        Response: Updated profile object
    """
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
    
    Exports complete user account data including profile, jobs, documents, reminders,
    and preferences in a structured JSON format. Implements GDPR Article 20 (Right to
    Data Portability).
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Complete data export containing:
            - export_info: Metadata (user_id, export_date, format_version)
            - account: Basic account information
            - profile: User profile data
            - jobs: All saved jobs
            - documents: Document metadata (not file contents)
            - reminders: All reminders with notes
            - preferences: User preferences
    
    Raises:
        HTTPException: 500 if export generation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only export their own data
        - No sensitive data like passwords included
        - OAuth tokens excluded from export
    
    Notes:
        - Document file contents not included (download separately)
        - All timestamps converted to ISO format for portability
        - Includes comprehensive audit trail for GDPR compliance
        - Failed document retrieval doesn't fail entire export
        - Logs export completion with statistics
        - Can be used for backup or account migration
    
    Example:
        GET /api/profile/export
        Response:
        {
            "export_info": {
                "user_id": "uuid",
                "export_date": "2025-10-29T...",
                "format_version": "1.0"
            },
            "account": {...},
            "profile": {...},
            "jobs": [...],
            "documents": [...],
            "reminders": [...],
            "preferences": {...}
        }
    """
    try:
        logger.info("Data export requested", extra={"user_id": str(current_user.id)})
        
        from ....db.models import (
            UserProfile, Job, Reminder, ReminderNote, 
            UserPreferences, Resume
        )
        
        # Initialize export structure
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
        
        # Export profile data
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
        
        # Export jobs data
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
        
        # Export documents metadata
        try:
            documents = db.query(Resume).filter(Resume.user_id == current_user.id).all()
            for doc in documents:
                export_data["documents"].append({
                    "id": str(doc.id),
                    "label": doc.label,
                    "file_path": doc.file_path,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    "note": "File contents not included in export. Download files separately from the application."
                })
        except Exception as e:
            logger.error(f"Failed to export documents metadata: {str(e)}", exc_info=True)
            export_data["documents_error"] = "Failed to retrieve documents metadata"
        
        # Export reminders data with notes
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
        
        # Export user preferences
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
    """
    Check if profile is complete enough for AI dashboard access.
    
    Calculates profile completeness percentage based on required fields and determines
    if the profile meets the minimum threshold for accessing AI-powered features.
    
    Args:
        current_user: Authenticated user from dependency injection
        db: Database session from dependency injection
    
    Returns:
        dict: Completeness status containing:
            - is_complete: Boolean indicating if profile meets 75% threshold
            - completeness_percentage: Integer percentage (0-100)
            - message: Human-readable status message
    
    Raises:
        HTTPException: 500 if database query fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only check their own profile completeness
    
    Notes:
        - Requires 75% completeness for AI features access
        - Required fields: preferred_locations, country, remote_preference, experience_level
        - Returns 0% if no profile exists
        - Used by frontend to show profile setup prompts
        - Helps ensure quality of AI-generated recommendations
    
    Example:
        GET /api/profile/completeness
        Response:
        {
            "is_complete": true,
            "completeness_percentage": 100,
            "message": "Profile complete"
        }
    """
    try:
        logger.debug("Checking profile completeness", extra={"user_id": current_user.id})
        
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        
        if not profile:
            logger.debug("No profile found for completeness check", extra={"user_id": current_user.id})
            return {
                "is_complete": False,
                "completeness_percentage": 0,
                "message": "Profile setup required"
            }

        # Check required fields for completeness
        required_fields = [
            profile.preferred_locations,
            profile.country,
            profile.remote_preference,
            profile.experience_level
        ]
        
        completed_count = sum(1 for field in required_fields if field)
        completeness_percentage = (completed_count / len(required_fields)) * 100
        is_complete = completeness_percentage >= 75
        
        logger.debug("Profile completeness calculated", extra={
            "user_id": current_user.id,
            "completeness": int(completeness_percentage),
            "is_complete": is_complete
        })

        return {
            "is_complete": is_complete,
            "completeness_percentage": int(completeness_percentage),
            "message": "Profile complete" if is_complete else "Please complete your profile setup"
        }
        
    except Exception as e:
        logger.error("Failed to check profile completeness", extra={
            "user_id": current_user.id,
            "error": str(e)
        }, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check profile completeness")
