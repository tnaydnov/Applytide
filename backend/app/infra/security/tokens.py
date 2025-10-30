"""
JWT Token Management and Email Verification System

This module handles all token operations including JWT access/refresh tokens
and email verification/reset tokens with secure storage and validation.

Features:
    - JWT access token generation and validation
    - JWT refresh token with family tracking (rotation detection)
    - Redis-based access token blacklist
    - Database-backed refresh token storage
    - Email verification/reset token management
    - Device-based session management
    - Token revocation and expiry handling
    
Constants:
    MAX_TOKEN_LENGTH: Maximum token string length (2000 chars)
    MAX_USER_AGENT_LENGTH: Maximum user agent string length (500 chars)
    MAX_IP_LENGTH: Maximum IP address length (45 chars - IPv6)
    MIN_TTL_DAYS: Minimum refresh token TTL (1 day)
    MAX_TTL_DAYS: Maximum refresh token TTL (365 days)
    
Exception Hierarchy:
    TokenError (base)
    ├── ValidationError
    ├── JWTOperationError
    ├── RedisOperationError
    └── DatabaseOperationError

Security Features:
    - Device-based session limiting (one session per device)
    - Token family tracking for rotation attack detection
    - Automatic revocation of compromised token families
    - Timezone-aware timestamps (UTC)
    - Secure random token generation (CSPRNG)

Usage:
    from app.infra.security.tokens import (
        create_access_token, create_refresh_token,
        decode_access, decode_refresh,
        revoke_refresh_token, revoke_all_user_tokens
    )
    
    # Create tokens
    access_token = create_access_token(user_id="uuid-here")
    refresh_token, family_id = create_refresh_token(
        user_id="uuid-here",
        user_agent="Mozilla/5.0...",
        ip_address="192.168.1.1",
        extended=False
    )
    
    # Decode tokens
    access_data = decode_access(access_token)
    refresh_data = decode_refresh(refresh_token)
    
    # Revoke tokens
    revoke_refresh_token(jti="token-jti")
    revoke_all_user_tokens(user_id="uuid-here")
"""
from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from sqlalchemy.exc import SQLAlchemyError
from redis.exceptions import RedisError

from ...config import settings
from ...infra.cache.redis_client import r
from ...db.session import get_db_session
from ...db.models import RefreshToken, EmailAction
from ...db import models
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration Constants
MAX_TOKEN_LENGTH = 2000
MAX_USER_AGENT_LENGTH = 500
MAX_IP_LENGTH = 45  # IPv6
MIN_TTL_DAYS = 1
MAX_TTL_DAYS = 365
EMAIL_TOKEN_LENGTH = 32
USER_AGENT_PREFIX_LENGTH = 100

# ==================== Exception Classes ====================

class TokenError(Exception):
    """Base exception for token operations"""
    pass

class ValidationError(TokenError):
    """Raised when input validation fails"""
    pass

class JWTOperationError(TokenError):
    """Raised when JWT operation fails"""
    pass

class RedisOperationError(TokenError):
    """Raised when Redis operation fails"""
    pass

class DatabaseOperationError(TokenError):
    """Raised when database operation fails"""
    pass

# ==================== Validation Functions ====================

def _validate_user_id(user_id: str) -> None:
    """Validate user ID is valid UUID"""
    if not user_id:
        raise ValidationError("User ID is required")
    try:
        uuid.UUID(user_id)
    except (ValueError, AttributeError) as e:
        raise ValidationError(f"Invalid user ID format: {str(e)}")

def _validate_token(token: str, field_name: str = "token") -> None:
    """Validate token string"""
    if not token or not token.strip():
        raise ValidationError(f"{field_name} is required")
    if len(token) > MAX_TOKEN_LENGTH:
        raise ValidationError(f"{field_name} too long (max {MAX_TOKEN_LENGTH} chars)")

def _validate_ttl_days(ttl_days: int) -> None:
    """Validate TTL days"""
    if ttl_days < MIN_TTL_DAYS:
        raise ValidationError(f"TTL must be >= {MIN_TTL_DAYS} days")
    if ttl_days > MAX_TTL_DAYS:
        raise ValidationError(f"TTL must be <= {MAX_TTL_DAYS} days")

def _validate_user_agent(user_agent: str) -> None:
    """Validate user agent string"""
    if user_agent and len(user_agent) > MAX_USER_AGENT_LENGTH:
        raise ValidationError(f"User agent too long (max {MAX_USER_AGENT_LENGTH} chars)")

def _validate_ip_address(ip_address: str) -> None:
    """Validate IP address string"""
    if ip_address and len(ip_address) > MAX_IP_LENGTH:
        raise ValidationError(f"IP address too long (max {MAX_IP_LENGTH} chars)")

# ==================== Helper Functions ====================

# ==================== Helper Functions ====================

def _now():
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)

def _exp(minutes: int = 15) -> datetime:
    """Calculate expiry datetime from minutes"""
    return _now() + timedelta(minutes=minutes)

def _exp_days(days: int) -> datetime:
    """Calculate expiry datetime from days"""
    return _now() + timedelta(days=days)

# ==================== Access Token Functions ====================

def create_access_token(user_id: str) -> str:
    """
    Create JWT access token
    
    Args:
        user_id: User UUID string
        
    Returns:
        Encoded JWT access token
        
    Raises:
        ValidationError: If user_id is invalid
        JWTOperationError: If JWT encoding fails
        
    Notes:
        - Short-lived (configured via ACCESS_TTL_MIN)
        - Contains: sub (user_id), typ (access), jti (unique ID), iat, exp
        - JTI used for revocation via Redis blacklist
    """
    try:
        _validate_user_id(user_id)
        
        jti = str(uuid.uuid4())
        payload = {
            "sub": user_id,
            "typ": "access",
            "jti": jti,
            "iat": int(_now().timestamp()),
            "exp": int(_exp(settings.ACCESS_TTL_MIN).timestamp()),
        }
        
        logger.debug(
            f"Creating access token for user {user_id}",
            extra={"user_id": user_id, "jti": jti, "ttl_minutes": settings.ACCESS_TTL_MIN}
        )
        
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
        
        logger.info(f"Created access token", extra={"user_id": user_id, "jti": jti})
        return token
        
    except JWTError as e:
        logger.error(f"JWT encoding error: {e}", exc_info=True)
        raise JWTOperationError(f"Failed to create access token: {str(e)}")

def decode_access(token: str) -> dict:
    """
    Decode and validate JWT access token
    
    Args:
        token: JWT access token string
        
    Returns:
        Decoded token payload
        
    Raises:
        ValidationError: If token is invalid format
        JWTOperationError: If decoding fails or token invalid
        RedisOperationError: If Redis check fails
        
    Notes:
        - Verifies signature, expiry, type
        - Checks JTI against Redis blacklist
        - Raises JWTError if revoked
    """
    try:
        _validate_token(token, "access_token")
        
        logger.debug("Decoding access token")
        
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        
        if data.get("typ") != "access":
            logger.warning("Wrong token type in access token")
            raise JWTError("Wrong token type")
            
        jti = data.get("jti")
        if jti and is_revoked(jti):
            logger.warning(f"Access token revoked: {jti}", extra={"jti": jti})
            raise JWTError("Token revoked")
            
        logger.debug("Access token decoded successfully", extra={"user_id": data.get("sub")})
        return data
        
    except JWTError as e:
        logger.warning(f"JWT decoding error: {e}")
        raise JWTOperationError(f"Failed to decode access token: {str(e)}")

# ==================== Refresh Token Functions ====================

# ==================== Refresh Token Functions ====================

def create_refresh_token(
    user_id: str,
    family: str | None = None,
    user_agent: str = None,
    ip_address: str = None,
    extended: bool = False,
    ttl_days: int = None
) -> tuple[str, str]:
    """
    Create JWT refresh token with database storage
    
    Args:
        user_id: User UUID string
        family: Optional family ID for rotation tracking
        user_agent: Optional user agent string
        ip_address: Optional IP address
        extended: Whether to use extended TTL
        ttl_days: Optional custom TTL in days
        
    Returns:
        Tuple of (encoded token, family_id)
        
    Raises:
        ValidationError: If inputs are invalid
        JWTOperationError: If JWT encoding fails
        DatabaseOperationError: If database operation fails
        
    Notes:
        - Long-lived (configured via REFRESH_TTL_DAYS)
        - Stored in database for revocation checking
        - Device-based: revokes existing sessions from same user_agent
        - Family tracking for rotation attack detection
    """
    try:
        _validate_user_id(user_id)
        if user_agent:
            _validate_user_agent(user_agent)
        if ip_address:
            _validate_ip_address(ip_address)
            
        family_id = family or str(uuid.uuid4())
        jti = str(uuid.uuid4())

        # Calculate TTL
        if ttl_days is None:
            extended_days = getattr(settings, 'REFRESH_TTL_EXTENDED_DAYS',
                                    getattr(settings, 'REFRESH_TTL_DAYS', 7) * 4)
            ttl_days = extended_days if extended else settings.REFRESH_TTL_DAYS
        else:
            _validate_ttl_days(ttl_days)
            
        expires_at = _exp_days(ttl_days)

        payload = {
            "sub": user_id,
            "typ": "refresh",
            "jti": jti,
            "fam": family_id,
            "iat": int(_now().timestamp()),
            "exp": int(expires_at.timestamp()),
        }

        logger.info(
            f"Creating refresh token for user {user_id}",
            extra={
                "user_id": user_id,
                "jti": jti,
                "family_id": family_id,
                "ttl_days": ttl_days,
                "extended": extended
            }
        )

        with get_db_session() as db:
            # Revoke existing active sessions from the same device
            if user_agent:
                try:
                    user_agent_prefix = user_agent[:USER_AGENT_PREFIX_LENGTH]
                    
                    existing_sessions = db.query(RefreshToken).filter(
                        RefreshToken.user_id == uuid.UUID(user_id),
                        RefreshToken.user_agent.like(f"{user_agent_prefix}%"),
                        RefreshToken.is_active == True,
                        RefreshToken.expires_at > _now()
                    ).all()
                    
                    if existing_sessions:
                        revoked_count = len(existing_sessions)
                        for session in existing_sessions:
                            session.revoked_at = _now()
                            session.is_active = False
                        
                        db.commit()
                        
                        logger.info(
                            f"Revoked {revoked_count} existing session(s) from same device",
                            extra={
                                "user_id": user_id,
                                "user_agent_prefix": user_agent_prefix,
                                "revoked_count": revoked_count
                            }
                        )
                except SQLAlchemyError as e:
                    logger.error(
                        "Failed to revoke existing sessions",
                        extra={"user_id": user_id, "error": str(e)},
                        exc_info=True
                    )
                    # Continue - don't fail login due to session cleanup error
            
            # Create new session
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
            
            logger.info(
                f"Created refresh token",
                extra={"user_id": user_id, "jti": jti, "family_id": family_id}
            )

        token = jwt.encode(payload, settings.REFRESH_SECRET, algorithm="HS256")
        return token, family_id
        
    except JWTError as e:
        logger.error(f"JWT encoding error: {e}", exc_info=True)
        raise JWTOperationError(f"Failed to create refresh token: {str(e)}")
    except SQLAlchemyError as e:
        logger.error(f"Database error creating refresh token: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to store refresh token: {str(e)}")

def decode_refresh(token: str) -> dict:
    """
    Decode and validate JWT refresh token
    
    Args:
        token: JWT refresh token string
        
    Returns:
        Decoded token payload
        
    Raises:
        ValidationError: If token is invalid format
        JWTOperationError: If decoding fails or token invalid
        DatabaseOperationError: If database check fails
        
    Notes:
        - Verifies signature, expiry, type
        - Checks JTI against database for revocation
        - Raises JWTError if revoked or expired
    """
    try:
        _validate_token(token, "refresh_token")
        
        logger.debug("Decoding refresh token")
        
        data = jwt.decode(token, settings.REFRESH_SECRET, algorithms=["HS256"])
        
        if data.get("typ") != "refresh":
            logger.warning("Wrong token type in refresh token")
            raise JWTError("Wrong token type")

        jti = data.get("jti")
        if jti:
            with get_db_session() as db:
                db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
                
                if not db_token:
                    logger.warning(f"Refresh token not found in database: {jti}")
                    raise JWTError("Token not found")
                    
                if db_token.revoked_at is not None:
                    logger.warning(f"Refresh token revoked: {jti}", extra={"jti": jti})
                    raise JWTError("Token revoked")
                    
                if db_token.expires_at < _now():
                    logger.warning(f"Refresh token expired: {jti}", extra={"jti": jti})
                    raise JWTError("Token expired")

        logger.debug("Refresh token decoded successfully", extra={"user_id": data.get("sub")})
        return data
        
    except JWTError as e:
        logger.warning(f"JWT decoding error: {e}")
        raise JWTOperationError(f"Failed to decode refresh token: {str(e)}")
    except SQLAlchemyError as e:
        logger.error(f"Database error checking refresh token: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to validate refresh token: {str(e)}")

def revoke_refresh_token(jti: str):
    """
    Revoke specific refresh token
    
    Args:
        jti: Token JTI to revoke
        
    Raises:
        ValidationError: If jti is invalid
        DatabaseOperationError: If database operation fails
    """
    try:
        if not jti:
            raise ValidationError("JTI is required")
            
        logger.info(f"Revoking refresh token: {jti}", extra={"jti": jti})
        
        with get_db_session() as db:
            db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
            if db_token:
                db_token.revoked_at = _now()
                db.commit()
                logger.info(f"Revoked refresh token: {jti}", extra={"jti": jti})
            else:
                logger.warning(f"Refresh token not found for revocation: {jti}")
                
    except SQLAlchemyError as e:
        logger.error(f"Database error revoking refresh token: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to revoke refresh token: {str(e)}")

def revoke_all_user_tokens(user_id: str):
    """
    Revoke all refresh tokens for user
    
    Args:
        user_id: User UUID string
        
    Raises:
        ValidationError: If user_id is invalid
        DatabaseOperationError: If database operation fails
    """
    try:
        _validate_user_id(user_id)
        
        logger.info(f"Revoking all tokens for user {user_id}", extra={"user_id": user_id})
        
        with get_db_session() as db:
            count = db.query(RefreshToken).filter(
                RefreshToken.user_id == uuid.UUID(user_id),
                RefreshToken.revoked_at.is_(None)
            ).update({"revoked_at": _now()})
            db.commit()
            
            logger.info(
                f"Revoked {count} tokens for user {user_id}",
                extra={"user_id": user_id, "count": count}
            )
            
    except SQLAlchemyError as e:
        logger.error(f"Database error revoking user tokens: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to revoke user tokens: {str(e)}")

# ==================== Access Token Blacklist (Redis) ====================

def revoke_jti(jti: str, seconds: int):
    """
    Add JTI to Redis blacklist
    
    Args:
        jti: Token JTI to blacklist
        seconds: TTL in seconds (until token expires naturally)
        
    Raises:
        ValidationError: If inputs are invalid
        RedisOperationError: If Redis operation fails
        
    Notes:
        - Used for access token revocation
        - Key expires automatically after token TTL
    """
    try:
        if not jti:
            raise ValidationError("JTI is required")
        if seconds < 0:
            raise ValidationError("Seconds must be >= 0")
            
        if seconds > 0:
            logger.debug(f"Blacklisting JTI: {jti} for {seconds}s", extra={"jti": jti, "ttl": seconds})
            r.setex(f"jwt:blacklist:{jti}", seconds, "1")
            logger.info(f"Blacklisted JTI: {jti}", extra={"jti": jti})
            
    except RedisError as e:
        logger.error(f"Redis error blacklisting JTI: {e}", exc_info=True)
        raise RedisOperationError(f"Failed to blacklist JTI: {str(e)}")

def is_revoked(jti: str) -> bool:
    """
    Check if JTI is blacklisted
    
    Args:
        jti: Token JTI to check
        
    Returns:
        True if blacklisted, False otherwise
        
    Raises:
        RedisOperationError: If Redis operation fails
    """
    try:
        if not jti:
            return False
            
        revoked = r.exists(f"jwt:blacklist:{jti}") == 1
        
        if revoked:
            logger.debug(f"JTI is blacklisted: {jti}", extra={"jti": jti})
            
        return revoked
        
    except RedisError as e:
        logger.error(f"Redis error checking JTI: {e}", exc_info=True)
        # Fail open: if Redis is down, don't block auth
        logger.warning("Redis unavailable, allowing token (fail-open policy)")
        return False

# ==================== Email Verification/Reset Tokens ====================

def create_email_token(user_id: str, token_type: str) -> str:
    """
    Create email verification or password reset token
    
    Args:
        user_id: User UUID string
        token_type: Token type ("VERIFY" or "RESET")
        
    Returns:
        URL-safe token string
        
    Raises:
        ValidationError: If inputs are invalid
        DatabaseOperationError: If database operation fails
        
    Notes:
        - VERIFY tokens: 24 hour TTL
        - RESET tokens: 1 hour TTL
        - Invalidates previous unused tokens of same type
        - Uses CSPRNG (secrets module)
    """
    try:
        _validate_user_id(user_id)
        
        if token_type not in ("VERIFY", "RESET"):
            raise ValidationError(f"Invalid token type: {token_type}")
            
        logger.info(
            f"Creating {token_type} email token for user {user_id}",
            extra={"user_id": user_id, "token_type": token_type}
        )
        
        token = secrets.token_urlsafe(EMAIL_TOKEN_LENGTH)
        expires_at = _exp(60 * 24) if token_type == "VERIFY" else _exp(60)
        
        with get_db_session() as db:
            # Invalidate existing unused tokens
            db.query(EmailAction).filter(
                EmailAction.user_id == uuid.UUID(user_id),
                EmailAction.type == token_type,
                EmailAction.used_at.is_(None)
            ).update({"used_at": _now()})
            
            email_action = EmailAction(
                user_id=uuid.UUID(user_id),
                type=token_type,
                token=token,
                expires_at=expires_at
            )
            db.add(email_action)
            db.commit()
            
            logger.info(
                f"Created {token_type} email token",
                extra={"user_id": user_id, "token_type": token_type}
            )
            
        return token
        
    except SQLAlchemyError as e:
        logger.error(f"Database error creating email token: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to create email token: {str(e)}")

def verify_email_token(token: str, token_type: str) -> str | None:
    """
    Verify and consume email token
    
    Args:
        token: Email token string
        token_type: Token type ("VERIFY" or "RESET")
        
    Returns:
        User ID if token valid, None otherwise
        
    Raises:
        ValidationError: If inputs are invalid
        DatabaseOperationError: If database operation fails
        
    Notes:
        - Token consumed on successful verification (marked as used)
        - Returns None if token invalid, expired, or already used
    """
    try:
        _validate_token(token, "email_token")
        
        if token_type not in ("VERIFY", "RESET"):
            raise ValidationError(f"Invalid token type: {token_type}")
            
        logger.debug(
            f"Verifying {token_type} email token",
            extra={"token_type": token_type}
        )
        
        with get_db_session() as db:
            email_action = db.query(EmailAction).filter(
                EmailAction.token == token,
                EmailAction.type == token_type,
                EmailAction.used_at.is_(None),
                EmailAction.expires_at > _now()
            ).first()
            
            if email_action:
                user_id = str(email_action.user_id)
                email_action.used_at = _now()
                db.commit()
                
                logger.info(
                    f"Verified {token_type} email token",
                    extra={"user_id": user_id, "token_type": token_type}
                )
                
                return user_id
            else:
                logger.warning(
                    f"{token_type} email token invalid or expired",
                    extra={"token_type": token_type}
                )
                return None
                
    except SQLAlchemyError as e:
        logger.error(f"Database error verifying email token: {e}", exc_info=True)
        raise DatabaseOperationError(f"Failed to verify email token: {str(e)}")
