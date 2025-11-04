"""Add comprehensive subscription management system

Revision ID: 20251103_subscription_plan
Revises: 20251031_add_extension_banner_field
Create Date: 2025-11-03 00:00:00.000000

Adds fields for:
- subscription_plan: Dynamic plan name (starter, pro, premium, etc.)
- subscription_status: active, canceled, expired, past_due
- subscription_period: monthly, yearly
- Auto-renewal tracking
- Cancellation handling (keeps access until period ends)

Removes deprecated fields:
- is_premium (replaced by subscription_plan + subscription_status)
- premium_expires_at (replaced by subscription_ends_at)

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251103_subscription_plan'
down_revision = '20251031_add_extension_banner'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new subscription management columns
    op.add_column('users', sa.Column('subscription_plan', sa.String(20), nullable=True, server_default='starter'))
    op.add_column('users', sa.Column('subscription_status', sa.String(20), nullable=True, server_default='active'))
    op.add_column('users', sa.Column('subscription_period', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('subscription_started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_renews_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_ends_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_canceled_at', sa.DateTime(timezone=True), nullable=True))
    
    # Migrate existing data from is_premium to new system
    op.execute("""
        UPDATE users 
        SET 
            subscription_plan = CASE 
                WHEN is_premium = true THEN 'premium'
                ELSE 'starter'
            END,
            subscription_status = CASE
                WHEN is_premium = true THEN 'active'
                ELSE 'active'
            END,
            subscription_ends_at = CASE
                WHEN is_premium = true AND premium_expires_at IS NOT NULL THEN premium_expires_at
                ELSE NULL
            END
    """)
    
    # Make non-nullable after migration
    op.alter_column('users', 'subscription_plan', nullable=False)
    op.alter_column('users', 'subscription_status', nullable=False)
    
    # Add index for fast plan queries
    op.create_index('ix_users_subscription_plan', 'users', ['subscription_plan'])
    op.create_index('ix_users_subscription_status', 'users', ['subscription_status'])
    
    # Drop old deprecated columns
    op.drop_column('users', 'is_premium')
    op.drop_column('users', 'premium_expires_at')


def downgrade() -> None:
    # Restore old columns
    op.add_column('users', sa.Column('is_premium', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('premium_expires_at', sa.DateTime(timezone=True), nullable=True))
    
    # Migrate data back
    op.execute("""
        UPDATE users 
        SET 
            is_premium = CASE 
                WHEN subscription_plan != 'starter' AND subscription_status = 'active' THEN true
                ELSE false
            END,
            premium_expires_at = subscription_ends_at
    """)
    
    op.alter_column('users', 'is_premium', nullable=False)
    
    # Remove indexes
    op.drop_index('ix_users_subscription_status', table_name='users')
    op.drop_index('ix_users_subscription_plan', table_name='users')
    
    # Remove new columns
    op.drop_column('users', 'subscription_canceled_at')
    op.drop_column('users', 'subscription_ends_at')
    op.drop_column('users', 'subscription_renews_at')
    op.drop_column('users', 'subscription_started_at')
    op.drop_column('users', 'subscription_period')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'subscription_plan')
