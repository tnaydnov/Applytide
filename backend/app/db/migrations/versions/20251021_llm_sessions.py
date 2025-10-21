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
    
    # Update active_sessions table schema (table exists from 20251020_180650_add_enhanced_admin_features.py)
    # Modify existing columns
    op.alter_column('active_sessions', 'session_token',
                   existing_type=sa.String(64),
                   type_=sa.String(500),
                   existing_nullable=False)
    
    # Rename created_at to login_at
    op.alter_column('active_sessions', 'created_at',
                   new_column_name='login_at',
                   existing_type=sa.DateTime(),
                   existing_nullable=False)
    
    # Add new columns
    op.add_column('active_sessions', sa.Column('device_type', sa.String(50), nullable=True))
    op.add_column('active_sessions', sa.Column('browser', sa.String(100), nullable=True))
    op.add_column('active_sessions', sa.Column('os', sa.String(100), nullable=True))
    
    # Rename/repurpose device_info to location (both String fields)
    op.alter_column('active_sessions', 'device_info',
                   new_column_name='location',
                   existing_type=sa.String(200),
                   existing_nullable=True)
    
    # Drop columns we don't need
    op.drop_column('active_sessions', 'refresh_token_jti')
    op.drop_index('ix_active_sessions_refresh_token_jti', table_name='active_sessions')
    
    # Update location column size (it was device_info=200, now location=200, no change needed)
    # Update ip_address index (it had none, add it)
    op.create_index(op.f('ix_active_sessions_ip_address'), 'active_sessions', ['ip_address'], unique=False)
    
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
    # Drop new tables
    op.drop_table('security_events')
    op.drop_table('error_logs')
    op.drop_table('llm_usage')
    
    # Revert active_sessions table schema changes
    op.drop_index(op.f('ix_active_sessions_ip_address'), table_name='active_sessions')
    op.create_index('ix_active_sessions_refresh_token_jti', 'active_sessions', ['refresh_token_jti'], unique=False)
    op.add_column('active_sessions', sa.Column('refresh_token_jti', sa.String(36), nullable=True))
    op.alter_column('active_sessions', 'location',
                   new_column_name='device_info',
                   existing_type=sa.String(200),
                   existing_nullable=True)
    op.drop_column('active_sessions', 'os')
    op.drop_column('active_sessions', 'browser')
    op.drop_column('active_sessions', 'device_type')
    op.alter_column('active_sessions', 'login_at',
                   new_column_name='created_at',
                   existing_type=sa.DateTime(),
                   existing_nullable=False)
    op.alter_column('active_sessions', 'session_token',
                   existing_type=sa.String(500),
                   type_=sa.String(64),
                   existing_nullable=False)
