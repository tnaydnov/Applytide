from __future__ import annotations
import csv, io
from typing import Dict, List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..auth.deps import get_current_user
from ..db.session import get_db
from ..db import models

router = APIRouter(prefix="/io", tags=["io"])

@router.get("/api/export/applications.csv")
def export_apps(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    j = (
        select(models.Application, models.Job, models.Company)
        .join(models.Job, models.Application.job_id == models.Job.id)
        .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
        .where(models.Application.user_id == current_user.id)
        .order_by(models.Application.created_at.desc())
    )
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["application_id","status","job_id","title","company","location","source_url","created_at"])
    for app, job, company in db.execute(j).all():
        w.writerow([
            str(app.id), app.status, str(job.id),
            job.title, (company.name if company else ""),
            job.location or "", job.source_url or "",
            app.created_at.isoformat()
        ])
    out.seek(0)
    return StreamingResponse(
        out, media_type="text/csv",
        headers={"Content-Disposition":"attachment; filename=applications.csv"}
    )

@router.post("/import/applications")
async def import_apps(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = await file.read()
    try:
        text = data.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file encoding")

    r = csv.DictReader(io.StringIO(text))
    created = 0
    for row in r:
        title = (row.get("title") or row.get("Title") or "").strip()
        if not title:
            continue

        company_name = (row.get("company") or row.get("Company") or "").strip()
        location = (row.get("location") or "").strip()
        description = (row.get("description") or row.get("desc") or "").strip()
        source_url = (row.get("source_url") or row.get("url") or "").strip()
        status = (row.get("status") or "Applied").strip()

        comp = None
        if company_name:
            comp = db.execute(
                select(models.Company).where(models.Company.name == company_name)
            ).scalar_one_or_none()
            if not comp:
                comp = models.Company(name=company_name, location=location)
                db.add(comp)
                db.flush()

        job = models.Job(
            company_id=(comp.id if comp else None),
            title=title, location=location,
            description=description, source_url=source_url
        )
        db.add(job); db.flush()

        app = models.Application(
            user_id=current_user.id,
            job_id=job.id,
            status=status,
        )
        db.add(app)
        created += 1

    db.commit()
    return {"created": created}
