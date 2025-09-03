"""Performance indexes and constraints

Revision ID: 0007_performance_indexes
Revises: 0006_auth_enhancements
Create Date: 2025-01-09 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0007_performance_indexes'
down_revision = '0006_auth_enhancements'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add performance indexes for most common queries.
    # NOTE: ix_applications_status already created in 0003; don't recreate it.

    # Applications (new supplemental indexes)
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_user_id ON applications (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_created_at ON applications (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_updated_at ON applications (updated_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_applications_user_status_created ON applications (user_id, status, created_at)")

    # Jobs
    op.execute("CREATE INDEX IF NOT EXISTS ix_jobs_location ON jobs (location)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_jobs_remote_type ON jobs (remote_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_jobs_created_at ON jobs (created_at)")

    # Companies (case-insensitive unique constraint). Use a functional unique index in Postgres.
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_name_lower ON companies (LOWER(name))")

    # Resumes
    op.execute("CREATE INDEX IF NOT EXISTS ix_resumes_user_id ON resumes (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_resumes_created_at ON resumes (created_at)")

    # Stages
    op.execute("CREATE INDEX IF NOT EXISTS ix_stages_application_id ON stages (application_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stages_scheduled_at ON stages (scheduled_at)")

    # Notes
    op.execute("CREATE INDEX IF NOT EXISTS ix_notes_application_id ON notes (application_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notes_created_at ON notes (created_at)")

    # Match results
    op.execute("CREATE INDEX IF NOT EXISTS ix_match_results_user_id ON match_results (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_match_results_resume_id ON match_results (resume_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_match_results_job_id ON match_results (job_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_match_results_score ON match_results (score)")

    # Full-text search indexes (idempotent creation)
    op.execute("CREATE INDEX IF NOT EXISTS ix_jobs_title_fts ON jobs USING gin(to_tsvector('english', title))")
    op.execute("CREATE INDEX IF NOT EXISTS ix_jobs_description_fts ON jobs USING gin(to_tsvector('english', description))")
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_jobs_content_fts ON jobs 
        USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
    """)


def downgrade() -> None:
    # Full-text search indexes
    op.execute("DROP INDEX IF EXISTS ix_jobs_content_fts")
    op.execute("DROP INDEX IF EXISTS ix_jobs_description_fts")
    op.execute("DROP INDEX IF EXISTS ix_jobs_title_fts")

    # Regular indexes
    for idx in [
        'ix_match_results_score', 'ix_match_results_job_id', 'ix_match_results_resume_id', 'ix_match_results_user_id',
        'ix_notes_created_at', 'ix_notes_application_id',
        'ix_stages_scheduled_at', 'ix_stages_application_id',
        'ix_resumes_created_at', 'ix_resumes_user_id',
        'ix_jobs_created_at', 'ix_jobs_remote_type', 'ix_jobs_location',
        'ix_applications_user_status_created', 'ix_applications_updated_at', 'ix_applications_created_at', 'ix_applications_user_id'
    ]:
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # Drop functional unique index
    op.execute("DROP INDEX IF EXISTS uq_companies_name_lower")

    # Do NOT drop ix_applications_status here (belongs to migration 0003)
