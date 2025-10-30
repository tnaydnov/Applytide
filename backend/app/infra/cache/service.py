"""
Cache Service for Application-Level Caching

This module provides a high-level async-compatible cache service built on top
of Redis. It's designed for FastAPI dependency injection and handles common
caching patterns with proper error handling.

Use Cases:
    - Step-up authentication token storage (short-lived tokens)
    - Rate limiting state (handled by slowapi middleware)
    - Session data (user preferences, temporary state)
    - API response caching (when appropriate)
    - Feature flags and configuration caching

Features:
    - Async-compatible methods (work with FastAPI async endpoints)
    - Automatic error handling with logging
    - TTL (time-to-live) support for all operations
    - Graceful degradation (returns None on errors, never crashes)
    - Structured logging for debugging and monitoring

Architecture:
    - Singleton pattern: One Redis connection pool shared across instances
    - Thread-safe: Redis-py handles connection pooling automatically
    - Async methods: Compatible with FastAPI async/await
    - Error isolation: Cache failures don't crash the application

Usage Example:
    from app.infra.cache.service import get_cache_service, CacheService
    from fastapi import Depends
    
    @app.get("/data")
    async def get_data(cache: CacheService = Depends(get_cache_service)):
        # Try cache first
        cached = await cache.get("data:123")
        if cached:
            return {"data": cached, "from_cache": True}
        
        # Cache miss - fetch from database
        data = fetch_from_db()
        await cache.set("data:123", data, expire=3600)
        return {"data": data, "from_cache": False}

Performance Notes:
    - Redis operations are typically < 1ms
    - Set expiration times to avoid memory bloat
    - Use key namespacing for different data types
    - Monitor cache hit rates using get_redis_stats()

Security:
    - Don't cache sensitive data without encryption
    - Use short TTLs for user-specific data
    - Invalidate caches on user logout or permission changes
"""

from typing import Optional
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

from .redis_client import get_redis
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants
DEFAULT_EXPIRATION: int = 3600  # Default TTL: 1 hour
MAX_KEY_LENGTH: int = 250  # Maximum Redis key length (Redis max is 512MB, we limit for safety)
MAX_VALUE_LENGTH: int = 5_000_000  # Maximum value length: 5MB (Redis max is 512MB)


class CacheService:
    """
    Service for interacting with Redis cache.
    
    This class provides async-compatible methods for common cache operations.
    All methods handle errors gracefully and log failures for monitoring.
    
    Attributes:
        redis: Redis client instance (shared connection pool)
    
    Error Handling:
        - All methods catch and log exceptions
        - Returns None/False on errors (never raises)
        - Logs include operation type, key, and error details
    
    Thread Safety:
        - Thread-safe (uses redis-py connection pool)
        - Can be used across multiple async tasks
        - No need for locks or synchronization
    """
    
    def __init__(self):
        """
        Initialize cache service with Redis client.
        
        Notes:
            - Redis connection is established in redis_client module
            - This just stores a reference to the global connection pool
            - Multiple CacheService instances share the same connection
        """
        self.redis = get_redis()
        
        logger.debug(
            "CacheService initialized",
            extra={"redis_connected": True}
        )
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value from cache by key.
        
        Args:
            key: Cache key to retrieve. Should be descriptive and namespaced.
                Examples: "user:123:profile", "job:456:details"
        
        Returns:
            Optional[str]: Cached value as string, or None if:
                - Key doesn't exist
                - Key expired
                - Redis error occurred
        
        Raises:
            No exceptions are raised - errors are logged and None is returned
        
        Example:
            >>> cache = CacheService()
            >>> value = await cache.get("user:123:token")
            >>> if value:
            ...     print(f"Found cached token: {value}")
            ... else:
            ...     print("Cache miss - need to regenerate")
        
        Notes:
            - Returns None for both cache misses and errors
            - Check logs if you need to distinguish between the two
            - Keys are case-sensitive
        """
        # Validate key
        if not key or not key.strip():
            logger.warning(
                "Cache GET attempted with empty key",
                extra={"key": repr(key)}
            )
            return None
        
        if len(key) > MAX_KEY_LENGTH:
            logger.warning(
                "Cache GET key exceeds maximum length",
                extra={
                    "key_length": len(key),
                    "max_length": MAX_KEY_LENGTH,
                    "key_preview": key[:50]
                }
            )
            return None
        
        try:
            value = self.redis.get(key)
            
            if value is not None:
                logger.debug(
                    "Cache GET hit",
                    extra={
                        "key": key,
                        "value_length": len(value) if value else 0
                    }
                )
            else:
                logger.debug(
                    "Cache GET miss",
                    extra={"key": key}
                )
            
            return value
            
        except RedisConnectionError as e:
            logger.error(
                "Cache GET connection error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": "ConnectionError"
                },
                exc_info=True
            )
            return None
            
        except RedisError as e:
            logger.error(
                "Cache GET Redis error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None
            
        except Exception as e:
            logger.error(
                "Cache GET unexpected error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None
    
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """
        Set value in cache with optional expiration.
        
        Args:
            key: Cache key to set. Should be descriptive and namespaced.
            value: Value to store (must be string or will be converted).
            expire: Optional expiration time in seconds. If None, key never expires.
                   Recommended: Always set expiration to avoid memory bloat.
        
        Returns:
            bool: True if successful, False if error occurred
        
        Raises:
            No exceptions are raised - errors are logged and False is returned
        
        Example:
            >>> cache = CacheService()
            >>> # Cache for 1 hour
            >>> success = await cache.set("user:123:token", "abc123", expire=3600)
            >>> if success:
            ...     print("Token cached successfully")
            ... else:
            ...     print("Failed to cache token - check logs")
        
        Notes:
            - Values are stored as strings (use JSON for complex types)
            - Setting expire=None creates keys that never expire (use carefully!)
            - Large values (>5MB) are rejected with warning
        """
        # Validate key
        if not key or not key.strip():
            logger.warning(
                "Cache SET attempted with empty key",
                extra={"key": repr(key)}
            )
            return False
        
        if len(key) > MAX_KEY_LENGTH:
            logger.warning(
                "Cache SET key exceeds maximum length",
                extra={
                    "key_length": len(key),
                    "max_length": MAX_KEY_LENGTH,
                    "key_preview": key[:50]
                }
            )
            return False
        
        # Validate value
        if value is None:
            logger.warning(
                "Cache SET attempted with None value",
                extra={"key": key}
            )
            return False
        
        # Convert value to string if needed
        if not isinstance(value, str):
            logger.debug(
                "Cache SET converting non-string value",
                extra={
                    "key": key,
                    "value_type": type(value).__name__
                }
            )
            value = str(value)
        
        # Check value size
        if len(value) > MAX_VALUE_LENGTH:
            logger.warning(
                "Cache SET value exceeds maximum length",
                extra={
                    "key": key,
                    "value_length": len(value),
                    "max_length": MAX_VALUE_LENGTH
                }
            )
            return False
        
        # Validate expiration
        if expire is not None:
            if not isinstance(expire, int) or expire <= 0:
                logger.warning(
                    "Cache SET invalid expiration time",
                    extra={
                        "key": key,
                        "expire": expire,
                        "expire_type": type(expire).__name__
                    }
                )
                return False
        
        try:
            if expire:
                self.redis.setex(key, expire, value)
                logger.debug(
                    "Cache SET with expiration",
                    extra={
                        "key": key,
                        "expire_seconds": expire,
                        "value_length": len(value)
                    }
                )
            else:
                self.redis.set(key, value)
                logger.debug(
                    "Cache SET without expiration",
                    extra={
                        "key": key,
                        "value_length": len(value),
                        "warning": "No expiration set - key will persist indefinitely"
                    }
                )
            
            return True
            
        except RedisConnectionError as e:
            logger.error(
                "Cache SET connection error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": "ConnectionError"
                },
                exc_info=True
            )
            return False
            
        except RedisError as e:
            logger.error(
                "Cache SET Redis error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False
            
        except Exception as e:
            logger.error(
                "Cache SET unexpected error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache by key.
        
        Args:
            key: Cache key to delete
        
        Returns:
            bool: True if successful (even if key didn't exist), False on error
        
        Raises:
            No exceptions are raised - errors are logged and False is returned
        
        Example:
            >>> cache = CacheService()
            >>> success = await cache.delete("user:123:token")
            >>> if success:
            ...     print("Token invalidated")
        
        Notes:
            - Returns True even if key didn't exist (idempotent operation)
            - Use this for cache invalidation (logout, data updates, etc.)
        """
        # Validate key
        if not key or not key.strip():
            logger.warning(
                "Cache DELETE attempted with empty key",
                extra={"key": repr(key)}
            )
            return False
        
        if len(key) > MAX_KEY_LENGTH:
            logger.warning(
                "Cache DELETE key exceeds maximum length",
                extra={
                    "key_length": len(key),
                    "max_length": MAX_KEY_LENGTH,
                    "key_preview": key[:50]
                }
            )
            return False
        
        try:
            deleted_count = self.redis.delete(key)
            
            logger.debug(
                "Cache DELETE executed",
                extra={
                    "key": key,
                    "deleted_count": deleted_count,
                    "existed": deleted_count > 0
                }
            )
            
            return True
            
        except RedisConnectionError as e:
            logger.error(
                "Cache DELETE connection error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": "ConnectionError"
                },
                exc_info=True
            )
            return False
            
        except RedisError as e:
            logger.error(
                "Cache DELETE Redis error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False
            
        except Exception as e:
            logger.error(
                "Cache DELETE unexpected error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.
        
        Args:
            key: Cache key to check
        
        Returns:
            bool: True if key exists, False if not found or error occurred
        
        Raises:
            No exceptions are raised - errors are logged and False is returned
        
        Example:
            >>> cache = CacheService()
            >>> if await cache.exists("user:123:session"):
            ...     print("User has active session")
            ... else:
            ...     print("No active session found")
        
        Notes:
            - Returns False for both missing keys and errors
            - Check logs if you need to distinguish between the two
            - Use this before expensive cache.get() if you only need existence check
        """
        # Validate key
        if not key or not key.strip():
            logger.warning(
                "Cache EXISTS attempted with empty key",
                extra={"key": repr(key)}
            )
            return False
        
        if len(key) > MAX_KEY_LENGTH:
            logger.warning(
                "Cache EXISTS key exceeds maximum length",
                extra={
                    "key_length": len(key),
                    "max_length": MAX_KEY_LENGTH,
                    "key_preview": key[:50]
                }
            )
            return False
        
        try:
            exists = bool(self.redis.exists(key))
            
            logger.debug(
                "Cache EXISTS check",
                extra={
                    "key": key,
                    "exists": exists
                }
            )
            
            return exists
            
        except RedisConnectionError as e:
            logger.error(
                "Cache EXISTS connection error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": "ConnectionError"
                },
                exc_info=True
            )
            return False
            
        except RedisError as e:
            logger.error(
                "Cache EXISTS Redis error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False
            
        except Exception as e:
            logger.error(
                "Cache EXISTS unexpected error",
                extra={
                    "key": key,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False


def get_cache_service() -> CacheService:
    """
    Dependency for FastAPI endpoints.
    
    This function is designed for FastAPI's dependency injection system.
    It creates a new CacheService instance for each request.
    
    Returns:
        CacheService: New cache service instance
    
    Usage in FastAPI:
        from fastapi import Depends
        from app.infra.cache.service import get_cache_service, CacheService
        
        @app.get("/api/data")
        async def get_data(cache: CacheService = Depends(get_cache_service)):
            value = await cache.get("key")
            return {"value": value}
    
    Notes:
        - Each request gets a new CacheService instance
        - But all instances share the same Redis connection pool
        - This is efficient and thread-safe
    """
    logger.debug("Creating new CacheService instance for request")
    return CacheService()


# Export all public classes and functions
__all__ = [
    'CacheService',
    'get_cache_service',
    'DEFAULT_EXPIRATION',
    'MAX_KEY_LENGTH',
    'MAX_VALUE_LENGTH',
]
