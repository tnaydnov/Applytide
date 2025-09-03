"""add premium fields to users

Revision ID: 0008_premium_features
Revises: 0007_performance_indexes
Create Date: 2025-09-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0008_premium_features'
down_revision = '0007_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add premium fields to users table
    op.add_column('users', sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('premium_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove premium fields from users table
    op.drop_column('users', 'premium_expires_at')
    op.drop_column('users', 'is_premium')
