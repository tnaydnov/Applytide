"""
Pagination Utilities Module

Provides comprehensive pagination utilities for consistent API responses across
all endpoints. Handles query pagination, filtering, sorting, and response formatting.

Key Features:
- Type-safe generic pagination responses
- SQLAlchemy query pagination with offset/limit
- Search filtering across multiple fields
- Configurable sorting with field validation
- Consistent metadata (total, pages, has_next/prev)
- Protection against excessive page sizes

Dependencies:
- Pydantic for validated parameter models
- SQLAlchemy for database query manipulation
- Type hints for static type checking

Usage:
    # Use PaginationParams for request validation
    params = PaginationParams(page=1, page_size=20, q="search", sort="created_at")
    
    # Apply pagination to query
    result = paginate_query(query, params, db_session=db)
    
    # Return typed response
    return PaginatedResponse[MyModel](**result)
"""
from __future__ import annotations
from typing import TypeVar, Generic, List, Any, Dict
from pydantic import BaseModel, Field
from sqlalchemy.orm import Query
from math import ceil

from ...infra.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")

class PaginationParams(BaseModel):
    """
    Pagination and filtering parameters for list endpoints.
    
    Provides validated pagination, search, and sorting parameters with
    sensible defaults and constraints.
    
    Attributes:
        page: Page number (1-indexed, default: 1, minimum: 1)
        page_size: Items per page (default: 20, range: 1-100)
        q: Search query string (default: empty, case-insensitive)
        sort: Field name to sort by (default: "created_at")
        order: Sort direction "asc" or "desc" (default: "desc")
    
    Notes:
        - Extra fields allowed for additional filter parameters
        - Page size automatically capped at 100 to prevent performance issues
        - Invalid page numbers normalized to minimum valid value
        - Search query trimmed of leading/trailing whitespace
    
    Example:
        params = PaginationParams(
            page=2,
            page_size=50,
            q="python",
            sort="title",
            order="asc"
        )
    """
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    q: str = Field(default="", description="Search query string")
    sort: str = Field(default="created_at", description="Sort field name")
    order: str = Field(default="desc", description="Sort order (asc/desc)")

    class Config:
        extra = "allow"  # Allow additional filter parameters for endpoint-specific filters

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response container.
    
    Type-safe container for paginated API responses with comprehensive metadata.
    Supports any Pydantic model type through Generic[T].
    
    Attributes:
        items: List of items for current page (type T)
        total: Total number of items across all pages
        page: Current page number (1-indexed)
        page_size: Number of items per page
        pages: Total number of pages
        has_next: Boolean indicating if next page exists
        has_prev: Boolean indicating if previous page exists
    
    Type Parameters:
        T: Type of items in the list (must be a Pydantic model)
    
    Notes:
        - Empty results return items=[], total=0, pages=1
        - has_next/has_prev useful for pagination UI
        - Type safety ensures items match declared response model
        - Consistent across all paginated endpoints
    
    Example:
        response = PaginatedResponse[JobOut](
            items=[job1, job2],
            total=100,
            page=1,
            page_size=20,
            pages=5,
            has_next=True,
            has_prev=False
        )
    """
    items: List[T]
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Items per page")
    pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether next page exists")
    has_prev: bool = Field(description="Whether previous page exists")

def paginate_query(query, params: PaginationParams, total_query=None, db_session=None) -> Dict[str, Any]:
    """
    Paginate a SQLAlchemy query and return pagination metadata.
    
    Applies offset/limit pagination to SQLAlchemy queries and calculates
    comprehensive pagination metadata. Supports both legacy Query API and
    modern Select statements.
    
    Args:
        query: SQLAlchemy Query or Select statement to paginate
        params: Validated pagination parameters
        total_query: Optional separate query for total count (performance optimization)
        db_session: Database session (required for Select statements)
    
    Returns:
        dict: Pagination result containing:
            - items: List of query results for current page
            - total: Total number of items
            - page: Current page number
            - page_size: Items per page
            - pages: Total number of pages
            - has_next: Boolean indicating next page availability
            - has_prev: Boolean indicating previous page availability
    
    Raises:
        Exception: If count query fails or pagination execution fails
    
    Notes:
        - Page numbers normalized (minimum 1)
        - Page size capped at 100 for performance
        - Empty results return total=0, pages=1
        - Handles both Query and Select statement types
        - Separate count query improves performance for complex queries
        - Logs warnings for potential performance issues
    
    Performance:
        - For complex queries, provide separate total_query for better performance
        - Count queries executed without ORDER BY for efficiency
        - Offset/limit applied after filtering and sorting
    
    Example:
        params = PaginationParams(page=1, page_size=20)
        result = paginate_query(
            query=db.query(Job).filter(Job.user_id == user_id),
            params=params,
            db_session=db
        )
        return PaginatedResponse[JobOut](**result)
    """
    try:
        # Normalize pagination parameters
        page = max(1, params.page)
        page_size = min(100, max(1, params.page_size))  # cap at 100
        
        logger.debug(
            "Paginating query",
            extra={
                "page": page,
                "page_size": page_size,
                "has_total_query": total_query is not None
            }
        )

        # Calculate total count
        if total_query is not None:
            try:
                if isinstance(total_query, Query):
                    total = total_query.scalar() or 0
                else:
                    total = db_session.execute(total_query).scalar() or 0
            except Exception as e:
                logger.error(
                    "Error executing total count query",
                    extra={"error": str(e)},
                    exc_info=True
                )
                raise
        else:
            try:
                if isinstance(query, Query):
                    total = query.count()
                else:
                    # Modern Select API - need to build count query
                    from sqlalchemy import func, select
                    count_query = select(func.count()).select_from(query.order_by(None).subquery())
                    total = db_session.execute(count_query).scalar() or 0
            except Exception as e:
                logger.error(
                    "Error calculating total count",
                    extra={"error": str(e)},
                    exc_info=True
                )
                raise

        # Calculate pagination metadata
        pages = ceil(total / page_size) if total > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        offset = (page - 1) * page_size

        # Log warning for large offsets (potential performance issue)
        if offset > 10000:
            logger.warning(
                "Large pagination offset detected",
                extra={
                    "offset": offset,
                    "page": page,
                    "page_size": page_size,
                    "total": total
                }
            )

        # Execute paginated query
        try:
            if isinstance(query, Query):
                items = query.offset(offset).limit(page_size).all()
            else:
                paginated_query = query.offset(offset).limit(page_size)
                items = db_session.execute(paginated_query).scalars().all()
        except Exception as e:
            logger.error(
                "Error executing paginated query",
                extra={
                    "offset": offset,
                    "limit": page_size,
                    "error": str(e)
                },
                exc_info=True
            )
            raise

        logger.debug(
            "Pagination successful",
            extra={
                "items_count": len(items),
                "total": total,
                "pages": pages
            }
        )

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }
    
    except Exception as e:
        logger.error(
            "Pagination failed",
            extra={
                "page": params.page,
                "page_size": params.page_size,
                "error": str(e)
            },
            exc_info=True
        )
        raise

def apply_search_filter(query: Query, model_class, search_term: str, search_fields: List[str]):
    """
    Apply case-insensitive search filter across multiple fields.
    
    Adds WHERE clause with OR conditions for partial matching across specified
    fields. Uses ILIKE for case-insensitive partial matching.
    
    Args:
        query: SQLAlchemy Query to filter
        model_class: SQLAlchemy model class containing search fields
        search_term: Search string to match (partial matching with wildcards)
        search_fields: List of field names to search across
    
    Returns:
        Query: Modified query with search filter applied
    
    Notes:
        - Returns unmodified query if search_term empty or search_fields empty
        - Uses ILIKE for case-insensitive matching (PostgreSQL)
        - Wraps search term with wildcards (%term%) for partial matching
        - Combines multiple field conditions with OR
        - Skips invalid field names gracefully
        - Search across text fields only (numeric fields ignored)
    
    Performance:
        - May not use indexes effectively (full table scan)
        - Consider full-text search for large datasets
        - Multiple ILIKE conditions can be slow
    
    Example:
        query = db.query(Job)
        query = apply_search_filter(
            query,
            Job,
            "python developer",
            ["title", "description", "company_name"]
        )
        # Results: Jobs where title, description, or company_name contains "python developer"
    """
    if not search_term or not search_fields:
        logger.debug("Skipping search filter - empty search term or no search fields")
        return query
    
    try:
        search_term = search_term.strip()
        if not search_term:
            return query
        
        logger.debug(
            "Applying search filter",
            extra={
                "search_term": search_term,
                "search_fields": search_fields,
                "model": model_class.__name__
            }
        )
        
        search_conditions = []
        for field_name in search_fields:
            field = getattr(model_class, field_name, None)
            if field is not None:
                search_conditions.append(field.ilike(f"%{search_term}%"))
            else:
                logger.warning(
                    "Search field not found on model",
                    extra={
                        "field_name": field_name,
                        "model": model_class.__name__
                    }
                )
        
        if search_conditions:
            from sqlalchemy import or_
            query = query.filter(or_(*search_conditions))
            logger.debug(
                "Search filter applied",
                extra={"conditions_count": len(search_conditions)}
            )
        else:
            logger.warning(
                "No valid search fields found",
                extra={
                    "search_fields": search_fields,
                    "model": model_class.__name__
                }
            )
        
        return query
    
    except Exception as e:
        logger.error(
            "Error applying search filter",
            extra={
                "search_term": search_term,
                "search_fields": search_fields,
                "model": model_class.__name__,
                "error": str(e)
            },
            exc_info=True
        )
        # Return unmodified query on error (graceful degradation)
        return query

def apply_sorting(query: Query, model_class, sort_field: str, order: str = "desc"):
    """
    Apply sorting to query with field validation and fallback.
    
    Adds ORDER BY clause to query with specified field and direction. Falls back
    to created_at if specified field doesn't exist.
    
    Args:
        query: SQLAlchemy Query to sort
        model_class: SQLAlchemy model class containing sort field
        sort_field: Name of field to sort by
        order: Sort direction - "asc" or "desc" (default: "desc")
    
    Returns:
        Query: Modified query with sorting applied
    
    Notes:
        - Falls back to "created_at" if sort_field invalid
        - Falls back to no sorting if neither field exists
        - Order normalized to lowercase for comparison
        - Invalid order values treated as "desc"
        - Logs warnings for invalid fields
    
    Security:
        - Field name validated against model class (no SQL injection)
        - Only allows sorting by existing model attributes
    
    Example:
        query = db.query(Job)
        query = apply_sorting(query, Job, "title", "asc")
        # Results sorted by title ascending
    """
    try:
        logger.debug(
            "Applying sorting",
            extra={
                "sort_field": sort_field,
                "order": order,
                "model": model_class.__name__
            }
        )
        
        # Normalize order
        order = order.lower() if order else "desc"
        
        # Get sort field with fallback to created_at
        field = getattr(model_class, sort_field, None)
        
        if field is None:
            logger.warning(
                "Sort field not found, trying fallback to created_at",
                extra={
                    "sort_field": sort_field,
                    "model": model_class.__name__
                }
            )
            field = getattr(model_class, "created_at", None)
            
        if field is not None:
            if order == "asc":
                query = query.order_by(field.asc())
            else:
                query = query.order_by(field.desc())
            
            logger.debug(
                "Sorting applied",
                extra={
                    "field": field.key if hasattr(field, 'key') else str(field),
                    "order": order
                }
            )
        else:
            logger.warning(
                "No sortable field found (including created_at fallback)",
                extra={
                    "requested_field": sort_field,
                    "model": model_class.__name__
                }
            )
        
        return query
    
    except Exception as e:
        logger.error(
            "Error applying sorting",
            extra={
                "sort_field": sort_field,
                "order": order,
                "model": model_class.__name__,
                "error": str(e)
            },
            exc_info=True
        )
        # Return unmodified query on error (graceful degradation)
        return query
