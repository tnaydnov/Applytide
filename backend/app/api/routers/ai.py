from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from ...domain.jobs.extraction.service import JobExtractionService
from ..deps import get_job_extraction_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ExtractIn(BaseModel):
    url: str
    html: str = ""
    jsonld: Optional[List[Dict[str, Any]]] = None
    metas: Optional[Dict[str, Any]] = None
    readable: Optional[Dict[str, Any]] = None   # { title, byline, content (HTML), textContent, length, excerpt, siteName }
    xhrLogs: Optional[List[Dict[str, Any]]] = None
    quick: Optional[Dict[str, Any]] = None
    manual_text: Optional[str] = None              # NEW: user-provided text (selection/paste)
    screenshot: Optional[str] = None               # NEW: data URL (data:image/png;base64,...)

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
    if payload.screenshot and not payload.screenshot.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Invalid screenshot format")

    if payload.manual_text and len(payload.manual_text) > 200_000:
        raise HTTPException(status_code=413, detail="Text too large")
    try:
        job = svc.extract_job(
            url=payload.url,
            html=payload.html,
            hints=payload.quick or {},
            jsonld=payload.jsonld or [],
            readable=payload.readable or {},
            metas=payload.metas or {},
            xhr_logs=payload.xhrLogs or [],
            manual_text=payload.manual_text,
            screenshot_data_url=payload.screenshot,
        )
        return ExtractOut(job=JobOut(**job))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to extract job")
