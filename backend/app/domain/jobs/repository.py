"""
Job domain repository protocols.

This module defines protocol interfaces (abstract contracts) for
repositories and gateways used in the job domain. These protocols
enable dependency inversion and testability by defining interfaces
that concrete implementations must satisfy.

Protocols:
- ICompanyRepository: Company data access operations
- IJobRepository: Job data access operations
- ISearchGateway: Job search operations

Design Pattern:
These use Python's Protocol type (structural subtyping) rather than
abstract base classes. This allows "duck typing" - any class implementing
the required methods automatically satisfies the protocol without
explicit inheritance.

Usage:
    def __init__(
        self,
        job_repo: IJobRepository,  # Any class with matching methods
        company_repo: ICompanyRepository,
        search_gateway: ISearchGateway
    ):
        ...

Notes:
- Protocols are intentionally minimal (just method signatures)
- No implementation details - that's for concrete classes
- Used for type hints and dependency injection
- Enables mocking in tests
"""
from __future__ import annotations

from typing import Optional, List, Tuple, Dict, Protocol
from uuid import UUID

from .dto import JobDTO


class ICompanyRepository(Protocol):
    """
    Protocol for company data access operations.
    
    This protocol defines the interface for repositories that manage
    company data. Implementations must provide these methods for
    company lookup and creation.
    
    Methods:
        get_id_by_name: Find company ID by name
        ensure_company: Get existing company or create new one
    
    Example Implementation:
        class PostgresCompanyRepository:
            def get_id_by_name(self, name: str) -> Optional[UUID]:
                # Query database for company by name
                ...
            
            def ensure_company(
                self,
                name: str,
                website: Optional[str],
                location: Optional[str]
            ) -> UUID:
                # Get existing or create new company
                ...
    """
    
    def get_id_by_name(self, name: str) -> Optional[UUID]:
        """
        Find company ID by name.
        
        Args:
            name: Company name to search for
        
        Returns:
            Optional[UUID]: Company ID if found, None otherwise
        
        Raises:
            Exception: If database query fails
        """
        ...
    
    def ensure_company(
        self,
        name: str,
        website: Optional[str],
        location: Optional[str]
    ) -> UUID:
        """
        Get existing company ID or create new company.
        
        This method ensures a company exists in the database. If a
        company with the given name exists, returns its ID. Otherwise,
        creates a new company record and returns the new ID.
        
        Args:
            name: Company name (required)
            website: Optional company website URL
            location: Optional company location
        
        Returns:
            UUID: Company ID (existing or newly created)
        
        Raises:
            ValueError: If name is empty or invalid
            Exception: If database operation fails
        """
        ...


class IJobRepository(Protocol):
    """
    Protocol for job data access operations.
    
    This protocol defines the interface for repositories that manage
    job data. Implementations must provide CRUD operations and user-
    scoped access controls.
    
    Methods:
        create: Create new job for user
        get_for_user_with_company: Get job with company details
        list_for_user: List jobs with pagination and filtering
        update_for_user: Update job for user
        delete_for_user_cascade: Delete job and related data
    
    Example Implementation:
        class PostgresJobRepository:
            def create(
                self,
                *,
                user_id: UUID,
                company_id: Optional[UUID],
                payload: Dict
            ) -> JobDTO:
                # Insert job record and return DTO
                ...
    """
    
    def create(
        self,
        *,
        user_id: UUID,
        company_id: Optional[UUID],
        payload: Dict
    ) -> JobDTO:
        """
        Create new job for user.
        
        Args:
            user_id: UUID of job owner
            company_id: Optional UUID of associated company
            payload: Job data dictionary with fields:
                - title: Job title (required)
                - location: Job location (optional)
                - description: Job description (optional)
                - requirements: List of requirements (optional)
                - skills: List of skills (optional)
                - etc.
        
        Returns:
            JobDTO: Created job data with generated ID
        
        Raises:
            ValueError: If payload is invalid
            Exception: If database insert fails
        """
        ...
    
    def get_for_user_with_company(
        self,
        job_id: UUID,
        user_id: UUID
    ) -> JobDTO:
        """
        Get job with company details for user.
        
        Retrieves job only if it belongs to the specified user.
        Includes joined company information if available.
        
        Args:
            job_id: UUID of job to retrieve
            user_id: UUID of job owner
        
        Returns:
            JobDTO: Job data with company details
        
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            Exception: If database query fails
        """
        ...
    
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
        List jobs for user with pagination and filtering.
        
        Args:
            user_id: UUID of job owner
            page: Page number (1-indexed)
            page_size: Number of items per page
            filters: Filter criteria dictionary:
                - company_name: Filter by company name
                - location: Filter by location
                - remote_type: Filter by remote type
                - job_type: Filter by employment type
                - etc.
            sort: Field to sort by (e.g., 'created_at', 'title')
            order: Sort order ('asc' or 'desc')
        
        Returns:
            Tuple[List[JobDTO], int]: (list of jobs, total count)
        
        Raises:
            ValueError: If pagination parameters are invalid
            Exception: If database query fails
        
        Notes:
            - Returns empty list if no jobs found
            - Total count includes all matching jobs (not just page)
        """
        ...
    
    def update_for_user(
        self,
        job_id: UUID,
        user_id: UUID,
        data: Dict
    ) -> JobDTO:
        """
        Update job for user.
        
        Updates only the fields provided in data dictionary.
        Job must belong to user.
        
        Args:
            job_id: UUID of job to update
            user_id: UUID of job owner
            data: Update data dictionary (partial updates supported)
        
        Returns:
            JobDTO: Updated job data
        
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            ValueError: If data is invalid
            Exception: If database update fails
        """
        ...
    
    def delete_for_user_cascade(
        self,
        job_id: UUID,
        user_id: UUID
    ) -> None:
        """
        Delete job and all related data for user.
        
        Cascades deletion to related entities:
        - Job applications
        - Job reminders
        - Job documents
        - etc.
        
        Args:
            job_id: UUID of job to delete
            user_id: UUID of job owner
        
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            Exception: If database delete fails
        
        Notes:
            - Soft delete vs hard delete depends on implementation
            - Related data should be deleted/archived appropriately
        """
        ...


class ISearchGateway(Protocol):
    """
    Protocol for job search operations.
    
    This protocol defines the interface for search gateways that enable
    full-text search and autocomplete for jobs. Implementations can use
    various search backends (Elasticsearch, PostgreSQL FTS, etc.).
    
    Methods:
        search_jobs: Full-text search for jobs
        count: Count matching jobs
        suggest: Autocomplete suggestions
    
    Example Implementation:
        class ElasticsearchSearchGateway:
            def search_jobs(
                self,
                *,
                query_text: str,
                limit: int,
                offset: int,
                filters: Dict
            ) -> List[dict]:
                # Query Elasticsearch and return results
                ...
    """
    
    def search_jobs(
        self,
        *,
        query_text: str,
        limit: int,
        offset: int,
        filters: Dict
    ) -> List[dict]:
        """
        Full-text search for jobs.
        
        Searches job titles, descriptions, company names, and other
        fields for matches to query text.
        
        Args:
            query_text: Search query string
            limit: Maximum number of results to return
            offset: Number of results to skip (for pagination)
            filters: Additional filter criteria:
                - location: Filter by location
                - remote_type: Filter by remote type
                - company_name: Filter by company
                - etc.
        
        Returns:
            List[dict]: List of matching job dictionaries with fields:
                - id: Job ID
                - title: Job title
                - description: Job description
                - company_name: Company name
                - relevance_score: Search relevance (0.0 to 1.0)
                - etc.
        
        Raises:
            ValueError: If query_text is empty or invalid
            Exception: If search operation fails
        
        Notes:
            - Results are sorted by relevance score
            - Empty query may return recent jobs
            - Supports fuzzy matching and synonyms
        """
        ...
    
    def count(
        self,
        query_text: str,
        filters: Dict
    ) -> int:
        """
        Count matching jobs for query.
        
        Args:
            query_text: Search query string
            filters: Filter criteria (same as search_jobs)
        
        Returns:
            int: Total number of matching jobs
        
        Raises:
            Exception: If count operation fails
        
        Notes:
            - Returns 0 if no matches found
            - Should be consistent with search_jobs results
        """
        ...
    
    def suggest(
        self,
        q: str,
        user_id: str
    ) -> List[str]:
        """
        Get autocomplete suggestions for query.
        
        Provides search suggestions based on job titles, company names,
        skills, and user's search history.
        
        Args:
            q: Partial query string (e.g., "soft eng")
            user_id: User ID for personalized suggestions
        
        Returns:
            List[str]: List of suggestion strings (e.g., ["Software Engineer", "Software Engineering Manager"])
        
        Raises:
            Exception: If suggest operation fails
        
        Notes:
            - Returns empty list if query too short
            - Suggestions ordered by relevance/popularity
            - May include user's recent searches
        """
        ...


# Export all protocols
__all__ = [
    'ICompanyRepository',
    'IJobRepository',
    'ISearchGateway',
]
