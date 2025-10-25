"""Add reminder notification settings

Revision ID: add_reminder_notifications
Revises: (previous revision)
Create Date: 2025-10-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251025_reminder_notifications'
down_revision = '20251024_usage_type'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email notification settings to reminders table
    op.add_column('reminders', sa.Column('email_notifications_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('reminders', sa.Column('notification_schedule', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('reminders', sa.Column('event_type', sa.String(length=50), nullable=True, server_default='general'))
    op.add_column('reminders', sa.Column('last_notification_sent', sa.DateTime(timezone=True), nullable=True))
    
    # notification_schedule structure:
    # {
    #   "type": "multiple",  // "once", "multiple", "recurring"
    #   "times": [
    #     {"value": 1, "unit": "hour", "sent": false},
    #     {"value": 1, "unit": "day", "sent": false},
    #     {"value": 1, "unit": "week", "sent": false}
    #   ]
    # }


def downgrade() -> None:
    op.drop_column('reminders', 'last_notification_sent')
    op.drop_column('reminders', 'event_type')
    op.drop_column('reminders', 'notification_schedule')
    op.drop_column('reminders', 'email_notifications_enabled')
