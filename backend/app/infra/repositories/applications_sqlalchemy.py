"""
SQLAlchemy Repository Implementation for Application Management

This module provides database operations for job applications, stages, notes, and attachments
using SQLAlchemy ORM. It implements the repository pattern to abstract database access from
business logic.

Features:
    - Application CRUD with ownership validation
    - Stage tracking (Applied, Interview, Offer, etc.)
    - Note management for application timeline
    - Attachment storage metadata
    - Cascade deletion with referential integrity
    - Pagination and filtering
    - Full-text search across jobs and companies
    - Archive management

Constants:
    MAX_PAGE_SIZE: Maximum items per page (1000)
    MAX_NOTE_LENGTH: Maximum note body length (10000 chars)
    MAX_FILENAME_LENGTH: Maximum attachment filename length (255 chars)
    MAX_SEARCH_QUERY_LENGTH: Maximum search query length (500 chars)
    MAX_STATUS_LENGTH: Maximum status string length (50 chars)
    
Exception Hierarchy:
    ApplicationRepositoryError (base)
    ├── DatabaseOperationError
    ├── ValidationError
    ├── NotFoundError
    └── PermissionError

Interfaces Implemented:
    - IApplicationRepo: Application CRUD and queries
    - IStageRepo: Stage management
    - INoteRepo: Note management
    - IAttachmentRepo: Attachment metadata management

Usage:
    from app.infra.repositories.applications_sqlalchemy import ApplicationSQLARepository
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    repo = ApplicationSQLARepository(db)
    
    # Create application
    app = repo.create(
        user_id=user_id,
        job_id=job_id,
        resume_id=resume_id,
        status="Applied",
        source="Manual"
    )
    
    # List with pagination
    apps, total = repo.list_paginated(
        user_id=user_id,
        status="Applied",
        q="engineer",
        sort="created_at",
        order="desc",
        page=1,
        page_size=20
    )
"""
from __future__ import annotations
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, join, delete
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from ...db import models
from ...api.utils.pagination import apply_sorting
from ...domain.applications.repository import (
    IApplicationRepo, IStageRepo, INoteRepo, IAttachmentRepo
)
from ...domain.applications.dto import (
    ApplicationDTO, StageDTO, NoteDTO, AttachmentDTO, CardRowDTO, JobTinyDTO
)
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration Constants
MAX_PAGE_SIZE = 1000
MAX_NOTE_LENGTH = 10000
MAX_FILENAME_LENGTH = 255
MAX_SEARCH_QUERY_LENGTH = 500
MAX_STATUS_LENGTH = 50
MIN_PAGE_SIZE = 1
MAX_PAGE_NUMBER = 10000

# ==================== Exception Classes ====================

class ApplicationRepositoryError(Exception):
    """Base exception for application repository operations"""
    pass

class DatabaseOperationError(ApplicationRepositoryError):
    """Raised when database operation fails"""
    pass

class ValidationError(ApplicationRepositoryError):
    """Raised when input validation fails"""
    pass

class NotFoundError(ApplicationRepositoryError):
    """Raised when entity not found"""
    pass

class PermissionError(ApplicationRepositoryError):
    """Raised when user doesn't have permission"""
    pass

# ==================== Validation Functions ====================

def _validate_uuid(value: UUID, field_name: str) -> None:
    """Validate UUID is not None"""
    if not value:
        raise ValidationError(f"{field_name} is required")
    
def _validate_pagination(page: int, page_size: int) -> None:
    """Validate pagination parameters"""
    if page < 1:
        raise ValidationError(f"Page must be >= 1, got {page}")
    if page > MAX_PAGE_NUMBER:
        raise ValidationError(f"Page must be <= {MAX_PAGE_NUMBER}, got {page}")
    if page_size < MIN_PAGE_SIZE:
        raise ValidationError(f"Page size must be >= {MIN_PAGE_SIZE}, got {page_size}")
    if page_size > MAX_PAGE_SIZE:
        raise ValidationError(f"Page size must be <= {MAX_PAGE_SIZE}, got {page_size}")

def _validate_search_query(q: str) -> None:
    """Validate search query length"""
    if q and len(q) > MAX_SEARCH_QUERY_LENGTH:
        raise ValidationError(f"Search query too long (max {MAX_SEARCH_QUERY_LENGTH} chars)")

def _validate_status(status: Optional[str]) -> None:
    """Validate status string"""
    if status and len(status) > MAX_STATUS_LENGTH:
        raise ValidationError(f"Status too long (max {MAX_STATUS_LENGTH} chars)")

def _validate_note_body(body: str) -> None:
    """Validate note body"""
    if not body or not body.strip():
        raise ValidationError("Note body cannot be empty")
    if len(body) > MAX_NOTE_LENGTH:
        raise ValidationError(f"Note too long (max {MAX_NOTE_LENGTH} chars)")

def _validate_filename(filename: str) -> None:
    """Validate attachment filename"""
    if not filename or not filename.strip():
        raise ValidationError("Filename cannot be empty")
    if len(filename) > MAX_FILENAME_LENGTH:
        raise ValidationError(f"Filename too long (max {MAX_FILENAME_LENGTH} chars)")

# ==================== DTO Conversion Functions ====================

# ==================== DTO Conversion Functions ====================

def _app_to_dto(a: models.Application) -> ApplicationDTO:
    """
    Convert Application model to DTO
    
    Args:
        a: Application model instance
        
    Returns:
        ApplicationDTO with all fields mapped
    """
    return ApplicationDTO(
        id=a.id, user_id=a.user_id, job_id=a.job_id, resume_id=a.resume_id,
        status=a.status, source=a.source, is_archived=a.is_archived, archived_at=a.archived_at,
        created_at=a.created_at, updated_at=a.updated_at
    )

def _stage_to_dto(s: models.Stage) -> StageDTO:
    """
    Convert Stage model to DTO
    
    Args:
        s: Stage model instance
        
    Returns:
        StageDTO with all fields mapped
    """
    return StageDTO(
        id=s.id, application_id=s.application_id, name=s.name,
        scheduled_at=s.scheduled_at, outcome=s.outcome, notes=s.notes, created_at=s.created_at
    )

def _note_to_dto(n: models.Note) -> NoteDTO:
    """
    Convert Note model to DTO
    
    Args:
        n: Note model instance
        
    Returns:
        NoteDTO with all fields mapped
    """
    return NoteDTO(id=n.id, application_id=n.application_id, body=n.body, created_at=n.created_at)

def _attach_to_dto(a: models.ApplicationAttachment) -> AttachmentDTO:
    """
    Convert ApplicationAttachment model to DTO
    
    Args:
        a: ApplicationAttachment model instance
        
    Returns:
        AttachmentDTO with all fields mapped
    """
    return AttachmentDTO(
        id=a.id, application_id=a.application_id, filename=a.filename, file_size=a.file_size,
        content_type=a.content_type, file_path=a.file_path, document_type=a.document_type, created_at=a.created_at
    )

# ==================== Guard Mixin ====================

class _GuardMixin:
    """
    Mixin providing ownership validation and existence checks
    
    Used by all repository classes to enforce data access rules
    """
    db: Session
    
    def ensure_job_exists(self, job_id: UUID) -> bool:
        """
        Check if job exists
        
        Args:
            job_id: Job UUID to check
            
        Returns:
            True if job exists, False otherwise
            
        Raises:
            ValidationError: If job_id is invalid
        """
        try:
            _validate_uuid(job_id, "job_id")
            exists = bool(self.db.get(models.Job, job_id))
            logger.debug(f"Job existence check: {job_id} = {exists}")
            return exists
        except SQLAlchemyError as e:
            logger.error(f"Database error checking job existence: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to check job existence: {str(e)}")
    
    def ensure_resume_exists(self, resume_id: UUID) -> bool:
        """
        Check if resume exists
        
        Args:
            resume_id: Resume UUID to check
            
        Returns:
            True if resume exists, False otherwise
            
        Raises:
            ValidationError: If resume_id is invalid
        """
        try:
            _validate_uuid(resume_id, "resume_id")
            exists = bool(self.db.get(models.Resume, resume_id))
            logger.debug(f"Resume existence check: {resume_id} = {exists}")
            return exists
        except SQLAlchemyError as e:
            logger.error(f"Database error checking resume existence: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to check resume existence: {str(e)}")
    
    def get_owned_app(self, app_id: UUID, user_id: UUID) -> ApplicationDTO:
        """
        Get application owned by user
        
        Args:
            app_id: Application UUID
            user_id: User UUID (owner)
            
        Returns:
            ApplicationDTO if found and owned by user
            
        Raises:
            NotFoundError: If application not found
            PermissionError: If user doesn't own application
            ValidationError: If IDs are invalid
        """
        try:
            _validate_uuid(app_id, "app_id")
            _validate_uuid(user_id, "user_id")
            
            a = self.db.get(models.Application, app_id)
            if not a:
                logger.warning(f"Application not found: {app_id}")
                raise NotFoundError(f"Application {app_id} not found")
            if a.user_id != user_id:
                logger.warning(
                    f"Permission denied: user {user_id} tried to access app {app_id} owned by {a.user_id}",
                    extra={"event_type": "permission_denied", "user_id": str(user_id), "app_id": str(app_id)}
                )
                raise PermissionError(f"You don't have permission to access this application")
            
            logger.debug(f"Retrieved owned application: {app_id} for user {user_id}")
            return _app_to_dto(a)
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting owned application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get application: {str(e)}")

# ==================== Application Repository ====================

# ==================== Application Repository ====================

class ApplicationSQLARepository(_GuardMixin, IApplicationRepo):
    """
    SQLAlchemy implementation of application repository
    
    Provides CRUD operations and queries for job applications with
    ownership validation, pagination, and full-text search.
    
    Implements: IApplicationRepo interface
    """
    
    def __init__(self, db: Session):
        """
        Initialize repository
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def find_by_user_and_job(self, user_id: UUID, job_id: UUID) -> Optional[ApplicationDTO]:
        """
        Find application by user and job
        
        Args:
            user_id: User UUID
            job_id: Job UUID
            
        Returns:
            ApplicationDTO if found, None otherwise
            
        Raises:
            ValidationError: If IDs are invalid
            DatabaseOperationError: If database query fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            _validate_uuid(job_id, "job_id")
            
            logger.debug(f"Finding application for user {user_id} and job {job_id}")
            
            app = self.db.execute(
                select(models.Application).where(
                    models.Application.user_id == user_id,
                    models.Application.job_id == job_id
                )
            ).scalar_one_or_none()
            
            if app:
                logger.debug(f"Found application: {app.id}")
                return _app_to_dto(app)
            else:
                logger.debug(f"No application found for user {user_id} and job {job_id}")
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Database error finding application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to find application: {str(e)}")

    def create(
        self, *, user_id: UUID, job_id: UUID, resume_id: Optional[UUID], 
        status: str, source: Optional[str]
    ) -> ApplicationDTO:
        """
        Create new application
        
        Args:
            user_id: User UUID (owner)
            job_id: Job UUID
            resume_id: Optional resume UUID
            status: Application status (defaults to "Applied")
            source: Optional source of application
            
        Returns:
            Created ApplicationDTO
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If creation fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            _validate_uuid(job_id, "job_id")
            if resume_id:
                _validate_uuid(resume_id, "resume_id")
            _validate_status(status)
            
            logger.info(
                f"Creating application for user {user_id}, job {job_id}",
                extra={"user_id": str(user_id), "job_id": str(job_id), "status": status}
            )
            
            row = models.Application(
                user_id=user_id, 
                job_id=job_id, 
                resume_id=resume_id,
                status=status or "Applied", 
                source=source
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
            
            logger.info(f"Created application: {row.id}", extra={"app_id": str(row.id)})
            return _app_to_dto(row)
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error creating application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Application creation failed (integrity constraint): {str(e)}")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to create application: {str(e)}")

    def update(self, app_id: UUID, data: dict) -> ApplicationDTO:
        """
        Update application
        
        Args:
            app_id: Application UUID
            data: Dictionary of fields to update
            
        Returns:
            Updated ApplicationDTO
            
        Raises:
            NotFoundError: If application not found
            ValidationError: If app_id is invalid
            DatabaseOperationError: If update fails
        """
        try:
            _validate_uuid(app_id, "app_id")
            
            if "status" in data:
                _validate_status(data["status"])
            
            logger.debug(f"Updating application {app_id} with data: {data}")
            
            row = self.db.get(models.Application, app_id)
            if not row:
                logger.warning(f"Application not found for update: {app_id}")
                raise NotFoundError(f"Application {app_id} not found")
                
            for k, v in data.items():
                setattr(row, k, v)
                
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
            
            logger.info(f"Updated application: {app_id}", extra={"app_id": str(app_id)})
            return _app_to_dto(row)
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error updating application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Application update failed (integrity constraint): {str(e)}")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to update application: {str(e)}")


    def list_paginated(
        self, *, user_id: UUID, status: Optional[str], q: str, sort: str, order: str, 
        page: int, page_size: int, show_archived: bool = False
    ) -> Tuple[List[ApplicationDTO], int]:
        """
        List applications with pagination and filtering
        
        Args:
            user_id: User UUID (owner)
            status: Optional status filter
            q: Search query (searches job title and company name)
            sort: Field to sort by
            order: Sort order ("asc" or "desc")
            page: Page number (1-indexed)
            page_size: Items per page
            show_archived: Whether to include archived applications
            
        Returns:
            Tuple of (list of ApplicationDTOs, total count)
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If query fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            _validate_pagination(page, page_size)
            _validate_search_query(q)
            _validate_status(status)
            
            logger.debug(
                f"Listing applications for user {user_id}",
                extra={
                    "user_id": str(user_id),
                    "status": status,
                    "query": q,
                    "page": page,
                    "page_size": page_size,
                    "show_archived": show_archived
                }
            )
            
            query = (
                select(models.Application)
                .join(models.Job, models.Application.job_id == models.Job.id)
                .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                .where(models.Application.user_id == user_id)
            )
            
            # Filter by archive status
            if not show_archived:
                query = query.where(models.Application.is_archived == False)
            
            if status:
                query = query.where(models.Application.status == status)
                
            if q.strip():
                safe_q = q.replace('%', '\\%').replace('_', '\\_')
                term = f"%{safe_q}%"
                query = query.where(or_(models.Job.title.ilike(term), models.Company.name.ilike(term)))

            query = apply_sorting(query, models.Application, sort, order)
            offset = (page - 1) * page_size
            items = self.db.execute(query.offset(offset).limit(page_size)).scalars().all()

            # Count query with same filters
            total_q = (
                select(func.count(models.Application.id))
                .join(models.Job, models.Application.job_id == models.Job.id)
                .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                .where(models.Application.user_id == user_id)
            )
            
            if not show_archived:
                total_q = total_q.where(models.Application.is_archived == False)
                
            if status:
                total_q = total_q.where(models.Application.status == status)
                
            if q.strip():
                safe_q = q.replace('%', '\\%').replace('_', '\\_')
                term = f"%{safe_q}%"
                total_q = total_q.where(or_(models.Job.title.ilike(term), models.Company.name.ilike(term)))
                
            total = self.db.execute(total_q).scalar() or 0

            logger.info(
                f"Listed {len(items)} applications (total: {total})",
                extra={"user_id": str(user_id), "count": len(items), "total": total}
            )
            
            return [_app_to_dto(a) for a in items], int(total)
            
        except SQLAlchemyError as e:
            logger.error(f"Database error listing applications: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to list applications: {str(e)}")


    def get_used_statuses(self, user_id: UUID) -> List[str]:
        """
        Get distinct status values used by user's applications
        
        Args:
            user_id: User UUID
            
        Returns:
            List of status strings in alphabetical order
            
        Raises:
            ValidationError: If user_id is invalid
            DatabaseOperationError: If query fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            
            logger.debug(f"Getting used statuses for user {user_id}")
            
            stmt = select(models.Application.status).where(
                models.Application.user_id == user_id
            ).distinct().order_by(models.Application.status)
            
            statuses = list(self.db.execute(stmt).scalars().all())
            
            logger.debug(f"Found {len(statuses)} statuses for user {user_id}")
            return statuses
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting statuses: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get statuses: {str(e)}")

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
        """
        Delete application and all related data (cascade)
        
        Deletes in order to maintain referential integrity:
        1. Reminder notes (reference reminders)
        2. Reminders (reference applications)
        3. Notes (reference applications)
        4. Stages (reference applications)
        5. Attachments (reference applications)
        6. Application itself
        
        Args:
            app_id: Application UUID to delete
            user_id: User UUID (owner) for permission check
            
        Raises:
            NotFoundError: If application not found
            PermissionError: If user doesn't own application
            ValidationError: If IDs are invalid
            DatabaseOperationError: If deletion fails
        """
        try:
            _validate_uuid(app_id, "app_id")
            _validate_uuid(user_id, "user_id")
            
            logger.info(
                f"Cascade deleting application {app_id} for user {user_id}",
                extra={"app_id": str(app_id), "user_id": str(user_id)}
            )
            
            # Verify ownership
            a = self.db.get(models.Application, app_id)
            if not a:
                logger.warning(f"Application not found for deletion: {app_id}")
                raise NotFoundError(f"Application {app_id} not found")
            if a.user_id != user_id:
                logger.warning(
                    f"Permission denied: user {user_id} tried to delete app {app_id} owned by {a.user_id}",
                    extra={"event_type": "permission_denied", "user_id": str(user_id), "app_id": str(app_id)}
                )
                raise PermissionError(f"You don't have permission to delete this application")
            
            # Delete in correct order for referential integrity
            
            # 1. Delete reminder notes (reference reminders)
            reminder_notes_deleted = self.db.execute(
                delete(models.ReminderNote)
                .where(models.ReminderNote.reminder_id.in_(
                    select(models.Reminder.id).where(models.Reminder.application_id == app_id)
                ))
            ).rowcount
            
            # 2. Delete reminders (reference applications)
            reminders_deleted = self.db.execute(
                delete(models.Reminder).where(models.Reminder.application_id == app_id)
            ).rowcount
            
            # 3. Delete notes
            notes_deleted = self.db.execute(
                delete(models.Note).where(models.Note.application_id == app_id)
            ).rowcount
            
            # 4. Delete stages
            stages_deleted = self.db.execute(
                delete(models.Stage).where(models.Stage.application_id == app_id)
            ).rowcount
            
            # 5. Delete attachments
            attachments_deleted = self.db.execute(
                delete(models.ApplicationAttachment).where(
                    models.ApplicationAttachment.application_id == app_id
                )
            ).rowcount
            
            # 6. Finally delete the application
            self.db.delete(a)
            self.db.commit()
            
            logger.info(
                f"Deleted application {app_id} and related data",
                extra={
                    "app_id": str(app_id),
                    "reminder_notes_deleted": reminder_notes_deleted,
                    "reminders_deleted": reminders_deleted,
                    "notes_deleted": notes_deleted,
                    "stages_deleted": stages_deleted,
                    "attachments_deleted": attachments_deleted
                }
            )
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting application: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to delete application: {str(e)}")

    def list_with_stages_dict(self, user_id: UUID) -> List[dict]:
        # Preserve legacy shape for this endpoint
        # Uses batch queries to avoid N+1 (1 + 3 queries instead of 1 + 3N).
        apps = self.db.execute(
            select(models.Application).where(models.Application.user_id == user_id).order_by(models.Application.created_at.desc())
        ).scalars().all()

        if not apps:
            return []

        # Batch-load all related jobs
        job_ids = {app.job_id for app in apps}
        jobs = {
            j.id: j
            for j in self.db.execute(
                select(models.Job).where(models.Job.id.in_(job_ids))
            ).scalars().all()
        }

        # Batch-load all related companies
        company_ids = {j.company_id for j in jobs.values() if j.company_id}
        companies: dict = {}
        if company_ids:
            companies = {
                c.id: c
                for c in self.db.execute(
                    select(models.Company).where(models.Company.id.in_(company_ids))
                ).scalars().all()
            }

        # Batch-load all stages
        app_ids = [app.id for app in apps]
        all_stages = self.db.execute(
            select(models.Stage).where(models.Stage.application_id.in_(app_ids))
            .order_by(models.Stage.created_at.asc())
        ).scalars().all()
        stages_by_app: dict[UUID, list] = {}
        for s in all_stages:
            stages_by_app.setdefault(s.application_id, []).append(s)

        out = []
        for app in apps:
            job = jobs.get(app.job_id)
            if not job:
                continue
            company = companies.get(job.company_id) if job.company_id else None
            stages = stages_by_app.get(app.id, [])
            out.append({
                "id": app.id,
                "status": app.status,
                "source": app.source,
                "is_archived": app.is_archived,
                "archived_at": app.archived_at,
                "resume_id": app.resume_id,
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

# ==================== Stage Repository ====================

class StageSQLARepository(_GuardMixin, IStageRepo):
    """
    SQLAlchemy implementation of stage repository
    
    Manages application stages (e.g., Applied, Interview, Offer)
    
    Implements: IStageRepo interface
    """
    
    def __init__(self, db: Session):
        """Initialize repository"""
        self.db = db
        
    def add(self, app_id, name, scheduled_at=None, outcome=None, notes=None) -> StageDTO:
        """
        Add stage to application
        
        Args:
            app_id: Application UUID
            name: Stage name (e.g., "Applied", "Interview", "Offer")
            scheduled_at: Optional scheduled datetime
            outcome: Optional outcome
            notes: Optional notes
            
        Returns:
            Created StageDTO
            
        Raises:
            DatabaseOperationError: If creation fails
            
        Notes:
            - Converts "Saved" to "Applied" for consistency
        """
        try:
            logger.debug(f"Adding stage '{name}' to application {app_id}")
            
            s = models.Stage(
                application_id=app_id, 
                name=("Applied" if name == "Saved" else name),
                scheduled_at=scheduled_at, 
                outcome=outcome, 
                notes=notes
            )
            self.db.add(s)
            self.db.commit()
            self.db.refresh(s)
            
            logger.info(f"Added stage {s.id} to application {app_id}", extra={"stage_id": str(s.id)})
            return _stage_to_dto(s)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error adding stage: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to add stage: {str(e)}")
            
    def list_for_app(self, app_id) -> List[StageDTO]:
        """
        List all stages for application
        
        Args:
            app_id: Application UUID
            
        Returns:
            List of StageDTOs ordered by creation time
            
        Raises:
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Listing stages for application {app_id}")
            
            stmt = select(models.Stage).where(
                models.Stage.application_id == app_id
            ).order_by(models.Stage.created_at.asc())
            
            stages = [_stage_to_dto(x) for x in self.db.execute(stmt).scalars().all()]
            
            logger.debug(f"Found {len(stages)} stages for application {app_id}")
            return stages
            
        except SQLAlchemyError as e:
            logger.error(f"Database error listing stages: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to list stages: {str(e)}")
            
    def get(self, app_id, stage_id) -> StageDTO:
        """
        Get specific stage
        
        Args:
            app_id: Application UUID
            stage_id: Stage UUID
            
        Returns:
            StageDTO
            
        Raises:
            NotFoundError: If stage not found
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Getting stage {stage_id} from application {app_id}")
            
            s = self.db.execute(
                select(models.Stage).where(
                    models.Stage.id == stage_id,
                    models.Stage.application_id == app_id
                )
            ).scalar_one_or_none()
            
            if not s:
                logger.warning(f"Stage not found: {stage_id}")
                raise NotFoundError(f"Stage {stage_id} not found")
                
            return _stage_to_dto(s)
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting stage: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get stage: {str(e)}")
            
    def update_partial(self, stage_id, data: dict) -> StageDTO:
        """
        Update stage fields
        
        Args:
            stage_id: Stage UUID
            data: Dictionary of fields to update
            
        Returns:
            Updated StageDTO
            
        Raises:
            NotFoundError: If stage not found
            DatabaseOperationError: If update fails
        """
        try:
            logger.debug(f"Updating stage {stage_id} with data: {data}")
            
            s = self.db.get(models.Stage, stage_id)
            if not s:
                logger.warning(f"Stage not found for update: {stage_id}")
                raise NotFoundError(f"Stage {stage_id} not found")
                
            for k, v in data.items():
                setattr(s, k, v)
                
            self.db.add(s)
            self.db.commit()
            self.db.refresh(s)
            
            logger.info(f"Updated stage: {stage_id}", extra={"stage_id": str(stage_id)})
            return _stage_to_dto(s)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating stage: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to update stage: {str(e)}")
            
    def delete(self, stage_id) -> None:
        """
        Delete stage
        
        Args:
            stage_id: Stage UUID
            
        Raises:
            NotFoundError: If stage not found
            DatabaseOperationError: If deletion fails
        """
        try:
            logger.info(f"Deleting stage: {stage_id}")
            
            s = self.db.get(models.Stage, stage_id)
            if not s:
                logger.warning(f"Stage not found for deletion: {stage_id}")
                raise NotFoundError(f"Stage {stage_id} not found")
                
            self.db.delete(s)
            self.db.commit()
            
            logger.info(f"Deleted stage: {stage_id}", extra={"stage_id": str(stage_id)})
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting stage: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to delete stage: {str(e)}")

# ==================== Note Repository ====================

class NoteSQLARepository(_GuardMixin, INoteRepo):
    """
    SQLAlchemy implementation of note repository
    
    Manages application notes for timeline tracking
    
    Implements: INoteRepo interface
    """
    
    def __init__(self, db: Session):
        """Initialize repository"""
        self.db = db
        
    def add(self, app_id, body: str) -> NoteDTO:
        """
        Add note to application
        
        Args:
            app_id: Application UUID
            body: Note text
            
        Returns:
            Created NoteDTO
            
        Raises:
            ValidationError: If body is empty or too long
            DatabaseOperationError: If creation fails
        """
        try:
            _validate_note_body(body)
            
            logger.debug(f"Adding note to application {app_id}")
            
            n = models.Note(application_id=app_id, body=body)
            self.db.add(n)
            self.db.commit()
            self.db.refresh(n)
            
            logger.info(f"Added note {n.id} to application {app_id}", extra={"note_id": str(n.id)})
            return _note_to_dto(n)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error adding note: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to add note: {str(e)}")
            
    def list_for_app(self, app_id) -> List[NoteDTO]:
        """
        List all notes for application
        
        Args:
            app_id: Application UUID
            
        Returns:
            List of NoteDTOs ordered by creation time
            
        Raises:
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Listing notes for application {app_id}")
            
            stmt = select(models.Note).where(
                models.Note.application_id == app_id
            ).order_by(models.Note.created_at.asc())
            
            notes = [_note_to_dto(x) for x in self.db.execute(stmt).scalars().all()]
            
            logger.debug(f"Found {len(notes)} notes for application {app_id}")
            return notes
            
        except SQLAlchemyError as e:
            logger.error(f"Database error listing notes: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to list notes: {str(e)}")
    
    def get(self, note_id) -> NoteDTO:
        """
        Get a specific note by ID
        
        Args:
            note_id: Note UUID
            
        Returns:
            NoteDTO
            
        Raises:
            LookupError: If note not found
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Getting note {note_id}")
            
            stmt = select(models.Note).where(models.Note.id == note_id)
            n = self.db.execute(stmt).scalar_one_or_none()
            
            if not n:
                logger.warning(f"Note {note_id} not found")
                raise LookupError(f"Note {note_id} not found")
            
            return _note_to_dto(n)
            
        except LookupError:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Database error getting note: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get note: {str(e)}")
    
    def update(self, note_id, body: str) -> NoteDTO:
        """
        Update note body
        
        Args:
            note_id: Note UUID
            body: New note text
            
        Returns:
            Updated NoteDTO
            
        Raises:
            ValidationError: If body is empty or too long
            LookupError: If note not found
            DatabaseOperationError: If update fails
        """
        try:
            _validate_note_body(body)
            
            logger.debug(f"Updating note {note_id}")
            
            stmt = select(models.Note).where(models.Note.id == note_id)
            n = self.db.execute(stmt).scalar_one_or_none()
            
            if not n:
                logger.warning(f"Note {note_id} not found")
                raise LookupError(f"Note {note_id} not found")
            
            n.body = body
            self.db.commit()
            self.db.refresh(n)
            
            logger.info(f"Updated note {note_id}", extra={"note_id": str(note_id)})
            return _note_to_dto(n)
            
        except (ValidationError, LookupError):
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating note: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to update note: {str(e)}")
    
    def delete(self, note_id) -> None:
        """
        Delete a note
        
        Args:
            note_id: Note UUID
            
        Raises:
            LookupError: If note not found
            DatabaseOperationError: If deletion fails
        """
        try:
            logger.debug(f"Deleting note {note_id}")
            
            stmt = select(models.Note).where(models.Note.id == note_id)
            n = self.db.execute(stmt).scalar_one_or_none()
            
            if not n:
                logger.warning(f"Note {note_id} not found")
                raise LookupError(f"Note {note_id} not found")
            
            self.db.delete(n)
            self.db.commit()
            
            logger.info(f"Deleted note {note_id}", extra={"note_id": str(note_id)})
            
        except LookupError:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting note: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to delete note: {str(e)}")

# ==================== Attachment Repository ====================

class AttachmentSQLARepository(_GuardMixin, IAttachmentRepo):
    """
    SQLAlchemy implementation of attachment repository
    
    Manages attachment metadata for applications
    (Physical file storage is handled by document store)
    
    Implements: IAttachmentRepo interface
    """
    
    def __init__(self, db: Session):
        """Initialize repository"""
        self.db = db
        
    def create(
        self, *, app_id, filename, file_size, content_type, file_path, document_type
    ) -> AttachmentDTO:
        """
        Create attachment metadata
        
        Args:
            app_id: Application UUID
            filename: Original filename
            file_size: File size in bytes
            content_type: MIME type
            file_path: Storage path
            document_type: Document type (e.g., "resume", "cover_letter", "other")
            
        Returns:
            Created AttachmentDTO
            
        Raises:
            ValidationError: If filename is invalid
            DatabaseOperationError: If creation fails
        """
        try:
            _validate_filename(filename)
            
            logger.debug(f"Creating attachment for application {app_id}: {filename}")
            
            a = models.ApplicationAttachment(
                application_id=app_id, 
                filename=filename, 
                file_size=file_size, 
                content_type=content_type,
                file_path=file_path, 
                document_type=document_type or "other"
            )
            self.db.add(a)
            self.db.commit()
            self.db.refresh(a)
            
            logger.info(
                f"Created attachment {a.id} for application {app_id}",
                extra={"attachment_id": str(a.id), "file_name": filename, "size": file_size}
            )
            return _attach_to_dto(a)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating attachment: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to create attachment: {str(e)}")
            
    def list_for_app(self, app_id) -> List[AttachmentDTO]:
        """
        List all attachments for application
        
        Args:
            app_id: Application UUID
            
        Returns:
            List of AttachmentDTOs ordered by creation time (newest first)
            
        Raises:
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Listing attachments for application {app_id}")
            
            stmt = select(models.ApplicationAttachment).where(
                models.ApplicationAttachment.application_id == app_id
            ).order_by(models.ApplicationAttachment.created_at.desc())
            
            attachments = [_attach_to_dto(x) for x in self.db.execute(stmt).scalars().all()]
            
            logger.debug(f"Found {len(attachments)} attachments for application {app_id}")
            return attachments
            
        except SQLAlchemyError as e:
            logger.error(f"Database error listing attachments: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to list attachments: {str(e)}")
            
    def get(self, attachment_id) -> AttachmentDTO:
        """
        Get specific attachment
        
        Args:
            attachment_id: Attachment UUID
            
        Returns:
            AttachmentDTO
            
        Raises:
            NotFoundError: If attachment not found
            DatabaseOperationError: If query fails
        """
        try:
            logger.debug(f"Getting attachment: {attachment_id}")
            
            a = self.db.get(models.ApplicationAttachment, attachment_id)
            if not a:
                logger.warning(f"Attachment not found: {attachment_id}")
                raise NotFoundError(f"Attachment {attachment_id} not found")
                
            return _attach_to_dto(a)
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting attachment: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get attachment: {str(e)}")
            
    def delete(self, attachment_id) -> None:
        """
        Delete attachment metadata
        
        Note: This only deletes the database record.
        Physical file deletion should be handled separately.
        
        Args:
            attachment_id: Attachment UUID
            
        Raises:
            NotFoundError: If attachment not found
            DatabaseOperationError: If deletion fails
        """
        try:
            logger.info(f"Deleting attachment: {attachment_id}")
            
            a = self.db.get(models.ApplicationAttachment, attachment_id)
            if not a:
                logger.warning(f"Attachment not found for deletion: {attachment_id}")
                raise NotFoundError(f"Attachment {attachment_id} not found")
                
            file_path = a.file_path  # For logging
            self.db.delete(a)
            self.db.commit()
            
            logger.info(
                f"Deleted attachment: {attachment_id}",
                extra={"attachment_id": str(attachment_id), "file_path": file_path}
            )
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting attachment: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to delete attachment: {str(e)}")
