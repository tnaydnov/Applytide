import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from ..config import settings
from ..services.redis_client import r

def _now():
    return datetime.now(timezone.utc)

def _exp(minutes: int = 15) -> datetime:
    return _now() + timedelta(minutes=minutes)

def _exp_days(days: int) -> datetime:
    return _now() + timedelta(days=days)

def create_access_token(user_id: str) -> str:
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "typ": "access",
        "jti": jti,
        "iat": int(_now().timestamp()),
        "exp": int(_exp(settings.ACCESS_TTL_MIN).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token(user_id: str, family: str | None = None) -> tuple[str, str]:
    """Return (token, family_id). family is constant across rotations."""
    family_id = family or str(uuid.uuid4())
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "typ": "refresh",
        "fam": family_id,
        "jti": jti,
        "iat": int(_now().timestamp()),
        "exp": int(_exp_days(settings.REFRESH_TTL_DAYS).timestamp()),
    }
    token = jwt.encode(payload, settings.REFRESH_SECRET, algorithm="HS256")
    return token, family_id

def decode_access(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])

def decode_refresh(token: str) -> dict:
    return jwt.decode(token, settings.REFRESH_SECRET, algorithms=["HS256"])

# ---- Revocation (rotation) ----
def revoke_jti(jti: str, seconds: int):
    """Store jti in Redis blacklist with TTL equal to remaining token life."""
    r.setex(f"jwt:blacklist:{jti}", seconds, "1")

def is_revoked(jti: str) -> bool:
    return r.exists(f"jwt:blacklist:{jti}") == 1
