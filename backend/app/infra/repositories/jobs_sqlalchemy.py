"""
SQLAlchemy Repository Implementation for Job and Company Management

This module provides database operations for jobs and companies using SQLAlchemy ORM.
It implements the repository pattern to abstract database access from business logic.

Features:
    - Job CRUD with ownership validation
    - Company management with deduplication
    - Job listing with pagination and filtering
    - Cascade deletion maintaining referential integrity
    - Company name-based lookup
    
Constants:
    MAX_PAGE_SIZE: Maximum items per page (1000)
    MAX_COMPANY_NAME_LENGTH: Maximum company name length (200 chars)
    MAX_FILTER_VALUE_LENGTH: Maximum filter value length (500 chars)
    MAX_JOB_TITLE_LENGTH: Maximum job title length (200 chars)
    MAX_DESCRIPTION_LENGTH: Maximum job description length (100000 chars)
    
Exception Hierarchy:
    JobRepositoryError (base)
    ├── DatabaseOperationError
    ├── ValidationError
    ├── NotFoundError
    └── PermissionError
    
Interfaces Implemented:
    - ICompanyRepository: Company CRUD and lookups
    - IJobRepository: Job CRUD and queries

Usage:
    from app.infra.repositories.jobs_sqlalchemy import JobSQLARepository, CompanySQLARepository
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    job_repo = JobSQLARepository(db)
    company_repo = CompanySQLARepository(db)
    
    # Ensure company exists (upsert)
    company_id = company_repo.ensure_company(
        name="Acme Corp",
        website="https://acme.com",
        location="San Francisco"
    )
    
    # Create job
    job = job_repo.create(
        user_id=user_id,
        company_id=company_id,
        payload={
            "title": "Software Engineer",
            "location": "Remote",
            "remote_type": "full",
            "job_type": "full-time",
            "description": "Job description...",
            "requirements": ["Python", "FastAPI"],
            "skills": ["Backend", "API Design"],
            "source_url": "https://jobs.acme.com/123"
        }
    )
"""
from __future__ import annotations
from typing import Optional, List, Tuple, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from ...db import models
from ...api.utils.pagination import apply_sorting
from ...domain.jobs.dto import JobDTO
from ...domain.jobs.repository import ICompanyRepository, IJobRepository
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration Constants
MAX_PAGE_SIZE = 1000
MAX_COMPANY_NAME_LENGTH = 200
MAX_FILTER_VALUE_LENGTH = 500
MAX_JOB_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 100000
MIN_PAGE_SIZE = 1
MAX_PAGE_NUMBER = 10000

# ==================== Exception Classes ====================

class JobRepositoryError(Exception):
    """Base exception for job repository operations"""
    pass

class DatabaseOperationError(JobRepositoryError):
    """Raised when database operation fails"""
    pass

class ValidationError(JobRepositoryError):
    """Raised when input validation fails"""
    pass

class NotFoundError(JobRepositoryError):
    """Raised when entity not found"""
    pass

class PermissionError(JobRepositoryError):
    """Raised when user doesn't have permission"""
    pass

# ==================== Validation Functions ====================

def _validate_uuid(value: UUID, field_name: str) -> None:
    """Validate UUID is not None"""
    if not value:
        raise ValidationError(f"{field_name} is required")

def _validate_company_name(name: str) -> None:
    """Validate company name"""
    if not name or not name.strip():
        raise ValidationError("Company name cannot be empty")
    if len(name) > MAX_COMPANY_NAME_LENGTH:
        raise ValidationError(f"Company name too long (max {MAX_COMPANY_NAME_LENGTH} chars)")

def _validate_job_title(title: str) -> None:
    """Validate job title"""
    if not title or not title.strip():
        raise ValidationError("Job title cannot be empty")
    if len(title) > MAX_JOB_TITLE_LENGTH:
        raise ValidationError(f"Job title too long (max {MAX_JOB_TITLE_LENGTH} chars)")

def _validate_description(description: Optional[str]) -> None:
    """Validate job description"""
    if description and len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValidationError(f"Description too long (max {MAX_DESCRIPTION_LENGTH} chars)")

def _validate_filter_value(value: str, field_name: str) -> None:
    """Validate filter value length"""
    if value and len(value) > MAX_FILTER_VALUE_LENGTH:
        raise ValidationError(f"{field_name} filter too long (max {MAX_FILTER_VALUE_LENGTH} chars)")

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

# ==================== Company Repository ====================

# ==================== Company Repository ====================

class CompanySQLARepository(ICompanyRepository):
    """
    SQLAlchemy implementation of company repository
    
    Provides company CRUD and name-based lookup with deduplication
    
    Implements: ICompanyRepository interface
    """
    
    def __init__(self, db: Session):
        """
        Initialize repository
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def get_id_by_name(self, name: str) -> Optional[UUID]:
        """
        Get company ID by exact name match
        
        Args:
            name: Company name to search for
            
        Returns:
            Company UUID if found, None otherwise
            
        Raises:
            ValidationError: If name is invalid
            DatabaseOperationError: If database query fails
        """
        try:
            if not name:
                logger.debug("Empty company name provided")
                return None
                
            _validate_company_name(name)
            
            logger.debug(f"Looking up company by name: {name}")
            
            c = self.db.execute(
                select(models.Company.id).where(models.Company.name == name)
            ).scalar_one_or_none()
            
            if c:
                logger.debug(f"Found company: {c}")
            else:
                logger.debug(f"Company not found: {name}")
                
            return c
            
        except SQLAlchemyError as e:
            logger.error(f"Database error looking up company: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to lookup company: {str(e)}")

    def ensure_company(self, name: str, website: Optional[str], location: Optional[str]) -> UUID:
        """
        Get or create company (upsert by name)
        
        If company with name exists, returns existing ID.
        Otherwise creates new company and returns new ID.
        
        Args:
            name: Company name (required)
            website: Optional company website
            location: Optional company location
            
        Returns:
            Company UUID (existing or newly created)
            
        Raises:
            ValidationError: If name is invalid
            DatabaseOperationError: If operation fails
            
        Notes:
            - Uses flush() instead of commit() to keep within transaction
            - Deduplicates by exact name match
        """
        try:
            _validate_company_name(name)
            
            logger.debug(f"Ensuring company exists: {name}")
            
            cid = self.get_id_by_name(name)
            if cid:
                logger.debug(f"Company already exists: {cid}")
                return cid
                
            logger.info(f"Creating new company: {name}", extra={"company_name": name})
            
            company = models.Company(name=name, website=website, location=location)
            self.db.add(company)
            self.db.flush()  # Get ID without committing transaction
            
            logger.info(
                f"Created company: {company.id}",
                extra={"company_id": str(company.id), "company_name": name}
            )
            return company.id
            
        except IntegrityError as e:
            # Handle race condition where company was created between check and insert
            logger.warning(f"Company creation race condition for '{name}', re-fetching", exc_info=True)
            self.db.rollback()
            cid = self.get_id_by_name(name)
            if cid:
                return cid
            raise DatabaseOperationError(f"Failed to ensure company: {str(e)}")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error ensuring company: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to ensure company: {str(e)}")

# ==================== DTO Conversion ====================

def _to_dto(job: models.Job, company_name: Optional[str], company_website: Optional[str]) -> JobDTO:
    """
    Convert Job model to DTO with company enrichment
    
    Args:
        job: Job model instance
        company_name: Company name (from join or separate query)
        company_website: Company website (from join or separate query)
        
    Returns:
        JobDTO with all fields mapped including company info
    """
    return JobDTO(
        id=job.id,
        title=job.title,
        company_id=job.company_id,
        company_name=company_name,
        website=company_website,
        location=job.location,
        remote_type=job.remote_type,
        job_type=job.job_type,
        description=job.description,
        requirements=list(job.requirements or []),
        skills=list(job.skills or []),
        source_url=job.source_url,
        is_archived=job.is_archived,
        created_at=job.created_at,
    )

# ==================== Job Repository ====================

# ==================== Job Repository ====================

class JobSQLARepository(IJobRepository):
    """
    SQLAlchemy implementation of job repository
    
    Provides CRUD operations and queries for jobs with ownership validation,
    pagination, filtering, and company enrichment.
    
    Implements: IJobRepository interface
    """
    
    def __init__(self, db: Session):
        """
        Initialize repository
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(self, *, user_id: UUID, company_id: Optional[UUID], payload: Dict) -> JobDTO:
        """
        Create new job
        
        Args:
            user_id: User UUID (owner)
            company_id: Optional company UUID
            payload: Job data dictionary with fields:
                - title (required)
                - location
                - remote_type
                - job_type
                - description
                - requirements (list)
                - skills (list)
                - source_url
                
        Returns:
            Created JobDTO with company info enriched
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If creation fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            if company_id:
                _validate_uuid(company_id, "company_id")
                
            title = payload.get("title")
            if title:
                _validate_job_title(title)
                
            description = payload.get("description")
            _validate_description(description)
            
            logger.info(
                f"Creating job for user {user_id}: {title}",
                extra={"user_id": str(user_id), "title": title, "company_id": str(company_id) if company_id else None}
            )
            
            job = models.Job(
                user_id=user_id,
                company_id=company_id,
                title=title,
                location=payload.get("location"),
                remote_type=payload.get("remote_type"),
                job_type=payload.get("job_type"),
                description=description,
                requirements=payload.get("requirements") or [],
                skills=payload.get("skills") or [],
                source_url=payload.get("source_url"),
            )
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)

            # Enrich with company info for DTO
            cname = None
            cweb = None
            if job.company_id:
                row = self.db.execute(
                    select(models.Company.name, models.Company.website).where(
                        models.Company.id == job.company_id
                    )
                ).first()
                if row:
                    cname, cweb = row
                    
            logger.info(f"Created job: {job.id}", extra={"job_id": str(job.id)})
            return _to_dto(job, cname, cweb)
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error creating job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Job creation failed (integrity constraint): {str(e)}")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to create job: {str(e)}")

    def get_for_user_with_company(self, job_id: UUID, user_id: UUID) -> JobDTO:
        """
        Get job by ID with company info, checking ownership
        
        Args:
            job_id: Job UUID
            user_id: User UUID (owner)
            
        Returns:
            JobDTO with company info
            
        Raises:
            NotFoundError: If job not found
            PermissionError: If user doesn't own job
            ValidationError: If IDs are invalid
            DatabaseOperationError: If query fails
        """
        try:
            _validate_uuid(job_id, "job_id")
            _validate_uuid(user_id, "user_id")
            
            logger.debug(f"Getting job {job_id} for user {user_id}")
            
            row = self.db.execute(
                select(
                    models.Job,
                    models.Company.name.label("company_name"),
                    models.Company.website.label("company_website"),
                )
                .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                .where(models.Job.id == job_id, models.Job.user_id == user_id)
            ).first()
            
            if not row:
                logger.warning(f"Job not found or permission denied: {job_id} for user {user_id}")
                raise NotFoundError(f"Job {job_id} not found or you don't have permission")
                
            job, cname, cweb = row
            logger.debug(f"Retrieved job: {job_id}")
            return _to_dto(job, cname, cweb)
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to get job: {str(e)}")

    def list_for_user(
        self,
        user_id: UUID,
        page: int,
        page_size: int,
        filters: Dict,
        sort: str,
        order: str,
    ) -> Tuple[List[JobDTO], int]:
        """
        List jobs for user with pagination and filtering
        
        Args:
            user_id: User UUID (owner)
            page: Page number (1-indexed)
            page_size: Items per page
            filters: Filter dictionary with optional keys:
                - location: Location filter (LIKE match)
                - remote_type: Remote type filter (exact match)
                - company: Company name filter (LIKE match)
            sort: Field to sort by
            order: Sort order ("asc" or "desc")
            
        Returns:
            Tuple of (list of JobDTOs, total count)
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If query fails
        """
        try:
            _validate_uuid(user_id, "user_id")
            _validate_pagination(page, page_size)
            
            # Validate filter values
            location = (filters.get("location") or "").strip()
            remote_type = (filters.get("remote_type") or "").strip()
            company = (filters.get("company") or "").strip()
            
            _validate_filter_value(location, "location")
            _validate_filter_value(remote_type, "remote_type")
            _validate_filter_value(company, "company")
            
            logger.debug(
                f"Listing jobs for user {user_id}",
                extra={
                    "user_id": str(user_id),
                    "page": page,
                    "page_size": page_size,
                    "filters": filters
                }
            )
            
            base = (
                select(
                    models.Job,
                    models.Company.name.label("company_name"),
                    models.Company.website.label("company_website"),
                )
                .join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                .where(models.Job.user_id == user_id)
            )

            # Apply filters
            if location:
                _loc = location.replace('%', '\\%').replace('_', '\\_')
                base = base.where(models.Job.location.ilike(f"%{_loc}%"))
            if remote_type:
                base = base.where(models.Job.remote_type == remote_type)
            if company:
                _comp = company.replace('%', '\\%').replace('_', '\\_')
                base = base.where(models.Company.name.ilike(f"%{_comp}%"))

            base = apply_sorting(base, models.Job, sort, order)

            offset = (page - 1) * page_size
            rows = self.db.execute(base.offset(offset).limit(page_size)).all()

            # Count with same filters
            total_q = select(func.count(models.Job.id)).where(models.Job.user_id == user_id)
            if location:
                total_q = total_q.where(models.Job.location.ilike(f"%{_loc}%"))
            if remote_type:
                total_q = total_q.where(models.Job.remote_type == remote_type)
            if company:
                total_q = (
                    total_q.join(models.Company, models.Job.company_id == models.Company.id, isouter=True)
                    .where(models.Company.name.ilike(f"%{_comp}%"))
                )
            total = self.db.execute(total_q).scalar() or 0

            items = []
            for job, cname, cweb in rows:
                items.append(_to_dto(job, cname, cweb))
                
            logger.info(
                f"Listed {len(items)} jobs (total: {total})",
                extra={"user_id": str(user_id), "count": len(items), "total": total}
            )
            return items, total
            
        except SQLAlchemyError as e:
            logger.error(f"Database error listing jobs: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to list jobs: {str(e)}")

    def update_for_user(self, job_id: UUID, user_id: UUID, data: Dict) -> JobDTO:
        """
        Update job for user
        
        Args:
            job_id: Job UUID
            user_id: User UUID (owner)
            data: Dictionary of fields to update
            
        Returns:
            Updated JobDTO with company info
            
        Raises:
            NotFoundError: If job not found
            PermissionError: If user doesn't own job
            ValidationError: If inputs are invalid
            DatabaseOperationError: If update fails
        """
        try:
            _validate_uuid(job_id, "job_id")
            _validate_uuid(user_id, "user_id")
            
            if "title" in data:
                _validate_job_title(data["title"])
            if "description" in data:
                _validate_description(data["description"])
            
            logger.debug(f"Updating job {job_id} for user {user_id} with data: {data}")
            
            job = self.db.execute(
                select(models.Job).where(models.Job.id == job_id, models.Job.user_id == user_id)
            ).scalar_one_or_none()
            
            if not job:
                logger.warning(f"Job not found or permission denied for update: {job_id} for user {user_id}")
                raise NotFoundError(f"Job {job_id} not found or you don't have permission")

            for k, v in data.items():
                setattr(job, k, v)

            self.db.commit()
            self.db.refresh(job)

            # Enrich with company info
            cname = None
            cweb = None
            if job.company_id:
                row = self.db.execute(
                    select(models.Company.name, models.Company.website).where(
                        models.Company.id == job.company_id
                    )
                ).first()
                if row:
                    cname, cweb = row
                    
            logger.info(f"Updated job: {job_id}", extra={"job_id": str(job_id)})
            return _to_dto(job, cname, cweb)
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error updating job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Job update failed (integrity constraint): {str(e)}")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to update job: {str(e)}")

    def delete_for_user_cascade(self, job_id: UUID, user_id: UUID) -> None:
        """
        Delete job and all related data (cascade) for user
        
        Deletes in order to maintain referential integrity:
        1. Application attachments (reference applications)
        2. Stages (reference applications)
        3. Notes (reference applications)
        4. Applications (reference jobs)
        5. Match results (reference jobs)
        6. Job itself
        
        Args:
            job_id: Job UUID to delete
            user_id: User UUID (owner) for permission check
            
        Raises:
            NotFoundError: If job not found
            PermissionError: If user doesn't own job
            ValidationError: If IDs are invalid
            DatabaseOperationError: If deletion fails
        """
        try:
            _validate_uuid(job_id, "job_id")
            _validate_uuid(user_id, "user_id")
            
            logger.info(
                f"Cascade deleting job {job_id} for user {user_id}",
                extra={"job_id": str(job_id), "user_id": str(user_id)}
            )
            
            # Verify ownership
            job = self.db.execute(
                select(models.Job).where(models.Job.id == job_id, models.Job.user_id == user_id)
            ).scalar_one_or_none()
            
            if not job:
                logger.warning(f"Job not found or permission denied for deletion: {job_id} for user {user_id}")
                raise NotFoundError(f"Job {job_id} not found or you don't have permission")

            # Get application IDs for bulk child deletion
            app_ids = [
                row[0]
                for row in self.db.execute(
                    select(models.Application.id).where(models.Application.job_id == job_id)
                ).all()
            ]

            # Bulk-delete children in correct order for referential integrity
            attachments_deleted = 0
            stages_deleted = 0
            notes_deleted = 0
            apps_deleted = 0

            if app_ids:
                attachments_deleted = self.db.execute(
                    delete(models.ApplicationAttachment).where(
                        models.ApplicationAttachment.application_id.in_(app_ids)
                    )
                ).rowcount

                stages_deleted = self.db.execute(
                    delete(models.Stage).where(
                        models.Stage.application_id.in_(app_ids)
                    )
                ).rowcount

                notes_deleted = self.db.execute(
                    delete(models.Note).where(
                        models.Note.application_id.in_(app_ids)
                    )
                ).rowcount

                apps_deleted = self.db.execute(
                    delete(models.Application).where(
                        models.Application.job_id == job_id
                    )
                ).rowcount

            # Delete match results
            match_results_deleted = self.db.execute(
                delete(models.MatchResult).where(models.MatchResult.job_id == job_id)
            ).rowcount
            
            # Finally delete the job
            self.db.delete(job)
            self.db.commit()
            
            logger.info(
                f"Deleted job {job_id} and related data",
                extra={
                    "job_id": str(job_id),
                    "applications_deleted": apps_deleted,
                    "attachments_deleted": attachments_deleted,
                    "stages_deleted": stages_deleted,
                    "notes_deleted": notes_deleted,
                    "match_results_deleted": match_results_deleted
                }
            )
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting job: {e}", exc_info=True)
            raise DatabaseOperationError(f"Failed to delete job: {str(e)}")
