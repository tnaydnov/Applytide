"""
Search Gateway Module

This module provides a gateway interface to the job search service,
delegating search operations to the underlying fulltext search implementation.

Features:
    - Job search with filtering and pagination
    - Result counting for pagination
    - Search term suggestions
    - Comprehensive error handling
    - Detailed logging for search operations

Implements ISearchGateway port for domain layer.

Constants:
    MAX_LIMIT: Maximum search results per query (100)
    MAX_OFFSET: Maximum pagination offset (10000)
    MAX_QUERY_LENGTH: Maximum query text length (500 characters)

Example:
    >>> from app.infra.search.search_gateway import SearchGateway
    >>> 
    >>> gateway = SearchGateway(db_session)
    >>> results = gateway.search_jobs(
    ...     query_text="python engineer",
    ...     limit=10,
    ...     offset=0,
    ...     filters={"location": "Remote"}
    ... )
    >>> print(len(results))
    10
"""

from __future__ import annotations
import logging
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ...infra.search.fulltext import search_service
from ...domain.jobs.repository import ISearchGateway

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class SearchGatewayError(Exception):
    """Base exception for search gateway operations"""
    pass

class ValidationError(SearchGatewayError):
    """Exception raised when input validation fails"""
    pass

class SearchOperationError(SearchGatewayError):
    """Exception raised when search operation fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# Search pagination limits
MAX_LIMIT = 100
MAX_OFFSET = 10000

# Query constraints
MAX_QUERY_LENGTH = 500
MAX_USER_ID_LENGTH = 100

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_query_text(query_text: str) -> None:
    """Validate search query text."""
    if not isinstance(query_text, str):
        raise ValidationError(f"query_text must be string, got {type(query_text).__name__}")
    
    if len(query_text) > MAX_QUERY_LENGTH:
        raise ValidationError(
            f"query_text too long ({len(query_text)} chars, max {MAX_QUERY_LENGTH})"
        )

def _validate_pagination(limit: int, offset: int) -> None:
    """Validate pagination parameters."""
    if not isinstance(limit, int):
        raise ValidationError(f"limit must be int, got {type(limit).__name__}")
    
    if not isinstance(offset, int):
        raise ValidationError(f"offset must be int, got {type(offset).__name__}")
    
    if limit < 1:
        raise ValidationError(f"limit must be >= 1, got {limit}")
    
    if limit > MAX_LIMIT:
        raise ValidationError(f"limit must be <= {MAX_LIMIT}, got {limit}")
    
    if offset < 0:
        raise ValidationError(f"offset must be >= 0, got {offset}")
    
    if offset > MAX_OFFSET:
        raise ValidationError(f"offset must be <= {MAX_OFFSET}, got {offset}")

def _validate_filters(filters: Dict) -> None:
    """Validate filters dictionary."""
    if not isinstance(filters, dict):
        raise ValidationError(f"filters must be dict, got {type(filters).__name__}")

def _validate_user_id(user_id: str) -> None:
    """Validate user ID string."""
    if not isinstance(user_id, str):
        raise ValidationError(f"user_id must be string, got {type(user_id).__name__}")
    
    if len(user_id) > MAX_USER_ID_LENGTH:
        raise ValidationError(
            f"user_id too long ({len(user_id)} chars, max {MAX_USER_ID_LENGTH})"
        )

# ============================================================================
# Gateway Implementation
# ============================================================================

class SearchGateway(ISearchGateway):
    """
    Gateway to job search service.
    
    Provides interface to underlying fulltext search service with validation,
    error handling, and logging.
    """
    
    def __init__(self, db: Session):
        """
        Initialize search gateway with database session.
        
        Args:
            db: SQLAlchemy session for search operations
            
        Raises:
            ValidationError: If db is not a Session
        """
        if not isinstance(db, Session):
            raise ValidationError(f"db must be SQLAlchemy Session, got {type(db).__name__}")
        
        self.db = db
        logger.debug("Initialized SearchGateway")
    
    def search_jobs(
        self,
        *,
        query_text: str,
        limit: int,
        offset: int,
        filters: Dict
    ) -> List[dict]:
        """
        Search for jobs matching query and filters.
        
        Args:
            query_text: Search query string (e.g., "python engineer")
            limit: Maximum results to return (1-MAX_LIMIT)
            offset: Number of results to skip for pagination (0-MAX_OFFSET)
            filters: Dictionary of filter criteria (e.g., {"location": "Remote"})
            
        Returns:
            List of job dictionaries matching search criteria
            
        Raises:
            ValidationError: If parameters are invalid
            SearchOperationError: If search operation fails
            
        Example:
            >>> gateway = SearchGateway(db)
            >>> results = gateway.search_jobs(
            ...     query_text="software engineer",
            ...     limit=20,
            ...     offset=0,
            ...     filters={"location": "New York", "remote": True}
            ... )
            >>> print(len(results))
            20
            
        Notes:
            - Returns empty list if no results found
            - Results are ordered by relevance score
            - Filters are AND-combined with query text
        """
        try:
            # Validate inputs
            _validate_query_text(query_text)
            _validate_pagination(limit, offset)
            _validate_filters(filters)
            
            logger.debug(
                "Searching jobs",
                extra={
                    "query_text": query_text[:100],
                    "limit": limit,
                    "offset": offset,
                    "filter_keys": list(filters.keys()),
                }
            )
            
            # Delegate to search service
            try:
                results = search_service.search_jobs(
                    db=self.db,
                    query_text=query_text,
                    limit=limit,
                    offset=offset,
                    filters=filters
                )
            except Exception as e:
                logger.error(
                    "Job search failed",
                    exc_info=True,
                    extra={
                        "query_text": query_text[:100],
                        "limit": limit,
                        "offset": offset,
                        "error": str(e),
                    }
                )
                raise SearchOperationError(f"Job search failed: {e}") from e
            
            logger.info(
                "Job search complete",
                extra={
                    "query_text": query_text[:100],
                    "limit": limit,
                    "offset": offset,
                    "result_count": len(results),
                }
            )
            
            return results
            
        except (ValidationError, SearchOperationError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in search_jobs",
                exc_info=True,
                extra={
                    "query_text": query_text if isinstance(query_text, str) else None,
                    "error": str(e),
                }
            )
            raise SearchOperationError(f"Job search failed: {e}") from e
    
    def count(self, query_text: str, filters: Dict) -> int:
        """
        Count jobs matching query and filters.
        
        Args:
            query_text: Search query string
            filters: Dictionary of filter criteria
            
        Returns:
            Total count of matching jobs
            
        Raises:
            ValidationError: If parameters are invalid
            SearchOperationError: If count operation fails
            
        Example:
            >>> gateway = SearchGateway(db)
            >>> total = gateway.count(
            ...     query_text="data scientist",
            ...     filters={"location": "Remote"}
            ... )
            >>> print(f"Found {total} matching jobs")
            Found 156 matching jobs
            
        Notes:
            - Returns 0 if no results found
            - More efficient than fetching all results
            - Used for pagination calculation
        """
        try:
            # Validate inputs
            _validate_query_text(query_text)
            _validate_filters(filters)
            
            logger.debug(
                "Counting search results",
                extra={
                    "query_text": query_text[:100],
                    "filter_keys": list(filters.keys()),
                }
            )
            
            # Delegate to search service
            try:
                count = search_service.count_search_results(
                    self.db,
                    query_text,
                    filters
                )
            except Exception as e:
                logger.error(
                    "Search count failed",
                    exc_info=True,
                    extra={
                        "query_text": query_text[:100],
                        "error": str(e),
                    }
                )
                raise SearchOperationError(f"Search count failed: {e}") from e
            
            logger.info(
                "Search count complete",
                extra={
                    "query_text": query_text[:100],
                    "count": count,
                }
            )
            
            return count
            
        except (ValidationError, SearchOperationError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in count",
                exc_info=True,
                extra={
                    "query_text": query_text if isinstance(query_text, str) else None,
                    "error": str(e),
                }
            )
            raise SearchOperationError(f"Search count failed: {e}") from e
    
    def suggest(self, q: str, user_id: str) -> List[str]:
        """
        Get search term suggestions for partial query.
        
        Args:
            q: Partial query string for suggestions
            user_id: User ID for personalized suggestions
            
        Returns:
            List of suggested search terms
            
        Raises:
            ValidationError: If parameters are invalid
            SearchOperationError: If suggestion operation fails
            
        Example:
            >>> gateway = SearchGateway(db)
            >>> suggestions = gateway.suggest(q="soft", user_id="user_123")
            >>> print(suggestions)
            ['software engineer', 'software developer', 'software architect']
            
        Notes:
            - Returns empty list if no suggestions
            - Suggestions may be personalized based on user history
            - Typically used for autocomplete/typeahead
        """
        try:
            # Validate inputs
            _validate_query_text(q)
            _validate_user_id(user_id)
            
            logger.debug(
                "Getting search suggestions",
                extra={
                    "query": q[:100],
                    "user_id": user_id,
                }
            )
            
            # Delegate to search service
            try:
                suggestions = search_service.suggest_search_terms(
                    self.db,
                    q,
                    user_id=user_id
                )
            except Exception as e:
                logger.error(
                    "Search suggestions failed",
                    exc_info=True,
                    extra={
                        "query": q[:100],
                        "user_id": user_id,
                        "error": str(e),
                    }
                )
                raise SearchOperationError(f"Search suggestions failed: {e}") from e
            
            logger.info(
                "Search suggestions complete",
                extra={
                    "query": q[:100],
                    "user_id": user_id,
                    "suggestion_count": len(suggestions),
                }
            )
            
            return suggestions
            
        except (ValidationError, SearchOperationError):
            raise
        except Exception as e:
            logger.error(
                "Unexpected error in suggest",
                exc_info=True,
                extra={
                    "query": q if isinstance(q, str) else None,
                    "user_id": user_id if isinstance(user_id, str) else None,
                    "error": str(e),
                }
            )
            raise SearchOperationError(f"Search suggestions failed: {e}") from e
