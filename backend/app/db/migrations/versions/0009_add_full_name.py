"""add_full_name_to_users

Revision ID: 0009_add_full_name
Revises: 0008_premium_and_preferences
Create Date: 2025-09-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0009_add_full_name'
down_revision = '0008_premium_and_preferences'
branch_labels = None
depends_on = None


def upgrade():
    # Add full_name column to users table
    op.add_column('users', sa.Column('full_name', sa.String(255), nullable=True))


def downgrade():
    # Remove full_name column from users table
    op.drop_column('users', 'full_name')
