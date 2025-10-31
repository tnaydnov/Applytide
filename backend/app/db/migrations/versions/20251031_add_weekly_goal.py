"""add_weekly_goal_to_users

Revision ID: 20251031_weekly_goal
Revises: 20251028_welcome_modal
Create Date: 2025-10-31

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251031_weekly_goal'
down_revision = '20251028_welcome_modal'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add weekly_goal field to users table with default of 5
    op.add_column('users', sa.Column('weekly_goal', sa.Integer(), nullable=False, server_default='5'))


def downgrade() -> None:
    op.drop_column('users', 'weekly_goal')
