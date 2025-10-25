"""Add timezone field to reminders

Revision ID: 20251025_reminder_timezone
Revises: 20251025_reminder_notifications
Create Date: 2025-10-25 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251025_reminder_timezone'
down_revision = '20251025_reminder_notifications'
branch_labels = None
depends_on = None


def upgrade():
    # Add user_timezone field to reminders table
    op.add_column('reminders', sa.Column('user_timezone', sa.String(length=50), nullable=True))
    
    # Set default timezone for existing reminders (UTC)
    op.execute("UPDATE reminders SET user_timezone = 'UTC' WHERE user_timezone IS NULL")


def downgrade():
    op.drop_column('reminders', 'user_timezone')
