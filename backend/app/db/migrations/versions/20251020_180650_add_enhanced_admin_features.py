"""add_enhanced_admin_features

Revision ID: 20251020_180650
Revises: 
Create Date: 2025-10-20 18:06:50

Adds:
- Ban/unban functionality to users table
- Active sessions tracking table
- Email history table for admin monitoring
- Enhanced refresh token fields
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251020_180650'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add ban fields to users table
    op.add_column('users', sa.Column('is_banned', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('banned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('ban_reason', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('banned_by_admin_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Create index on is_banned for faster queries
    op.create_index(op.f('ix_users_is_banned'), 'users', ['is_banned'], unique=False)
    
    # Add enhanced fields to refresh_tokens table
    op.add_column('refresh_tokens', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('refresh_tokens', sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
    
    # Create active_sessions table
    op.create_table('active_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_token', sa.String(length=64), nullable=False),
        sa.Column('refresh_token_jti', sa.String(length=36), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('device_info', sa.String(length=200), nullable=True),
        sa.Column('location', sa.String(length=100), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_active_sessions_user_id'), 'active_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_active_sessions_session_token'), 'active_sessions', ['session_token'], unique=True)
    op.create_index(op.f('ix_active_sessions_refresh_token_jti'), 'active_sessions', ['refresh_token_jti'], unique=False)
    op.create_index(op.f('ix_active_sessions_last_activity_at'), 'active_sessions', ['last_activity_at'], unique=False)
    op.create_index(op.f('ix_active_sessions_expires_at'), 'active_sessions', ['expires_at'], unique=False)
    
    # Create email_history table
    op.create_table('email_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('recipient_email', sa.String(length=320), nullable=False),
        sa.Column('email_type', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('provider_response', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_history_user_id'), 'email_history', ['user_id'], unique=False)
    op.create_index(op.f('ix_email_history_recipient_email'), 'email_history', ['recipient_email'], unique=False)
    op.create_index(op.f('ix_email_history_email_type'), 'email_history', ['email_type'], unique=False)
    op.create_index(op.f('ix_email_history_status'), 'email_history', ['status'], unique=False)
    op.create_index(op.f('ix_email_history_sent_at'), 'email_history', ['sent_at'], unique=False)


def downgrade():
    # Drop email_history table
    op.drop_index(op.f('ix_email_history_sent_at'), table_name='email_history')
    op.drop_index(op.f('ix_email_history_status'), table_name='email_history')
    op.drop_index(op.f('ix_email_history_email_type'), table_name='email_history')
    op.drop_index(op.f('ix_email_history_recipient_email'), table_name='email_history')
    op.drop_index(op.f('ix_email_history_user_id'), table_name='email_history')
    op.drop_table('email_history')
    
    # Drop active_sessions table
    op.drop_index(op.f('ix_active_sessions_expires_at'), table_name='active_sessions')
    op.drop_index(op.f('ix_active_sessions_last_activity_at'), table_name='active_sessions')
    op.drop_index(op.f('ix_active_sessions_refresh_token_jti'), table_name='active_sessions')
    op.drop_index(op.f('ix_active_sessions_session_token'), table_name='active_sessions')
    op.drop_index(op.f('ix_active_sessions_user_id'), table_name='active_sessions')
    op.drop_table('active_sessions')
    
    # Remove refresh_tokens enhancements
    op.drop_column('refresh_tokens', 'last_used_at')
    op.drop_column('refresh_tokens', 'is_active')
    
    # Remove ban fields from users
    op.drop_index(op.f('ix_users_is_banned'), table_name='users')
    op.drop_column('users', 'banned_by_admin_id')
    op.drop_column('users', 'ban_reason')
    op.drop_column('users', 'banned_at')
    op.drop_column('users', 'is_banned')
