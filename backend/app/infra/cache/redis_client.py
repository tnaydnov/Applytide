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
        print(f"Redis connection error: {e}")
        return False
