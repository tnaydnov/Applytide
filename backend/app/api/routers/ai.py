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
def extract_job(payload: ExtractIn, svc: JobExtractionService = Depends(get_job_extraction_service)):
    try:
        html_len = len(payload.html or "")
        manual_text_len = len(payload.manual_text or "")
        
        logger.info("Job extraction request received", extra={
            "url": payload.url[:100] if payload.url else None,
            "html_length": html_len,
            "manual_text_length": manual_text_len,
            "jsonld_items": len(payload.jsonld or []),
            "has_readable": bool(payload.readable),
            "has_metas": bool(payload.metas),
            "xhr_logs_count": len(payload.xhrLogs or [])
        })
        
        if payload.manual_text:
            logger.debug("Manual text provided", extra={
                "preview": payload.manual_text[:200]
            })

        if html_len == 0 and manual_text_len == 0:
            logger.warning("Job extraction failed: All content sources empty", extra={
                "url": payload.url
            })
            raise HTTPException(status_code=400, detail="All content sources are empty")

        if payload.manual_text and len(payload.manual_text) > 200_000:
            logger.warning("Job extraction failed: Text too large", extra={
                "url": payload.url,
                "text_length": len(payload.manual_text)
            })
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
            logger.warning("Job extraction produced insufficient content", extra={
                "url": payload.url,
                "title_ok": title_ok,
                "company_ok": company_ok,
                "desc_ok": desc_ok
            })
            raise HTTPException(status_code=400, detail="Extraction produced too little content. Try text selection instead.")

        logger.info("Job extraction successful", extra={
            "url": payload.url,
            "title": job.get("title", "")[:50],
            "company": job.get("company_name", ""),
            "description_length": len(job.get("description", ""))
        })
        
        return ExtractOut(job=JobOut(**job))
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning("Job extraction validation error", extra={
            "url": payload.url,
            "error": str(e)
        })
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Job extraction failed", extra={
            "url": payload.url,
            "error": str(e),
            "error_type": type(e).__name__
        }, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to extract job: {str(e)}")
