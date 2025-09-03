"""Add premium user fields, application attachments, user preferences

Revision ID: 0008_premium_and_preferences
Revises: 0007_performance_indexes
Create Date: 2025-09-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "0008_premium_and_preferences"
down_revision = "0007_performance_indexes"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add premium fields to users (if not already present)
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        batch.add_column(sa.Column("premium_expires_at", sa.DateTime(timezone=True), nullable=True))
    # Remove the server default so future inserts rely on application default
    op.execute("ALTER TABLE users ALTER COLUMN is_premium DROP DEFAULT")

    # Create application_attachments table
    op.create_table(
        "application_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(300), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_application_attachments_application_id", "application_attachments", ["application_id"])  # for lookup
    op.create_index("ix_application_attachments_created_at", "application_attachments", ["created_at"])  # ordering

    # Create user_preferences table
    op.create_table(
        "user_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("preference_key", sa.String(255), nullable=False),
        sa.Column("preference_value", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"])
    op.create_index("ix_user_preferences_key", "user_preferences", ["preference_key"])
    op.create_unique_constraint("uq_user_preferences_user_key", "user_preferences", ["user_id", "preference_key"])  # one key per user


def downgrade() -> None:
    # Drop user preferences
    op.drop_constraint("uq_user_preferences_user_key", "user_preferences", type_="unique")
    op.drop_index("ix_user_preferences_key", table_name="user_preferences")
    op.drop_index("ix_user_preferences_user_id", table_name="user_preferences")
    op.drop_table("user_preferences")

    # Drop application attachments
    op.drop_index("ix_application_attachments_created_at", table_name="application_attachments")
    op.drop_index("ix_application_attachments_application_id", table_name="application_attachments")
    op.drop_table("application_attachments")

    # Remove premium fields
    with op.batch_alter_table("users") as batch:
        batch.drop_column("premium_expires_at")
        batch.drop_column("is_premium")
