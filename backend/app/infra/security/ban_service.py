"""
Ban Service - User and IP Address Banning System

This module provides comprehensive functionality for banning and managing
banned entities (email addresses and IP addresses) to prevent abuse.

Features:
- Ban users by email address or IP address
- Check if email/IP is banned before registration/login
- Support for temporary bans with expiration
- Audit trail with ban reasons and admin tracking
- Soft delete support (deactivate instead of delete)

Security Considerations:
- Case-insensitive email matching
- IP address normalization and validation
- Prevents duplicate bans
- Rate limit integration recommended

Usage:
    from app.infra.security.ban_service import BanService
    
    # Check if email is banned
    if BanService.is_email_banned(db, "user@example.com"):
        raise HTTPException(status_code=403, detail="Account is banned")
    
    # Ban a user
    BanService.ban_user(
        db=db,
        user_id=user.id,
        email=user.email,
        reason="Violated terms of service",
        banned_by_admin_id=admin.id
    )
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import logging

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.models import BannedEntity, User

logger = logging.getLogger(__name__)


class BanServiceError(Exception):
    """Base exception for ban service errors"""
    pass


class DuplicateBanError(BanServiceError):
    """Raised when attempting to ban an already banned entity"""
    pass


class InvalidBanDataError(BanServiceError):
    """Raised when ban data validation fails"""
    pass


class BanService:
    """Service for managing user and IP bans"""
    
    # Constants
    ENTITY_TYPE_EMAIL = "email"
    ENTITY_TYPE_IP = "ip"
    MAX_REASON_LENGTH = 2000
    
    @staticmethod
    def _normalize_email(email: str) -> str:
        """
        Normalize email address for consistent matching.
        
        Args:
            email: Email address to normalize
            
        Returns:
            Normalized email (lowercase, stripped)
            
        Raises:
            InvalidBanDataError: If email is invalid
        """
        if not email or not isinstance(email, str):
            raise InvalidBanDataError("Email must be a non-empty string")
        
        normalized = email.strip().lower()
        
        if not normalized or "@" not in normalized:
            raise InvalidBanDataError(f"Invalid email format: {email}")
        
        if len(normalized) > 320:  # RFC 5321 max email length
            raise InvalidBanDataError(f"Email exceeds maximum length: {len(normalized)} > 320")
        
        return normalized
    
    @staticmethod
    def _normalize_ip(ip_address: str) -> str:
        """
        Normalize IP address for consistent matching.
        
        Args:
            ip_address: IP address to normalize (IPv4 or IPv6)
            
        Returns:
            Normalized IP address (stripped)
            
        Raises:
            InvalidBanDataError: If IP is invalid
        """
        if not ip_address or not isinstance(ip_address, str):
            raise InvalidBanDataError("IP address must be a non-empty string")
        
        normalized = ip_address.strip()
        
        if not normalized:
            raise InvalidBanDataError("IP address cannot be empty")
        
        if len(normalized) > 45:  # IPv6 max length
            raise InvalidBanDataError(f"IP address exceeds maximum length: {len(normalized)} > 45")
        
        # Basic validation - contains only valid IP characters
        valid_chars = set("0123456789abcdefABCDEF.:[]")
        if not all(c in valid_chars for c in normalized):
            raise InvalidBanDataError(f"Invalid IP address format: {ip_address}")
        
        return normalized
    
    @staticmethod
    def _validate_reason(reason: Optional[str]) -> Optional[str]:
        """
        Validate and truncate ban reason if necessary.
        
        Args:
            reason: Ban reason text
            
        Returns:
            Validated reason (truncated if too long)
        """
        if reason is None:
            return None
        
        if not isinstance(reason, str):
            logger.warning(f"Ban reason is not a string, converting: {type(reason)}")
            reason = str(reason)
        
        reason = reason.strip()
        
        if len(reason) > BanService.MAX_REASON_LENGTH:
            logger.warning(
                f"Ban reason exceeds max length, truncating: {len(reason)} > {BanService.MAX_REASON_LENGTH}"
            )
            reason = reason[:BanService.MAX_REASON_LENGTH]
        
        return reason if reason else None
    
    @staticmethod
    def is_email_banned(db: Session, email: str) -> bool:
        """
        Check if an email address is currently banned.
        
        Args:
            db: Database session
            email: Email address to check
            
        Returns:
            True if email is banned and active, False otherwise
            
        Raises:
            InvalidBanDataError: If email format is invalid
        """
        try:
            normalized_email = BanService._normalize_email(email)
            
            # Check for active ban that hasn't expired
            now = datetime.now(timezone.utc)
            ban = db.query(BannedEntity).filter(
                and_(
                    BannedEntity.entity_type == BanService.ENTITY_TYPE_EMAIL,
                    BannedEntity.entity_value == normalized_email,
                    BannedEntity.is_active == True,
                    or_(
                        BannedEntity.expires_at.is_(None),
                        BannedEntity.expires_at > now
                    )
                )
            ).first()
            
            is_banned = ban is not None
            
            if is_banned:
                logger.warning(
                    f"Banned email attempted access",
                    extra={
                        "email": normalized_email,
                        "ban_id": str(ban.id),
                        "banned_at": ban.banned_at.isoformat(),
                        "reason": ban.reason
                    }
                )
            
            return is_banned
            
        except InvalidBanDataError:
            logger.error("Invalid email format in ban check", extra={"email_hash": hash(email) % 10000})
            raise
        except Exception as e:
            logger.error("Error checking email ban", extra={"email_hash": hash(email) % 10000}, exc_info=True)
            # Fail open - don't block access on error, but log it
            return False
    
    @staticmethod
    def is_ip_banned(db: Session, ip_address: str) -> bool:
        """
        Check if an IP address is currently banned.
        
        Args:
            db: Database session
            ip_address: IP address to check
            
        Returns:
            True if IP is banned and active, False otherwise
            
        Raises:
            InvalidBanDataError: If IP format is invalid
        """
        try:
            normalized_ip = BanService._normalize_ip(ip_address)
            
            # Check for active ban that hasn't expired
            now = datetime.now(timezone.utc)
            ban = db.query(BannedEntity).filter(
                and_(
                    BannedEntity.entity_type == BanService.ENTITY_TYPE_IP,
                    BannedEntity.entity_value == normalized_ip,
                    BannedEntity.is_active == True,
                    or_(
                        BannedEntity.expires_at.is_(None),
                        BannedEntity.expires_at > now
                    )
                )
            ).first()
            
            is_banned = ban is not None
            
            if is_banned:
                logger.warning(
                    f"Banned IP attempted access",
                    extra={
                        "ip_address": normalized_ip,
                        "ban_id": str(ban.id),
                        "banned_at": ban.banned_at.isoformat(),
                        "reason": ban.reason
                    }
                )
            
            return is_banned
            
        except InvalidBanDataError:
            logger.error("Invalid IP format in ban check", extra={"ip_hash": hash(ip_address) % 10000})
            raise
        except Exception as e:
            logger.error("Error checking IP ban", extra={"ip_hash": hash(ip_address) % 10000}, exc_info=True)
            # Fail open - don't block access on error, but log it
            return False
    
    @staticmethod
    def ban_email(
        db: Session,
        email: str,
        reason: Optional[str] = None,
        banned_by_admin_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        expires_at: Optional[datetime] = None
    ) -> BannedEntity:
        """
        Ban an email address.
        
        Args:
            db: Database session
            email: Email address to ban
            reason: Reason for ban (optional)
            banned_by_admin_id: ID of admin issuing the ban (optional)
            user_id: ID of user being banned (optional, for audit trail)
            expires_at: Expiration datetime (None = permanent ban)
            
        Returns:
            Created BannedEntity record
            
        Raises:
            InvalidBanDataError: If email format is invalid
            DuplicateBanError: If email is already banned
        """
        try:
            normalized_email = BanService._normalize_email(email)
            validated_reason = BanService._validate_reason(reason)
            
            # Check if already banned
            existing_ban = db.query(BannedEntity).filter(
                BannedEntity.entity_type == BanService.ENTITY_TYPE_EMAIL,
                BannedEntity.entity_value == normalized_email,
                BannedEntity.is_active == True
            ).first()
            
            if existing_ban:
                logger.warning(
                    f"Attempted to ban already banned email",
                    extra={"email": normalized_email, "existing_ban_id": str(existing_ban.id)}
                )
                raise DuplicateBanError(f"Email is already banned: {email}")
            
            # Create ban record
            ban = BannedEntity(
                entity_type=BanService.ENTITY_TYPE_EMAIL,
                entity_value=normalized_email,
                reason=validated_reason,
                banned_by=banned_by_admin_id,
                banned_user_id=user_id,
                expires_at=expires_at,
                is_active=True
            )
            
            db.add(ban)
            db.commit()
            db.refresh(ban)
            
            logger.info(
                f"Email banned successfully",
                extra={
                    "ban_id": str(ban.id),
                    "email": normalized_email,
                    "banned_by": str(banned_by_admin_id) if banned_by_admin_id else None,
                    "user_id": str(user_id) if user_id else None,
                    "reason": validated_reason,
                    "expires_at": expires_at.isoformat() if expires_at else "permanent"
                }
            )
            
            return ban
            
        except (InvalidBanDataError, DuplicateBanError):
            db.rollback()
            raise
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Database integrity error banning email: {e}", extra={"email": email})
            raise DuplicateBanError(f"Email is already banned: {email}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error banning email: {e}", extra={"email": email})
            raise BanServiceError(f"Failed to ban email: {str(e)}")
    
    @staticmethod
    def ban_ip(
        db: Session,
        ip_address: str,
        reason: Optional[str] = None,
        banned_by_admin_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        expires_at: Optional[datetime] = None
    ) -> BannedEntity:
        """
        Ban an IP address.
        
        Args:
            db: Database session
            ip_address: IP address to ban
            reason: Reason for ban (optional)
            banned_by_admin_id: ID of admin issuing the ban (optional)
            user_id: ID of user associated with IP (optional, for audit trail)
            expires_at: Expiration datetime (None = permanent ban)
            
        Returns:
            Created BannedEntity record
            
        Raises:
            InvalidBanDataError: If IP format is invalid
            DuplicateBanError: If IP is already banned
        """
        try:
            normalized_ip = BanService._normalize_ip(ip_address)
            validated_reason = BanService._validate_reason(reason)
            
            # Check if already banned
            existing_ban = db.query(BannedEntity).filter(
                BannedEntity.entity_type == BanService.ENTITY_TYPE_IP,
                BannedEntity.entity_value == normalized_ip,
                BannedEntity.is_active == True
            ).first()
            
            if existing_ban:
                logger.warning(
                    f"Attempted to ban already banned IP",
                    extra={"ip_address": normalized_ip, "existing_ban_id": str(existing_ban.id)}
                )
                raise DuplicateBanError(f"IP address is already banned: {ip_address}")
            
            # Create ban record
            ban = BannedEntity(
                entity_type=BanService.ENTITY_TYPE_IP,
                entity_value=normalized_ip,
                reason=validated_reason,
                banned_by=banned_by_admin_id,
                banned_user_id=user_id,
                expires_at=expires_at,
                is_active=True
            )
            
            db.add(ban)
            db.commit()
            db.refresh(ban)
            
            logger.info(
                f"IP address banned successfully",
                extra={
                    "ban_id": str(ban.id),
                    "ip_address": normalized_ip,
                    "banned_by": str(banned_by_admin_id) if banned_by_admin_id else None,
                    "user_id": str(user_id) if user_id else None,
                    "reason": validated_reason,
                    "expires_at": expires_at.isoformat() if expires_at else "permanent"
                }
            )
            
            return ban
            
        except (InvalidBanDataError, DuplicateBanError):
            db.rollback()
            raise
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Database integrity error banning IP: {e}", extra={"ip_address": ip_address})
            raise DuplicateBanError(f"IP address is already banned: {ip_address}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error banning IP: {e}", extra={"ip_address": ip_address})
            raise BanServiceError(f"Failed to ban IP: {str(e)}")
    
    @staticmethod
    def ban_user(
        db: Session,
        user_id: uuid.UUID,
        email: str,
        ip_address: Optional[str] = None,
        reason: Optional[str] = None,
        banned_by_admin_id: Optional[uuid.UUID] = None,
        ban_duration_days: Optional[int] = None
    ) -> Tuple[BannedEntity, Optional[BannedEntity]]:
        """
        Ban a user by both email and optionally IP address.
        
        This is the recommended method for banning users as it prevents
        them from creating new accounts with the same email or IP.
        
        Args:
            db: Database session
            user_id: ID of user to ban
            email: User's email address
            ip_address: User's IP address (optional)
            reason: Reason for ban (optional)
            banned_by_admin_id: ID of admin issuing the ban (optional)
            ban_duration_days: Number of days until ban expires (None = permanent)
            
        Returns:
            Tuple of (email_ban, ip_ban) where ip_ban may be None
            
        Raises:
            InvalidBanDataError: If email or IP format is invalid
            DuplicateBanError: If email or IP is already banned
        """
        expires_at = None
        if ban_duration_days is not None:
            if ban_duration_days <= 0:
                raise InvalidBanDataError("Ban duration must be positive")
            expires_at = datetime.now(timezone.utc) + timedelta(days=ban_duration_days)
        
        email_ban = BanService.ban_email(
            db=db,
            email=email,
            reason=reason,
            banned_by_admin_id=banned_by_admin_id,
            user_id=user_id,
            expires_at=expires_at
        )
        
        ip_ban = None
        if ip_address:
            try:
                ip_ban = BanService.ban_ip(
                    db=db,
                    ip_address=ip_address,
                    reason=reason,
                    banned_by_admin_id=banned_by_admin_id,
                    user_id=user_id,
                    expires_at=expires_at
                )
            except Exception as e:
                logger.error(
                    f"Failed to ban IP for user, continuing with email ban only: {e}",
                    extra={"user_id": str(user_id), "ip_address": ip_address}
                )
        
        logger.info(
            f"User banned successfully",
            extra={
                "user_id": str(user_id),
                "email_ban_id": str(email_ban.id),
                "ip_ban_id": str(ip_ban.id) if ip_ban else None,
                "banned_by": str(banned_by_admin_id) if banned_by_admin_id else None,
                "duration_days": ban_duration_days or "permanent"
            }
        )
        
        return email_ban, ip_ban
    
    @staticmethod
    def unban_email(
        db: Session,
        email: str,
        unbanned_by_admin_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Unban an email address.
        
        Args:
            db: Database session
            email: Email address to unban
            unbanned_by_admin_id: ID of admin removing the ban (optional)
            
        Returns:
            True if email was unbanned, False if no active ban found
            
        Raises:
            InvalidBanDataError: If email format is invalid
        """
        try:
            normalized_email = BanService._normalize_email(email)
            
            # Find active ban
            ban = db.query(BannedEntity).filter(
                BannedEntity.entity_type == BanService.ENTITY_TYPE_EMAIL,
                BannedEntity.entity_value == normalized_email,
                BannedEntity.is_active == True
            ).first()
            
            if not ban:
                logger.info(f"No active ban found for email", extra={"email": normalized_email})
                return False
            
            # Deactivate ban
            ban.is_active = False
            ban.unbanned_at = datetime.now(timezone.utc)
            ban.unbanned_by = unbanned_by_admin_id
            
            db.commit()
            
            logger.info(
                f"Email unbanned successfully",
                extra={
                    "ban_id": str(ban.id),
                    "email": normalized_email,
                    "unbanned_by": str(unbanned_by_admin_id) if unbanned_by_admin_id else None
                }
            )
            
            return True
            
        except InvalidBanDataError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error unbanning email: {e}", extra={"email": email})
            raise BanServiceError(f"Failed to unban email: {str(e)}")
    
    @staticmethod
    def unban_ip(
        db: Session,
        ip_address: str,
        unbanned_by_admin_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Unban an IP address.
        
        Args:
            db: Database session
            ip_address: IP address to unban
            unbanned_by_admin_id: ID of admin removing the ban (optional)
            
        Returns:
            True if IP was unbanned, False if no active ban found
            
        Raises:
            InvalidBanDataError: If IP format is invalid
        """
        try:
            normalized_ip = BanService._normalize_ip(ip_address)
            
            # Find active ban
            ban = db.query(BannedEntity).filter(
                BannedEntity.entity_type == BanService.ENTITY_TYPE_IP,
                BannedEntity.entity_value == normalized_ip,
                BannedEntity.is_active == True
            ).first()
            
            if not ban:
                logger.info(f"No active ban found for IP", extra={"ip_address": normalized_ip})
                return False
            
            # Deactivate ban
            ban.is_active = False
            ban.unbanned_at = datetime.now(timezone.utc)
            ban.unbanned_by = unbanned_by_admin_id
            
            db.commit()
            
            logger.info(
                f"IP unbanned successfully",
                extra={
                    "ban_id": str(ban.id),
                    "ip_address": normalized_ip,
                    "unbanned_by": str(unbanned_by_admin_id) if unbanned_by_admin_id else None
                }
            )
            
            return True
            
        except InvalidBanDataError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error unbanning IP: {e}", extra={"ip_address": ip_address})
            raise BanServiceError(f"Failed to unban IP: {str(e)}")
    
    @staticmethod
    def unban_user(
        db: Session,
        user_id: uuid.UUID,
        unbanned_by_admin_id: Optional[uuid.UUID] = None
    ) -> Tuple[int, int]:
        """
        Unban all bans associated with a user (email and IP).
        
        Args:
            db: Database session
            user_id: ID of user to unban
            unbanned_by_admin_id: ID of admin removing the bans (optional)
            
        Returns:
            Tuple of (email_bans_removed, ip_bans_removed)
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Find all active bans for this user
            bans = db.query(BannedEntity).filter(
                BannedEntity.banned_user_id == user_id,
                BannedEntity.is_active == True
            ).all()
            
            if not bans:
                logger.info(f"No active bans found for user", extra={"user_id": str(user_id)})
                return (0, 0)
            
            email_count = 0
            ip_count = 0
            
            for ban in bans:
                ban.is_active = False
                ban.unbanned_at = now
                ban.unbanned_by = unbanned_by_admin_id
                
                if ban.entity_type == BanService.ENTITY_TYPE_EMAIL:
                    email_count += 1
                else:
                    ip_count += 1
            
            db.commit()
            
            logger.info(
                f"User unbanned successfully",
                extra={
                    "user_id": str(user_id),
                    "email_bans_removed": email_count,
                    "ip_bans_removed": ip_count,
                    "unbanned_by": str(unbanned_by_admin_id) if unbanned_by_admin_id else None
                }
            )
            
            return (email_count, ip_count)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error unbanning user: {e}", extra={"user_id": str(user_id)})
            raise BanServiceError(f"Failed to unban user: {str(e)}")
    
    @staticmethod
    def get_user_bans(db: Session, user_id: uuid.UUID) -> list[BannedEntity]:
        """
        Get all bans (active and inactive) for a specific user.
        
        Args:
            db: Database session
            user_id: ID of user
            
        Returns:
            List of BannedEntity records
        """
        try:
            bans = db.query(BannedEntity).filter(
                BannedEntity.banned_user_id == user_id
            ).order_by(BannedEntity.banned_at.desc()).all()
            
            return bans
            
        except Exception as e:
            logger.error(f"Error fetching user bans: {e}", extra={"user_id": str(user_id)})
            return []
    
    @staticmethod
    def cleanup_expired_bans(db: Session) -> int:
        """
        Deactivate expired bans (where expires_at has passed).
        
        This should be run periodically (e.g., daily cron job) to clean up
        expired temporary bans.
        
        Args:
            db: Database session
            
        Returns:
            Number of bans deactivated
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Find expired active bans
            expired_bans = db.query(BannedEntity).filter(
                BannedEntity.is_active == True,
                BannedEntity.expires_at.isnot(None),
                BannedEntity.expires_at <= now
            ).all()
            
            count = 0
            for ban in expired_bans:
                ban.is_active = False
                ban.unbanned_at = now
                count += 1
            
            if count > 0:
                db.commit()
                logger.info(f"Cleaned up expired bans", extra={"count": count})
            
            return count
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning up expired bans: {e}")
            return 0
