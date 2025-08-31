from __future__ import annotations
import uuid
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..auth.deps import get_current_user
from ..db.session import get_db
from ..db import models
from .engine import tfidf_score, top_keywords, present_missing

router = APIRouter(prefix="/match", tags=["match"])

@router.post("/score", response_model=Dict)
def score(resume_id: uuid.UUID, job_id: uuid.UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    resume = db.get(models.Resume, resume_id)
    job = db.get(models.Job, job_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    sim = tfidf_score(resume.text or "", job.description or "")
    kw = [k for (k, _w) in top_keywords(job.description or "", 20)]
    present, missing = present_missing(resume.text or "", kw)
    pct = int(round(sim * 100))
    row = models.MatchResult(
        user_id=current_user.id,
        resume_id=resume.id,
        job_id=job.id,
        score=pct,
        keywords_present=",".join(present) if present else None,
        keywords_missing=",".join(missing) if missing else None,
    )
    db.add(row)
    db.commit()

    return {
        "score": pct,
        "keywords_present": present,
        "keywords_missing": missing,
        "result_id": str(row.id),
    }

@router.get("/latest", response_model=Dict)
def latest(resume_id: uuid.UUID, job_id: uuid.UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    stmt = select(models.MatchResult).where(
        models.MatchResult.user_id == current_user.id,
        models.MatchResult.resume_id == resume_id,
        models.MatchResult.job_id == job_id
    ).order_by(models.MatchResult.created_at.desc())
    row = db.execute(stmt).scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="No match result")
    return {
        "score": row.score,
        "keywords_present": (row.keywords_present or "").split(",") if row.keywords_present else [],
        "keywords_missing": (row.keywords_missing or "").split(",") if row.keywords_missing else [],
        "result_id": str(row.id),
    }
