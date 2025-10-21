"""
Cache statistics utility for Redis metrics
"""
from typing import Dict, Any, Optional
from .redis_client import get_redis
from ..logging import get_logger

logger = get_logger(__name__)


def get_redis_stats() -> Dict[str, Any]:
    """
    Get Redis performance statistics
    
    Returns:
        Dict with cache metrics including hits, misses, hit rate, memory usage
    """
    try:
        redis_client = get_redis()
        info = redis_client.info("stats")
        memory_info = redis_client.info("memory")
        
        # Extract key metrics
        keyspace_hits = int(info.get("keyspace_hits", 0))
        keyspace_misses = int(info.get("keyspace_misses", 0))
        
        # Calculate hit rate
        total_requests = keyspace_hits + keyspace_misses
        hit_rate = (keyspace_hits / total_requests * 100) if total_requests > 0 else 0.0
        
        # Memory usage in MB
        used_memory_bytes = int(memory_info.get("used_memory", 0))
        used_memory_mb = used_memory_bytes / (1024 * 1024)
        
        # Peak memory in MB
        peak_memory_bytes = int(memory_info.get("used_memory_peak", 0))
        peak_memory_mb = peak_memory_bytes / (1024 * 1024)
        
        # Connected clients
        connected_clients = int(redis_client.info("clients").get("connected_clients", 0))
        
        # Evicted keys (when memory limit reached)
        evicted_keys = int(info.get("evicted_keys", 0))
        
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
    
    except Exception as e:
        logger.error("Failed to get Redis stats", extra={"error": str(e)})
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
    Get Redis metrics for last 24 hours
    Note: Redis doesn't natively track time-based metrics, so we approximate
    by taking current stats (they reset on Redis restart)
    
    Returns:
        Dict with hits and misses (cumulative since last restart)
    """
    try:
        redis_client = get_redis()
        info = redis_client.info("stats")
        
        return {
            "hits_24h": int(info.get("keyspace_hits", 0)),
            "misses_24h": int(info.get("keyspace_misses", 0))
        }
    
    except Exception as e:
        logger.error("Failed to get 24h Redis stats", extra={"error": str(e)})
        return {
            "hits_24h": 0,
            "misses_24h": 0
        }
