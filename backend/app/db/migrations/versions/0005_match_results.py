"""match results table"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = "0005_match_results"
down_revision = "0004_notes"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "match_results",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resume_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("resumes.id"), nullable=False),
        sa.Column("job_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("keywords_present", sa.Text(), nullable=True),
        sa.Column("keywords_missing", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

def downgrade():
    op.drop_table("match_results")
