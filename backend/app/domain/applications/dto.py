"""
Application domain Data Transfer Objects (DTOs).

This module defines data structures for transferring application data between
layers of the application. DTOs are used to:
- Transfer data from repositories to services
- Transfer data from services to API layers
- Structure application data with related entities

Classes:
- ApplicationDTO: Complete application information from database
- StageDTO: Application stage/interview information
- NoteDTO: Application note information
- AttachmentDTO: Application attachment/file information
- CardRowDTO: Lightweight application data for card views
- JobTinyDTO: Minimal job information for application details
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

# Configuration constants
MAX_STATUS_LENGTH: int = 50  # Maximum status string length
MAX_SOURCE_LENGTH: int = 100  # Maximum source string length
MAX_STAGE_NAME_LENGTH: int = 100  # Maximum stage name length
MAX_OUTCOME_LENGTH: int = 50  # Maximum outcome string length
MAX_NOTES_LENGTH: int = 10000  # Maximum notes text length
MAX_BODY_LENGTH: int = 50000  # Maximum note body length
MAX_FILENAME_LENGTH: int = 255  # Maximum filename length
MAX_CONTENT_TYPE_LENGTH: int = 100  # Maximum content type length
MAX_DOCUMENT_TYPE_LENGTH: int = 50  # Maximum document type length
MAX_TITLE_LENGTH: int = 500  # Maximum job title length
MAX_LOCATION_LENGTH: int = 200  # Maximum location length
MAX_DESCRIPTION_LENGTH: int = 50000  # Maximum description length


@dataclass
class ApplicationDTO:
    """
    Complete application information from database.
    
    This DTO represents a full job application record with all associated
    data including job reference, resume reference, status tracking, and
    archiving information.
    
    Attributes:
        id: Unique application identifier (UUID)
        user_id: Optional UUID of user who created application
        job_id: UUID of job being applied to
        resume_id: Optional UUID of resume version used
        status: Current application status (applied, interview, offer, rejected, etc.)
        source: Optional source of application (LinkedIn, Indeed, etc.)
        is_archived: Whether application is archived
        archived_at: Optional timestamp when application was archived
        created_at: Timestamp when application was created
        updated_at: Timestamp when application was last updated
    
    Validation:
        - id, job_id must be valid UUIDs
        - user_id, resume_id can be None
        - status must not be empty
        - is_archived must be boolean
        - created_at, updated_at must be valid datetimes
    
    Examples:
        >>> app = ApplicationDTO(
        ...     id=uuid4(),
        ...     user_id=uuid4(),
        ...     job_id=uuid4(),
        ...     status="applied",
        ...     is_archived=False,
        ...     created_at=datetime.now(),
        ...     updated_at=datetime.now()
        ... )
    """
    id: UUID
    user_id: Optional[UUID]
    job_id: UUID
    resume_id: Optional[UUID]
    status: str
    source: Optional[str]
    is_archived: bool
    archived_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    def __post_init__(self):
        """
        Validate DTO fields after initialization.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate UUID fields
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.job_id, UUID):
                raise ValueError(f"job_id must be UUID, got {type(self.job_id).__name__}")
            
            if self.user_id is not None and not isinstance(self.user_id, UUID):
                raise ValueError(f"user_id must be UUID or None, got {type(self.user_id).__name__}")
            
            if self.resume_id is not None and not isinstance(self.resume_id, UUID):
                raise ValueError(f"resume_id must be UUID or None, got {type(self.resume_id).__name__}")
            
            # Validate status
            if not self.status or not self.status.strip():
                raise ValueError("status must not be empty")
            
            if len(self.status) > MAX_STATUS_LENGTH:
                logger.warning(
                    "Application status exceeds maximum length",
                    extra={
                        "app_id": str(self.id),
                        "status_length": len(self.status),
                        "max_length": MAX_STATUS_LENGTH
                    }
                )
                self.status = self.status[:MAX_STATUS_LENGTH]
            
            # Validate source
            if self.source and len(self.source) > MAX_SOURCE_LENGTH:
                logger.warning(
                    "Application source exceeds maximum length",
                    extra={
                        "app_id": str(self.id),
                        "source_length": len(self.source),
                        "max_length": MAX_SOURCE_LENGTH
                    }
                )
                self.source = self.source[:MAX_SOURCE_LENGTH]
            
            # Validate boolean
            if not isinstance(self.is_archived, bool):
                raise ValueError(f"is_archived must be bool, got {type(self.is_archived).__name__}")
            
            # Validate datetimes
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if not isinstance(self.updated_at, datetime):
                raise ValueError(f"updated_at must be datetime, got {type(self.updated_at).__name__}")
            
            if self.archived_at is not None and not isinstance(self.archived_at, datetime):
                raise ValueError(f"archived_at must be datetime or None, got {type(self.archived_at).__name__}")
            
            logger.debug(
                "ApplicationDTO validated successfully",
                extra={
                    "app_id": str(self.id),
                    "job_id": str(self.job_id),
                    "status": self.status,
                    "is_archived": self.is_archived
                }
            )
            
        except Exception as e:
            logger.error(
                "ApplicationDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "app_id": str(self.id) if isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DTO to dictionary for JSON serialization.
        
        Returns:
            Dict[str, Any]: Dictionary representation of application data
        """
        try:
            return {
                'id': str(self.id),
                'user_id': str(self.user_id) if self.user_id else None,
                'job_id': str(self.job_id),
                'resume_id': str(self.resume_id) if self.resume_id else None,
                'status': self.status,
                'source': self.source,
                'is_archived': self.is_archived,
                'archived_at': self.archived_at.isoformat() if self.archived_at else None,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting ApplicationDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "app_id": str(self.id)
                },
                exc_info=True
            )
            raise


@dataclass
class StageDTO:
    """
    Application stage/interview information.
    
    This DTO represents a stage in the application process (phone screen,
    technical interview, onsite, offer, etc.) with scheduling and outcome
    tracking.
    
    Attributes:
        id: Unique stage identifier (UUID)
        application_id: UUID of parent application
        name: Stage name (Phone Screen, Technical Interview, etc.)
        scheduled_at: Optional timestamp when stage is scheduled
        outcome: Optional outcome (passed, rejected, pending, etc.)
        notes: Optional notes about the stage
        created_at: Timestamp when stage was created
    
    Validation:
        - id, application_id must be valid UUIDs
        - name must not be empty
        - scheduled_at, outcome, notes can be None
        - created_at must be valid datetime
    """
    id: UUID
    application_id: UUID
    name: str
    scheduled_at: Optional[datetime]
    outcome: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    def __post_init__(self):
        """Validate stage DTO fields."""
        try:
            # Validate UUIDs
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.application_id, UUID):
                raise ValueError(f"application_id must be UUID, got {type(self.application_id).__name__}")
            
            # Validate name
            if not self.name or not self.name.strip():
                raise ValueError("name must not be empty")
            
            if len(self.name) > MAX_STAGE_NAME_LENGTH:
                logger.warning(
                    "Stage name exceeds maximum length",
                    extra={
                        "stage_id": str(self.id),
                        "name_length": len(self.name),
                        "max_length": MAX_STAGE_NAME_LENGTH
                    }
                )
                self.name = self.name[:MAX_STAGE_NAME_LENGTH]
            
            # Validate outcome
            if self.outcome and len(self.outcome) > MAX_OUTCOME_LENGTH:
                logger.warning(
                    "Stage outcome exceeds maximum length",
                    extra={
                        "stage_id": str(self.id),
                        "outcome_length": len(self.outcome),
                        "max_length": MAX_OUTCOME_LENGTH
                    }
                )
                self.outcome = self.outcome[:MAX_OUTCOME_LENGTH]
            
            # Validate notes
            if self.notes and len(self.notes) > MAX_NOTES_LENGTH:
                logger.warning(
                    "Stage notes exceed maximum length",
                    extra={
                        "stage_id": str(self.id),
                        "notes_length": len(self.notes),
                        "max_length": MAX_NOTES_LENGTH
                    }
                )
                self.notes = self.notes[:MAX_NOTES_LENGTH]
            
            # Validate datetimes
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if self.scheduled_at is not None and not isinstance(self.scheduled_at, datetime):
                raise ValueError(f"scheduled_at must be datetime or None, got {type(self.scheduled_at).__name__}")
            
            logger.debug(
                "StageDTO validated successfully",
                extra={
                    "stage_id": str(self.id),
                    "application_id": str(self.application_id),
                    "name": self.name,
                    "outcome": self.outcome
                }
            )
            
        except Exception as e:
            logger.error(
                "StageDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "stage_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert DTO to dictionary."""
        try:
            return {
                'id': str(self.id),
                'application_id': str(self.application_id),
                'name': self.name,
                'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
                'outcome': self.outcome,
                'notes': self.notes,
                'created_at': self.created_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting StageDTO to dict",
                extra={"error": str(e), "stage_id": str(self.id)},
                exc_info=True
            )
            raise


@dataclass
class NoteDTO:
    """
    Application note information.
    
    This DTO represents a note attached to an application for tracking
    thoughts, feedback, or important information.
    
    Attributes:
        id: Unique note identifier (UUID)
        application_id: UUID of parent application
        body: Note content/text
        created_at: Timestamp when note was created
    
    Validation:
        - id, application_id must be valid UUIDs
        - body must not be empty
        - created_at must be valid datetime
    """
    id: UUID
    application_id: UUID
    body: str
    created_at: datetime
    
    def __post_init__(self):
        """Validate note DTO fields."""
        try:
            # Validate UUIDs
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.application_id, UUID):
                raise ValueError(f"application_id must be UUID, got {type(self.application_id).__name__}")
            
            # Validate body
            if not self.body or not self.body.strip():
                raise ValueError("body must not be empty")
            
            if len(self.body) > MAX_BODY_LENGTH:
                logger.warning(
                    "Note body exceeds maximum length",
                    extra={
                        "note_id": str(self.id),
                        "body_length": len(self.body),
                        "max_length": MAX_BODY_LENGTH
                    }
                )
                self.body = self.body[:MAX_BODY_LENGTH]
            
            # Validate datetime
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            logger.debug(
                "NoteDTO validated successfully",
                extra={
                    "note_id": str(self.id),
                    "application_id": str(self.application_id),
                    "body_length": len(self.body)
                }
            )
            
        except Exception as e:
            logger.error(
                "NoteDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "note_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert DTO to dictionary."""
        try:
            return {
                'id': str(self.id),
                'application_id': str(self.application_id),
                'body': self.body,
                'created_at': self.created_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting NoteDTO to dict",
                extra={"error": str(e), "note_id": str(self.id)},
                exc_info=True
            )
            raise


@dataclass
class AttachmentDTO:
    """
    Application attachment/file information.
    
    This DTO represents a file attached to an application (resume, cover
    letter, portfolio, etc.) with metadata and storage information.
    
    Attributes:
        id: Unique attachment identifier (UUID)
        application_id: UUID of parent application
        filename: Original filename
        file_size: Size of file in bytes
        content_type: MIME type (application/pdf, image/png, etc.)
        file_path: Storage path/key for file retrieval
        document_type: Optional document type category (resume, cover_letter, etc.)
        created_at: Timestamp when attachment was uploaded
    
    Validation:
        - id, application_id must be valid UUIDs
        - filename must not be empty
        - file_size must be positive integer
        - content_type must not be empty
        - file_path must not be empty
        - created_at must be valid datetime
    """
    id: UUID
    application_id: UUID
    filename: str
    file_size: int
    content_type: str
    file_path: str
    document_type: Optional[str]
    created_at: datetime
    
    def __post_init__(self):
        """Validate attachment DTO fields."""
        try:
            # Validate UUIDs
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.application_id, UUID):
                raise ValueError(f"application_id must be UUID, got {type(self.application_id).__name__}")
            
            # Validate filename
            if not self.filename or not self.filename.strip():
                raise ValueError("filename must not be empty")
            
            if len(self.filename) > MAX_FILENAME_LENGTH:
                logger.warning(
                    "Attachment filename exceeds maximum length",
                    extra={
                        "attachment_id": str(self.id),
                        "filename_length": len(self.filename),
                        "max_length": MAX_FILENAME_LENGTH
                    }
                )
                self.filename = self.filename[:MAX_FILENAME_LENGTH]
            
            # Validate file_size
            if not isinstance(self.file_size, int) or self.file_size <= 0:
                raise ValueError(f"file_size must be positive integer, got {self.file_size}")
            
            # Validate content_type
            if not self.content_type or not self.content_type.strip():
                raise ValueError("content_type must not be empty")
            
            if len(self.content_type) > MAX_CONTENT_TYPE_LENGTH:
                logger.warning(
                    "Content type exceeds maximum length",
                    extra={
                        "attachment_id": str(self.id),
                        "content_type_length": len(self.content_type),
                        "max_length": MAX_CONTENT_TYPE_LENGTH
                    }
                )
                self.content_type = self.content_type[:MAX_CONTENT_TYPE_LENGTH]
            
            # Validate file_path
            if not self.file_path or not self.file_path.strip():
                raise ValueError("file_path must not be empty")
            
            # Validate document_type
            if self.document_type and len(self.document_type) > MAX_DOCUMENT_TYPE_LENGTH:
                logger.warning(
                    "Document type exceeds maximum length",
                    extra={
                        "attachment_id": str(self.id),
                        "document_type_length": len(self.document_type),
                        "max_length": MAX_DOCUMENT_TYPE_LENGTH
                    }
                )
                self.document_type = self.document_type[:MAX_DOCUMENT_TYPE_LENGTH]
            
            # Validate datetime
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            logger.debug(
                "AttachmentDTO validated successfully",
                extra={
                    "attachment_id": str(self.id),
                    "application_id": str(self.application_id),
                    "filename": self.filename,
                    "file_size": self.file_size,
                    "content_type": self.content_type
                }
            )
            
        except Exception as e:
            logger.error(
                "AttachmentDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "attachment_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert DTO to dictionary."""
        try:
            return {
                'id': str(self.id),
                'application_id': str(self.application_id),
                'filename': self.filename,
                'file_size': self.file_size,
                'content_type': self.content_type,
                'file_path': self.file_path,
                'document_type': self.document_type,
                'created_at': self.created_at.isoformat()
            }
        except Exception as e:
            logger.error(
                "Error converting AttachmentDTO to dict",
                extra={"error": str(e), "attachment_id": str(self.id)},
                exc_info=True
            )
            raise


# For cards
@dataclass
class CardRowDTO:
    """
    Lightweight application data for card views.
    
    This DTO provides minimal application data needed for displaying
    application cards in list/grid views, optimized for performance.
    
    Attributes:
        id: Application UUID
        status: Current application status
        resume_id: Optional resume version used
        created_at: When application was created
        updated_at: Last update timestamp
        job_id: UUID of job being applied to
        title: Job title
        company_name: Optional company name
    
    Validation:
        - id, job_id must be valid UUIDs
        - resume_id can be None
        - status, title must not be empty
        - created_at, updated_at must be valid datetimes
    """
    id: UUID
    status: str
    resume_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    job_id: UUID
    title: str
    company_name: Optional[str]
    
    def __post_init__(self):
        """Validate card row DTO fields."""
        try:
            # Validate UUIDs
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if not isinstance(self.job_id, UUID):
                raise ValueError(f"job_id must be UUID, got {type(self.job_id).__name__}")
            
            if self.resume_id is not None and not isinstance(self.resume_id, UUID):
                raise ValueError(f"resume_id must be UUID or None, got {type(self.resume_id).__name__}")
            
            # Validate status
            if not self.status or not self.status.strip():
                raise ValueError("status must not be empty")
            
            if len(self.status) > MAX_STATUS_LENGTH:
                self.status = self.status[:MAX_STATUS_LENGTH]
            
            # Validate title
            if not self.title or not self.title.strip():
                raise ValueError("title must not be empty")
            
            if len(self.title) > MAX_TITLE_LENGTH:
                self.title = self.title[:MAX_TITLE_LENGTH]
            
            # Validate datetimes
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            if not isinstance(self.updated_at, datetime):
                raise ValueError(f"updated_at must be datetime, got {type(self.updated_at).__name__}")
            
            logger.debug(
                "CardRowDTO validated successfully",
                extra={
                    "app_id": str(self.id),
                    "job_id": str(self.job_id),
                    "title": self.title,
                    "status": self.status
                }
            )
            
        except Exception as e:
            logger.error(
                "CardRowDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "app_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert DTO to dictionary."""
        try:
            return {
                'id': str(self.id),
                'status': self.status,
                'resume_id': str(self.resume_id) if self.resume_id else None,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat(),
                'job_id': str(self.job_id),
                'title': self.title,
                'company_name': self.company_name
            }
        except Exception as e:
            logger.error(
                "Error converting CardRowDTO to dict",
                extra={"error": str(e), "app_id": str(self.id)},
                exc_info=True
            )
            raise


# For detail
@dataclass
class JobTinyDTO:
    """
    Minimal job information for application details.
    
    This DTO provides basic job information needed when displaying
    application details, without loading the full job entity.
    
    Attributes:
        id: Job UUID
        title: Job title
        company_name: Optional company name
        company_website: Optional company website URL
        location: Optional job location
        source_url: Optional URL of job posting
        description: Optional job description
    
    Validation:
        - id must be valid UUID
        - title must not be empty
        - All other fields can be None
    """
    id: UUID
    title: str
    company_name: Optional[str]
    company_website: Optional[str]
    location: Optional[str]
    source_url: Optional[str]
    description: Optional[str]
    
    def __post_init__(self):
        """Validate job tiny DTO fields."""
        try:
            # Validate UUID
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            # Validate title
            if not self.title or not self.title.strip():
                raise ValueError("title must not be empty")
            
            if len(self.title) > MAX_TITLE_LENGTH:
                self.title = self.title[:MAX_TITLE_LENGTH]
            
            # Validate location
            if self.location and len(self.location) > MAX_LOCATION_LENGTH:
                self.location = self.location[:MAX_LOCATION_LENGTH]
            
            # Validate description
            if self.description and len(self.description) > MAX_DESCRIPTION_LENGTH:
                logger.warning(
                    "Job description exceeds maximum length",
                    extra={
                        "job_id": str(self.id),
                        "description_length": len(self.description),
                        "max_length": MAX_DESCRIPTION_LENGTH
                    }
                )
                self.description = self.description[:MAX_DESCRIPTION_LENGTH]
            
            logger.debug(
                "JobTinyDTO validated successfully",
                extra={
                    "job_id": str(self.id),
                    "title": self.title,
                    "company_name": self.company_name
                }
            )
            
        except Exception as e:
            logger.error(
                "JobTinyDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "job_id": str(self.id) if hasattr(self, 'id') and isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert DTO to dictionary."""
        try:
            return {
                'id': str(self.id),
                'title': self.title,
                'company_name': self.company_name,
                'company_website': self.company_website,
                'location': self.location,
                'source_url': self.source_url,
                'description': self.description
            }
        except Exception as e:
            logger.error(
                "Error converting JobTinyDTO to dict",
                extra={"error": str(e), "job_id": str(self.id)},
                exc_info=True
            )
            raise


# Export all DTOs
__all__ = [
    'ApplicationDTO',
    'StageDTO',
    'NoteDTO',
    'AttachmentDTO',
    'CardRowDTO',
    'JobTinyDTO',
]
