# backend/app/api/routers/admin/cache.py
"""Cache management"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.cache_service import CacheAdminService
from ....infra.cache.service import CacheService, get_cache_service


router = APIRouter(tags=["admin-cache"])

# Redis cache browser and management

class CacheStatsResponse(BaseModel):
    total_keys: int
    memory_usage_bytes: int
    memory_usage_human: str
    hit_rate: Optional[float]
    connected_clients: int
    uptime_seconds: int
    used_memory_peak: int
    expired_keys: int


class CacheKeyResponse(BaseModel):
    key: str
    type: str
    ttl: int
    size_bytes: Optional[int]
    value_preview: Optional[str]


class CacheKeyDetailResponse(BaseModel):
    key: str
    type: str
    ttl: int
    size_bytes: int
    value: str


class DeleteKeyRequest(BaseModel):
    key: str
    justification: str = Field(..., min_length=10)


class FlushPatternRequest(BaseModel):
    pattern: str = Field(..., min_length=2, description="Redis pattern (e.g., 'session:*')")
    justification: str = Field(..., min_length=10)
    max_keys: int = Field(default=1000, ge=1, le=10000)


@router.get(
    "/cache/stats",
    response_model=CacheStatsResponse,
    summary="Get Cache Statistics"
)
@limiter.limit("30/minute")
async def get_cache_stats(
    request: Request,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get comprehensive Redis cache statistics
    
    Returns memory usage, key count, hit rate, and performance metrics
    """
    service = CacheAdminService(db, cache_service)
    stats = await service.get_cache_stats()
    
    return CacheStatsResponse(
        total_keys=stats.total_keys,
        memory_usage_bytes=stats.memory_usage_bytes,
        memory_usage_human=stats.memory_usage_human,
        hit_rate=stats.hit_rate,
        connected_clients=stats.connected_clients,
        uptime_seconds=stats.uptime_seconds,
        used_memory_peak=stats.used_memory_peak,
        expired_keys=stats.expired_keys
    )


@router.get(
    "/cache/keys",
    response_model=list[CacheKeyResponse],
    summary="List Cache Keys"
)
@limiter.limit("30/minute")
async def list_cache_keys(
    request: Request,
    pattern: str = Query(default="*", description="Redis pattern"),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    List cache keys matching pattern
    
    Use patterns like:
    - `user:*` - All user keys
    - `session:*` - All session keys
    - `*email*` - Keys containing "email"
    """
    service = CacheAdminService(db, cache_service)
    keys = await service.list_keys(pattern=pattern, limit=limit)
    
    return [
        CacheKeyResponse(
            key=key.key,
            type=key.type,
            ttl=key.ttl,
            size_bytes=key.size_bytes,
            value_preview=key.value_preview
        )
        for key in keys
    ]


@router.get(
    "/cache/keys/{key}",
    response_model=CacheKeyDetailResponse,
    summary="Get Cache Key Detail"
)
@limiter.limit("30/minute")
async def get_cache_key_detail(
    request: Request,
    key: str,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get detailed information about a cache key
    
    Returns full value and metadata
    """
    service = CacheAdminService(db, cache_service)
    detail = await service.get_key_detail(key)
    
    return CacheKeyDetailResponse(
        key=detail.key,
        type=detail.type,
        ttl=detail.ttl,
        size_bytes=detail.size_bytes,
        value=detail.value
    )


@router.delete(
    "/cache/keys",
    summary="Delete Cache Key"
)
@limiter.limit("20/minute")
async def delete_cache_key(
    request: Request,
    delete_request: DeleteKeyRequest,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Delete a cache key
    
    Requires step-up authentication and justification
    """
    service = CacheAdminService(db, cache_service)
    deleted = await service.delete_key(
        key=delete_request.key,
        admin_id=current_admin.id,
        justification=delete_request.justification
    )
    
    return {
        "success": True,
        "deleted": deleted,
        "message": f"Key '{delete_request.key}' deleted" if deleted else f"Key '{delete_request.key}' not found"
    }


@router.post(
    "/cache/flush",
    summary="Flush Keys by Pattern"
)
@limiter.limit("5/hour")  # Very strict limit for bulk operations
async def flush_cache_pattern(
    request: Request,
    flush_request: FlushPatternRequest,
    db: Session = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Delete all keys matching pattern
    
    DANGEROUS OPERATION - Use with extreme caution!
    
    - Requires step-up authentication
    - Cannot flush all keys (pattern "*" is blocked)
    - Limited to 10,000 keys per operation
    - Rate limited to 5 per hour
    """
    service = CacheAdminService(db, cache_service)
    deleted_count = await service.flush_pattern(
        pattern=flush_request.pattern,
        admin_id=current_admin.id,
        justification=flush_request.justification,
        max_keys=flush_request.max_keys
    )
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "pattern": flush_request.pattern,
        "message": f"Deleted {deleted_count} keys matching pattern '{flush_request.pattern}'"
    }

