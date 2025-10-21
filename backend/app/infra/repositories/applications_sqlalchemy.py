from __future__ import annotations
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, join, delete
from ...db import models
from ...api.utils.pagination import apply_sorting
from ...domain.applications.repository import (
    IApplicationRepo, IStageRepo, INoteRepo, IAttachmentRepo
)
from ...domain.applications.dto import (
    ApplicationDTO, StageDTO, NoteDTO, AttachmentDTO, CardRowDTO, JobTinyDTO
)

def _app_to_dto(a: models.Application) -> ApplicationDTO:
    return ApplicationDTO(
        id=a.id, user_id=a.user_id, job_id=a.job_id, resume_id=a.resume_id,
        status=a.status, source=a.source, is_archived=a.is_archived, archived_at=a.archived_at,
        created_at=a.created_at, updated_at=a.updated_at
    )

def _stage_to_dto(s: models.Stage) -> StageDTO:
    return StageDTO(
        id=s.id, application_id=s.application_id, name=s.name,
        scheduled_at=s.scheduled_at, outcome=s.outcome, notes=s.notes, created_at=s.created_at
    )

def _note_to_dto(n: models.Note) -> NoteDTO:
    return NoteDTO(id=n.id, application_id=n.application_id, body=n.body, created_at=n.created_at)

def _attach_to_dto(a: models.ApplicationAttachment) -> AttachmentDTO:
    return AttachmentDTO(
        id=a.id, application_id=a.application_id, filename=a.filename, file_size=a.file_size,
        content_type=a.content_type, file_path=a.file_path, document_type=a.document_type, created_at=a.created_at
    )

class _GuardMixin:
    db: Session
    def ensure_job_exists(self, job_id: UUID) -> bool:
        return bool(self.db.get(models.Job, job_id))
    def ensure_resume_exists(self, resume_id: UUID) -> bool:
        return bool(self.db.get(models.Resume, resume_id))
    def get_owned_app(self, app_id: UUID, user_id: UUID) -> ApplicationDTO:
        a = self.db.get(models.Application, app_id)
        if not a or a.user_id != user_id:
            raise LookupError
        return _app_to_dto(a)

class ApplicationSQLARepository(_GuardMixin, IApplicationRepo):
    def __init__(self, db: Session): self.db = db

    def find_by_user_and_job(self, user_id: UUID, job_id: UUID) -> Optional[ApplicationDTO]:
        app = self.db.execute(
            select(models.Application).where(models.Application.user_id == user_id, models.Application.job_id == job_id)
        ).scalar_one_or_none()
        return _app_to_dto(app) if app else None

    def create(self, *, user_id: UUID, job_id: UUID, resume_id: Optional[UUID], status: str, source: Optional[str]) -> ApplicationDTO:
        row = models.Application(
            user_id=user_id, job_id=job_id, resume_id=resume_id,
            status=status or "Applied", source=source
        )
        self.db.add(row); self.db.commit(); self.db.refresh(row)
        return _app_to_dto(row)

    def update(self, app_id: UUID, data: dict) -> ApplicationDTO:
        row = self.db.get(models.Application, app_id)
        if not row: raise LookupError
        for k, v in data.items():
            setattr(row, k, v)
        self.db.add(row); self.db.commit(); self.db.refresh(row)
        return _app_to_dto(row)

    def list_paginated(
        self, *, user_id: UUID, status: Optional[str], q: str, sort: str, order: str, page: int, page_size: int, show_archived: bool = False
    ) -> Tuple[List[ApplicationDTO], int]:
        query = (
            select(models.Application)
            .join(models.Job, models.Application.job_id == models.Job.id)
            .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Application.user_id == user_id)
        )
        # Filter by archive status - show only non-archived by default
        if not show_archived:
            query = query.where(models.Application.is_archived == False)
        
        if status:
            query = query.where(models.Application.status == status)
        if q.strip():
            term = f"%{q}%"
            query = query.where(or_(models.Job.title.ilike(term), models.Company.name.ilike(term)))

        query = apply_sorting(query, models.Application, sort, order)
        offset = (page - 1) * page_size
        items = self.db.execute(query.offset(offset).limit(page_size)).scalars().all()

        total_q = (
            select(func.count(models.Application.id))
            .join(models.Job, models.Application.job_id == models.Job.id)
            .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
            .where(models.Application.user_id == user_id)
        )
        # Apply same archive filter to count query
        if not show_archived:
            total_q = total_q.where(models.Application.is_archived == False)
            
        if status:
            total_q = total_q.where(models.Application.status == status)
        if q.strip():
            term = f"%{q}%"
            total_q = total_q.where(or_(models.Job.title.ilike(term), models.Company.name.ilike(term)))
        total = self.db.execute(total_q).scalar() or 0

        return [_app_to_dto(a) for a in items], int(total)

    def get_used_statuses(self, user_id: UUID) -> List[str]:
        stmt = select(models.Application.status).where(models.Application.user_id == user_id).distinct().order_by(models.Application.status)
        return list(self.db.execute(stmt).scalars().all())

    def list_cards(self, user_id: UUID, status: Optional[str], show_archived: bool = False) -> List[CardRowDTO]:
        j = join(models.Application, models.Job, models.Application.job_id == models.Job.id)
        j = join(j, models.Company, models.Job.company_id == models.Company.id, isouter=True)
        stmt = (
            select(
                models.Application.id, models.Application.status, models.Application.resume_id,
                models.Application.created_at, models.Application.updated_at,
                models.Job.id.label("job_id"), models.Job.title, models.Company.name.label("company_name")
            ).select_from(j)
            .where(models.Application.user_id == user_id)
            .order_by(models.Application.created_at.desc())
        )
        # Filter based on archived state
        # False = show only active (not archived)
        # True = show only archived
        stmt = stmt.where(models.Application.is_archived == show_archived)
        
        if status:
            stmt = stmt.where(models.Application.status == status)
        rows = self.db.execute(stmt).all()
        return [
            CardRowDTO(
                id=r.id, status=r.status, resume_id=r.resume_id,
                created_at=r.created_at, updated_at=r.updated_at,
                job_id=r.job_id, title=r.title, company_name=r.company_name
            ) for r in rows
        ]

    def delete_cascade(self, app_id: UUID, user_id: UUID) -> None:
        a = self.db.get(models.Application, app_id)
        if not a or a.user_id != user_id:
            raise LookupError
        
        # Delete reminder notes first (they reference reminders)
        self.db.execute(
            delete(models.ReminderNote)
            .where(models.ReminderNote.reminder_id.in_(
                select(models.Reminder.id).where(models.Reminder.application_id == app_id)
            ))
        )
        
        # Delete reminders (they reference applications)
        self.db.execute(delete(models.Reminder).where(models.Reminder.application_id == app_id))
        
        # Delete other application-related entities
        self.db.execute(delete(models.Note).where(models.Note.application_id == app_id))
        self.db.execute(delete(models.Stage).where(models.Stage.application_id == app_id))
        self.db.execute(delete(models.ApplicationAttachment).where(models.ApplicationAttachment.application_id == app_id))
        
        # Finally delete the application
        self.db.delete(a)
        self.db.commit()

    def list_with_stages_dict(self, user_id: UUID) -> List[dict]:
        # Preserve legacy shape for this endpoint
        apps = self.db.execute(
            select(models.Application).where(models.Application.user_id == user_id).order_by(models.Application.created_at.desc())
        ).scalars().all()

        out = []
        for app in apps:
            job = self.db.get(models.Job, app.job_id)
            if not job:
                continue
            company = self.db.get(models.Company, job.company_id) if job.company_id else None
            stages = self.db.execute(
                select(models.Stage).where(models.Stage.application_id == app.id).order_by(models.Stage.created_at.asc())
            ).scalars().all()
            out.append({
                "id": app.id,
                "status": app.status,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
                "job": {
                    "id": job.id,
                    "title": job.title,
                    "company_name": company.name if company else None,
                    "location": job.location,
                    "source_url": job.source_url
                },
                "stages": [
                    {
                        "id": s.id, "name": s.name, "scheduled_at": s.scheduled_at,
                        "outcome": s.outcome, "notes": s.notes,
                        "created_at": s.created_at, "application_id": s.application_id
                    } for s in stages
                ]
            })
        return out

    def get_detail(
        self, user_id: UUID, app_id: UUID
    ):
        a = self.db.get(models.Application, app_id)
        if not a or a.user_id != user_id:
            raise LookupError
        job = self.db.get(models.Job, a.job_id)
        company_name = company_website = None
        if job and job.company_id:
            comp = self.db.get(models.Company, job.company_id)
            if comp:
                company_name, company_website = comp.name, comp.website

        resume_label = None
        if a.resume_id:
            res = self.db.get(models.Resume, a.resume_id)
            resume_label = res.label if res else None

        stages = self.db.execute(
            select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
        ).scalars().all()
        notes = self.db.execute(
            select(models.Note).where(models.Note.application_id == app_id).order_by(models.Note.created_at.asc())
        ).scalars().all()
        attachments = self.db.execute(
            select(models.ApplicationAttachment).where(models.ApplicationAttachment.application_id == app_id).order_by(models.ApplicationAttachment.created_at.asc())
        ).scalars().all()

        job_tiny = None
        if job:
            job_tiny = JobTinyDTO(
                id=job.id, title=job.title,
                company_name=company_name, company_website=company_website,
                location=job.location, source_url=job.source_url, description=job.description
            )
        return (
            _app_to_dto(a), job_tiny, company_name, company_website, resume_label,
            [_stage_to_dto(s) for s in stages],
            [_note_to_dto(n) for n in notes],
            [_attach_to_dto(att) for att in attachments],
        )

class StageSQLARepository(_GuardMixin, IStageRepo):
    def __init__(self, db: Session): self.db = db
    def add(self, app_id, name, scheduled_at=None, outcome=None, notes=None) -> StageDTO:
        s = models.Stage(application_id=app_id, name=("Applied" if name == "Saved" else name),
                         scheduled_at=scheduled_at, outcome=outcome, notes=notes)
        self.db.add(s); self.db.commit(); self.db.refresh(s)
        return _stage_to_dto(s)
    def list_for_app(self, app_id) -> List[StageDTO]:
        stmt = select(models.Stage).where(models.Stage.application_id == app_id).order_by(models.Stage.created_at.asc())
        return [_stage_to_dto(x) for x in self.db.execute(stmt).scalars().all()]
    def get(self, app_id, stage_id) -> StageDTO:
        s = self.db.execute(select(models.Stage).where(models.Stage.id == stage_id, models.Stage.application_id == app_id)).scalar_one_or_none()
        if not s: raise LookupError
        return _stage_to_dto(s)
    def update_partial(self, stage_id, data: dict) -> StageDTO:
        s = self.db.get(models.Stage, stage_id)
        if not s: raise LookupError
        for k,v in data.items(): setattr(s, k, v)
        self.db.add(s); self.db.commit(); self.db.refresh(s)
        return _stage_to_dto(s)
    def delete(self, stage_id) -> None:
        s = self.db.get(models.Stage, stage_id)
        if not s: raise LookupError
        self.db.delete(s); self.db.commit()

class NoteSQLARepository(_GuardMixin, INoteRepo):
    def __init__(self, db: Session): self.db = db
    def add(self, app_id, body: str) -> NoteDTO:
        n = models.Note(application_id=app_id, body=body)
        self.db.add(n); self.db.commit(); self.db.refresh(n)
        return _note_to_dto(n)
    def list_for_app(self, app_id) -> List[NoteDTO]:
        stmt = select(models.Note).where(models.Note.application_id == app_id).order_by(models.Note.created_at.asc())
        return [_note_to_dto(x) for x in self.db.execute(stmt).scalars().all()]

class AttachmentSQLARepository(_GuardMixin, IAttachmentRepo):
    def __init__(self, db: Session): self.db = db
    def create(self, *, app_id, filename, file_size, content_type, file_path, document_type) -> AttachmentDTO:
        a = models.ApplicationAttachment(
            application_id=app_id, filename=filename, file_size=file_size, content_type=content_type,
            file_path=file_path, document_type=document_type or "other"
        )
        self.db.add(a); self.db.commit(); self.db.refresh(a)
        return _attach_to_dto(a)
    def list_for_app(self, app_id) -> List[AttachmentDTO]:
        stmt = select(models.ApplicationAttachment).where(models.ApplicationAttachment.application_id == app_id).order_by(models.ApplicationAttachment.created_at.desc())
        return [_attach_to_dto(x) for x in self.db.execute(stmt).scalars().all()]
    def get(self, attachment_id) -> AttachmentDTO:
        a = self.db.get(models.ApplicationAttachment, attachment_id)
        if not a: raise LookupError
        return _attach_to_dto(a)
    def delete(self, attachment_id) -> None:
        a = self.db.get(models.ApplicationAttachment, attachment_id)
        if not a: raise LookupError
        self.db.delete(a); self.db.commit()
