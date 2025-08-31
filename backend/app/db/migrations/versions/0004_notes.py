"""notes for applications"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = "0004_notes"
down_revision = "0003_applications_pipeline"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "notes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("application_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("applications.id"), nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

def downgrade():
    op.drop_table("notes")
