"""add job_type to jobs

Revision ID: 88339cf63f91
Revises: 0011_add_requirements_skills
Create Date: 2025-09-06 

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '88339cf63f91'
down_revision = '0011_add_requirements_skills'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('job_type', sa.String(length=40), nullable=True))


def downgrade():
    op.drop_column('jobs', 'job_type')
