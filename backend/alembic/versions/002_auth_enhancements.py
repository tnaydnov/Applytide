"""Auth enhancements: refresh tokens, email verification, rate limiting

Revision ID: 002
Revises: 001
Create Date: 2025-01-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email verification fields to users table
    op.add_column('users', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('calendar_token', sa.String(64), nullable=True))
    op.create_index('ix_users_calendar_token', 'users', ['calendar_token'])
    
    # Create refresh_tokens table
    op.create_table('refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('jti', sa.String(36), nullable=False, unique=True),
        sa.Column('family_id', sa.String(36), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_jti', 'refresh_tokens', ['jti'])
    op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])
    
    # Create email verification/reset tokens table
    op.create_table('email_actions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),  # VERIFY, RESET
        sa.Column('token', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_email_actions_token', 'email_actions', ['token'])
    op.create_index('ix_email_actions_user_id', 'email_actions', ['user_id'])
    op.create_index('ix_email_actions_expires_at', 'email_actions', ['expires_at'])


def downgrade() -> None:
    op.drop_table('email_actions')
    op.drop_table('refresh_tokens')
    op.drop_column('users', 'calendar_token')
    op.drop_column('users', 'email_verified_at')
