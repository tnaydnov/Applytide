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
from ....infra.logging import get_logger
from ....infra.logging.security_logging import log_security_event


router = APIRouter(tags=["admin-cache"])
logger = get_logger(__name__)

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
    try:
        logger.info(
            "Admin requesting cache statistics",
            extra={"admin_id": str(current_admin.id)}
        )
        
        service = CacheAdminService(db, cache_service)
        stats = await service.get_cache_stats()
        
        logger.info(
            "Cache statistics retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "total_keys": stats.total_keys,
                "memory_usage": stats.memory_usage_human
            }
        )
        
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
    
    except Exception as e:
        logger.error(
            "Error retrieving cache statistics - Redis connection issue?",
            extra={
                "admin_id": str(current_admin.id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve cache statistics. Redis may be unavailable."
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
    try:
        logger.info(
            "Admin listing cache keys",
            extra={
                "admin_id": str(current_admin.id),
                "pattern": pattern,
                "limit": limit
            }
        )
        
        service = CacheAdminService(db, cache_service)
        keys = await service.list_keys(pattern=pattern, limit=limit)
        
        result = [
            CacheKeyResponse(
                key=key.key,
                type=key.type,
                ttl=key.ttl,
                size_bytes=key.size_bytes,
                value_preview=key.value_preview
            )
            for key in keys
        ]
        
        logger.info(
            "Cache keys listed",
            extra={
                "admin_id": str(current_admin.id),
                "pattern": pattern,
                "count": len(result)
            }
        )
        
        return result
    
    except Exception as e:
        logger.error(
            "Error listing cache keys",
            extra={
                "admin_id": str(current_admin.id),
                "pattern": pattern,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to list cache keys"
        )


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
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.warning(
            "Admin deleting cache key",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "cache_key": delete_request.key,
                "justification": delete_request.justification,
                "admin_ip": ip_address
            }
        )
        
        service = CacheAdminService(db, cache_service)
        deleted = await service.delete_key(
            key=delete_request.key,
            admin_id=current_admin.id,
            justification=delete_request.justification
        )
        
        logger.info(
            "Cache key deletion completed",
            extra={
                "admin_id": str(current_admin.id),
                "cache_key": delete_request.key,
                "deleted": deleted
            }
        )
        
        return {
            "success": True,
            "deleted": deleted,
            "message": f"Key '{delete_request.key}' deleted" if deleted else f"Key '{delete_request.key}' not found"
        }
    
    except Exception as e:
        logger.error(
            "Error deleting cache key",
            extra={
                "admin_id": str(current_admin.id),
                "cache_key": delete_request.key,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete cache key"
        )


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
    try:
        ip_address, user_agent = get_client_info(request)
        
        # Log this DANGEROUS bulk operation
        logger.critical(
            "Admin initiating BULK CACHE FLUSH",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "pattern": flush_request.pattern,
                "max_keys": flush_request.max_keys,
                "justification": flush_request.justification,
                "admin_ip": ip_address
            }
        )
        
        # Security event for monitoring
        log_security_event(
            event_type="cache_bulk_flush",
            details={
                "admin_id": str(current_admin.id),
                "pattern": flush_request.pattern,
                "max_keys": flush_request.max_keys,
                "justification": flush_request.justification
            },
            request=request
        )
        
        service = CacheAdminService(db, cache_service)
        deleted_count = await service.flush_pattern(
            pattern=flush_request.pattern,
            admin_id=current_admin.id,
            justification=flush_request.justification,
            max_keys=flush_request.max_keys
        )
        
        logger.warning(
            "Bulk cache flush completed",
            extra={
                "admin_id": str(current_admin.id),
                "pattern": flush_request.pattern,
                "deleted_count": deleted_count
            }
        )
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "pattern": flush_request.pattern,
            "message": f"Deleted {deleted_count} keys matching pattern '{flush_request.pattern}'"
        }
    
    except Exception as e:
        logger.error(
            "Error during bulk cache flush",
            extra={
                "admin_id": str(current_admin.id),
                "pattern": flush_request.pattern,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to flush cache keys"
        )

