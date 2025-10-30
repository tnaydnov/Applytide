"""
Redis Statistics and Monitoring Module

This module provides functions for monitoring Redis cache health and performance.
It's designed for admin dashboards, health checks, and operational visibility.

Features:
    - Real-time Redis statistics (memory usage, connections, hit rate)
    - Cumulative metrics since last restart
    - Error handling with graceful degradation
    - Structured logging for debugging

Use Cases:
    - Admin dashboard metrics display
    - Health check endpoints
    - Capacity planning (memory trends)
    - Performance monitoring (hit rate tracking)
    - Alerting on anomalies (high memory, connection spikes)

Architecture:
    - Standalone utility functions (no state)
    - Separate from CacheService (admin-focused vs. app-focused)
    - Error isolation: Returns safe defaults on errors
    - Uses Redis INFO command for metrics

Usage Example:
    from app.infra.cache.stats import get_redis_stats, get_redis_info_24h
    
    # Get current stats
    stats = get_redis_stats()
    print(f"Memory: {stats['used_memory_mb']} MB")
    print(f"Hit rate: {stats['hit_rate']}%")
    print(f"Connections: {stats['connected_clients']}")
    
    # Get cumulative stats
    cumulative = get_redis_info_24h()
    print(f"Total hits since restart: {cumulative['hits_24h']}")

Performance Notes:
    - INFO command is O(1) but returns lots of data
    - Call sparingly (once per dashboard load, not per request)
    - Metrics are cumulative since last Redis restart

Monitoring Thresholds:
    - Memory usage: Alert if >80% of maxmemory
    - Hit rate: Alert if <70% (indicates cache misconfiguration)
    - Connections: Alert if >90% of maxclients
    - Evictions: Alert if >1000 total (memory pressure)
"""

from typing import Dict, Any
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError, TimeoutError

from .redis_client import get_redis
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants for monitoring thresholds
MEMORY_WARNING_THRESHOLD_PERCENT: int = 80  # Warn if memory usage >80%
HIT_RATE_WARNING_THRESHOLD_PERCENT: int = 70  # Warn if hit rate <70%
CONNECTION_WARNING_THRESHOLD_PERCENT: int = 90  # Warn if connections >90% of max
EVICTION_WARNING_THRESHOLD: int = 1000  # Warn if >1000 total evictions
BYTES_PER_MB: int = 1024 * 1024  # Conversion factor


def get_redis_stats() -> Dict[str, Any]:
    """
    Get Redis performance statistics.
    
    Retrieves key metrics about Redis server health and performance:
    - Hit/miss counts and calculated hit rate
    - Memory usage (current and peak)
    - Client connections
    - Evicted keys count
    
    Returns:
        Dict[str, Any]: Dictionary with the following structure:
            {
                "keyspace_hits": int,         # Total cache hits since restart
                "keyspace_misses": int,       # Total cache misses since restart
                "hit_rate": float,            # Hit rate percentage (0-100)
                "total_requests": int,        # Total cache operations (hits + misses)
                "used_memory_mb": float,      # Current memory usage in MB
                "peak_memory_mb": float,      # Peak memory usage in MB
                "connected_clients": int,     # Number of connected clients
                "evicted_keys": int,          # Keys evicted due to maxmemory
                "status": str                 # "healthy" or "error"
            }
            
            On error, returns dictionary with zeros and status="error".
    
    Raises:
        No exceptions are raised - errors are logged and safe defaults returned
    
    Example:
        >>> stats = get_redis_stats()
        >>> if stats['status'] == 'healthy':
        ...     print(f"Hit rate: {stats['hit_rate']}%")
        ...     print(f"Memory: {stats['used_memory_mb']} MB")
        ... else:
        ...     print(f"Redis error: {stats.get('error', 'unknown')}")
    
    Notes:
        - All metrics are cumulative since last Redis restart
        - Hit rate is calculated as: hits / (hits + misses) * 100
        - Returns status="error" if Redis is unavailable
        - Memory values are rounded to 2 decimal places
    """
    try:
        redis_client = get_redis()
        
        # Validate client
        if redis_client is None:
            logger.error("Redis client is None")
            raise ValueError("Redis client not initialized")
        
        # Fetch stats info (contains hits, misses, evictions)
        info = redis_client.info("stats")
        if not isinstance(info, dict):
            logger.error(
                "Redis INFO stats returned non-dict",
                extra={"info_type": type(info).__name__}
            )
            raise ValueError(f"Expected dict, got {type(info).__name__}")
        
        # Fetch memory info (contains memory usage)
        memory_info = redis_client.info("memory")
        if not isinstance(memory_info, dict):
            logger.error(
                "Redis INFO memory returned non-dict",
                extra={"memory_type": type(memory_info).__name__}
            )
            raise ValueError(f"Expected dict, got {type(memory_info).__name__}")
        
        # Fetch client info (contains connection count)
        client_info = redis_client.info("clients")
        if not isinstance(client_info, dict):
            logger.error(
                "Redis INFO clients returned non-dict",
                extra={"client_type": type(client_info).__name__}
            )
            raise ValueError(f"Expected dict, got {type(client_info).__name__}")
        
        # Extract key metrics with validation
        keyspace_hits = int(info.get("keyspace_hits", 0))
        keyspace_misses = int(info.get("keyspace_misses", 0))
        
        # Validate non-negative
        if keyspace_hits < 0 or keyspace_misses < 0:
            logger.warning(
                "Redis returned negative hit/miss counts",
                extra={
                    "keyspace_hits": keyspace_hits,
                    "keyspace_misses": keyspace_misses
                }
            )
            keyspace_hits = max(0, keyspace_hits)
            keyspace_misses = max(0, keyspace_misses)
        
        # Calculate hit rate
        total_requests = keyspace_hits + keyspace_misses
        hit_rate = (keyspace_hits / total_requests * 100) if total_requests > 0 else 0.0
        
        # Memory usage in MB
        used_memory_bytes = int(memory_info.get("used_memory", 0))
        if used_memory_bytes < 0:
            logger.warning(
                "Redis returned negative used_memory",
                extra={"used_memory_bytes": used_memory_bytes}
            )
            used_memory_bytes = 0
        used_memory_mb = used_memory_bytes / BYTES_PER_MB
        
        # Peak memory in MB
        peak_memory_bytes = int(memory_info.get("used_memory_peak", 0))
        if peak_memory_bytes < 0:
            logger.warning(
                "Redis returned negative peak_memory",
                extra={"peak_memory_bytes": peak_memory_bytes}
            )
            peak_memory_bytes = 0
        peak_memory_mb = peak_memory_bytes / BYTES_PER_MB
        
        # Connected clients
        connected_clients = int(client_info.get("connected_clients", 0))
        if connected_clients < 0:
            logger.warning(
                "Redis returned negative connected_clients",
                extra={"connected_clients": connected_clients}
            )
            connected_clients = 0
        
        # Evicted keys (when memory limit reached)
        evicted_keys = int(info.get("evicted_keys", 0))
        if evicted_keys < 0:
            logger.warning(
                "Redis returned negative evicted_keys",
                extra={"evicted_keys": evicted_keys}
            )
            evicted_keys = 0
        
        # Check thresholds and log warnings
        if hit_rate < HIT_RATE_WARNING_THRESHOLD_PERCENT and total_requests > 100:
            logger.warning(
                "Redis hit rate below threshold",
                extra={
                    "hit_rate": hit_rate,
                    "threshold": HIT_RATE_WARNING_THRESHOLD_PERCENT,
                    "hits": keyspace_hits,
                    "misses": keyspace_misses
                }
            )
        
        if evicted_keys > EVICTION_WARNING_THRESHOLD:
            logger.warning(
                "Redis evicted keys exceed threshold",
                extra={
                    "evicted_keys": evicted_keys,
                    "threshold": EVICTION_WARNING_THRESHOLD,
                    "suggestion": "Consider increasing maxmemory or reducing cache TTL"
                }
            )
        
        logger.debug(
            "Redis stats retrieved successfully",
            extra={
                "hit_rate": f"{hit_rate:.2f}%",
                "used_memory_mb": f"{used_memory_mb:.2f}",
                "connected_clients": connected_clients,
                "total_requests": total_requests
            }
        )
        
        return {
            "keyspace_hits": keyspace_hits,
            "keyspace_misses": keyspace_misses,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests,
            "used_memory_mb": round(used_memory_mb, 2),
            "peak_memory_mb": round(peak_memory_mb, 2),
            "connected_clients": connected_clients,
            "evicted_keys": evicted_keys,
            "status": "healthy"
        }
    
    except RedisConnectionError as e:
        logger.error(
            "Redis stats connection error",
            extra={
                "error": str(e),
                "error_type": "ConnectionError",
                "suggestion": "Check if Redis server is running and accessible"
            },
            exc_info=True
        )
        return {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_rate": 0.0,
            "total_requests": 0,
            "used_memory_mb": 0.0,
            "peak_memory_mb": 0.0,
            "connected_clients": 0,
            "evicted_keys": 0,
            "status": "error",
            "error": "Connection error - Redis unavailable"
        }
    
    except TimeoutError as e:
        logger.error(
            "Redis stats timeout error",
            extra={
                "error": str(e),
                "error_type": "TimeoutError",
                "suggestion": "Redis server may be overloaded or network latency high"
            },
            exc_info=True
        )
        return {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_rate": 0.0,
            "total_requests": 0,
            "used_memory_mb": 0.0,
            "peak_memory_mb": 0.0,
            "connected_clients": 0,
            "evicted_keys": 0,
            "status": "error",
            "error": "Timeout - Redis not responding"
        }
    
    except RedisError as e:
        logger.error(
            "Redis stats Redis error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "suggestion": "Check Redis server logs for more details"
            },
            exc_info=True
        )
        return {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_rate": 0.0,
            "total_requests": 0,
            "used_memory_mb": 0.0,
            "peak_memory_mb": 0.0,
            "connected_clients": 0,
            "evicted_keys": 0,
            "status": "error",
            "error": f"Redis error: {str(e)}"
        }
    
    except (ValueError, TypeError) as e:
        logger.error(
            "Redis stats validation error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_rate": 0.0,
            "total_requests": 0,
            "used_memory_mb": 0.0,
            "peak_memory_mb": 0.0,
            "connected_clients": 0,
            "evicted_keys": 0,
            "status": "error",
            "error": f"Validation error: {str(e)}"
        }
    
    except Exception as e:
        logger.error(
            "Redis stats unexpected error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "hit_rate": 0.0,
            "total_requests": 0,
            "used_memory_mb": 0.0,
            "peak_memory_mb": 0.0,
            "connected_clients": 0,
            "evicted_keys": 0,
            "status": "error",
            "error": str(e)
        }


def get_redis_info_24h() -> Dict[str, int]:
    """
    Get cumulative Redis metrics since last restart.
    
    Note: Redis doesn't natively track time-based metrics. This function
    returns cumulative statistics since the last Redis restart, which
    may or may not be within the last 24 hours.
    
    Returns:
        Dict[str, int]: Dictionary with cumulative metrics:
            {
                "hits_24h": int,    # Total hits since restart (not necessarily 24h)
                "misses_24h": int   # Total misses since restart (not necessarily 24h)
            }
            
            On error, returns dictionary with zeros.
    
    Raises:
        No exceptions are raised - errors are logged and safe defaults returned
    
    Example:
        >>> metrics = get_redis_info_24h()
        >>> total_ops = metrics['hits_24h'] + metrics['misses_24h']
        >>> print(f"Total operations since restart: {total_ops}")
    
    Notes:
        - Name is legacy/misleading: Returns cumulative stats, not 24h window
        - Consider renaming to get_redis_cumulative_stats() for clarity
        - Metrics reset to 0 when Redis restarts
        - For true 24h metrics, implement external time-series tracking
    
    Implementation Suggestions:
        - For accurate 24h metrics, use external monitoring (Prometheus, CloudWatch)
        - Or implement application-level tracking with database persistence
        - Current implementation is a simplified approximation
    """
    try:
        redis_client = get_redis()
        
        # Validate client
        if redis_client is None:
            logger.error("Redis client is None")
            raise ValueError("Redis client not initialized")
        
        info = redis_client.info("stats")
        
        # Validate response
        if not isinstance(info, dict):
            logger.error(
                "Redis INFO stats returned non-dict",
                extra={"info_type": type(info).__name__}
            )
            raise ValueError(f"Expected dict, got {type(info).__name__}")
        
        # Extract metrics
        hits_24h = int(info.get("keyspace_hits", 0))
        misses_24h = int(info.get("keyspace_misses", 0))
        
        # Validate non-negative
        if hits_24h < 0 or misses_24h < 0:
            logger.warning(
                "Redis returned negative hit/miss counts",
                extra={
                    "hits_24h": hits_24h,
                    "misses_24h": misses_24h
                }
            )
            hits_24h = max(0, hits_24h)
            misses_24h = max(0, misses_24h)
        
        logger.debug(
            "Redis cumulative metrics retrieved",
            extra={
                "hits_24h": hits_24h,
                "misses_24h": misses_24h,
                "total": hits_24h + misses_24h
            }
        )
        
        return {
            "hits_24h": hits_24h,
            "misses_24h": misses_24h
        }
    
    except RedisConnectionError as e:
        logger.error(
            "Redis 24h stats connection error",
            extra={
                "error": str(e),
                "error_type": "ConnectionError"
            },
            exc_info=True
        )
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }
    
    except TimeoutError as e:
        logger.error(
            "Redis 24h stats timeout error",
            extra={
                "error": str(e),
                "error_type": "TimeoutError"
            },
            exc_info=True
        )
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }
    
    except RedisError as e:
        logger.error(
            "Redis 24h stats Redis error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }
    
    except (ValueError, TypeError) as e:
        logger.error(
            "Redis 24h stats validation error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }
    
    except Exception as e:
        logger.error(
            "Redis 24h stats unexpected error",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }


# Export all public functions and constants
__all__ = [
    'get_redis_stats',
    'get_redis_info_24h',
    'MEMORY_WARNING_THRESHOLD_PERCENT',
    'HIT_RATE_WARNING_THRESHOLD_PERCENT',
    'CONNECTION_WARNING_THRESHOLD_PERCENT',
    'EVICTION_WARNING_THRESHOLD',
]
