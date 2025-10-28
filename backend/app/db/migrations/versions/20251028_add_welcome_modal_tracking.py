"""add_welcome_modal_tracking

Revision ID: 20251028_welcome_modal
Revises: 20250128_legal_deletion
Create Date: 2025-10-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251028_welcome_modal'
down_revision = '20250128_legal_deletion'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add welcome modal tracking fields to users table
    op.add_column('users', sa.Column('has_seen_welcome_modal', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('welcome_modal_seen_at', sa.DateTime(timezone=True), nullable=True))
    
    # For existing users (created before this deployment), mark them as having seen the modal
    # This ensures only NEW users see the welcome modal
    op.execute("""
        UPDATE users 
        SET has_seen_welcome_modal = true, 
            welcome_modal_seen_at = created_at 
        WHERE created_at < NOW()
    """)


def downgrade() -> None:
    op.drop_column('users', 'welcome_modal_seen_at')
    op.drop_column('users', 'has_seen_welcome_modal')
