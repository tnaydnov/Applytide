"""
Job domain Data Transfer Objects (DTOs).

This module defines data structures for transferring job data between
layers of the application. DTOs are used to:
- Transfer data from repositories to services
- Transfer data from services to API layers
- Structure search results

Classes:
- JobDTO: Complete job information from database
- JobSearchDTO: Job search results with relevance scoring
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)

# Configuration constants
MAX_REQUIREMENTS: int = 1000  # Maximum requirements to prevent data issues
MAX_SKILLS: int = 1000  # Maximum skills to prevent data issues
MAX_TITLE_LENGTH: int = 500  # Maximum title length
MAX_LOCATION_LENGTH: int = 200  # Maximum location length


@dataclass
class JobDTO:
    """
    Complete job information from database.
    
    This DTO represents a full job record with all associated data
    including company information, job details, requirements, and skills.
    
    Attributes:
        id: Unique job identifier (UUID)
        title: Job title/position name
        company_id: Optional UUID of associated company
        company_name: Optional name of hiring company
        website: Optional company website URL
        location: Optional job location (city, state, country, etc.)
        remote_type: Optional remote work type (remote, hybrid, onsite)
        job_type: Optional employment type (full-time, part-time, contract)
        description: Optional detailed job description
        requirements: List of job requirements/qualifications
        skills: List of required/desired skills
        source_url: Optional URL of job posting source
        created_at: Timestamp when job was created
    
    Validation:
        - id must be valid UUID
        - title must not be empty
        - requirements and skills must be lists
        - created_at must be valid datetime
    
    Examples:
        >>> job = JobDTO(
        ...     id=uuid4(),
        ...     title="Software Engineer",
        ...     company_name="TechCorp",
        ...     requirements=["Python", "3+ years"],
        ...     skills=["Django", "REST APIs"],
        ...     created_at=datetime.now()
        ... )
    """
    id: UUID
    title: str
    company_id: Optional[UUID]
    company_name: Optional[str]
    website: Optional[str]
    location: Optional[str]
    remote_type: Optional[str]
    job_type: Optional[str]
    description: Optional[str]
    requirements: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    source_url: Optional[str] = None
    is_archived: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """
        Validate DTO fields after initialization.
        
        This method is automatically called after __init__ to ensure
        data integrity and consistency.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate UUID fields
            if not isinstance(self.id, UUID):
                raise ValueError(f"id must be UUID, got {type(self.id).__name__}")
            
            if self.company_id is not None and not isinstance(self.company_id, UUID):
                raise ValueError(f"company_id must be UUID or None, got {type(self.company_id).__name__}")
            
            # Validate title
            if not self.title or not self.title.strip():
                raise ValueError("title must not be empty")
            
            if len(self.title) > MAX_TITLE_LENGTH:
                logger.warning(
                    "Job title exceeds maximum length",
                    extra={
                        "job_id": str(self.id),
                        "title_length": len(self.title),
                        "max_length": MAX_TITLE_LENGTH
                    }
                )
                self.title = self.title[:MAX_TITLE_LENGTH]
            
            # Validate location
            if self.location and len(self.location) > MAX_LOCATION_LENGTH:
                logger.warning(
                    "Job location exceeds maximum length",
                    extra={
                        "job_id": str(self.id),
                        "location_length": len(self.location),
                        "max_length": MAX_LOCATION_LENGTH
                    }
                )
                self.location = self.location[:MAX_LOCATION_LENGTH]
            
            # Validate lists
            if not isinstance(self.requirements, list):
                raise ValueError(f"requirements must be list, got {type(self.requirements).__name__}")
            
            if not isinstance(self.skills, list):
                raise ValueError(f"skills must be list, got {type(self.skills).__name__}")
            
            # Validate list sizes
            if len(self.requirements) > MAX_REQUIREMENTS:
                logger.warning(
                    "Job requirements count exceeds maximum",
                    extra={
                        "job_id": str(self.id),
                        "requirements_count": len(self.requirements),
                        "max_requirements": MAX_REQUIREMENTS
                    }
                )
                self.requirements = self.requirements[:MAX_REQUIREMENTS]
            
            if len(self.skills) > MAX_SKILLS:
                logger.warning(
                    "Job skills count exceeds maximum",
                    extra={
                        "job_id": str(self.id),
                        "skills_count": len(self.skills),
                        "max_skills": MAX_SKILLS
                    }
                )
                self.skills = self.skills[:MAX_SKILLS]
            
            # Validate datetime
            if not isinstance(self.created_at, datetime):
                raise ValueError(f"created_at must be datetime, got {type(self.created_at).__name__}")
            
            logger.debug(
                "JobDTO validated successfully",
                extra={
                    "job_id": str(self.id),
                    "title": self.title,
                    "company_name": self.company_name,
                    "requirements_count": len(self.requirements),
                    "skills_count": len(self.skills)
                }
            )
            
        except Exception as e:
            logger.error(
                "JobDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "job_id": str(self.id) if isinstance(self.id, UUID) else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DTO to dictionary for JSON serialization.
        
        Returns:
            Dict[str, Any]: Dictionary representation of job data
        
        Examples:
            >>> job_dto.to_dict()
            {'id': '...', 'title': 'Software Engineer', ...}
        """
        try:
            return {
                'id': str(self.id),
                'title': self.title,
                'company_id': str(self.company_id) if self.company_id else None,
                'company_name': self.company_name,
                'website': self.website,
                'location': self.location,
                'remote_type': self.remote_type,
                'job_type': self.job_type,
                'description': self.description,
                'requirements': self.requirements,
                'skills': self.skills,
                'source_url': self.source_url,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
        except Exception as e:
            logger.error(
                "Error converting JobDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "job_id": str(self.id)
                },
                exc_info=True
            )
            raise


@dataclass
class JobSearchDTO:
    """
    Job search result with relevance scoring.
    
    This DTO represents a job from search results, including search
    relevance scoring and formatted data for display.
    
    Attributes:
        id: Job ID as string (for search indexing)
        title: Job title/position name
        description: Optional job description
        location: Optional job location
        remote_type: Optional remote work type
        source_url: Optional URL of job posting
        created_at: Creation timestamp as ISO string
        company_name: Optional company name
        company_website: Optional company website
        relevance_score: Search relevance score (0.0 to 1.0)
    
    Validation:
        - id must not be empty
        - title must not be empty
        - relevance_score must be between 0.0 and 1.0
        - created_at must be valid ISO format
    
    Examples:
        >>> result = JobSearchDTO(
        ...     id="123",
        ...     title="Backend Developer",
        ...     relevance_score=0.85,
        ...     created_at="2024-01-01T00:00:00"
        ... )
    """
    id: str
    title: str
    description: Optional[str]
    location: Optional[str]
    remote_type: Optional[str]
    source_url: Optional[str]
    created_at: str
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    relevance_score: float = 0.0
    
    def __post_init__(self):
        """
        Validate search DTO fields after initialization.
        
        Raises:
            ValueError: If validation fails for any field
        """
        try:
            # Validate id
            if not self.id or not str(self.id).strip():
                raise ValueError("id must not be empty")
            
            # Validate title
            if not self.title or not self.title.strip():
                raise ValueError("title must not be empty")
            
            if len(self.title) > MAX_TITLE_LENGTH:
                logger.warning(
                    "Search result title exceeds maximum length",
                    extra={
                        "job_id": self.id,
                        "title_length": len(self.title),
                        "max_length": MAX_TITLE_LENGTH
                    }
                )
                self.title = self.title[:MAX_TITLE_LENGTH]
            
            # Validate location
            if self.location and len(self.location) > MAX_LOCATION_LENGTH:
                logger.warning(
                    "Search result location exceeds maximum length",
                    extra={
                        "job_id": self.id,
                        "location_length": len(self.location),
                        "max_length": MAX_LOCATION_LENGTH
                    }
                )
                self.location = self.location[:MAX_LOCATION_LENGTH]
            
            # Validate relevance score
            if not isinstance(self.relevance_score, (int, float)):
                logger.warning(
                    "Invalid relevance score type, defaulting to 0.0",
                    extra={
                        "job_id": self.id,
                        "score_type": type(self.relevance_score).__name__
                    }
                )
                self.relevance_score = 0.0
            
            # Clamp relevance score to valid range
            if self.relevance_score < 0.0:
                logger.warning(
                    "Relevance score below minimum, clamping to 0.0",
                    extra={"job_id": self.id, "original_score": self.relevance_score}
                )
                self.relevance_score = 0.0
            elif self.relevance_score > 1.0:
                logger.warning(
                    "Relevance score above maximum, clamping to 1.0",
                    extra={"job_id": self.id, "original_score": self.relevance_score}
                )
                self.relevance_score = 1.0
            
            logger.debug(
                "JobSearchDTO validated successfully",
                extra={
                    "job_id": self.id,
                    "title": self.title,
                    "relevance_score": self.relevance_score,
                    "company_name": self.company_name
                }
            )
            
        except Exception as e:
            logger.error(
                "JobSearchDTO validation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "job_id": self.id if hasattr(self, 'id') else None
                },
                exc_info=True
            )
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert search DTO to dictionary for JSON serialization.
        
        Returns:
            Dict[str, Any]: Dictionary representation of search result
        
        Examples:
            >>> result_dto.to_dict()
            {'id': '123', 'title': 'Backend Developer', ...}
        """
        try:
            return {
                'id': self.id,
                'title': self.title,
                'description': self.description,
                'location': self.location,
                'remote_type': self.remote_type,
                'source_url': self.source_url,
                'created_at': self.created_at,
                'company_name': self.company_name,
                'company_website': self.company_website,
                'relevance_score': self.relevance_score
            }
        except Exception as e:
            logger.error(
                "Error converting JobSearchDTO to dict",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "job_id": self.id
                },
                exc_info=True
            )
            raise


# Export all DTOs
__all__ = ['JobDTO', 'JobSearchDTO']
