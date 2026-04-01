"""Encrypt existing plaintext OAuth tokens at rest

Revision ID: 20250616_encrypt_oauth
Revises: 20250615_fk_constraints
Create Date: 2025-06-16 00:00:00

This is a DATA migration (no schema change).
The column type is still Text in the DB — EncryptedText is a Python-side
TypeDecorator that wraps Text.  Here we re-encrypt any plaintext values
that were written before the TypeDecorator was installed.

The migration is idempotent: values that are already Fernet-encrypted
will be detected and skipped.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20250616_encrypt_oauth"
down_revision = "20250615_fk_constraints"
branch_labels = None
depends_on = None

# Lightweight table reference for data migration (no ORM needed)
oauth_tokens = sa.table(
    "oauth_tokens",
    sa.column("id", sa.Text),
    sa.column("access_token", sa.Text),
    sa.column("refresh_token", sa.Text),
)


def _is_fernet(value: str) -> bool:
    """Heuristic: Fernet tokens are base64, start with 'gAAAAA'."""
    if not value:
        return False
    return value.startswith("gAAAAA")


def upgrade() -> None:
    # Import encryption lazily — only needed during this migration
    from app.infra.security.encryption import encrypt

    conn = op.get_bind()
    rows = conn.execute(
        sa.select(
            oauth_tokens.c.id,
            oauth_tokens.c.access_token,
            oauth_tokens.c.refresh_token,
        )
    ).fetchall()

    for row in rows:
        updates = {}
        if row.access_token and not _is_fernet(row.access_token):
            updates["access_token"] = encrypt(row.access_token)
        if row.refresh_token and not _is_fernet(row.refresh_token):
            updates["refresh_token"] = encrypt(row.refresh_token)
        if updates:
            conn.execute(
                oauth_tokens.update()
                .where(oauth_tokens.c.id == row.id)
                .values(**updates)
            )


def downgrade() -> None:
    # Decrypt all tokens back to plaintext
    from app.infra.security.encryption import decrypt, try_decrypt

    conn = op.get_bind()
    rows = conn.execute(
        sa.select(
            oauth_tokens.c.id,
            oauth_tokens.c.access_token,
            oauth_tokens.c.refresh_token,
        )
    ).fetchall()

    for row in rows:
        updates = {}
        if row.access_token and _is_fernet(row.access_token):
            updates["access_token"] = try_decrypt(row.access_token)
        if row.refresh_token and _is_fernet(row.refresh_token):
            updates["refresh_token"] = try_decrypt(row.refresh_token)
        if updates:
            conn.execute(
                oauth_tokens.update()
                .where(oauth_tokens.c.id == row.id)
                .values(**updates)
            )
