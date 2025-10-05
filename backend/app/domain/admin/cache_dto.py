# backend/app/domain/admin/cache_dto.py
from pydantic import BaseModel
from typing import Optional


class CacheStatsDTO(BaseModel):
    """Redis cache statistics"""
    total_keys: int
    memory_usage_bytes: int
    memory_usage_human: str
    hit_rate: Optional[float]  # If available
    connected_clients: int
    uptime_seconds: int
    used_memory_peak: int
    expired_keys: int


class CacheKeyDTO(BaseModel):
    """Individual cache key information"""
    key: str
    type: str  # string, list, set, hash, etc.
    ttl: int  # Time to live in seconds (-1 = no expiration, -2 = key doesn't exist)
    size_bytes: Optional[int]
    value_preview: Optional[str]  # First 100 chars


class CacheKeyDetailDTO(BaseModel):
    """Detailed cache key information"""
    key: str
    type: str
    ttl: int
    size_bytes: int
    value: str  # Full value (be careful with large values)
