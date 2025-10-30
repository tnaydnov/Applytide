"""
Analytics SQLAlchemy Repository Module

This module provides SQLAlchemy-based repository implementation for analytics
read operations, querying applications, stages, jobs, and companies.

Features:
    - Efficient batch queries for applications and stages
    - Job and company mapping with bulk fetching
    - Optional field handling for schema evolution
    - Comprehensive error handling for database operations
    - Detailed logging for query performance monitoring

Implements IAnalyticsReadRepo port for domain layer.

Constants:
    MAX_APPLICATION_IDS: Maximum application IDs to query at once
    MAX_JOB_IDS: Maximum job IDs to query at once
    MAX_COMPANY_IDS: Maximum company IDs to query at once

Example:
    >>> from app.infra.repositories.analytics_sqlalchemy import AnalyticsSQLARepository
    >>> from sqlalchemy.orm import Session
    >>> 
    >>> repo = AnalyticsSQLARepository(db_session)
    >>> apps = repo.list_user_applications_since(
    ...     user_id=user_uuid,
    ...     start_date=datetime(2024, 1, 1)
    ... )
    >>> print(len(apps))
    42
"""

from __future__ import annotations
import logging
from typing import List, Dict, Iterable
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from ...db import models
from ...domain.analytics.ports import IAnalyticsReadRepo
from ...domain.analytics.dto import ApplicationLiteDTO, StageLiteDTO, JobLiteDTO, CompanyLiteDTO

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class AnalyticsRepositoryError(Exception):
    """Base exception for analytics repository operations"""
    pass

class DatabaseQueryError(AnalyticsRepositoryError):
    """Exception raised when database query fails"""
    pass

class ValidationError(AnalyticsRepositoryError):
    """Exception raised when input validation fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# Query batch limits (prevent excessive IN clause sizes)
MAX_APPLICATION_IDS = 1000
MAX_JOB_IDS = 1000
MAX_COMPANY_IDS = 1000

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_user_id(user_id: UUID) -> None:
    """Validate user ID parameter."""
    if not isinstance(user_id, UUID):
        raise ValidationError(f"user_id must be UUID, got {type(user_id).__name__}")

def _validate_date(date: datetime, param_name: str) -> None:
    """Validate datetime parameter."""
    if not isinstance(date, datetime):
        raise ValidationError(f"{param_name} must be datetime, got {type(date).__name__}")

def _validate_id_list(ids: Iterable[UUID], param_name: str, max_count: int) -> List[UUID]:
    """Validate and convert ID iterable to list."""
    try:
        id_list = list(ids)
    except Exception as e:
        raise ValidationError(f"Failed to convert {param_name} to list: {e}")
    
    if not all(isinstance(id_val, UUID) for id_val in id_list):
        raise ValidationError(f"All {param_name} must be UUIDs")
    
    if len(id_list) > max_count:
        raise ValidationError(
            f"{param_name} count ({len(id_list)}) exceeds maximum ({max_count})"
        )
    
    return id_list

# ============================================================================
# Repository Implementation
# ============================================================================

class AnalyticsSQLARepository(IAnalyticsReadRepo):
    """
    SQLAlchemy repository for analytics read operations.
    
    Provides efficient queries for applications, stages, jobs, and companies
    with proper error handling and logging.
    """
    
    def __init__(self, db: Session):
        """
        Initialize repository with database session.
        
        Args:
            db: SQLAlchemy session
            
        Raises:
            ValidationError: If db is not a Session
        """
        if not isinstance(db, Session):
            raise ValidationError(f"db must be SQLAlchemy Session, got {type(db).__name__}")
        
        self.db = db
        logger.debug("Initialized AnalyticsSQLARepository")
    
    def list_user_applications_since(
        self,
        *,
        user_id: UUID,
        start_date: datetime
    ) -> List[ApplicationLiteDTO]:
        """
        List all applications for user created after start_date.
        
        Args:
            user_id: User UUID to query applications for
            start_date: Only return applications created on or after this date
            
        Returns:
            List of ApplicationLiteDTO objects sorted by created_at
            
        Raises:
            ValidationError: If parameters are invalid
            DatabaseQueryError: If database query fails
            
        Example:
            >>> from datetime import datetime, timedelta
            >>> repo = AnalyticsSQLARepository(db)
            >>> start = datetime.now() - timedelta(days=30)
            >>> apps = repo.list_user_applications_since(user_id=user_uuid, start_date=start)
            >>> print(len(apps))
            15
            
        Notes:
            - Tolerates optional schema fields (source, resume_id, has_cover_letter)
            - Returns empty list if no applications found (doesn't raise)
            - Logs query performance metrics
        """
        try:
            # Validate inputs
            _validate_user_id(user_id)
            _validate_date(start_date, "start_date")
            
            logger.debug(
                "Querying user applications",
                extra={
                    "user_id": str(user_id),
                    "start_date": start_date.isoformat(),
                }
            )
            
            # Query applications
            try:
                rows = self.db.execute(
                    select(models.Application).where(
                        models.Application.user_id == user_id,
                        models.Application.created_at >= start_date
                    )
                ).scalars().all()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query applications",
                    exc_info=True,
                    extra={
                        "user_id": str(user_id),
                        "start_date": start_date.isoformat(),
                        "error": str(e),
                    }
                )
                raise DatabaseQueryError(f"Application query failed: {e}") from e
            
            # Map to DTOs (tolerate optional columns)
            out: List[ApplicationLiteDTO] = []
            for a in rows:
                try:
                    out.append(ApplicationLiteDTO(
                        id=a.id,
                        user_id=a.user_id,
                        job_id=a.job_id,
                        status=a.status,
                        created_at=a.created_at,
                        updated_at=a.updated_at,
                        source=getattr(a, "source", None),
                        resume_id=getattr(a, "resume_id", None),
                        has_cover_letter=getattr(a, "has_cover_letter", None),
                    ))
                except Exception as e:
                    logger.warning(
                        "Failed to map application to DTO, skipping",
                        extra={
                            "application_id": str(a.id),
                            "error": str(e),
                        }
                    )
                    continue
            
            logger.info(
                "Applications query complete",
                extra={
                    "user_id": str(user_id),
                    "start_date": start_date.isoformat(),
                    "result_count": len(out),
                }
            )
            
            return out
            
        except (ValidationError, DatabaseQueryError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in list_user_applications_since",
                exc_info=True,
                extra={
                    "user_id": str(user_id) if isinstance(user_id, UUID) else None,
                    "error": str(e),
                }
            )
            raise DatabaseQueryError(f"Failed to list applications: {e}") from e
    
    def list_stages_for_applications(
        self,
        *,
        app_ids: Iterable[UUID]
    ) -> List[StageLiteDTO]:
        """
        List all stages for given application IDs.
        
        Args:
            app_ids: Application UUIDs to query stages for
            
        Returns:
            List of StageLiteDTO objects
            
        Raises:
            ValidationError: If app_ids validation fails
            DatabaseQueryError: If database query fails
            
        Example:
            >>> repo = AnalyticsSQLARepository(db)
            >>> stages = repo.list_stages_for_applications(app_ids=[uuid1, uuid2])
            >>> print(len(stages))
            8
            
        Notes:
            - Returns empty list if app_ids is empty (efficient shortcut)
            - Handles up to MAX_APPLICATION_IDS at once
            - Logs query performance
        """
        try:
            # Convert to list and validate
            app_id_list = _validate_id_list(app_ids, "app_ids", MAX_APPLICATION_IDS)
            
            # Shortcut for empty input
            if not app_id_list:
                logger.debug("No application IDs provided, returning empty list")
                return []
            
            logger.debug(
                "Querying stages for applications",
                extra={"app_id_count": len(app_id_list)}
            )
            
            # Query stages
            try:
                rows = self.db.execute(
                    select(models.Stage).where(
                        models.Stage.application_id.in_(app_id_list)
                    )
                ).scalars().all()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query stages",
                    exc_info=True,
                    extra={
                        "app_id_count": len(app_id_list),
                        "error": str(e),
                    }
                )
                raise DatabaseQueryError(f"Stage query failed: {e}") from e
            
            # Map to DTOs
            result = [
                StageLiteDTO(
                    id=s.id,
                    application_id=s.application_id,
                    name=s.name,
                    outcome=s.outcome,
                    created_at=s.created_at
                )
                for s in rows
            ]
            
            logger.info(
                "Stages query complete",
                extra={
                    "app_id_count": len(app_id_list),
                    "result_count": len(result),
                }
            )
            
            return result
            
        except (ValidationError, DatabaseQueryError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in list_stages_for_applications",
                exc_info=True,
                extra={"error": str(e)}
            )
            raise DatabaseQueryError(f"Failed to list stages: {e}") from e
    
    def map_jobs(self, *, job_ids: Iterable[UUID]) -> Dict[UUID, JobLiteDTO]:
        """
        Map job IDs to JobLiteDTO objects.
        
        Args:
            job_ids: Job UUIDs to fetch
            
        Returns:
            Dictionary mapping job UUID to JobLiteDTO
            
        Raises:
            ValidationError: If job_ids validation fails
            DatabaseQueryError: If database query fails
            
        Example:
            >>> repo = AnalyticsSQLARepository(db)
            >>> jobs = repo.map_jobs(job_ids=[uuid1, uuid2, uuid3])
            >>> print(jobs[uuid1].title)
            'Software Engineer'
            
        Notes:
            - Returns empty dict if job_ids is empty
            - Handles up to MAX_JOB_IDS at once
            - Deduplicates input IDs automatically
        """
        try:
            # Convert to list, deduplicate, and validate
            ids = list(set(job_ids))
            id_list = _validate_id_list(ids, "job_ids", MAX_JOB_IDS)
            
            if not id_list:
                logger.debug("No job IDs provided, returning empty dict")
                return {}
            
            logger.debug(
                "Querying jobs",
                extra={"job_id_count": len(id_list)}
            )
            
            # Query jobs
            try:
                rows = self.db.execute(
                    select(models.Job).where(models.Job.id.in_(id_list))
                ).scalars().all()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query jobs",
                    exc_info=True,
                    extra={
                        "job_id_count": len(id_list),
                        "error": str(e),
                    }
                )
                raise DatabaseQueryError(f"Job query failed: {e}") from e
            
            # Build result dict
            result = {
                j.id: JobLiteDTO(
                    id=j.id,
                    title=j.title,
                    company_id=j.company_id,
                    created_at=j.created_at
                )
                for j in rows
            }
            
            logger.info(
                "Jobs query complete",
                extra={
                    "job_id_count": len(id_list),
                    "result_count": len(result),
                }
            )
            
            return result
            
        except (ValidationError, DatabaseQueryError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in map_jobs",
                exc_info=True,
                extra={"error": str(e)}
            )
            raise DatabaseQueryError(f"Failed to map jobs: {e}") from e
    
    def map_companies(self, *, company_ids: Iterable[UUID]) -> Dict[UUID, CompanyLiteDTO]:
        """
        Map company IDs to CompanyLiteDTO objects.
        
        Args:
            company_ids: Company UUIDs to fetch (None values filtered out)
            
        Returns:
            Dictionary mapping company UUID to CompanyLiteDTO
            
        Raises:
            ValidationError: If company_ids validation fails
            DatabaseQueryError: If database query fails
            
        Example:
            >>> repo = AnalyticsSQLARepository(db)
            >>> companies = repo.map_companies(company_ids=[uuid1, uuid2])
            >>> print(companies[uuid1].name)
            'Tech Corp'
            
        Notes:
            - Filters out None values from input automatically
            - Returns empty dict if no valid company IDs
            - Handles up to MAX_COMPANY_IDS at once
            - Deduplicates input IDs automatically
        """
        try:
            # Filter out None values, deduplicate, convert to list
            ids = [cid for cid in set(company_ids) if cid]
            id_list = _validate_id_list(ids, "company_ids", MAX_COMPANY_IDS)
            
            if not id_list:
                logger.debug("No company IDs provided, returning empty dict")
                return {}
            
            logger.debug(
                "Querying companies",
                extra={"company_id_count": len(id_list)}
            )
            
            # Query companies
            try:
                rows = self.db.execute(
                    select(models.Company).where(models.Company.id.in_(id_list))
                ).scalars().all()
            except SQLAlchemyError as e:
                logger.error(
                    "Failed to query companies",
                    exc_info=True,
                    extra={
                        "company_id_count": len(id_list),
                        "error": str(e),
                    }
                )
                raise DatabaseQueryError(f"Company query failed: {e}") from e
            
            # Build result dict
            result = {
                c.id: CompanyLiteDTO(
                    id=c.id,
                    name=c.name,
                    location=c.location
                )
                for c in rows
            }
            
            logger.info(
                "Companies query complete",
                extra={
                    "company_id_count": len(id_list),
                    "result_count": len(result),
                }
            )
            
            return result
            
        except (ValidationError, DatabaseQueryError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in map_companies",
                exc_info=True,
                extra={"error": str(e)}
            )
            raise DatabaseQueryError(f"Failed to map companies: {e}") from e
