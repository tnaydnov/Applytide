"""
Cache service for application-level caching.

Used for:
- Step-up authentication token storage
- Rate limiting state (handled by slowapi)
- Session data
"""

from typing import Optional
from .redis_client import get_redis
from ..logging import get_logger

logger = get_logger(__name__)


class CacheService:
    """Service for interacting with Redis cache"""
    
    def __init__(self):
        self.redis = get_redis()
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        try:
            return self.redis.get(key)
        except Exception as e:
            logger.error("Cache GET error", extra={"key": key, "error": str(e)}, exc_info=True)
            return None
    
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to store
            expire: Expiration time in seconds (optional)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if expire:
                self.redis.setex(key, expire, value)
            else:
                self.redis.set(key, value)
            return True
        except Exception as e:
            logger.error("Cache SET error", extra={"key": key, "error": str(e)}, exc_info=True)
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            logger.error("Cache DELETE error", extra={"key": key, "error": str(e)}, exc_info=True)
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error("Cache EXISTS error", extra={"key": key, "error": str(e)}, exc_info=True)
            return False


def get_cache_service() -> CacheService:
    """Dependency for FastAPI endpoints"""
    return CacheService()
