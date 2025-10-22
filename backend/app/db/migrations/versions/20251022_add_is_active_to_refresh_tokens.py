"""add is_active and last_used_at to refresh_tokens

Revision ID: i9j0k1l2m3n4
Revises: 20251022_merge_branches
Create Date: 2025-10-22 08:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'i9j0k1l2m3n4'
down_revision = '20251022_merge_branches'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_active column to refresh_tokens table with default True
    op.add_column('refresh_tokens', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    
    # Add last_used_at column to refresh_tokens table with default to created_at
    op.add_column('refresh_tokens', sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')))


def downgrade():
    # Remove columns from refresh_tokens table
    op.drop_column('refresh_tokens', 'last_used_at')
    op.drop_column('refresh_tokens', 'is_active')
