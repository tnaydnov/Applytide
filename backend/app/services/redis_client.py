import redis
from ..config import settings

# decode_responses=True → we work with str instead of bytes
r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def get_redis():
    return r
