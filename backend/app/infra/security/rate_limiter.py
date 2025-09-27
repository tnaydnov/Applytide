"""Rate limiting service using Redis"""
import time
from typing import Tuple
from app.infra.cache.redis_client import r

class RateLimiter:
    def __init__(self, key_prefix: str, max_attempts: int, window_seconds: int):
        self.key_prefix = key_prefix
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds

    def check_rate_limit(self, identifier: str) -> Tuple[bool, int]:
        key = f"{self.key_prefix}:{identifier}"
        current_time = int(time.time())
        window_start = current_time - self.window_seconds

        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.expire(key, self.window_seconds)
        results = pipe.execute()

        current_attempts = results[1]

        if current_attempts >= self.max_attempts:
            oldest_entries = r.zrange(key, 0, 0, withscores=True)
            if oldest_entries:
                oldest_time = int(oldest_entries[0][1])
                retry_after = max(0, self.window_seconds - (current_time - oldest_time))
                return False, retry_after
            return False, self.window_seconds

        r.zadd(key, {str(current_time): current_time})
        return True, 0

login_limiter = RateLimiter("rate_limit:login",   max_attempts=5,  window_seconds=300)
refresh_limiter = RateLimiter("rate_limit:refresh", max_attempts=10, window_seconds=300)
email_limiter = RateLimiter("rate_limit:email",   max_attempts=3,  window_seconds=3600)
