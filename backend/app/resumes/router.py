from __future__ import annotations
from typing import List
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db.session import get_db
from ..db import models
from .extractor import save_file_and_extract

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.post("", response_model=dict)
async def upload_resume(
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
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
        user_id=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    # Return a short preview to avoid huge payloads
    preview = (text[:500] + "…") if text and len(text) > 500 else (text or "")
    return {"id": str(row.id), "label": row.label, "file_path": row.file_path, "text_preview": preview}

@router.get("", response_model=List[dict])
def list_resumes(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Resume).order_by(models.Resume.created_at.desc())).scalars().all()
    return [
        {"id": str(r.id), "label": r.label, "file_path": r.file_path, "created_at": r.created_at.isoformat()}
        for r in rows
    ]
