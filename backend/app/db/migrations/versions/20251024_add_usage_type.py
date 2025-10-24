"""Add usage_type field to llm_usage table

Revision ID: 20251024_usage_type
Revises: 20251023_llm_usage
Create Date: 2025-10-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251024_usage_type'
down_revision = '20251023_llm_usage'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add usage_type field for better categorization of LLM calls."""
    # Add usage_type column
    op.add_column('llm_usage', sa.Column('usage_type', sa.String(length=100), nullable=True))
    
    # Create index for filtering by usage type
    op.create_index('ix_llm_usage_usage_type', 'llm_usage', ['usage_type'])
    
    # Update existing records based on endpoint field
    # This preserves historical data with proper categorization
    op.execute("""
        UPDATE llm_usage 
        SET usage_type = CASE 
            WHEN endpoint = 'job_extraction' THEN 'chrome_extension'
            WHEN endpoint = 'cover_letter_generation' THEN 'cover_letter'
            ELSE 'other'
        END
    """)
    
    # Make the column non-nullable after backfilling
    op.alter_column('llm_usage', 'usage_type', nullable=False)


def downgrade() -> None:
    """Remove usage_type field."""
    op.drop_index('ix_llm_usage_usage_type', table_name='llm_usage')
    op.drop_column('llm_usage', 'usage_type')
