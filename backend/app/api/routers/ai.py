"""
AI-Powered Job Extraction Router

This module provides AI-powered job posting extraction from web pages.
Uses LLM to parse job listings from various sources (HTML, JSON-LD, manual text)
and extract structured job information.

Key Features:
- Multi-source extraction (HTML, JSON-LD, readable text, manual selection)
- AI-powered content understanding via LLM
- Quality validation (rejects insufficient content)
- Size limits for performance
- XHR log analysis for dynamic content
- Fallback strategies for extraction

Use Cases:
- Browser extension job capture
- Manual text selection extraction
- Automated job board scraping
- Quick hints-based extraction

Dependencies:
- JobExtractionService for AI extraction logic
- LLM service for content analysis

Router: /api/ai
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from ...domain.jobs.extraction.service import JobExtractionService
from ..deps import get_job_extraction_service
from ...infra.logging import get_logger

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = get_logger(__name__)

class ExtractIn(BaseModel):
    url: str
    html: str = ""
    jsonld: Optional[List[Dict[str, Any]]] = None
    metas: Optional[Dict[str, Any]] = None
    readable: Optional[Dict[str, Any]] = None
    xhrLogs: Optional[List[Dict[str, Any]]] = None
    quick: Optional[Dict[str, Any]] = None
    manual_text: Optional[str] = None

class JobOut(BaseModel):
    title: str = ""
    company_name: str = ""
    source_url: str = ""
    location: str = ""
    remote_type: str = ""
    job_type: str = ""
    description: str = ""
    requirements: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)

class ExtractOut(BaseModel):
    job: JobOut

@router.post("/extract", response_model=ExtractOut)
def extract_job(
    payload: ExtractIn,
    svc: JobExtractionService = Depends(get_job_extraction_service),
):
    """
    Extract structured job data from web page using AI.
    
    Analyzes job posting content from various sources and extracts structured
    information using LLM. Supports multiple input formats and fallback strategies
    for maximum extraction success.
    
    Request Body:
        ExtractIn with:
        - url: Source URL (required, for reference)
        - html: Full page HTML (optional)
        - jsonld: JSON-LD structured data array (optional)
        - metas: Meta tags dictionary (optional)
        - readable: Readable content object (optional)
        - xhrLogs: XHR network logs for dynamic content (optional)
        - quick: Quick hints for fast extraction (optional)
        - manual_text: User-selected text (optional, max 200KB)
    
    Args:
        payload: Extraction input with job page data
        svc: Job extraction service from dependency injection
    
    Returns:
        ExtractOut: Extracted job data with all fields
    
    Raises:
        HTTPException: 400 if all content sources empty
        HTTPException: 413 if manual_text exceeds 200KB
        HTTPException: 400 if extraction produces insufficient content
        HTTPException: 400 if validation fails
        HTTPException: 500 if extraction fails
    
    Extraction Strategy:
        1. Try JSON-LD structured data (fastest, most reliable)
        2. Try quick hints if provided
        3. Try readable content
        4. Try full HTML parsing
        5. Try manual_text if provided
        6. Use XHR logs for dynamically loaded content
    
    Quality Validation:
        - Rejects results with no title AND no company AND description < 30 chars
        - Ensures extracted data meets minimum quality threshold
        - Prevents saving empty/useless job postings
    
    Security:
        - No authentication required (called by extension/public)
        - Size limits: manual_text max 200KB
        - Input validation via Pydantic schemas
        - No sensitive data exposure
    
    Notes:
        - LLM-powered extraction (may incur API costs)
        - Multiple sources improve extraction accuracy
        - URL required for reference (not fetched by server)
        - XHR logs help with JavaScript-rendered content
        - Logs all extraction attempts for debugging
        - Quality check prevents poor results
    
    Performance:
        - Quick hints fastest (if available)
        - JSON-LD second fastest
        - Full HTML slowest
        - Manual text depends on length
    
    Example:
        POST /api/ai/extract
        Request:
        {
            "url": "https://example.com/job/12345",
            "html": "<html>...</html>",
            "jsonld": [{...}],
            "readable": {"content": "..."},
            "quick": {"title": "Engineer"}
        }
        Response:
        {
            "job": {
                "title": "Senior Software Engineer",
                "company_name": "Tech Corp",
                "location": "San Francisco, CA",
                "remote_type": "Remote",
                "job_type": "Full-time",
                "description": "...",
                "requirements": ["5+ years experience", ...],
                "skills": ["Python", "React", ...]
            }
        }
    """
    try:
        html_len = len(payload.html or "")
        manual_text_len = len(payload.manual_text or "")

        logger.info(
            "Job extraction request received",
            extra={
                "url": payload.url[:100] if payload.url else None,
                "html_length": html_len,
                "manual_text_length": manual_text_len,
                "jsonld_items": len(payload.jsonld or []),
                "has_readable": bool(payload.readable),
                "has_metas": bool(payload.metas),
                "xhr_logs_count": len(payload.xhrLogs or []),
            },
        )

        if payload.manual_text:
            logger.debug(
                "Manual text provided", extra={"preview": payload.manual_text[:200]}
            )

        if html_len == 0 and manual_text_len == 0:
            logger.warning(
                "Job extraction failed: All content sources empty",
                extra={"url": payload.url},
            )
            raise HTTPException(
                status_code=400, detail="All content sources are empty"
            )

        if payload.manual_text and len(payload.manual_text) > 200_000:
            logger.warning(
                "Job extraction failed: Text too large",
                extra={"url": payload.url, "text_length": len(payload.manual_text)},
            )
            raise HTTPException(status_code=413, detail="Text too large")

        logger.debug("Calling job extraction service", extra={"url": payload.url})

        job = svc.extract_job(
            url=payload.url,
            html=payload.html,
            hints=payload.quick or {},
            jsonld=payload.jsonld or [],
            readable=payload.readable or {},
            metas=payload.metas or {},
            xhr_logs=payload.xhrLogs or [],
            manual_text=payload.manual_text,
        )

        # Reject results with no meaningful content (prevents saving blank jobs)
        title_ok = bool((job.get("title") or "").strip())
        company_ok = bool((job.get("company_name") or "").strip())
        desc_ok = len((job.get("description") or "").strip()) >= 30

        if not (title_ok or company_ok or desc_ok):
            logger.warning(
                "Job extraction produced insufficient content",
                extra={
                    "url": payload.url,
                    "title_ok": title_ok,
                    "company_ok": company_ok,
                    "desc_ok": desc_ok,
                },
            )
            raise HTTPException(
                status_code=400,
                detail="Extraction produced too little content. Try text selection instead.",
            )

        logger.info(
            "Job extraction successful",
            extra={
                "url": payload.url,
                "title": job.get("title", "")[:50],
                "company": job.get("company_name", ""),
                "description_length": len(job.get("description", "")),
            },
        )

        return ExtractOut(job=JobOut(**job))

    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(
            "Job extraction validation error",
            extra={"url": payload.url, "error": str(e)},
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            "Job extraction failed",
            extra={"url": payload.url, "error": str(e), "error_type": type(e).__name__},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to extract job: {str(e)}")
