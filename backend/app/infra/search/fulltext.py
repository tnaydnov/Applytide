"""
PostgreSQL Full-Text Search Service

This module provides full-text search functionality using PostgreSQL's built-in
text search capabilities with tsvector and tsquery.

Features:
    - Full-text search across job titles and descriptions
    - Relevance ranking using ts_rank
    - Filter support (user, location, remote_type, company)
    - Query suggestions based on job titles
    - SQL injection prevention with parameterized queries
    
Constants:
    MAX_QUERY_LENGTH: Maximum search query length (500 chars)
    MAX_FILTER_VALUE_LENGTH: Maximum filter value length (500 chars)
    MAX_SEARCH_LIMIT: Maximum search results per query (1000)
    MAX_SUGGEST_LIMIT: Maximum suggestions per query (50)
    MIN_SUGGEST_QUERY_LENGTH: Minimum query length for suggestions (2 chars)
    MIN_WORD_LENGTH: Minimum word length for suggestions (3 chars)
    
Exception Hierarchy:
    FullTextSearchError (base)
    ├── ValidationError
    ├── DatabaseOperationError
    └── QuerySanitizationError

Usage:
    from app.infra.search.fulltext import search_service
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    
    # Search with filters
    results = search_service.search_jobs(
        db=db,
        query_text="python developer",
        limit=20,
        offset=0,
        filters={
            "user_id": "uuid-here",
            "location": "Remote",
            "remote_type": "full"
        }
    )
    
    # Count results
    count = search_service.count_search_results(
        db=db,
        query_text="python developer",
        filters={"user_id": "uuid-here"}
    )
    
    # Get suggestions
    suggestions = search_service.suggest_search_terms(
        db=db,
        partial_query="pytho",
        limit=5,
        user_id="uuid-here"
    )
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, DatabaseError
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration Constants
MAX_QUERY_LENGTH = 500
MAX_FILTER_VALUE_LENGTH = 500
MAX_SEARCH_LIMIT = 1000
MAX_SUGGEST_LIMIT = 50
MIN_SUGGEST_QUERY_LENGTH = 2
MIN_WORD_LENGTH = 3
DEFAULT_SEARCH_LIMIT = 20
DEFAULT_SUGGEST_LIMIT = 5

# Stop words for suggestions
STOP_WORDS = {
    'and', 'the', 'for', 'with', 'from', 'this', 'that',
    'you', 'are', 'not', 'but', 'can', 'will', 'all', 'any'
}

# ==================== Exception Classes ====================

class FullTextSearchError(Exception):
    """Base exception for full-text search operations"""
    pass

class ValidationError(FullTextSearchError):
    """Raised when input validation fails"""
    pass

class DatabaseOperationError(FullTextSearchError):
    """Raised when database operation fails"""
    pass

class QuerySanitizationError(FullTextSearchError):
    """Raised when query sanitization fails"""
    pass

# ==================== Validation Functions ====================

def _validate_query_text(query_text: str) -> None:
    """Validate search query text"""
    if not query_text:
        raise ValidationError("Query text is required")
    if len(query_text) > MAX_QUERY_LENGTH:
        raise ValidationError(f"Query text too long (max {MAX_QUERY_LENGTH} chars)")
    # Check for SQL injection attempts
    if any(keyword in query_text.lower() for keyword in ['drop ', 'delete ', 'insert ', 'update ', '--', ';']):
        raise QuerySanitizationError("Query contains potentially unsafe SQL keywords")

def _validate_filter_value(value: Any, field_name: str) -> None:
    """Validate filter value"""
    if value is None:
        return
    if isinstance(value, str) and len(value) > MAX_FILTER_VALUE_LENGTH:
        raise ValidationError(f"{field_name} filter too long (max {MAX_FILTER_VALUE_LENGTH} chars)")

def _validate_pagination(limit: int, offset: int) -> None:
    """Validate pagination parameters"""
    if limit < 1:
        raise ValidationError(f"Limit must be >= 1, got {limit}")
    if limit > MAX_SEARCH_LIMIT:
        raise ValidationError(f"Limit must be <= {MAX_SEARCH_LIMIT}, got {limit}")
    if offset < 0:
        raise ValidationError(f"Offset must be >= 0, got {offset}")

def _validate_suggest_params(partial_query: str, limit: int) -> None:
    """Validate suggestion parameters"""
    if len(partial_query or "") < MIN_SUGGEST_QUERY_LENGTH:
        raise ValidationError(f"Query must be at least {MIN_SUGGEST_QUERY_LENGTH} chars for suggestions")
    if len(partial_query) > MAX_QUERY_LENGTH:
        raise ValidationError(f"Query too long (max {MAX_QUERY_LENGTH} chars)")
    if limit < 1 or limit > MAX_SUGGEST_LIMIT:
        raise ValidationError(f"Limit must be between 1 and {MAX_SUGGEST_LIMIT}")

def _sanitize_query_text(query_text: str) -> str:
    """Sanitize query text for safe use"""
    # Remove leading/trailing whitespace
    sanitized = query_text.strip()
    # Remove multiple spaces
    sanitized = ' '.join(sanitized.split())
    return sanitized

def _escape_like(value: str) -> str:
    """Escape LIKE/ILIKE metacharacters (%, _) for safe use in LIKE patterns."""
    return value.replace('%', '\\%').replace('_', '\\_')

# ==================== Full-Text Search Service ====================

# ==================== Full-Text Search Service ====================

class FullTextSearchService:
    """
    PostgreSQL full-text search service
    
    Uses PostgreSQL's tsvector and tsquery for text search with relevance ranking.
    All queries are parameterized to prevent SQL injection.
    """
    
    @staticmethod
    def search_jobs(
        db: Session,
        query_text: str,
        limit: int = DEFAULT_SEARCH_LIMIT,
        offset: int = 0,
        filters: Dict[str, Any] | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Search jobs using full-text search
        
        Args:
            db: Database session
            query_text: Search query (searches title and description)
            limit: Maximum results to return
            offset: Number of results to skip
            filters: Optional filters:
                - user_id: Filter by user
                - location: Filter by location (LIKE match)
                - remote_type: Filter by remote type (exact match)
                - company: Filter by company name (LIKE match)
                
        Returns:
            List of job dictionaries with relevance scores
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If query fails
            
        Notes:
            - Uses plainto_tsquery for simple query syntax
            - Results ordered by relevance score then creation date
            - Empty query returns empty list
        """
        try:
            # Validate inputs
            if not query_text or not query_text.strip():
                logger.debug("Empty search query provided")
                return []
                
            _validate_query_text(query_text)
            _validate_pagination(limit, offset)
            
            if filters:
                for key in ['location', 'remote_type', 'company', 'user_id']:
                    if key in filters:
                        _validate_filter_value(filters[key], key)
            
            sanitized_query = _sanitize_query_text(query_text)
            
            logger.debug(
                f"Searching jobs with query: '{sanitized_query}'",
                extra={"query": sanitized_query, "limit": limit, "offset": offset, "filters": filters}
            )
            
            base_query = """
                SELECT
                    j.id, j.title, j.description, j.location, j.remote_type, j.source_url, j.created_at,
                    c.name AS company_name, c.website AS company_website,
                    ts_rank(
                        to_tsvector('english', j.title || ' ' || COALESCE(j.description, '')),
                        plainto_tsquery('english', :query)
                    ) AS relevance_score
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, ''))
                      @@ plainto_tsquery('english', :query)
            """
            
            params: Dict[str, Any] = {"query": sanitized_query}
            
            # Apply filters with parameterized queries
            if filters:
                if filters.get("user_id"):
                    base_query += " AND j.user_id = :user_id"
                    params["user_id"] = filters["user_id"]
                if filters.get("location"):
                    base_query += " AND j.location ILIKE :location"
                    params["location"] = f"%{_escape_like(filters['location'])}%"
                if filters.get("remote_type"):
                    base_query += " AND j.remote_type = :remote_type"
                    params["remote_type"] = filters["remote_type"]
                if filters.get("company"):
                    base_query += " AND c.name ILIKE :company"
                    params["company"] = f"%{_escape_like(filters['company'])}%"
                    
            base_query += " ORDER BY relevance_score DESC, j.created_at DESC LIMIT :limit OFFSET :offset"
            params.update({"limit": limit, "offset": offset})
            
            result = db.execute(text(base_query), params)
            
            results = [
                {
                    "id": str(row.id),
                    "title": row.title,
                    "description": row.description,
                    "location": row.location,
                    "remote_type": row.remote_type,
                    "source_url": row.source_url,
                    "created_at": row.created_at.isoformat(),
                    "company_name": row.company_name,
                    "company_website": row.company_website,
                    "relevance_score": float(row.relevance_score or 0),
                }
                for row in result
            ]
            
            logger.info(
                f"Search returned {len(results)} results",
                extra={"query": sanitized_query, "count": len(results)}
            )
            
            return results
            
        except (SQLAlchemyError, DatabaseError) as e:
            logger.error(f"Database error during search: {e}", exc_info=True)
            raise DatabaseOperationError(f"Search failed: {str(e)}")

    @staticmethod
    def count_search_results(db: Session, query_text: str, filters: Dict[str, Any] | None = None) -> int:
        """
        Count matching search results
        
        Args:
            db: Database session
            query_text: Search query
            filters: Optional filters (same as search_jobs)
            
        Returns:
            Count of matching jobs
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If query fails
            
        Notes:
            - Uses same query logic as search_jobs
            - Empty query returns 0
        """
        try:
            if not query_text or not query_text.strip():
                logger.debug("Empty count query provided")
                return 0
                
            _validate_query_text(query_text)
            
            if filters:
                for key in ['location', 'remote_type', 'company', 'user_id']:
                    if key in filters:
                        _validate_filter_value(filters[key], key)
            
            sanitized_query = _sanitize_query_text(query_text)
            
            logger.debug(
                f"Counting search results for query: '{sanitized_query}'",
                extra={"query": sanitized_query, "filters": filters}
            )
            
            base_query = """
                SELECT COUNT(*)
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, ''))
                      @@ plainto_tsquery('english', :query)
            """
            
            params: Dict[str, Any] = {"query": sanitized_query}
            
            # Apply same filters as search
            if filters:
                if filters.get("user_id"):
                    base_query += " AND j.user_id = :user_id"
                    params["user_id"] = filters["user_id"]
                if filters.get("location"):
                    base_query += " AND j.location ILIKE :location"
                    params["location"] = f"%{_escape_like(filters['location'])}%"
                if filters.get("remote_type"):
                    base_query += " AND j.remote_type = :remote_type"
                    params["remote_type"] = filters["remote_type"]
                if filters.get("company"):
                    base_query += " AND c.name ILIKE :company"
                    params["company"] = f"%{_escape_like(filters['company'])}%"
                    
            result = db.execute(text(base_query), params)
            count = int(result.scalar() or 0)
            
            logger.debug(f"Count result: {count}", extra={"query": sanitized_query, "count": count})
            return count
            
        except (SQLAlchemyError, DatabaseError) as e:
            logger.error(f"Database error during count: {e}", exc_info=True)
            raise DatabaseOperationError(f"Count failed: {str(e)}")

    @staticmethod
    def suggest_search_terms(db: Session, partial_query: str, limit: int = DEFAULT_SUGGEST_LIMIT, user_id: Optional[str] = None) -> List[str]:
        """
        Suggest search terms based on partial query
        
        Args:
            db: Database session
            partial_query: Partial search query (min 2 chars)
            limit: Maximum suggestions to return
            user_id: Optional user ID to filter by user's jobs
            
        Returns:
            List of suggested search terms ordered by frequency
            
        Raises:
            ValidationError: If inputs are invalid
            DatabaseOperationError: If query fails
            
        Notes:
            - Searches job titles only
            - Filters out stop words
            - Returns words >= 3 chars
            - Case insensitive
        """
        try:
            if len(partial_query or "") < MIN_SUGGEST_QUERY_LENGTH:
                logger.debug(f"Query too short for suggestions: '{partial_query}'")
                return []
                
            _validate_suggest_params(partial_query, limit)
            
            sanitized_query = _sanitize_query_text(partial_query)
            
            logger.debug(
                f"Getting suggestions for query: '{sanitized_query}'",
                extra={"query": sanitized_query, "limit": limit, "user_id": user_id}
            )
            
            # Build stop words as parameterized array to avoid SQL injection
            user_clause = "AND j.user_id = :user_id" if user_id else ""
            
            # Generate named params for stop words (:sw_0, :sw_1, ...)
            sw_params = {f"sw_{i}": w for i, w in enumerate(STOP_WORDS)}
            sw_placeholders = ", ".join(f":{k}" for k in sw_params)
            
            query = f"""
                SELECT DISTINCT word, COUNT(*) AS frequency
                FROM (
                    SELECT unnest(string_to_array(lower(j.title), ' ')) AS word
                    FROM jobs j
                    WHERE j.title ILIKE :partial
                    {user_clause}
                ) words
                WHERE length(word) >= :min_word_length
                  AND word NOT IN ({sw_placeholders})
                GROUP BY word
                ORDER BY frequency DESC, word
                LIMIT :limit
            """
            
            params: Dict[str, Any] = {
                "partial": f"%{_escape_like(sanitized_query)}%",
                "limit": limit,
                "min_word_length": MIN_WORD_LENGTH,
                **sw_params,
            }
            if user_id:
                params["user_id"] = user_id
                
            result = db.execute(text(query), params)
            suggestions = [row.word for row in result]
            
            logger.debug(
                f"Returned {len(suggestions)} suggestions",
                extra={"query": sanitized_query, "count": len(suggestions)}
            )
            
            return suggestions
            
        except (SQLAlchemyError, DatabaseError) as e:
            logger.error(f"Database error during suggestions: {e}", exc_info=True)
            raise DatabaseOperationError(f"Suggestions failed: {str(e)}")


# Global service instance
search_service = FullTextSearchService()

