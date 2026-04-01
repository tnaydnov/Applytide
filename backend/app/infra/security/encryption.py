"""
Symmetric encryption helpers (Fernet / AES-128-CBC + HMAC).

Used for encrypting secrets at rest (e.g. TOTP keys, OAuth tokens)
while still allowing the application to decrypt them when needed.

The encryption key is loaded from ``settings.ENCRYPTION_KEY``.  In
production this **must** be a URL-safe base64-encoded 32-byte key
(``Fernet.generate_key()``).  In development a deterministic - but
obviously insecure - fallback is used.
"""
from __future__ import annotations

import base64
import logging
import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text, TypeDecorator

from ...config import settings

logger = logging.getLogger(__name__)


# ── Key management ───────────────────────────────────────────────────────

def _derive_key() -> bytes:
    """
    Return the Fernet key bytes.

    In production ``ENCRYPTION_KEY`` env var is mandatory (44-char base64).
    In dev we derive a stable key from the JWT secret so it "just works".
    """
    raw = os.getenv("ENCRYPTION_KEY", "")
    if raw and len(raw) >= 44:
        return raw.encode()

    if settings.is_production:
        raise ValueError(
            "ENCRYPTION_KEY must be set in production "
            "(use: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\")"
        )

    # Dev fallback - deterministic but obviously insecure
    seed = (settings.JWT_SECRET or "dev-key").encode()
    return base64.urlsafe_b64encode(seed.ljust(32, b"\x00")[:32])


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(_derive_key())


# ── Public API ───────────────────────────────────────────────────────────

def encrypt(plaintext: str) -> str:
    """Encrypt *plaintext* and return a URL-safe base64 token (str)."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a token previously produced by :func:`encrypt`."""
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt - invalid key or corrupted data") from exc


def try_decrypt(ciphertext: str) -> str:
    """
    Decrypt if possible, otherwise return the value unchanged.

    Used for backward-compatible reads during migration from plaintext
    to encrypted storage.  Once all rows are migrated you can switch
    callers to :func:`decrypt`.
    """
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception):
        # Value is still plaintext (pre-migration row)
        logger.debug("Value not Fernet-encrypted, returning as-is (migration pending)")
        return ciphertext


# ── SQLAlchemy TypeDecorator ─────────────────────────────────────────────

class EncryptedText(TypeDecorator):
    """
    SQLAlchemy column type that transparently encrypts on write and
    decrypts on read using Fernet symmetric encryption.

    During the migration window, reads gracefully handle plaintext values
    that have not yet been re-encrypted.

    Usage in models::

        access_token = mapped_column(EncryptedText, nullable=False)
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt before writing to the database."""
        if value is not None:
            return encrypt(value)
        return value

    def process_result_value(self, value, dialect):
        """Decrypt after reading from the database (migration-safe)."""
        if value is not None:
            return try_decrypt(value)
        return value
