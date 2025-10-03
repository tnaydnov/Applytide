"""add admin features

Revision ID: c5d6e7f8g9h0
Revises: f2a3b4c5d6e7
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c5d6e7f8g9h0'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_admin column to users table
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create admin_logs table
    # IMPORTANT: admin_id uses SET NULL to preserve audit logs even if admin is deleted
    op.create_table('admin_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), nullable=True),  # Nullable to preserve logs
        sa.Column('admin_email', sa.String(length=320), nullable=False),  # Redundant but permanent
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='SET NULL'),  # SET NULL instead of CASCADE
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_admin_logs_admin_id'), 'admin_logs', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_logs_admin_email'), 'admin_logs', ['admin_email'], unique=False)
    op.create_index(op.f('ix_admin_logs_action'), 'admin_logs', ['action'], unique=False)
    op.create_index(op.f('ix_admin_logs_target_type'), 'admin_logs', ['target_type'], unique=False)
    op.create_index(op.f('ix_admin_logs_created_at'), 'admin_logs', ['created_at'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_admin_logs_created_at'), table_name='admin_logs')
    op.drop_index(op.f('ix_admin_logs_target_type'), table_name='admin_logs')
    op.drop_index(op.f('ix_admin_logs_action'), table_name='admin_logs')
    op.drop_index(op.f('ix_admin_logs_admin_email'), table_name='admin_logs')
    op.drop_index(op.f('ix_admin_logs_admin_id'), table_name='admin_logs')
    
    # Drop admin_logs table
    op.drop_table('admin_logs')
    
    # Remove is_admin column from users
    op.drop_column('users', 'is_admin')
