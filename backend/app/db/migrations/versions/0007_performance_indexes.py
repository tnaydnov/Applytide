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
    # Add performance indexes for most common queries
    
    # Applications - commonly filtered by status, user_id, and sorted by created_at
    # Check if indexes exist before creating them
    try:
        op.create_index('ix_applications_status', 'applications', ['status'])
    except Exception:
        pass  # Index already exists
    try:
        op.create_index('ix_applications_user_id', 'applications', ['user_id'])
    except Exception:
        pass  # Index already exists
    try:
        op.create_index('ix_applications_created_at', 'applications', ['created_at'])
    except Exception:
        pass  # Index already exists
    try:
        op.create_index('ix_applications_updated_at', 'applications', ['updated_at'])
    except Exception:
        pass  # Index already exists
    
    # Composite index for user's applications by status and date
    op.create_index('ix_applications_user_status_created', 'applications', 
                   ['user_id', 'status', 'created_at'])
    
    # Jobs - commonly searched by title and description, filtered by location
    op.create_index('ix_jobs_location', 'jobs', ['location'])
    op.create_index('ix_jobs_remote_type', 'jobs', ['remote_type'])
    op.create_index('ix_jobs_created_at', 'jobs', ['created_at'])
    
    # Companies - enforce unique names (case-insensitive)
    op.create_unique_constraint('uq_companies_name_lower', 'companies', 
                               [sa.text('LOWER(name)')])
    
    # Resumes - commonly filtered by user
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'])
    op.create_index('ix_resumes_created_at', 'resumes', ['created_at'])
    
    # Stages - commonly queried by application
    op.create_index('ix_stages_application_id', 'stages', ['application_id'])
    op.create_index('ix_stages_scheduled_at', 'stages', ['scheduled_at'])
    
    # Notes - commonly queried by application
    op.create_index('ix_notes_application_id', 'notes', ['application_id'])
    op.create_index('ix_notes_created_at', 'notes', ['created_at'])
    
    # Match results - commonly queried by user, resume, job
    op.create_index('ix_match_results_user_id', 'match_results', ['user_id'])
    op.create_index('ix_match_results_resume_id', 'match_results', ['resume_id'])
    op.create_index('ix_match_results_job_id', 'match_results', ['job_id'])
    op.create_index('ix_match_results_score', 'match_results', ['score'])
    
    # Add full-text search capabilities for jobs
    op.execute("CREATE INDEX ix_jobs_title_fts ON jobs USING gin(to_tsvector('english', title))")
    op.execute("CREATE INDEX ix_jobs_description_fts ON jobs USING gin(to_tsvector('english', description))")
    
    # Combined full-text search index for title and description
    op.execute("""
        CREATE INDEX ix_jobs_content_fts ON jobs 
        USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
    """)


def downgrade() -> None:
    # Drop full-text search indexes
    op.drop_index('ix_jobs_content_fts', 'jobs')
    op.drop_index('ix_jobs_description_fts', 'jobs')
    op.drop_index('ix_jobs_title_fts', 'jobs')
    
    # Drop regular indexes
    op.drop_index('ix_match_results_score', 'match_results')
    op.drop_index('ix_match_results_job_id', 'match_results')
    op.drop_index('ix_match_results_resume_id', 'match_results')
    op.drop_index('ix_match_results_user_id', 'match_results')
    
    op.drop_index('ix_notes_created_at', 'notes')
    op.drop_index('ix_notes_application_id', 'notes')
    
    op.drop_index('ix_stages_scheduled_at', 'stages')
    op.drop_index('ix_stages_application_id', 'stages')
    
    op.drop_index('ix_resumes_created_at', 'resumes')
    op.drop_index('ix_resumes_user_id', 'resumes')
    
    op.drop_constraint('uq_companies_name_lower', 'companies')
    
    op.drop_index('ix_jobs_created_at', 'jobs')
    op.drop_index('ix_jobs_remote_type', 'jobs')
    op.drop_index('ix_jobs_location', 'jobs')
    
    op.drop_index('ix_applications_user_status_created', 'applications')
    op.drop_index('ix_applications_updated_at', 'applications')
    op.drop_index('ix_applications_created_at', 'applications')
    op.drop_index('ix_applications_user_id', 'applications')
    op.drop_index('ix_applications_status', 'applications')
