"""add_user_id_to_jobs

Revision ID: 0010_add_user_id_to_jobs
Revises: 0009_add_full_name
Create Date: 2025-09-03 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0010_add_user_id_to_jobs'
down_revision = '0009_add_full_name'
branch_labels = None
depends_on = None


def upgrade():
    # Add user_id column to jobs table
    op.add_column('jobs', sa.Column('user_id', sa.UUID(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key('jobs_user_id_fkey', 'jobs', 'users', ['user_id'], ['id'])
    
    # Add index for performance
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])


def downgrade():
    # Remove index
    op.drop_index('ix_jobs_user_id', 'jobs')
    
    # Remove foreign key constraint
    op.drop_constraint('jobs_user_id_fkey', 'jobs', type_='foreignkey')
    
    # Remove user_id column
    op.drop_column('jobs', 'user_id')
