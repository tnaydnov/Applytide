from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from ...domain.jobs.extraction.service import JobExtractionService
from ..deps import get_job_extraction_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ExtractIn(BaseModel):
    url: str
    html: str
    quick: Optional[Dict[str, Any]] = None

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
        job = svc.extract_job(url=payload.url, html=payload.html, hints=payload.quick)
        return ExtractOut(job=JobOut(**job))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to extract job")
