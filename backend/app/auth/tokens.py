import uuid
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from ..config import settings
from ..services.redis_client import r
from ..db.session import get_db_session
from ..db.models import RefreshToken, EmailAction


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


def create_refresh_token(user_id: str, family: str | None = None, user_agent: str = None, ip_address: str = None) -> tuple[str, str]:
    """Return (token, family_id). family is constant across rotations."""
    family_id = family or str(uuid.uuid4())
    jti = str(uuid.uuid4())
    expires_at = _exp_days(settings.REFRESH_TTL_DAYS)
    
    payload = {
        "sub": user_id,
        "typ": "refresh",
        "jti": jti,
        "fam": family_id,
        "iat": int(_now().timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    
    # Store in database
    with get_db_session() as db:
        db_token = RefreshToken(
            user_id=uuid.UUID(user_id),
            jti=jti,
            family_id=family_id,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address
        )
        db.add(db_token)
        db.commit()
    
    token = jwt.encode(payload, settings.REFRESH_SECRET, algorithm="HS256")
    return token, family_id


def decode_access(token: str) -> dict:
    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if data.get("typ") != "access":
            raise JWTError("Wrong token type")
        jti = data.get("jti")
        if jti and is_revoked(jti):
            raise JWTError("Token revoked")
        return data
    except JWTError:
        raise


def decode_refresh(token: str) -> dict:
    try:
        data = jwt.decode(token, settings.REFRESH_SECRET, algorithms=["HS256"])
        if data.get("typ") != "refresh":
            raise JWTError("Wrong token type")
        
        # Check database for revocation
        jti = data.get("jti")
        if jti:
            with get_db_session() as db:
                db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
                if not db_token or db_token.revoked_at is not None:
                    raise JWTError("Token revoked")
                if db_token.expires_at < _now():
                    raise JWTError("Token expired")
        
        return data
    except JWTError:
        raise


def revoke_refresh_token(jti: str):
    """Revoke a refresh token by jti in database"""
    with get_db_session() as db:
        db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
        if db_token:
            db_token.revoked_at = _now()
            db.commit()


def revoke_all_user_tokens(user_id: str):
    """Revoke all refresh tokens for a user"""
    with get_db_session() as db:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == uuid.UUID(user_id),
            RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": _now()})
        db.commit()


# ---- Redis-based revocation for access tokens ----
def revoke_jti(jti: str, seconds: int):
    """Store jti in Redis blacklist with TTL equal to remaining token life."""
    if seconds > 0:
        r.setex(f"jwt:blacklist:{jti}", seconds, "1")


def is_revoked(jti: str) -> bool:
    return r.exists(f"jwt:blacklist:{jti}") == 1


# ---- Email verification/reset tokens ----
def create_email_token(user_id: str, token_type: str) -> str:
    """Create email verification or password reset token"""
    token = secrets.token_urlsafe(32)
    expires_at = _exp(60 * 24) if token_type == "VERIFY" else _exp(60)  # 24h for verify, 1h for reset
    
    with get_db_session() as db:
        # Revoke existing tokens of same type
        db.query(EmailAction).filter(
            EmailAction.user_id == uuid.UUID(user_id),
            EmailAction.type == token_type,
            EmailAction.used_at.is_(None)
        ).update({"used_at": _now()})
        
        # Create new token
        email_action = EmailAction(
            user_id=uuid.UUID(user_id),
            type=token_type,
            token=token,
            expires_at=expires_at
        )
        db.add(email_action)
        db.commit()
    
    return token


def verify_email_token(token: str, token_type: str) -> str | None:
    """Verify email token and return user_id if valid"""
    with get_db_session() as db:
        email_action = db.query(EmailAction).filter(
            EmailAction.token == token,
            EmailAction.type == token_type,
            EmailAction.used_at.is_(None),
            EmailAction.expires_at > _now()
        ).first()
        
        if email_action:
            email_action.used_at = _now()
            db.commit()
            return str(email_action.user_id)
    
    return None
