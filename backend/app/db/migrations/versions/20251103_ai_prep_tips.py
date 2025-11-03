"""Add AI preparation tips to reminders

Revision ID: 20251103_ai_prep_tips
Revises: 20251103_subscription_plan
Create Date: 2025-11-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251103_ai_prep_tips'
down_revision = '20251103_subscription_plan'
branch_labels = None
depends_on = None


def upgrade():
    # Add AI prep tips fields to reminders table
    op.add_column('reminders', sa.Column('ai_prep_tips_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('reminders', sa.Column('ai_prep_tips_generated', sa.Text(), nullable=True))
    op.add_column('reminders', sa.Column('ai_prep_tips_generated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # Remove AI prep tips fields
    op.drop_column('reminders', 'ai_prep_tips_generated_at')
    op.drop_column('reminders', 'ai_prep_tips_generated', )
    op.drop_column('reminders', 'ai_prep_tips_enabled')
