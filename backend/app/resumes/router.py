from __future__ import annotations
from typing import List
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..db.session import get_db
from ..db import models
from .extractor import save_file_and_extract
from ..auth.deps import get_current_user
from ..db.models import User
from ..core.pagination import PaginationParams, PaginatedResponse, paginate_query, apply_search_filter, apply_sorting

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.post("", response_model=dict)
async def upload_resume(
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a resume (PDF/DOCX/TXT). Stores file to /app/uploads/resumes and
    saves a DB row with extracted text for later scoring.
    """
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    path, text = save_file_and_extract(file.filename, data)

    # TODO: wire user_id from auth later. For now we leave it null.
    row = models.Resume(
        label=label,
        file_path=path,
        text=text,
        user_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    # Return a short preview to avoid huge payloads
    preview = (text[:500] + "…") if text and len(text) > 500 else (text or "")
    return {"id": str(row.id), "label": row.label, "file_path": row.file_path, "text_preview": preview}

@router.get("", response_model=PaginatedResponse[dict])
def list_resumes(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    q: str = Query("", description="Search in resume label"),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's resumes with pagination and search"""
    params = PaginationParams(
        page=page,
        page_size=page_size,
        q=q,
        sort=sort,
        order=order
    )
    
    # Build query
    query = select(models.Resume).where(models.Resume.user_id == current_user.id)
    
    # Apply search filter
    if q.strip():
        query = apply_search_filter(query, models.Resume, q, ["label"])
    
    # Apply sorting
    query = apply_sorting(query, models.Resume, params.sort, params.order)
    
    # Get total count
    total_query = select(func.count(models.Resume.id)).where(
        models.Resume.user_id == current_user.id
    )
    if q.strip():
        total_query = total_query.filter(models.Resume.label.ilike(f"%{q}%"))
    
    # Paginate
    result = paginate_query(query, params, total_query, db)
    
    # Convert items to dict format
    formatted_items = [
        {
            "id": str(r.id), 
            "label": r.label, 
            "file_path": r.file_path, 
            "created_at": r.created_at.isoformat()
        }
        for r in result["items"]
    ]
    
    result["items"] = formatted_items
    return PaginatedResponse(**result)
