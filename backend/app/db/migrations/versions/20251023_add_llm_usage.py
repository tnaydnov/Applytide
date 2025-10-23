"""Add LLM usage tracking table

Revision ID: 20251023_llm_usage
Revises: 20251022_initial
Create Date: 2025-10-23 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251023_llm_usage'
down_revision = '20251022_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create llm_usage table
    op.create_table('llm_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('endpoint', sa.String(length=200), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False),
        sa.Column('completion_tokens', sa.Integer(), nullable=False),
        sa.Column('total_tokens', sa.Integer(), nullable=False),
        sa.Column('estimated_cost', sa.Float(), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('idx_llm_usage_timestamp', 'llm_usage', ['timestamp'])
    op.create_index('idx_llm_usage_user_id', 'llm_usage', ['user_id'])
    op.create_index('idx_llm_usage_provider', 'llm_usage', ['provider'])
    op.create_index('idx_llm_usage_model', 'llm_usage', ['model'])
    op.create_index('idx_llm_usage_success', 'llm_usage', ['success'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_llm_usage_success', table_name='llm_usage')
    op.drop_index('idx_llm_usage_model', table_name='llm_usage')
    op.drop_index('idx_llm_usage_provider', table_name='llm_usage')
    op.drop_index('idx_llm_usage_user_id', table_name='llm_usage')
    op.drop_index('idx_llm_usage_timestamp', table_name='llm_usage')
    
    # Drop table
    op.drop_table('llm_usage')
