"""
Jobs Manual Creation Module

Handles manual job creation from extension and user input.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends

from ....db import models
from ...deps import get_current_user
from ...deps import get_job_service
from ....domain.jobs.service import JobService
from .schemas import ManualJobCreate, JobOut

router = APIRouter()


@router.post("/extension", response_model=JobOut)
def create_job_from_extension(
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create job from browser extension.
    
    Creates job posting from data submitted by browser extension. Used when user
    saves job from extension while browsing job boards.
    
    Request Body:
        ManualJobCreate with job details extracted by extension
    
    Args:
        payload: Job creation data from extension
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        JobOut: Created job posting
    
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 500 if creation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Job automatically associated with current user
        - Extension token validation handled upstream
    
    Notes:
        - Identical to /manual endpoint but tracked separately for analytics
        - Used by browser extension integration
        - Logs source as "extension" for tracking
        - Supports partial data (extension may not extract all fields)
    
    Example:
        POST /api/jobs/extension
        Request: ManualJobCreate payload
        Response: JobOut object
    """
    dto = svc.create_manual_job(user_id=current_user.id, payload=payload.dict())
    return JobOut(**dto.__dict__)


@router.post("/manual", response_model=JobOut)
def create_manual_job(
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create job manually without AI extraction.
    
    Creates job posting from user-provided data without using AI extraction.
    Used when users want to manually add job postings or when AI extraction unavailable.
    
    Request Body:
        ManualJobCreate containing job details (title and company_name required)
    
    Args:
        payload: Manual job creation data
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        JobOut: Created job posting
    
    Raises:
        HTTPException: 400 if validation fails (missing required fields)
        HTTPException: 500 if creation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Job automatically associated with current user
        - Input validation via Pydantic schema
    
    Notes:
        - Requires only title and company_name (minimum viable job)
        - All other fields optional for flexibility
        - Used as fallback when AI extraction fails
        - Useful for tracking opportunities received via email
        - Logs creation as "manual" for analytics
    
    Example:
        POST /api/jobs/manual
        Request:
        {
            "title": "Senior Engineer",
            "company_name": "Tech Corp",
            "location": "Remote"
        }
        Response: JobOut object
    """
    dto = svc.create_manual_job(user_id=current_user.id, payload=payload.dict())
    return JobOut(**dto.__dict__)
