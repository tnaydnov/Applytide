from __future__ import annotations
from typing import Optional, List, Tuple
from uuid import UUID
from .repository import IApplicationRepo, IStageRepo, INoteRepo, IAttachmentRepo
from .dto import ApplicationDTO, StageDTO, NoteDTO, AttachmentDTO, CardRowDTO
from .errors import ApplicationNotFound, StageNotFound, AttachmentNotFound, BadRequest

class AttachmentPort:
    """Abstract view the domain needs from an attachment store."""
    async def save_upload(self, file) -> tuple: ...
    def copy_from_path(self, src_path, suggested_name, media_type) -> tuple: ...

class DocumentServicePort:
    def resolve_download(self, *, db, user_id: str, document_id: str):
        ...

class ApplicationService:
    def __init__(
        self,
        apps: IApplicationRepo,
        stages: IStageRepo,
        notes: INoteRepo,
        attachments: IAttachmentRepo,
        attach_store: AttachmentPort,
        doc_service: DocumentServicePort,
        db_session,  # passed-through for doc service
    ):
        self.apps = apps
        self.stages = stages
        self.notes = notes
        self.attachments = attachments
        self.store = attach_store
        self.doc_service = doc_service
        self.db = db_session

    # ---- Applications ----
    def create_or_update(self, *, user_id: UUID, job_id: UUID, resume_id: Optional[UUID], status: Optional[str], source: Optional[str]) -> ApplicationDTO:
        if not self.apps.ensure_job_exists(job_id):
            raise BadRequest("job_id not found")
        if resume_id and not self.apps.ensure_resume_exists(resume_id):
            raise BadRequest("resume_id not found")

        existing = self.apps.find_by_user_and_job(user_id, job_id)
        if existing:
            new_status = (status or "Applied")
            if new_status == "Saved":
                new_status = "Applied"
            return self.apps.update(existing.id, {"status": new_status, "resume_id": resume_id, "source": source})
        return self.apps.create(user_id=user_id, job_id=job_id, resume_id=resume_id, status=status or "Applied", source=source)

    def list_paginated(self, *, user_id: UUID, status: Optional[str], q: str, sort: str, order: str, page: int, page_size: int, show_archived: bool = False) -> Tuple[List[ApplicationDTO], int]:
        return self.apps.list_paginated(user_id=user_id, status=status, q=q, sort=sort, order=order, page=page, page_size=page_size, show_archived=show_archived)

    def get_used_statuses(self, *, user_id: UUID) -> List[str]:
        return self.apps.get_used_statuses(user_id)

    def list_cards(self, *, user_id: UUID, status: Optional[str]) -> List[CardRowDTO]:
        return self.apps.list_cards(user_id, status)

    def get_owned_app(self, *, app_id: UUID, user_id: UUID) -> ApplicationDTO:
        try:
            return self.apps.get_owned_app(app_id, user_id)
        except LookupError:
            raise ApplicationNotFound

    def update_status(self, *, user_id: UUID, app_id: UUID, new_status: str) -> ApplicationDTO:
        app = self.get_owned_app(app_id=app_id, user_id=user_id)
        status = new_status or app.status
        if status == "Saved":
            status = "Applied"
        if app.status != status:
            self.stages.add(app_id, status, notes=f"Status changed from {app.status} to {status}")
        return self.apps.update(app_id, {"status": status})

    def delete(self, *, user_id: UUID, app_id: UUID) -> None:
        try:
            self.apps.delete_cascade(app_id, user_id)
        except LookupError:
            raise ApplicationNotFound

    # ---- Stages ----
    def add_stage(self, *, user_id: UUID, app_id: UUID, name: str, scheduled_at=None, outcome=None, notes=None) -> StageDTO:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        return self.stages.add(app_id, name, scheduled_at, outcome, notes)

    def list_stages(self, *, user_id: UUID, app_id: UUID) -> List[StageDTO]:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        return self.stages.list_for_app(app_id)

    def update_stage_partial(self, *, user_id: UUID, app_id: UUID, stage_id: UUID, name=None, scheduled_at=None, outcome=None, notes=None) -> StageDTO:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        try:
            self.stages.get(app_id, stage_id)  # ensures stage belongs to app
        except LookupError:
            raise StageNotFound
        data = {}
        if name is not None: data["name"] = name
        if scheduled_at is not None: data["scheduled_at"] = scheduled_at
        if outcome is not None: data["outcome"] = outcome
        if notes is not None: data["notes"] = notes
        try:
            return self.stages.update_partial(stage_id, data)
        except LookupError:
            raise StageNotFound

    def delete_stage(self, *, user_id: UUID, app_id: UUID, stage_id: UUID) -> None:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        try:
            self.stages.get(app_id, stage_id)
        except LookupError:
            raise StageNotFound
        self.stages.delete(stage_id)

    # ---- Notes ----
    def add_note(self, *, user_id: UUID, app_id: UUID, body: str) -> NoteDTO:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        return self.notes.add(app_id, body)

    def list_notes(self, *, user_id: UUID, app_id: UUID) -> List[NoteDTO]:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        return self.notes.list_for_app(app_id)

    # ---- Detail / With Stages ----
    def list_with_stages(self, *, user_id: UUID) -> list[dict]:
        return self.apps.list_with_stages_dict(user_id)

    def get_detail(self, *, user_id: UUID, app_id: UUID):
        try:
            return self.apps.get_detail(user_id, app_id)
        except LookupError:
            raise ApplicationNotFound

    # ---- Attachments ----
    def list_attachments(self, *, user_id: UUID, app_id: UUID) -> List[AttachmentDTO]:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        return self.attachments.list_for_app(app_id)

    def get_attachment(self, *, user_id: UUID, app_id: UUID, attachment_id: UUID) -> AttachmentDTO:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        try:
            a = self.attachments.get(attachment_id)
        except LookupError:
            raise AttachmentNotFound
        if a.application_id != app_id:
            raise AttachmentNotFound
        return a

    async def upload_attachment(self, *, user_id: UUID, app_id: UUID, file, document_type: Optional[str]) -> AttachmentDTO:
        self.get_owned_app(app_id=app_id, user_id=user_id)
        dst, size, filename, content_type = await self.store.save_upload(file)
        return self.attachments.create(app_id=app_id, filename=filename, file_size=size, content_type=content_type, file_path=str(dst), document_type=document_type or "other")

    def attach_from_document(self, *, user_id: UUID, app_id: UUID, document_id: str, document_type: Optional[str]):
        self.get_owned_app(app_id=app_id, user_id=user_id)
        src_path, filename, media_type = self.doc_service.resolve_download(db=self.db, user_id=str(user_id), document_id=document_id)
        dst, size, out_name, out_type = self.store.copy_from_path(src_path, filename, media_type)
        return self.attachments.create(app_id=app_id, filename=out_name, file_size=size, content_type=out_type, file_path=str(dst), document_type=document_type or "other")

    def delete_attachment(self, *, user_id: UUID, app_id: UUID, attachment_id: UUID) -> None:
        a = self.get_attachment(user_id=user_id, app_id=app_id, attachment_id=attachment_id)
        # remove file best-effort
        import os
        try: os.unlink(a.file_path)
        except Exception: pass
        self.attachments.delete(attachment_id)

    # ---- Archive ----
    def toggle_archive(self, *, user_id: UUID, app_id: UUID) -> ApplicationDTO:
        """Toggle archive status of an application while preserving its status."""
        app = self.get_owned_app(app_id=app_id, user_id=user_id)
        from datetime import datetime, timezone
        new_archived = not app.is_archived
        updates = {
            "is_archived": new_archived,
            "archived_at": datetime.now(timezone.utc) if new_archived else None
        }
        return self.apps.update(app_id, updates)
