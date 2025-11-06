"""Add banned_entities table for user and IP banning

Revision ID: 20251106_banned_entities
Revises: 20251103_subscription_plan
Create Date: 2025-11-06 12:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251106_banned_entities'
down_revision = '20251103_subscription_plan'
branch_labels = None
depends_on = None


def upgrade():
    """Create banned_entities table with full audit trail"""
    
    # Create banned_entities table
    op.create_table(
        'banned_entities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('entity_value', sa.String(320), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('banned_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('banned_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('unbanned_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('banned_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('unbanned_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Add foreign keys
    op.create_foreign_key(
        'fk_banned_entities_banned_user_id',
        'banned_entities', 'users',
        ['banned_user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_banned_entities_banned_by',
        'banned_entities', 'users',
        ['banned_by'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_banned_entities_unbanned_by',
        'banned_entities', 'users',
        ['unbanned_by'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add unique constraint to prevent duplicate bans
    op.create_unique_constraint(
        'uix_entity_type_value',
        'banned_entities',
        ['entity_type', 'entity_value']
    )
    
    # Add indexes for performance
    op.create_index(
        'idx_banned_entities_type',
        'banned_entities',
        ['entity_type']
    )
    
    op.create_index(
        'idx_banned_entities_value',
        'banned_entities',
        ['entity_value']
    )
    
    op.create_index(
        'idx_banned_entities_active',
        'banned_entities',
        ['is_active']
    )
    
    op.create_index(
        'idx_banned_entities_user',
        'banned_entities',
        ['banned_user_id']
    )
    
    # Composite index for the most common query pattern
    op.create_index(
        'idx_banned_entities_lookup',
        'banned_entities',
        ['entity_type', 'entity_value', 'is_active']
    )


def downgrade():
    """Drop banned_entities table and all related objects"""
    
    # Drop indexes
    op.drop_index('idx_banned_entities_lookup', 'banned_entities')
    op.drop_index('idx_banned_entities_user', 'banned_entities')
    op.drop_index('idx_banned_entities_active', 'banned_entities')
    op.drop_index('idx_banned_entities_value', 'banned_entities')
    op.drop_index('idx_banned_entities_type', 'banned_entities')
    
    # Drop unique constraint
    op.drop_constraint('uix_entity_type_value', 'banned_entities', type_='unique')
    
    # Drop foreign keys
    op.drop_constraint('fk_banned_entities_unbanned_by', 'banned_entities', type_='foreignkey')
    op.drop_constraint('fk_banned_entities_banned_by', 'banned_entities', type_='foreignkey')
    op.drop_constraint('fk_banned_entities_banned_user_id', 'banned_entities', type_='foreignkey')
    
    # Drop table
    op.drop_table('banned_entities')
