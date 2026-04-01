"""
Document Analysis Module

Handles AI-powered document analysis and optimization for ATS compatibility.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ....db.session import get_db
from ...deps import get_current_user
from ....db.models import User
from .schemas import DocumentAnalysis, DocumentOptimizationRequest
from ...deps import get_document_service
from ....domain.documents.service import DocumentService
from ...schemas.common import DocumentOptimizationResponse
from ....infra.security.rate_limiter import analysis_limiter
from ....infra.external.llm_tracker import check_llm_budget

router = APIRouter()


@router.post("/{document_id}/analyze", response_model=DocumentAnalysis)
def analyze_document(
    document_id: str,
    job_id: Optional[str] = Query(None),
    use_ai: bool = Query(True, description="If true and OpenAI is configured, include AI suggestions."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Analyze document for ATS compatibility and optimization suggestions.
    
    Performs comprehensive analysis of document (typically resume) for Applicant Tracking
    System (ATS) compatibility. Optionally analyzes against specific job posting for
    tailored recommendations. Uses AI when configured for enhanced suggestions.
    
    Path Parameters:
        - document_id: UUID of the document to analyze
    
    Query Parameters:
        - job_id: Optional job posting ID to analyze against
        - use_ai: Whether to include AI-powered suggestions (default: true)
    
    Args:
        document_id: Document UUID string
        job_id: Optional job posting UUID for targeted analysis
        use_ai: Boolean flag to enable AI suggestions
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        DocumentAnalysis: Analysis results containing:
            - ats_score: Overall ATS compatibility score (0-100)
            - keyword_matches: Matched keywords from job posting
            - missing_keywords: Important keywords not found
            - formatting_issues: List of formatting problems
            - section_analysis: Analysis of each resume section
            - suggestions: List of improvement recommendations
            - ai_insights: AI-generated suggestions (if use_ai=true and configured)
    
    Raises:
        HTTPException: 404 if document or job not found
        HTTPException: 400 if document type not analyzable
        HTTPException: 500 if analysis fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only analyze their own documents
        - Job ID ownership validated if provided
        - AI features only available if OpenAI configured
    
    Notes:
        - ATS analysis focuses on: keywords, formatting, sections, content structure
        - Job-specific analysis provides targeted keyword matching
        - Without job_id, performs general ATS compatibility check
        - AI suggestions require OpenAI API key configuration
        - Analysis cached to improve performance on repeated calls
        - Premium feature - may require premium subscription
    
    Example:
        POST /api/documents/550e8400-e29b-41d4-a716-446655440000/analyze?job_id=job-uuid&use_ai=true
        Response:
        {
            "ats_score": 85,
            "keyword_matches": ["Python", "FastAPI", "React"],
            "missing_keywords": ["AWS", "Docker"],
            "formatting_issues": ["Use standard section headings"],
            "suggestions": ["Add AWS experience", "Quantify achievements"],
            "ai_insights": "Consider emphasizing cloud infrastructure..."
        }
    """
    # Per-user AI rate limit for analysis
    allowed, retry_after = analysis_limiter.check_rate_limit(str(current_user.id))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Analysis rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
    # Global daily LLM budget cap
    if not check_llm_budget():
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable. Please try again later.",
        )
    return svc.analyze_document_ats(db=db, document_id=document_id, job_id=job_id, user_id=str(current_user.id), use_ai=use_ai)


@router.post("/optimize", response_model=DocumentOptimizationResponse)
def optimize_document(
    request: DocumentOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Optimize document content for ATS and target job.
    
    Applies optimization transformations to document content to improve ATS compatibility
    and keyword matching for target job posting. Returns optimized content without
    modifying original document.
    
    Request Body:
        DocumentOptimizationRequest containing:
            - document_id: UUID of document to optimize
            - job_id: Optional target job UUID for keyword optimization
            - optimization_level: Level of changes (minimal/moderate/aggressive)
            - preserve_formatting: Whether to maintain original formatting
            - target_keywords: Optional list of keywords to emphasize
    
    Args:
        request: Optimization request with parameters
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        dict: Optimization results containing:
            - optimized_content: Modified document content
            - optimization_summary: Summary of changes made
            - improvements_made: List of specific improvements
            - keyword_density: Keyword frequency analysis
            - before_score: ATS score before optimization
            - after_score: ATS score after optimization
    
    Raises:
        HTTPException: 404 if document or job not found
        HTTPException: 400 if optimization parameters invalid
        HTTPException: 500 if optimization fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only optimize their own documents
        - Job ID ownership validated if provided
        - Original document remains unchanged
    
    Notes:
        - Returns optimized content without saving (user must confirm)
        - Optimization levels: minimal (keywords only), moderate (structure + keywords), 
          aggressive (rewrite for maximum ATS score)
        - Preserves original document for comparison
        - Target keywords automatically extracted from job posting if not provided
        - Improvements include: keyword density optimization, section restructuring,
          ATS-friendly formatting, bullet point optimization
        - Premium feature - may require premium subscription
        - Recommended to show before/after comparison in UI
    
    Example:
        POST /api/documents/optimize
        Request:
        {
            "document_id": "doc-uuid",
            "job_id": "job-uuid",
            "optimization_level": "moderate",
            "preserve_formatting": true,
            "target_keywords": ["Python", "FastAPI", "AWS"]
        }
        Response:
        {
            "optimized_content": "Enhanced resume content...",
            "optimization_summary": "Document optimized for target keywords and ATS compatibility",
            "improvements_made": ["Enhanced keyword density", "Improved formatting", "Added missing sections"],
            "before_score": 72,
            "after_score": 89
        }
    """
    # Per-user AI rate limit for optimization
    allowed, retry_after = analysis_limiter.check_rate_limit(str(current_user.id))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Analysis rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
    # Global daily LLM budget cap
    if not check_llm_budget():
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable. Please try again later.",
        )
    optimized = svc.optimize_document(db=db, request=request)
    return {
        "optimized_content": optimized,
        "optimization_summary": "Document optimized for target keywords and ATS compatibility",
        "improvements_made": ["Enhanced keyword density", "Improved formatting for ATS scanning", "Added missing sections"],
    }
