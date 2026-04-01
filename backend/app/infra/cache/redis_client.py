"""
Redis Client Module

Provides Redis connection management with lazy initialization and health
monitoring.

The connection is created on first use (not at import time) so that modules
can be safely imported without requiring a live Redis instance.

Usage:
    from app.infra.cache.redis_client import get_redis, check_redis_health

    redis = get_redis()
    redis.set("key", "value")

    if check_redis_health():
        print("Redis is healthy")
"""

from __future__ import annotations

import sys
import threading
from typing import Optional

import redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

from ...config import settings

# Configuration constants
REDIS_SOCKET_TIMEOUT: int = 5
REDIS_SOCKET_CONNECT_TIMEOUT: int = 5
REDIS_RETRY_ON_TIMEOUT: bool = True
REDIS_HEALTH_CHECK_INTERVAL: int = 30

# Key namespace - prevents collisions when sharing a Redis instance
REDIS_NAMESPACE: str = "applytide"


def redis_key(*parts: str) -> str:
    """
    Build a namespaced Redis key.

    >>> redis_key("jwt", "blacklist", jti)
    'applytide:jwt:blacklist:<jti>'
    """
    return f"{REDIS_NAMESPACE}:{':'.join(parts)}"

# ── Lazy singleton ──────────────────────────────────────────────────────
_client: Optional[redis.Redis] = None
_lock = threading.Lock()


def _build_client() -> redis.Redis:
    """Create a Redis client from current settings."""
    return redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=REDIS_SOCKET_TIMEOUT,
        socket_connect_timeout=REDIS_SOCKET_CONNECT_TIMEOUT,
        retry_on_timeout=REDIS_RETRY_ON_TIMEOUT,
        health_check_interval=REDIS_HEALTH_CHECK_INTERVAL,
    )


def get_redis() -> redis.Redis:
    """
    Return the global Redis client, creating it on first call.

    Thread-safe via a lock; subsequent calls return the cached instance.
    """
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = _build_client()
    return _client


# Backward-compatible module-level proxy so ``from …redis_client import r``
# still works without triggering a connection at import time.
class _RedisProxy:
    """Transparent proxy that defers to ``get_redis()`` on every attribute access."""

    def __getattr__(self, name: str):
        return getattr(get_redis(), name)

    def __repr__(self) -> str:
        return f"<_RedisProxy wrapping {get_redis()!r}>"


r: redis.Redis = _RedisProxy()  # type: ignore[assignment]


def check_redis_health() -> bool:
    """
    Send PING to Redis and return ``True`` if it responds.

    All errors are caught and logged to stderr - never raises.
    """
    try:
        return bool(get_redis().ping())

    except RedisConnectionError as e:
        sys.stderr.write(f"Redis connection error during health check: {e}\n")
        return False

    except redis.exceptions.TimeoutError as e:
        sys.stderr.write(f"Redis timeout during health check: {e}\n")
        return False

    except RedisError as e:
        sys.stderr.write(f"Redis error during health check: {e}\n")
        return False

    except Exception as e:
        sys.stderr.write(f"Unexpected error during Redis health check: {e}\n")
        return False


__all__ = [
    "r",
    "get_redis",
    "check_redis_health",
    "redis_key",
    "REDIS_NAMESPACE",
    "REDIS_SOCKET_TIMEOUT",
    "REDIS_SOCKET_CONNECT_TIMEOUT",
    "REDIS_RETRY_ON_TIMEOUT",
    "REDIS_HEALTH_CHECK_INTERVAL",
]
