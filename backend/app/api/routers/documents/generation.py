"""
Document Generation Module

Handles AI-powered document generation (cover letters, etc.).
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ....db.session import get_db
from ...deps import get_current_user
from ....db.models import User
from .schemas import CoverLetterRequest
from ...deps import get_document_service
from ....domain.documents.service import DocumentService
from ....infra.logging import get_logger
from ...schemas.common import CoverLetterGenerationResponse
from ....infra.security.rate_limiter import ai_limiter
from ....infra.external.llm_tracker import check_llm_budget

router = APIRouter()
logger = get_logger(__name__)


@router.post("/cover-letter/generate", response_model=CoverLetterGenerationResponse)
async def generate_cover_letter(
    request: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Generate a cover letter using AI or template.
    
    Creates a personalized cover letter tailored to a specific job posting and user's
    resume. Uses AI when configured for intelligent content generation, falls back to
    template-based generation otherwise.
    
    Request Body:
        CoverLetterRequest containing:
            - job_id: UUID of target job posting
            - resume_id: UUID of resume to base cover letter on
            - tone: Tone/style (professional/enthusiastic/formal/creative)
            - additional_context: Optional custom notes to include
            - template_id: Optional specific template to use
            - include_salary: Whether to mention salary expectations
    
    Args:
        request: Cover letter generation request with parameters
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        dict: Generated cover letter containing:
            - content: Full cover letter text
            - job_title: Target job title
            - company_name: Target company name
            - key_highlights: Resume highlights emphasized
            - word_count: Total word count
            - estimated_read_time: Estimated reading time
            - tone_applied: Tone used in generation
    
    Raises:
        HTTPException: 404 if job or resume not found
        HTTPException: 400 if generation parameters invalid
        HTTPException: 500 if generation fails
        HTTPException: 503 if AI service unavailable
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only use their own resumes
        - Job ID ownership validated
        - AI-generated content logged for quality monitoring
    
    Notes:
        - AI generation requires OpenAI API key configuration
        - Falls back to template-based generation if AI unavailable
        - Cover letter personalized with: job requirements, resume highlights, company info
        - Tone options: professional (balanced), enthusiastic (energetic), 
          formal (conservative), creative (innovative)
        - Additional context incorporated naturally into narrative
        - Generated content requires user review before sending
        - Premium feature - may require premium subscription
        - Cover letter saved as new document for easy editing
        - Logs generation request for analytics and quality improvement
    
    Example:
        POST /api/documents/cover-letter/generate
        Request:
        {
            "job_id": "job-uuid",
            "resume_id": "resume-uuid",
            "tone": "professional",
            "additional_context": "Highlight my AWS certification",
            "include_salary": false
        }
        Response:
        {
            "content": "Dear Hiring Manager...",
            "job_title": "Senior Engineer",
            "company_name": "Tech Corp",
            "key_highlights": ["AWS Expert", "5 years Python"],
            "word_count": 350,
            "tone_applied": "professional"
        }
    """
    # Per-user AI rate limit for cover letter generation
    allowed, retry_after = ai_limiter.check_rate_limit(str(current_user.id))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"AI generation rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    # Global daily LLM budget cap
    if not check_llm_budget():
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable. Please try again later.",
        )

    logger.info(
        "Generating cover letter",
        extra={
            "user_id": str(current_user.id),
            "job_id": request.job_id,
            "resume_id": request.resume_id
        }
    )
    result = await svc.generate_cover_letter(db, str(current_user.id), request)
    return result
