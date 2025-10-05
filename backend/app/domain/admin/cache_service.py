# backend/app/domain/admin/cache_service.py
import re
import json
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .cache_dto import CacheStatsDTO, CacheKeyDTO, CacheKeyDetailDTO
from .service import AdminService
from ...infra.cache.service import CacheService


class CacheAdminService:
    """
    Admin service for Redis cache management
    
    Provides cache statistics, key browsing, and operations
    """
    
    def __init__(self, db: AsyncSession, cache_service: CacheService):
        self.db = db
        self.cache = cache_service
        self.redis = cache_service.redis  # Direct Redis client access
        
    async def get_cache_stats(self) -> CacheStatsDTO:
        """
        Get comprehensive Redis statistics
        
        Returns memory usage, key count, hit rate, etc.
        """
        info = await self.redis.info()
        stats = await self.redis.info('stats')
        
        # Calculate hit rate if stats are available
        hits = stats.get('keyspace_hits', 0)
        misses = stats.get('keyspace_misses', 0)
        total = hits + misses
        hit_rate = (hits / total * 100) if total > 0 else None
        
        # Get total key count
        db_info = await self.redis.info('keyspace')
        total_keys = 0
        for db_name, db_data in db_info.items():
            if db_name.startswith('db'):
                # Parse "keys=123,expires=45,avg_ttl=..."
                keys_match = re.search(r'keys=(\d+)', str(db_data))
                if keys_match:
                    total_keys += int(keys_match.group(1))
        
        # Format memory usage
        memory_bytes = info.get('used_memory', 0)
        memory_human = self._format_bytes(memory_bytes)
        
        return CacheStatsDTO(
            total_keys=total_keys,
            memory_usage_bytes=memory_bytes,
            memory_usage_human=memory_human,
            hit_rate=hit_rate,
            connected_clients=info.get('connected_clients', 0),
            uptime_seconds=info.get('uptime_in_seconds', 0),
            used_memory_peak=info.get('used_memory_peak', 0),
            expired_keys=stats.get('expired_keys', 0)
        )
    
    async def list_keys(
        self,
        pattern: str = "*",
        limit: int = 100
    ) -> List[CacheKeyDTO]:
        """
        List cache keys matching pattern
        
        Args:
            pattern: Redis pattern (e.g., "user:*", "session:*")
            limit: Maximum number of keys to return
            
        Returns:
            List of cache keys with metadata
        """
        keys = []
        cursor = 0
        
        # Use SCAN for safe iteration (doesn't block Redis)
        while len(keys) < limit:
            cursor, batch = await self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=min(100, limit - len(keys))
            )
            
            for key in batch:
                if len(keys) >= limit:
                    break
                    
                # Get key metadata
                key_type = await self.redis.type(key)
                ttl = await self.redis.ttl(key)
                
                # Get value preview based on type
                value_preview = None
                size_bytes = None
                
                if key_type == 'string':
                    value = await self.redis.get(key)
                    if value:
                        value_str = value.decode('utf-8') if isinstance(value, bytes) else str(value)
                        value_preview = value_str[:100] + ('...' if len(value_str) > 100 else '')
                        size_bytes = len(value_str)
                elif key_type == 'list':
                    length = await self.redis.llen(key)
                    value_preview = f"List with {length} items"
                    size_bytes = length * 50  # Estimate
                elif key_type == 'set':
                    cardinality = await self.redis.scard(key)
                    value_preview = f"Set with {cardinality} members"
                    size_bytes = cardinality * 50  # Estimate
                elif key_type == 'hash':
                    length = await self.redis.hlen(key)
                    value_preview = f"Hash with {length} fields"
                    size_bytes = length * 100  # Estimate
                
                keys.append(CacheKeyDTO(
                    key=key.decode('utf-8') if isinstance(key, bytes) else key,
                    type=key_type.decode('utf-8') if isinstance(key_type, bytes) else key_type,
                    ttl=ttl,
                    size_bytes=size_bytes,
                    value_preview=value_preview
                ))
            
            if cursor == 0:
                break
        
        return keys
    
    async def get_key_detail(self, key: str) -> CacheKeyDetailDTO:
        """
        Get detailed information about a cache key
        
        Args:
            key: The cache key
            
        Returns:
            Detailed key information with full value
        """
        exists = await self.redis.exists(key)
        if not exists:
            raise ValueError(f"Key '{key}' does not exist")
        
        key_type = await self.redis.type(key)
        ttl = await self.redis.ttl(key)
        
        # Get full value based on type
        if key_type == 'string':
            value = await self.redis.get(key)
            value_str = value.decode('utf-8') if isinstance(value, bytes) else str(value)
        elif key_type == 'list':
            items = await self.redis.lrange(key, 0, -1)
            value_str = json.dumps([item.decode('utf-8') if isinstance(item, bytes) else item for item in items])
        elif key_type == 'set':
            members = await self.redis.smembers(key)
            value_str = json.dumps(list(members))
        elif key_type == 'hash':
            hash_data = await self.redis.hgetall(key)
            value_str = json.dumps({
                k.decode('utf-8') if isinstance(k, bytes) else k: 
                v.decode('utf-8') if isinstance(v, bytes) else v 
                for k, v in hash_data.items()
            })
        else:
            value_str = f"Unsupported type: {key_type}"
        
        return CacheKeyDetailDTO(
            key=key,
            type=key_type.decode('utf-8') if isinstance(key_type, bytes) else key_type,
            ttl=ttl,
            size_bytes=len(value_str),
            value=value_str
        )
    
    async def delete_key(
        self,
        key: str,
        admin_id: str,
        justification: str
    ) -> bool:
        """
        Delete a cache key
        
        Args:
            key: The cache key to delete
            admin_id: ID of admin performing action
            justification: Reason for deletion
            
        Returns:
            True if deleted, False if key didn't exist
        """
        # Check if key exists before deletion
        exists = await self.redis.exists(key)
        
        if exists:
            await self.redis.delete(key)
            
            # Log the action
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="cache_key_delete",
                entity_type="cache_key",
                entity_id=key,
                justification=justification,
                metadata={"key": key}
            )
        
        return bool(exists)
    
    async def flush_pattern(
        self,
        pattern: str,
        admin_id: str,
        justification: str,
        max_keys: int = 1000
    ) -> int:
        """
        Delete all keys matching pattern
        
        DANGEROUS OPERATION - Use with caution!
        
        Args:
            pattern: Redis pattern (e.g., "session:*")
            admin_id: ID of admin performing action
            justification: Reason for bulk deletion
            max_keys: Safety limit (default 1000)
            
        Returns:
            Number of keys deleted
        """
        if pattern == "*":
            raise ValueError("Cannot flush all keys. Please use a specific pattern.")
        
        deleted_count = 0
        keys_to_delete = []
        cursor = 0
        
        # Scan for matching keys
        while len(keys_to_delete) < max_keys:
            cursor, batch = await self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=100
            )
            keys_to_delete.extend(batch)
            
            if cursor == 0:
                break
            
            if len(keys_to_delete) >= max_keys:
                break
        
        if len(keys_to_delete) >= max_keys:
            raise ValueError(
                f"Too many keys match pattern '{pattern}' ({len(keys_to_delete)}+). "
                f"Refusing to delete more than {max_keys} keys. Use a more specific pattern."
            )
        
        # Delete in batches
        if keys_to_delete:
            deleted_count = await self.redis.delete(*keys_to_delete)
            
            # Log the action
            await AdminService.log_action(
                self.db,
                admin_id=admin_id,
                action="cache_flush_pattern",
                entity_type="cache",
                entity_id=pattern,
                justification=justification,
                metadata={
                    "pattern": pattern,
                    "keys_deleted": deleted_count,
                    "keys_list": [k.decode('utf-8') if isinstance(k, bytes) else k for k in keys_to_delete[:50]]  # Log first 50
                }
            )
        
        return deleted_count
    
    @staticmethod
    def _format_bytes(bytes_size: int) -> str:
        """Format bytes to human-readable string"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_size < 1024:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024
        return f"{bytes_size:.2f} TB"
