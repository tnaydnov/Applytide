"""Add legal agreements and account deletion fields to users

Revision ID: 20250128_legal_deletion
Revises: 20251025_reminder_timezone
Create Date: 2025-01-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '20250128_legal_deletion'
down_revision = '20251025_reminder_timezone'
branch_labels = None
depends_on = None


def upgrade():
    # Add legal agreement tracking fields
    op.add_column('users', sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('privacy_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('terms_version', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('acceptance_ip', sa.String(length=45), nullable=True))
    
    # Add account deletion fields (7-day recovery period)
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deletion_scheduled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deletion_recovery_token', sa.String(length=64), nullable=True))
    
    # Create index for deletion recovery token lookups
    op.create_index('ix_users_deletion_recovery_token', 'users', ['deletion_recovery_token'], unique=False)


def downgrade():
    # Remove index
    op.drop_index('ix_users_deletion_recovery_token', table_name='users')
    
    # Remove account deletion fields
    op.drop_column('users', 'deletion_recovery_token')
    op.drop_column('users', 'deletion_scheduled_at')
    op.drop_column('users', 'deleted_at')
    
    # Remove legal agreement fields
    op.drop_column('users', 'acceptance_ip')
    op.drop_column('users', 'terms_version')
    op.drop_column('users', 'privacy_accepted_at')
    op.drop_column('users', 'terms_accepted_at')
