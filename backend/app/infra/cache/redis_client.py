"""
Redis Client Module

Provides Redis connection management with health monitoring.

This module establishes a global Redis connection pool that can be reused
across the application. The connection is configured to decode responses
as strings for easier handling.

Connection Configuration:
    - decode_responses=True: Automatically decode bytes to strings
    - Connection pooling: Automatically managed by redis-py
    - Retry logic: Built into redis-py client
    - Timeout handling: Configurable via REDIS_URL parameters

Health Monitoring:
    - check_redis_health(): Verify Redis connectivity
    - Logs errors to stderr for visibility during initialization

Usage:
    from app.infra.cache.redis_client import get_redis, check_redis_health
    
    # Get Redis client
    redis = get_redis()
    redis.set("key", "value")
    
    # Check health
    if check_redis_health():
        print("Redis is healthy")
    else:
        print("Redis is unavailable")

Error Handling:
    - Connection errors are logged but don't crash the application
    - Health checks return False on any error
    - Operations should handle Redis failures gracefully

Configuration:
    Set REDIS_URL in environment or settings:
    - redis://localhost:6379/0
    - redis://:password@localhost:6379/0
    - redis://localhost:6379/0?socket_timeout=5&socket_connect_timeout=5
"""

import sys
import redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

from ...config import settings

# Configuration constants
REDIS_SOCKET_TIMEOUT: int = 5  # Socket operation timeout in seconds
REDIS_SOCKET_CONNECT_TIMEOUT: int = 5  # Connection timeout in seconds
REDIS_RETRY_ON_TIMEOUT: bool = True  # Retry operations on timeout
REDIS_HEALTH_CHECK_INTERVAL: int = 30  # Health check interval in seconds

# decode_responses=True → handle str, not bytes
# This global connection pool is thread-safe and reused across the application
try:
    r = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=REDIS_SOCKET_TIMEOUT,
        socket_connect_timeout=REDIS_SOCKET_CONNECT_TIMEOUT,
        retry_on_timeout=REDIS_RETRY_ON_TIMEOUT,
        health_check_interval=REDIS_HEALTH_CHECK_INTERVAL
    )
    
    # Test connection immediately
    r.ping()
    
    sys.stderr.write(f"✓ Redis connected successfully: {settings.REDIS_URL}\n")
    
except Exception as e:
    # Log error but don't crash - let health checks handle it
    sys.stderr.write(f"✗ Redis connection error during initialization: {e}\n")
    sys.stderr.write(f"  REDIS_URL: {settings.REDIS_URL}\n")
    sys.stderr.write("  Application will continue, but cache operations will fail\n")
    
    # Create a Redis client anyway (operations will fail with proper errors)
    r = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=REDIS_SOCKET_TIMEOUT,
        socket_connect_timeout=REDIS_SOCKET_CONNECT_TIMEOUT,
        retry_on_timeout=REDIS_RETRY_ON_TIMEOUT
    )


def get_redis() -> redis.Redis:
    """
    Get the global Redis client instance.
    
    Returns:
        redis.Redis: Thread-safe Redis client with connection pooling
    
    Notes:
        - This returns the same global connection pool for efficiency
        - Connection pooling is automatic - no need to create multiple clients
        - Thread-safe and can be used across asyncio/threading
    
    Example:
        >>> redis_client = get_redis()
        >>> redis_client.set("key", "value", ex=3600)
        >>> value = redis_client.get("key")
    """
    return r


def check_redis_health() -> bool:
    """
    Check if Redis connection is healthy.
    
    This function sends a PING command to Redis and returns True if
    the response is successful. Used for health checks and monitoring.
    
    Returns:
        bool: True if Redis is healthy, False otherwise
    
    Raises:
        No exceptions are raised - all errors are caught and logged
    
    Error Handling:
        - Logs errors to stderr for visibility
        - Returns False on any error (connection, timeout, etc.)
        - Safe to call repeatedly for health monitoring
    
    Example:
        >>> if check_redis_health():
        ...     print("Redis is operational")
        ... else:
        ...     print("Redis is down - using fallback")
    
    Notes:
        - This is a blocking operation with timeout
        - Default timeout is REDIS_SOCKET_TIMEOUT (5 seconds)
        - Use this for startup health checks and monitoring endpoints
    """
    try:
        response = r.ping()
        
        if response:
            return True
        else:
            # Unexpected: ping() returned False or None
            sys.stderr.write("Redis health check failed: ping() returned non-True value\n")
            return False
            
    except RedisConnectionError as e:
        # Connection-specific errors
        sys.stderr.write(f"Redis connection error during health check: {e}\n")
        sys.stderr.write(f"  REDIS_URL: {settings.REDIS_URL}\n")
        sys.stderr.write("  Check that Redis server is running and accessible\n")
        return False
        
    except redis.exceptions.TimeoutError as e:
        # Timeout errors
        sys.stderr.write(f"Redis timeout during health check: {e}\n")
        sys.stderr.write(f"  Timeout: {REDIS_SOCKET_TIMEOUT}s\n")
        sys.stderr.write("  Redis server may be overloaded or network is slow\n")
        return False
        
    except RedisError as e:
        # Other Redis-specific errors
        sys.stderr.write(f"Redis error during health check: {e}\n")
        sys.stderr.write(f"  Error type: {type(e).__name__}\n")
        return False
        
    except Exception as e:
        # Unexpected errors
        sys.stderr.write(f"Unexpected error during Redis health check: {e}\n")
        sys.stderr.write(f"  Error type: {type(e).__name__}\n")
        return False


# Export all public functions and constants
__all__ = [
    'r',
    'get_redis',
    'check_redis_health',
    'REDIS_SOCKET_TIMEOUT',
    'REDIS_SOCKET_CONNECT_TIMEOUT',
    'REDIS_RETRY_ON_TIMEOUT',
    'REDIS_HEALTH_CHECK_INTERVAL',
]
