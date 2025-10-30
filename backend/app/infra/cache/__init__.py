"""
Cache Infrastructure Module

This module provides Redis caching infrastructure for the application.

Components:
- redis_client: Redis connection management and health checks
- service: High-level cache service with async operations
- stats: Redis performance statistics and metrics

Features:
- Connection pooling with automatic reconnection
- Health monitoring and diagnostics
- Performance metrics tracking (hits, misses, memory)
- Async-compatible cache operations
- Error handling with graceful degradation

Usage:
    from app.infra.cache import get_redis, get_cache_service, get_redis_stats
    
    # Direct Redis access
    redis = get_redis()
    redis.set("key", "value")
    
    # Service layer (recommended)
    cache = get_cache_service()
    await cache.set("key", "value", expire=3600)
    
    # Monitor performance
    stats = get_redis_stats()
    print(f"Cache hit rate: {stats['hit_rate']}%")

Notes:
    - Redis connection is established at import time
    - Use get_cache_service() for dependency injection in FastAPI
    - Check redis_client.check_redis_health() for health monitoring
"""

from .stats import get_redis_stats, get_redis_info_24h
from .redis_client import get_redis, r

__all__ = ["get_redis_stats", "get_redis_info_24h", "get_redis", "r"]
