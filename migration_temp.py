"""Add requirements and skills arrays to jobs

Revision ID: fc0ffe659cfc
Revises: ac6b53b02629
Create Date: 2024-09-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fc0ffe659cfc'
down_revision = 'ac6b53b02629'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns with default values first (nullable)
    op.add_column('jobs', sa.Column('requirements', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('jobs', sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Update existing rows to have empty arrays
    op.execute("UPDATE jobs SET requirements = '[]'::jsonb WHERE requirements IS NULL")
    op.execute("UPDATE jobs SET skills = '[]'::jsonb WHERE skills IS NULL")
    
    # Now make them NOT NULL
    op.alter_column('jobs', 'requirements', nullable=False)
    op.alter_column('jobs', 'skills', nullable=False)


def downgrade():
    op.drop_column('jobs', 'skills')
    op.drop_column('jobs', 'requirements')
