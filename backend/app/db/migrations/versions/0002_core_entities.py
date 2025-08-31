"""core entities: companies, jobs, resumes"""
from alembic import op
import sqlalchemy as sa
import uuid

# Alembic identifiers:
revision = "0002_core_entities"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None

def upgrade():
    # companies
    op.create_table(
        "companies",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_companies_name", "companies", ["name"], unique=False)

    # jobs
    op.create_table(
        "jobs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("company_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("source_url", sa.String(length=1000), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("remote_type", sa.String(length=40), nullable=True),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_jobs_title", "jobs", ["title"], unique=False)

    # resumes
    op.create_table(
        "resumes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

def downgrade():
    op.drop_table("resumes")
    op.drop_index("ix_jobs_title", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_companies_name", table_name="companies")
    op.drop_table("companies")
