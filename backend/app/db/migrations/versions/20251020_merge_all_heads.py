"""merge all heads

Revision ID: 20251020_merge_all_heads
Revises: a124a47fd4fb, 20251020_180650
Create Date: 2025-10-20 19:00:00.000000

Merges:
- a124a47fd4fb (reminder notes branch)
- 20251020_180650 (enhanced admin features)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251020_merge_all_heads'
down_revision = ('a124a47fd4fb', '20251020_180650')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration - no schema changes needed
    pass


def downgrade():
    # This is a merge migration - no schema changes needed
    pass
