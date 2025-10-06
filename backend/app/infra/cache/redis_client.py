import redis
from ...config import settings

# decode_responses=True → handle str, not bytes
r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def get_redis():
    return r

def check_redis_health():
    try:
        return r.ping()
    except Exception as e:
        # Log to stderr since this is initialization
        import sys
        sys.stderr.write(f"Redis connection error: {e}\n")
        return False
