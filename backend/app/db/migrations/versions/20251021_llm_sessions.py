"""add llm usage and active sessions tracking

Revision ID: 20251021_llm_sessions
Revises: 20251021_archive
Create Date: 2025-10-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = '20251021_llm_sessions'
down_revision = '20251021_archive'
branch_labels = None
depends_on = None


def upgrade():
    # Create llm_usage table
    op.create_table(
        'llm_usage',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('model', sa.String(100), nullable=False, index=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False),
        sa.Column('completion_tokens', sa.Integer(), nullable=False),
        sa.Column('total_tokens', sa.Integer(), nullable=False),
        sa.Column('cost', sa.Integer(), nullable=False),  # Stored as cents
        sa.Column('purpose', sa.String(100), nullable=True, index=True),
        sa.Column('endpoint', sa.String(500), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('request_sample', sa.Text(), nullable=True),
        sa.Column('response_sample', sa.Text(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
    )
    
    # Create active_sessions table
    op.create_table(
        'active_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('session_token', sa.String(500), nullable=False, unique=True, index=True),
        sa.Column('login_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('last_activity_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('ip_address', sa.String(50), nullable=True, index=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
    )
    
    # Create error_logs table
    op.create_table(
        'error_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('error_type', sa.String(200), nullable=False, index=True),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('endpoint', sa.String(500), nullable=True, index=True),
        sa.Column('method', sa.String(10), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True, index=True),
        sa.Column('ip_address', sa.String(50), nullable=True, index=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('service', sa.String(100), nullable=True, index=True),
        sa.Column('severity', sa.String(20), nullable=False, default='error', index=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
    )
    
    # Create security_events table
    op.create_table(
        'security_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, default='medium', index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('email', sa.String(255), nullable=True, index=True),
        sa.Column('endpoint', sa.String(500), nullable=True, index=True),
        sa.Column('method', sa.String(10), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=False, index=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('details', JSONB, nullable=True),
        sa.Column('action_taken', sa.String(200), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('security_events')
    op.drop_table('error_logs')
    op.drop_table('active_sessions')
    op.drop_table('llm_usage')
