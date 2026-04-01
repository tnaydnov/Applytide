"""
Scheduled Cleanup Tasks

Background jobs for database hygiene — runs via APScheduler.

Tasks:
    - purge_expired_email_actions: Removes expired/used EmailAction tokens
    - purge_expired_refresh_tokens: Removes expired/revoked RefreshToken rows
    - purge_old_llm_usage: Archives LLM usage logs older than retention period

Schedule (configured in main.py):
    - Token cleanup: Every 6 hours
    - LLM log cleanup: Daily at 03:00 UTC
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from sqlalchemy import delete

from ...db.session import get_session_factory
from ...db import models
from ...infra.logging import get_logger

logger = get_logger(__name__)

# ── Configuration ────────────────────────────────────────────────────────

# Retain expired tokens for 24 h after expiry (for audit trail)
TOKEN_RETENTION_HOURS = 24

# Retain LLM usage records for 90 days
LLM_LOG_RETENTION_DAYS = 90


def purge_expired_email_actions() -> None:
    """Delete EmailAction rows that expired more than TOKEN_RETENTION_HOURS ago."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=TOKEN_RETENTION_HOURS)
        stmt = delete(models.EmailAction).where(
            models.EmailAction.expires_at < cutoff,
        )
        result = db.execute(stmt)
        db.commit()
        deleted = result.rowcount  # type: ignore[union-attr]
        if deleted:
            logger.info(
                "Purged expired email action tokens",
                extra={"deleted_count": deleted, "cutoff": cutoff.isoformat()},
            )
    except Exception:
        db.rollback()
        logger.error("Failed to purge expired email actions", exc_info=True)
    finally:
        db.close()


def purge_expired_refresh_tokens() -> None:
    """Delete RefreshToken rows that are expired or revoked beyond retention."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=TOKEN_RETENTION_HOURS)

        # Delete tokens that expired beyond retention period
        stmt_expired = delete(models.RefreshToken).where(
            models.RefreshToken.expires_at < cutoff,
        )
        result_expired = db.execute(stmt_expired)

        # Delete tokens that were revoked beyond retention period
        stmt_revoked = delete(models.RefreshToken).where(
            models.RefreshToken.revoked_at.isnot(None),
            models.RefreshToken.revoked_at < cutoff,
        )
        result_revoked = db.execute(stmt_revoked)

        db.commit()

        expired_count = result_expired.rowcount  # type: ignore[union-attr]
        revoked_count = result_revoked.rowcount  # type: ignore[union-attr]

        if expired_count or revoked_count:
            logger.info(
                "Purged expired/revoked refresh tokens",
                extra={
                    "expired_deleted": expired_count,
                    "revoked_deleted": revoked_count,
                    "cutoff": cutoff.isoformat(),
                },
            )
    except Exception:
        db.rollback()
        logger.error("Failed to purge expired refresh tokens", exc_info=True)
    finally:
        db.close()


def purge_old_llm_usage() -> None:
    """Delete LLMUsage records older than LLM_LOG_RETENTION_DAYS."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=LLM_LOG_RETENTION_DAYS)
        stmt = delete(models.LLMUsage).where(
            models.LLMUsage.timestamp < cutoff,
        )
        result = db.execute(stmt)
        db.commit()
        deleted = result.rowcount  # type: ignore[union-attr]
        if deleted:
            logger.info(
                "Purged old LLM usage records",
                extra={"deleted_count": deleted, "cutoff": cutoff.isoformat()},
            )
    except Exception:
        db.rollback()
        logger.error("Failed to purge old LLM usage records", exc_info=True)
    finally:
        db.close()
