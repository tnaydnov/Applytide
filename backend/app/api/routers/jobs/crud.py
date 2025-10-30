"""
Jobs CRUD Module

Handles basic job CRUD operations: create, read, update, delete.
"""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException

from ....db import models
from ...deps import get_current_user
from ...deps import get_job_service
from ....domain.jobs.service import JobService
from .schemas import JobCreate, ManualJobCreate, JobOut
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a new job posting from extracted data.
    
    Creates a job posting record from AI-extracted job data. Typically used after
    job extraction from URL via the AI extraction endpoint.
    
    Request Body:
        JobCreate containing:
            - title: Job title
            - company_name: Company name
            - source_url: Original job posting URL
            - location: Job location
            - remote_type: Remote work type (remote/hybrid/onsite)
            - job_type: Employment type (full-time/part-time/contract)
            - description: Full job description
            - requirements: List of job requirements
            - skills: List of required skills
            - salary_range: Optional salary information
            - company_website: Optional company website
    
    Args:
        payload: Job creation data
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        JobOut: Created job posting with generated ID and timestamps
    
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 500 if creation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - Job automatically associated with current user
        - Input validation via Pydantic schema
    
    Notes:
        - Typically called after AI extraction completes
        - Source URL stored for reference and updates
        - Skills and requirements stored as arrays for searching
        - Duplicate detection not performed (user may save same job multiple times)
        - Logs creation with job title for analytics
    
    Example:
        POST /api/jobs
        Request:
        {
            "title": "Senior Python Engineer",
            "company_name": "Tech Corp",
            "source_url": "https://jobs.example.com/123",
            "location": "San Francisco, CA",
            "remote_type": "hybrid",
            "job_type": "full-time",
            "description": "We are seeking...",
            "requirements": ["5+ years Python", "FastAPI"],
            "skills": ["Python", "FastAPI", "PostgreSQL"]
        }
        Response: JobOut object with ID and timestamps
    """
    try:
        logger.info(
            "Creating job",
            extra={
                "user_id": str(current_user.id),
                "job_title": payload.dict().get("title")
            }
        )
        
        dto = svc.create_job(user_id=current_user.id, payload=payload.dict())
        
        logger.info(
            "Job created successfully",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(dto.id)
            }
        )
        
        return JobOut(**dto.__dict__)
    
    except Exception as e:
        logger.error(
            "Error creating job",
            extra={
                "user_id": str(current_user.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to create job"
        )


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get a specific job by ID.
    
    Retrieves complete details of a single saved job posting including all extracted
    information and metadata.
    
    Path Parameters:
        - job_id: UUID of the job to retrieve
    
    Args:
        job_id: Job UUID
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        JobOut: Complete job details
    
    Raises:
        HTTPException: 404 if job not found or not owned by user
        HTTPException: 500 if retrieval fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only access their own saved jobs
        - Returns 404 for unauthorized access (no information leakage)
    
    Notes:
        - Includes all job fields extracted from original posting
        - Useful for job detail view and application preparation
        - Logs access for analytics
    
    Example:
        GET /api/jobs/550e8400-e29b-41d4-a716-446655440000
        Response: JobOut object with complete job details
    """
    try:
        logger.debug(
            "Getting job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        
        dto = svc.get_job(user_id=current_user.id, job_id=job_id)
        return JobOut(**dto.__dict__)
    
    except ValueError as e:
        logger.warning(
            "Job not found",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        raise HTTPException(status_code=404, detail="Job not found")
    except Exception as e:
        logger.error(
            "Error getting job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve job")


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: uuid.UUID,
    payload: ManualJobCreate,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Update an existing job posting.
    
    Updates job information with new data. Performs complete replacement of job
    details (not a partial update). Used to correct extraction errors or enhance
    job details after initial save.
    
    Path Parameters:
        - job_id: UUID of the job to update
    
    Request Body:
        ManualJobCreate containing updated job data
    
    Args:
        job_id: Job UUID
        payload: Complete updated job data
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        JobOut: Updated job posting with new data and updated_at timestamp
    
    Raises:
        HTTPException: 404 if job not found or not authorized
        HTTPException: 400 if validation fails
        HTTPException: 500 if update fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own jobs
        - Ownership verification before update
        - Returns 404 for unauthorized access (no information leakage)
    
    Notes:
        - Complete replacement of all job fields (not partial PATCH)
        - Use to fix AI extraction errors
        - Use to add details missed by extraction
        - Updated_at timestamp automatically updated
        - Original created_at preserved
        - Logs update with user_id and job_id for audit trail
    
    Example:
        PUT /api/jobs/550e8400-e29b-41d4-a716-446655440000
        Request: ManualJobCreate with updated data
        Response: Updated JobOut object
    """
    try:
        logger.info(
            "Updating job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        
        dto = svc.update_job(user_id=current_user.id, job_id=job_id, payload=payload.dict())
        
        logger.info(
            "Job updated successfully",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        
        return JobOut(**dto.__dict__)
    
    except ValueError:
        logger.warning(
            "Job not found for update",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    except Exception as e:
        logger.error(
            "Error updating job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to update job")


@router.delete("/{job_id}")
def delete_job(
    job_id: uuid.UUID,
    svc: JobService = Depends(get_job_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delete a saved job posting.
    
    Permanently removes a job posting from the user's saved jobs. This operation
    is irreversible. Associated applications remain intact.
    
    Path Parameters:
        - job_id: UUID of the job to delete
    
    Args:
        job_id: Job UUID
        svc: Job service from dependency injection
        current_user: Authenticated user from dependency injection
    
    Returns:
        dict: Success message confirming deletion
    
    Raises:
        HTTPException: 404 if job not found or not authorized
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own jobs
        - Ownership verification before deletion
        - Returns 404 for unauthorized access (no information leakage)
    
    Notes:
        - Operation is irreversible - no recovery possible
        - Applications referencing this job remain intact (job_id set to null or orphaned)
        - Useful for cleaning up irrelevant saved jobs
        - Recommended to show confirmation dialog in UI before calling
        - Logs deletion with info level for audit trail
        - Does not affect job postings on original sites
    
    Example:
        DELETE /api/jobs/550e8400-e29b-41d4-a716-446655440000
        Response:
        {
            "message": "Job deleted successfully"
        }
    """
    try:
        logger.info(
            "Deleting job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        
        svc.delete_job(user_id=current_user.id, job_id=job_id)
        
        logger.info(
            "Job deleted successfully",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        
        return {"message": "Job deleted successfully"}
    
    except ValueError:
        logger.warning(
            "Job not found for deletion",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id)
            }
        )
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    except Exception as e:
        logger.error(
            "Error deleting job",
            extra={
                "user_id": str(current_user.id),
                "job_id": str(job_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to delete job")
