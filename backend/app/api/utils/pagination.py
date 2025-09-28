"""Pagination utilities for consistent API responses"""
from typing import TypeVar, Generic, List, Any, Dict
from pydantic import BaseModel
from sqlalchemy.orm import Query
from math import ceil

T = TypeVar("T")

class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
    q: str = ""
    sort: str = "created_at"
    order: str = "desc"  # asc or desc

    class Config:
        extra = "allow"  # Allow additional filter parameters

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int
    has_next: bool
    has_prev: bool

def paginate_query(query, params: PaginationParams, total_query=None, db_session=None) -> Dict[str, Any]:
    """Paginate a SQLAlchemy query and return pagination metadata."""
    page = max(1, params.page)
    page_size = min(100, max(1, params.page_size))  # cap at 100

    # total count
    if total_query is not None:
        if isinstance(total_query, Query):
            total = total_query.scalar() or 0
        else:
            total = db_session.execute(total_query).scalar() or 0
    else:
        if isinstance(query, Query):
            total = query.count()
        else:
            from sqlalchemy import func, select
            count_query = select(func.count()).select_from(query.order_by(None).subquery())
            total = db_session.execute(count_query).scalar() or 0

    pages = ceil(total / page_size) if total > 0 else 1
    has_next = page < pages
    has_prev = page > 1
    offset = (page - 1) * page_size

    if isinstance(query, Query):
        items = query.offset(offset).limit(page_size).all()
    else:
        paginated_query = query.offset(offset).limit(page_size)
        items = db_session.execute(paginated_query).scalars().all()

    return {
        "items": items, "total": total, "page": page, "page_size": page_size,
        "pages": pages, "has_next": has_next, "has_prev": has_prev,
    }

def apply_search_filter(query: Query, model_class, search_term: str, search_fields: List[str]):
    if not search_term or not search_fields:
        return query
    search_conditions = []
    for field_name in search_fields:
        field = getattr(model_class, field_name, None)
        if field is not None:
            search_conditions.append(field.ilike(f"%{search_term}%"))
    if search_conditions:
        from sqlalchemy import or_
        query = query.filter(or_(*search_conditions))
    return query

def apply_sorting(query: Query, model_class, sort_field: str, order: str = "desc"):
    field = getattr(model_class, sort_field, None) or getattr(model_class, "created_at", None)
    if field is not None:
        query = query.order_by(field.asc() if order.lower() == "asc" else field.desc())
    return query
