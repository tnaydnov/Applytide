"""Initial schema - all tables

Revision ID: 20251022_initial
Revises: 
Create Date: 2025-10-22 11:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251022_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create users table (no dependencies)
    op.create_table('users',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('full_name', sa.String(length=100), nullable=True),
    sa.Column('first_name', sa.String(length=50), nullable=True),
    sa.Column('last_name', sa.String(length=50), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('avatar_url', sa.String(length=500), nullable=True),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('location', sa.String(length=100), nullable=True),
    sa.Column('timezone', sa.String(length=50), nullable=True),
    sa.Column('website', sa.String(length=200), nullable=True),
    sa.Column('linkedin_url', sa.String(length=200), nullable=True),
    sa.Column('github_url', sa.String(length=500), nullable=True),
    sa.Column('is_premium', sa.Boolean(), nullable=False),
    sa.Column('premium_expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('google_id', sa.String(length=255), nullable=True),
    sa.Column('google_avatar_url', sa.String(length=500), nullable=True),
    sa.Column('is_oauth_user', sa.Boolean(), nullable=False),
    sa.Column('language', sa.String(length=10), nullable=False),
    sa.Column('notification_email', sa.Boolean(), nullable=False),
    sa.Column('notification_push', sa.Boolean(), nullable=False),
    sa.Column('theme_preference', sa.String(length=20), nullable=False),
    sa.Column('calendar_token', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    op.create_index(op.f('ix_users_calendar_token'), 'users', ['calendar_token'], unique=False)

    # 2. Create user_profiles table
    op.create_table('user_profiles',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('preferred_locations', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('country', sa.String(), nullable=True),
    sa.Column('remote_preference', sa.String(), nullable=True),
    sa.Column('target_roles', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('target_industries', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('experience_level', sa.String(), nullable=True),
    sa.Column('skills', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('career_goals', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )

    # 3. Create oauth_tokens table
    op.create_table('oauth_tokens',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('provider', sa.String(length=20), nullable=False),
    sa.Column('access_token', sa.Text(), nullable=False),
    sa.Column('refresh_token', sa.Text(), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('token_type', sa.String(length=20), nullable=True),
    sa.Column('scope', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oauth_tokens_user_id'), 'oauth_tokens', ['user_id'], unique=False)

    # 4. Create refresh_tokens table
    op.create_table('refresh_tokens',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('jti', sa.String(length=36), nullable=False),
    sa.Column('family_id', sa.String(length=36), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('user_agent', sa.String(length=500), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('last_used_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_expires_at'), 'refresh_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_family_id'), 'refresh_tokens', ['family_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_jti'), 'refresh_tokens', ['jti'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)

    # 5. Create email_actions table
    op.create_table('email_actions',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('type', sa.String(length=20), nullable=False),
    sa.Column('token', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_actions_expires_at'), 'email_actions', ['expires_at'], unique=False)
    op.create_index(op.f('ix_email_actions_token'), 'email_actions', ['token'], unique=True)
    op.create_index(op.f('ix_email_actions_user_id'), 'email_actions', ['user_id'], unique=False)

    # 6. Create user_preferences table
    op.create_table('user_preferences',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('preference_key', sa.String(length=255), nullable=False),
    sa.Column('preference_value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=False)

    # 7. Create application_logs table
    op.create_table('application_logs',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('level', sa.String(length=20), nullable=False),
    sa.Column('logger', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('request_id', sa.String(length=50), nullable=True),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('session_id', sa.String(length=255), nullable=True),
    sa.Column('endpoint', sa.String(length=500), nullable=True),
    sa.Column('method', sa.String(length=10), nullable=True),
    sa.Column('status_code', sa.Integer(), nullable=True),
    sa.Column('ip_address', sa.String(length=50), nullable=True),
    sa.Column('user_agent', sa.String(length=500), nullable=True),
    sa.Column('module', sa.String(length=255), nullable=True),
    sa.Column('function', sa.String(length=255), nullable=True),
    sa.Column('line_number', sa.Integer(), nullable=True),
    sa.Column('exception_type', sa.String(length=255), nullable=True),
    sa.Column('exception_message', sa.Text(), nullable=True),
    sa.Column('stack_trace', sa.Text(), nullable=True),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_application_logs_endpoint'), 'application_logs', ['endpoint'], unique=False)
    op.create_index(op.f('ix_application_logs_exception_type'), 'application_logs', ['exception_type'], unique=False)
    op.create_index(op.f('ix_application_logs_ip_address'), 'application_logs', ['ip_address'], unique=False)
    op.create_index(op.f('ix_application_logs_level'), 'application_logs', ['level'], unique=False)
    op.create_index(op.f('ix_application_logs_logger'), 'application_logs', ['logger'], unique=False)
    op.create_index(op.f('ix_application_logs_request_id'), 'application_logs', ['request_id'], unique=False)
    op.create_index(op.f('ix_application_logs_status_code'), 'application_logs', ['status_code'], unique=False)
    op.create_index(op.f('ix_application_logs_timestamp'), 'application_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_application_logs_user_id'), 'application_logs', ['user_id'], unique=False)

    # 8. Create companies table
    op.create_table('companies',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('website', sa.String(length=300), nullable=True),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_name'), 'companies', ['name'], unique=False)

    # 9. Create jobs table
    op.create_table('jobs',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('source_url', sa.String(length=1000), nullable=True),
    sa.Column('title', sa.String(length=300), nullable=False),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.Column('remote_type', sa.String(length=40), nullable=True),
    sa.Column('job_type', sa.String(length=40), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('requirements', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_company_id'), 'jobs', ['company_id'], unique=False)
    op.create_index(op.f('ix_jobs_created_at'), 'jobs', ['created_at'], unique=False)
    op.create_index(op.f('ix_jobs_location'), 'jobs', ['location'], unique=False)
    op.create_index(op.f('ix_jobs_remote_type'), 'jobs', ['remote_type'], unique=False)
    op.create_index(op.f('ix_jobs_title'), 'jobs', ['title'], unique=False)
    op.create_index(op.f('ix_jobs_user_id'), 'jobs', ['user_id'], unique=False)

    # 10. Create resumes table
    op.create_table('resumes',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('file_path', sa.String(length=500), nullable=False),
    sa.Column('text', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resumes_user_id'), 'resumes', ['user_id'], unique=False)

    # 11. Create applications table
    op.create_table('applications',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('resume_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('source', sa.String(length=50), nullable=True),
    sa.Column('is_archived', sa.Boolean(), nullable=False),
    sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_applications_is_archived'), 'applications', ['is_archived'], unique=False)
    op.create_index(op.f('ix_applications_job_id'), 'applications', ['job_id'], unique=False)
    op.create_index(op.f('ix_applications_resume_id'), 'applications', ['resume_id'], unique=False)
    op.create_index(op.f('ix_applications_source'), 'applications', ['source'], unique=False)
    op.create_index(op.f('ix_applications_status'), 'applications', ['status'], unique=False)
    op.create_index(op.f('ix_applications_user_id'), 'applications', ['user_id'], unique=False)

    # 12. Create stages table
    op.create_table('stages',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=60), nullable=False),
    sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('outcome', sa.String(length=60), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stages_application_id'), 'stages', ['application_id'], unique=False)

    # 13. Create notes table
    op.create_table('notes',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notes_application_id'), 'notes', ['application_id'], unique=False)
    op.create_index(op.f('ix_notes_user_id'), 'notes', ['user_id'], unique=False)

    # 14. Create match_results table
    op.create_table('match_results',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('resume_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('job_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('keywords_present', sa.Text(), nullable=True),
    sa.Column('keywords_missing', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_match_results_job_id'), 'match_results', ['job_id'], unique=False)
    op.create_index(op.f('ix_match_results_resume_id'), 'match_results', ['resume_id'], unique=False)
    op.create_index(op.f('ix_match_results_user_id'), 'match_results', ['user_id'], unique=False)

    # 15. Create application_attachments table
    op.create_table('application_attachments',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('filename', sa.String(length=300), nullable=False),
    sa.Column('file_size', sa.Integer(), nullable=False),
    sa.Column('content_type', sa.String(length=100), nullable=False),
    sa.Column('file_path', sa.String(length=500), nullable=False),
    sa.Column('document_type', sa.String(length=32), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_application_attachments_application_id'), 'application_attachments', ['application_id'], unique=False)
    op.create_index(op.f('ix_application_attachments_document_type'), 'application_attachments', ['document_type'], unique=False)

    # 16. Create reminders table
    op.create_table('reminders',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('google_event_id', sa.String(length=255), nullable=True),
    sa.Column('meet_url', sa.String(length=1000), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'google_event_id', name='uq_user_google_event')
    )
    op.create_index(op.f('ix_reminders_application_id'), 'reminders', ['application_id'], unique=False)
    op.create_index(op.f('ix_reminders_google_event_id'), 'reminders', ['google_event_id'], unique=False)
    op.create_index(op.f('ix_reminders_user_id'), 'reminders', ['user_id'], unique=False)

    # 17. Create reminder_notes table
    op.create_table('reminder_notes',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('reminder_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['reminder_id'], ['reminders.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reminder_notes_reminder_id'), 'reminder_notes', ['reminder_id'], unique=False)
    op.create_index(op.f('ix_reminder_notes_user_id'), 'reminder_notes', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_reminder_notes_user_id'), table_name='reminder_notes')
    op.drop_index(op.f('ix_reminder_notes_reminder_id'), table_name='reminder_notes')
    op.drop_table('reminder_notes')
    
    op.drop_index(op.f('ix_reminders_user_id'), table_name='reminders')
    op.drop_index(op.f('ix_reminders_google_event_id'), table_name='reminders')
    op.drop_index(op.f('ix_reminders_application_id'), table_name='reminders')
    op.drop_table('reminders')
    
    op.drop_index(op.f('ix_application_attachments_document_type'), table_name='application_attachments')
    op.drop_index(op.f('ix_application_attachments_application_id'), table_name='application_attachments')
    op.drop_table('application_attachments')
    
    op.drop_index(op.f('ix_match_results_user_id'), table_name='match_results')
    op.drop_index(op.f('ix_match_results_resume_id'), table_name='match_results')
    op.drop_index(op.f('ix_match_results_job_id'), table_name='match_results')
    op.drop_table('match_results')
    
    op.drop_index(op.f('ix_notes_user_id'), table_name='notes')
    op.drop_index(op.f('ix_notes_application_id'), table_name='notes')
    op.drop_table('notes')
    
    op.drop_index(op.f('ix_stages_application_id'), table_name='stages')
    op.drop_table('stages')
    
    op.drop_index(op.f('ix_applications_user_id'), table_name='applications')
    op.drop_index(op.f('ix_applications_status'), table_name='applications')
    op.drop_index(op.f('ix_applications_source'), table_name='applications')
    op.drop_index(op.f('ix_applications_resume_id'), table_name='applications')
    op.drop_index(op.f('ix_applications_job_id'), table_name='applications')
    op.drop_index(op.f('ix_applications_is_archived'), table_name='applications')
    op.drop_table('applications')
    
    op.drop_index(op.f('ix_resumes_user_id'), table_name='resumes')
    op.drop_table('resumes')
    
    op.drop_index(op.f('ix_jobs_user_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_title'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_remote_type'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_location'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_created_at'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_company_id'), table_name='jobs')
    op.drop_table('jobs')
    
    op.drop_index(op.f('ix_companies_name'), table_name='companies')
    op.drop_table('companies')
    
    op.drop_index(op.f('ix_application_logs_user_id'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_timestamp'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_status_code'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_request_id'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_logger'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_level'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_ip_address'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_exception_type'), table_name='application_logs')
    op.drop_index(op.f('ix_application_logs_endpoint'), table_name='application_logs')
    op.drop_table('application_logs')
    
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')
    
    op.drop_index(op.f('ix_email_actions_user_id'), table_name='email_actions')
    op.drop_index(op.f('ix_email_actions_token'), table_name='email_actions')
    op.drop_index(op.f('ix_email_actions_expires_at'), table_name='email_actions')
    op.drop_table('email_actions')
    
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_jti'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_family_id'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_expires_at'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    
    op.drop_index(op.f('ix_oauth_tokens_user_id'), table_name='oauth_tokens')
    op.drop_table('oauth_tokens')
    
    op.drop_table('user_profiles')
    
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_calendar_token'), table_name='users')
    op.drop_table('users')
