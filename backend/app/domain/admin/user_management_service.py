# backend/app/domain/admin/user_management_service.py
"""Enhanced user management service for admin operations"""
from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ...db import models
from ...infra.logging import get_logger

logger = get_logger(__name__)


class UserManagementService:
    """Service for enhanced user management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== BAN/UNBAN USER ====================
    
    def ban_user(
        self,
        user_id: UUID,
        admin_id: UUID,
        reason: str,
        revoke_sessions: bool = True
    ) -> bool:
        """
        Ban a user and optionally revoke all their sessions
        
        Args:
            user_id: User to ban
            admin_id: Admin performing the ban
            reason: Reason for ban (for audit trail)
            revoke_sessions: Whether to terminate all active sessions
            
        Returns:
            True if successful, False if user not found
        """
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            logger.warning(f"Attempted to ban non-existent user: {user_id}")
            return False
        
        # Prevent banning yourself
        if user_id == admin_id:
            logger.error(f"Admin {admin_id} attempted to ban themselves")
            raise ValueError("Cannot ban yourself")
        
        # Update user ban status
        user.is_banned = True
        user.banned_at = datetime.now(timezone.utc)
        user.ban_reason = reason
        user.banned_by_admin_id = admin_id
        
        # Revoke all refresh tokens
        if revoke_sessions:
            self.db.query(models.RefreshToken).filter(
                and_(
                    models.RefreshToken.user_id == user_id,
                    models.RefreshToken.revoked_at.is_(None)
                )
            ).update({
                "revoked_at": datetime.now(timezone.utc),
                "is_active": False
            })
            
            # Terminate all active sessions
            self.db.query(models.ActiveSession).filter(
                models.ActiveSession.user_id == user_id
            ).delete()
        
        self.db.commit()
        
        logger.warning(
            f"User banned",
            extra={
                "user_id": str(user_id),
                "admin_id": str(admin_id),
                "reason": reason,
                "revoked_sessions": revoke_sessions
            }
        )
        
        return True
    
    def unban_user(self, user_id: UUID, admin_id: UUID, reason: str) -> bool:
        """Unban a user"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False
        
        user.is_banned = False
        user.banned_at = None
        user.ban_reason = None
        user.banned_by_admin_id = None
        
        self.db.commit()
        
        logger.info(
            f"User unbanned",
            extra={
                "user_id": str(user_id),
                "admin_id": str(admin_id),
                "reason": reason
            }
        )
        
        return True
    
    # ==================== DELETE USER ====================
    
    def delete_user(
        self,
        user_id: UUID,
        admin_id: UUID,
        reason: str,
        hard_delete: bool = False
    ) -> bool:
        """
        Delete a user (soft delete by default, hard delete optional)
        
        Soft delete: Marks user as deleted, anonymizes PII, keeps data for referential integrity
        Hard delete: Completely removes user and all related data (CASCADE)
        
        Args:
            user_id: User to delete
            admin_id: Admin performing the deletion
            reason: Reason for deletion (audit trail)
            hard_delete: If True, permanently delete all user data
            
        Returns:
            True if successful, False if user not found
        """
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False
        
        # Prevent deleting yourself
        if user_id == admin_id:
            raise ValueError("Cannot delete yourself")
        
        if hard_delete:
            # Hard delete - CASCADE will handle related records
            # Due to ForeignKey constraints, this will delete:
            # - Applications, Jobs, Resumes, Reminders, etc.
            logger.critical(
                "HARD DELETE: Permanently deleting user and all data",
                extra={
                    "user_id": str(user_id),
                    "admin_id": str(admin_id),
                    "reason": reason,
                    "email": user.email
                }
            )
            
            # Delete all related data explicitly for logging
            self.db.query(models.ActiveSession).filter(
                models.ActiveSession.user_id == user_id
            ).delete()
            
            self.db.query(models.RefreshToken).filter(
                models.RefreshToken.user_id == user_id
            ).delete()
            
            # The rest will cascade
            self.db.delete(user)
        else:
            # Soft delete - anonymize and mark as deleted
            logger.warning(
                "SOFT DELETE: Anonymizing user account",
                extra={
                    "user_id": str(user_id),
                    "admin_id": str(admin_id),
                    "reason": reason,
                    "original_email": user.email
                }
            )
            
            # Anonymize PII
            user.email = f"deleted_user_{user_id}@deleted.local"
            user.full_name = "Deleted User"
            user.first_name = None
            user.last_name = None
            user.password_hash = None
            user.bio = None
            user.phone = None
            user.location = None
            user.website = None
            user.linkedin_url = None
            user.github_url = None
            user.avatar_url = None
            user.google_avatar_url = None
            user.google_id = None
            
            # Ban the account
            user.is_banned = True
            user.banned_at = datetime.now(timezone.utc)
            user.ban_reason = f"Account deleted: {reason}"
            user.banned_by_admin_id = admin_id
            
            # Revoke all tokens and sessions
            self.db.query(models.RefreshToken).filter(
                and_(
                    models.RefreshToken.user_id == user_id,
                    models.RefreshToken.revoked_at.is_(None)
                )
            ).update({
                "revoked_at": datetime.now(timezone.utc),
                "is_active": False
            })
            
            self.db.query(models.ActiveSession).filter(
                models.ActiveSession.user_id == user_id
            ).delete()
        
        self.db.commit()
        return True
    
    # ==================== PASSWORD RESET ====================
    
    def admin_reset_user_password(
        self,
        user_id: UUID,
        new_password_hash: str,
        admin_id: UUID,
        reason: str,
        revoke_sessions: bool = True
    ) -> bool:
        """
        Admin-initiated password reset for a user
        
        Args:
            user_id: User whose password to reset
            new_password_hash: Hashed new password
            admin_id: Admin performing the reset
            reason: Reason for password reset
            revoke_sessions: Whether to revoke all existing sessions
            
        Returns:
            True if successful, False if user not found
        """
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False
        
        # OAuth users don't have passwords
        if user.is_oauth_user and not user.password_hash:
            logger.warning(
                f"Attempted to reset password for OAuth-only user",
                extra={"user_id": str(user_id), "admin_id": str(admin_id)}
            )
            raise ValueError("Cannot reset password for OAuth-only users")
        
        # Update password
        user.password_hash = new_password_hash
        user.updated_at = datetime.now(timezone.utc)
        
        # Revoke all refresh tokens if requested
        if revoke_sessions:
            self.db.query(models.RefreshToken).filter(
                and_(
                    models.RefreshToken.user_id == user_id,
                    models.RefreshToken.revoked_at.is_(None)
                )
            ).update({
                "revoked_at": datetime.now(timezone.utc),
                "is_active": False
            })
            
            # Terminate all active sessions
            self.db.query(models.ActiveSession).filter(
                models.ActiveSession.user_id == user_id
            ).delete()
        
        self.db.commit()
        
        logger.warning(
            "Admin reset user password",
            extra={
                "user_id": str(user_id),
                "admin_id": str(admin_id),
                "reason": reason,
                "revoked_sessions": revoke_sessions
            }
        )
        
        return True
    
    def generate_temp_password_reset_token(
        self,
        user_id: UUID,
        admin_id: UUID
    ) -> Optional[str]:
        """
        Generate a temporary password reset token for a user
        
        This allows admin to send a password reset link to a user
        without requiring email verification flow.
        
        Returns the token that can be sent to the user
        """
        import secrets
        from datetime import timedelta
        
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return None
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Create email action
        email_action = models.EmailAction(
            user_id=user_id,
            type="ADMIN_RESET",
            token=token,
            expires_at=expires_at
        )
        
        self.db.add(email_action)
        self.db.commit()
        
        logger.info(
            "Admin generated password reset token",
            extra={
                "user_id": str(user_id),
                "admin_id": str(admin_id),
                "expires_at": expires_at.isoformat()
            }
        )
        
        return token
    
    # ==================== SESSION MANAGEMENT ====================
    
    def get_user_active_sessions(self, user_id: UUID) -> List[models.ActiveSession]:
        """Get all active sessions for a user"""
        return self.db.query(models.ActiveSession).filter(
            and_(
                models.ActiveSession.user_id == user_id,
                models.ActiveSession.expires_at > datetime.now(timezone.utc)
            )
        ).order_by(models.ActiveSession.last_activity_at.desc()).all()
    
    def terminate_session(
        self,
        session_id: UUID,
        admin_id: UUID,
        reason: str
    ) -> bool:
        """Terminate a specific session"""
        session = self.db.query(models.ActiveSession).filter(
            models.ActiveSession.id == session_id
        ).first()
        
        if not session:
            return False
        
        # Revoke associated refresh token if exists
        if session.refresh_token_jti:
            self.db.query(models.RefreshToken).filter(
                models.RefreshToken.jti == session.refresh_token_jti
            ).update({
                "revoked_at": datetime.now(timezone.utc),
                "is_active": False
            })
        
        # Delete the session
        self.db.delete(session)
        self.db.commit()
        
        logger.info(
            "Admin terminated user session",
            extra={
                "session_id": str(session_id),
                "user_id": str(session.user_id),
                "admin_id": str(admin_id),
                "reason": reason
            }
        )
        
        return True
    
    def terminate_all_user_sessions(
        self,
        user_id: UUID,
        admin_id: UUID,
        reason: str
    ) -> int:
        """Terminate all sessions for a user. Returns number of sessions terminated."""
        # Revoke all refresh tokens
        self.db.query(models.RefreshToken).filter(
            and_(
                models.RefreshToken.user_id == user_id,
                models.RefreshToken.revoked_at.is_(None)
            )
        ).update({
            "revoked_at": datetime.now(timezone.utc),
            "is_active": False
        })
        
        # Delete all active sessions
        count = self.db.query(models.ActiveSession).filter(
            models.ActiveSession.user_id == user_id
        ).count()
        
        self.db.query(models.ActiveSession).filter(
            models.ActiveSession.user_id == user_id
        ).delete()
        
        self.db.commit()
        
        logger.warning(
            "Admin terminated all user sessions",
            extra={
                "user_id": str(user_id),
                "admin_id": str(admin_id),
                "reason": reason,
                "sessions_terminated": count
            }
        )
        
        return count
