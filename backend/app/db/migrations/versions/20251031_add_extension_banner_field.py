"""add extension banner field

Revision ID: 20251031_add_extension_banner
Revises: 20251031_add_weekly_goal
Create Date: 2025-10-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251031_add_extension_banner'
down_revision = '20251031_add_weekly_goal'
branch_labels = None
depends_on = None


def upgrade():
    # Add has_dismissed_extension_banner column
    op.add_column('users', sa.Column('has_dismissed_extension_banner', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    # Remove has_dismissed_extension_banner column
    op.drop_column('users', 'has_dismissed_extension_banner')
