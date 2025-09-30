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
    print("\n=== AI ROUTER START ===")
    print(f"AI Router: Received extraction request")
    print(f"AI Router: URL = {payload.url[:100] if payload.url else 'None'}")
    
    html_len = len(payload.html or "")
    manual_text_len = len(payload.manual_text or "")
    screenshot_len = len(payload.screenshot or "")
    
    print(f"AI Router: html_len = {html_len}")
    print(f"AI Router: manual_text_len = {manual_text_len}")
    print(f"AI Router: screenshot_len = {screenshot_len}")
    print(f"AI Router: jsonld items = {len(payload.jsonld or [])}")
    print(f"AI Router: has_readable = {bool(payload.readable)}")
    print(f"AI Router: has_metas = {bool(payload.metas)}")
    print(f"AI Router: xhr_logs = {len(payload.xhrLogs or [])}")
    
    if payload.manual_text:
        print(f"AI Router: manual_text preview = {repr(payload.manual_text[:200])}")
    if payload.screenshot:
        print(f"AI Router: screenshot preview = {payload.screenshot[:100]}")
    
    if html_len == 0 and manual_text_len == 0 and screenshot_len == 0:
        print("AI Router ERROR: All content sources are empty")
        raise HTTPException(status_code=400, detail="All content sources are empty")
    
    if payload.screenshot and not payload.screenshot.startswith("data:image/"):
        print("AI Router ERROR: Invalid screenshot format")
        raise HTTPException(status_code=400, detail="Invalid screenshot format")

    if payload.manual_text and len(payload.manual_text) > 200_000:
        print("AI Router ERROR: Text too large")
        raise HTTPException(status_code=413, detail="Text too large")
    
    print("AI Router: Calling extraction service...")
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
        # Reject results with no meaningful content (prevents saving blank jobs)
        title_ok = bool((job.get("title") or "").strip())
        company_ok = bool((job.get("company_name") or "").strip())
        desc_ok = len((job.get("description") or "").strip()) >= 30
        if not (title_ok or company_ok or desc_ok):
            raise HTTPException(status_code=400, detail="Extraction produced too little content. Try text selection or screenshot.")

        print(f"AI Router: Extraction successful!")
        print(f"AI Router: Job title = '{job.get('title', '')[:50]}'")
        print(f"AI Router: Job company = '{job.get('company_name', '')}'")
        print(f"AI Router: Job description length = {len(job.get('description', ''))}")
        print("=== AI ROUTER SUCCESS ===")
        return ExtractOut(job=JobOut(**job))
    except ValueError as e:
        print(f"AI Router ERROR (ValueError): {str(e)}")
        print("=== AI ROUTER ERROR ===")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"AI Router ERROR (Exception): {str(e)}")
        print(f"AI Router ERROR type: {type(e).__name__}")
        print("=== AI ROUTER ERROR ===")
        raise HTTPException(status_code=500, detail=f"Failed to extract job: {str(e)}")
