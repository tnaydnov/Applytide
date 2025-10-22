"""merge branches after admin cleanup

Revision ID: 20251022_merge
Revises: 20251021_archive, g3h4i5j6k7l8
Create Date: 2025-10-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251022_merge'
down_revision = ('20251021_archive', 'g3h4i5j6k7l8')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration - no schema changes needed
    pass


def downgrade():
    # This is a merge migration - no schema changes needed
    pass
