"""merge heads

Revision ID: h8i9j0k1l2m3
Revises: c5d6e7f8g9h0, g3h4i5j6k7l8
Create Date: 2025-10-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h8i9j0k1l2m3'
down_revision = ('c5d6e7f8g9h0', 'g3h4i5j6k7l8')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration - no schema changes needed
    pass


def downgrade():
    # This is a merge migration - no schema changes needed
    pass
