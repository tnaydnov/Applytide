# Ban System - Database Migration Guide

## Overview
This guide helps you deploy the new `banned_entities` table to your database.

## Prerequisites
- Backend code deployed with new BannedEntity model
- Alembic configured and working
- Database backup taken (recommended)

## Migration Steps

### Option 1: Auto-generate Migration (Recommended)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Generate migration from model changes
alembic revision --autogenerate -m "Add banned_entities table for user and IP banning"

# 3. Review generated migration file
# Located in: backend/alembic/versions/

# 4. Apply migration
alembic upgrade head

# 5. Verify table created
psql -U your_user -d your_db -c "\d banned_entities"
```

### Option 2: Manual Migration (if auto-generate fails)

Create file: `backend/alembic/versions/YYYYMMDD_HHMMSS_add_banned_entities.py`

```python
"""Add banned_entities table for user and IP banning

Revision ID: xxxxx
Revises: previous_revision
Create Date: 2025-11-06 XX:XX:XX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'xxxxx'  # Generate with: import uuid; str(uuid.uuid4())[:12]
down_revision = 'previous_revision'  # Get from: alembic history
branch_labels = None
depends_on = None


def upgrade():
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
        sa.Column('banned_at', sa.DateTime(timezone=True), nullable=False),
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
    
    # Add unique constraint
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


def downgrade():
    # Drop indexes
    op.drop_index('idx_banned_entities_user', 'banned_entities')
    op.drop_index('idx_banned_entities_active', 'banned_entities')
    op.drop_index('idx_banned_entities_value', 'banned_entities')
    op.drop_index('idx_banned_entities_type', 'banned_entities')
    
    # Drop unique constraint
    op.drop_constraint('uix_entity_type_value', 'banned_entities')
    
    # Drop foreign keys
    op.drop_constraint('fk_banned_entities_unbanned_by', 'banned_entities')
    op.drop_constraint('fk_banned_entities_banned_by', 'banned_entities')
    op.drop_constraint('fk_banned_entities_banned_user_id', 'banned_entities')
    
    # Drop table
    op.drop_table('banned_entities')
```

Apply:
```bash
alembic upgrade head
```

## Verification

### 1. Check table exists:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'banned_entities';
```

### 2. Check columns:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'banned_entities'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid, not null)
- entity_type (varchar(20), not null)
- entity_value (varchar(320), not null)
- reason (text, nullable)
- banned_user_id (uuid, nullable)
- banned_by (uuid, nullable)
- unbanned_by (uuid, nullable)
- is_active (boolean, not null, default true)
- banned_at (timestamp with time zone, not null)
- expires_at (timestamp with time zone, nullable)
- unbanned_at (timestamp with time zone, nullable)

### 3. Check indexes:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'banned_entities';
```

Expected indexes:
- `banned_entities_pkey` (PRIMARY KEY on id)
- `uix_entity_type_value` (UNIQUE on entity_type, entity_value)
- `idx_banned_entities_type` (on entity_type)
- `idx_banned_entities_value` (on entity_value)
- `idx_banned_entities_active` (on is_active)
- `idx_banned_entities_user` (on banned_user_id)

### 4. Check foreign keys:
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'banned_entities'
    AND tc.constraint_type = 'FOREIGN KEY';
```

Expected foreign keys:
- `banned_user_id` → `users.id` (ON DELETE SET NULL)
- `banned_by` → `users.id` (ON DELETE SET NULL)
- `unbanned_by` → `users.id` (ON DELETE SET NULL)

## Test Migration

### Insert test ban:
```sql
INSERT INTO banned_entities (
    id,
    entity_type,
    entity_value,
    reason,
    is_active,
    banned_at
) VALUES (
    gen_random_uuid(),
    'email',
    'test@banned.com',
    'Test ban for migration verification',
    true,
    NOW()
);
```

### Query test ban:
```sql
SELECT * FROM banned_entities WHERE entity_value = 'test@banned.com';
```

### Delete test ban:
```sql
DELETE FROM banned_entities WHERE entity_value = 'test@banned.com';
```

## Rollback (if needed)

### Rollback one migration:
```bash
alembic downgrade -1
```

### Rollback to specific revision:
```bash
alembic downgrade <revision_id>
```

### Check current revision:
```bash
alembic current
```

### Check migration history:
```bash
alembic history
```

## Production Deployment Checklist

- [ ] **Backup database** before migration
- [ ] **Test migration** in staging environment first
- [ ] **Review generated migration** file for correctness
- [ ] **Check disk space** (table will be empty initially)
- [ ] **Schedule maintenance window** (if needed)
- [ ] **Run migration** during low-traffic period
- [ ] **Verify table created** with correct schema
- [ ] **Test ban functionality** with test account
- [ ] **Monitor logs** for errors after deployment
- [ ] **Rollback plan ready** if issues occur

## Docker Deployment

If using Docker, migration runs automatically on container start:

```yaml
# docker-compose.yml already configured
services:
  backend:
    command: ["./entrypoint.sh"]
    # entrypoint.sh runs: alembic upgrade head
```

Manual migration in Docker:
```bash
# Enter backend container
docker-compose exec backend bash

# Run migration
alembic upgrade head

# Exit container
exit
```

## Troubleshooting

### Error: "Target database is not up to date"
```bash
# Check current revision
alembic current

# Check pending migrations
alembic history --verbose

# Upgrade to latest
alembic upgrade head
```

### Error: "Can't locate revision identified by 'xxxxx'"
```bash
# Stamp database with current state
alembic stamp head

# Then try migration again
alembic upgrade head
```

### Error: "Table already exists"
```bash
# Check if table exists
psql -c "\d banned_entities"

# If exists, stamp migration as applied
alembic stamp head
```

### Error: Foreign key constraint violation
```bash
# Ensure users table exists first
psql -c "SELECT COUNT(*) FROM users;"

# Check migration order
alembic history
```

## Performance Considerations

### Index Performance:
The following indexes optimize ban checks:
- `idx_banned_entities_active` - Fast filtering of active bans
- `idx_banned_entities_value` - Fast lookup by email/IP
- `idx_banned_entities_type` - Fast filtering by entity type

### Query Performance Test:
```sql
-- Should use index scan, not seq scan
EXPLAIN ANALYZE
SELECT * FROM banned_entities
WHERE entity_type = 'email'
  AND entity_value = 'test@example.com'
  AND is_active = true;
```

Expected: "Index Scan" or "Bitmap Index Scan"

### Maintenance:
```sql
-- Analyze table after bulk operations
ANALYZE banned_entities;

-- Reindex if needed
REINDEX TABLE banned_entities;
```

## Monitoring

### Table size monitoring:
```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('banned_entities')) as total_size,
    pg_size_pretty(pg_relation_size('banned_entities')) as table_size,
    pg_size_pretty(pg_indexes_size('banned_entities')) as indexes_size;
```

### Row count monitoring:
```sql
SELECT 
    COUNT(*) as total_bans,
    COUNT(*) FILTER (WHERE is_active = true) as active_bans,
    COUNT(*) FILTER (WHERE entity_type = 'email') as email_bans,
    COUNT(*) FILTER (WHERE entity_type = 'ip') as ip_bans
FROM banned_entities;
```

---

## Next Steps

After successful migration:
1. ✅ Table created and verified
2. ✅ Restart backend services
3. ✅ Test ban functionality via API
4. ✅ Monitor logs for errors
5. ✅ Implement frontend UI (see BAN_SYSTEM_IMPLEMENTATION.md)

**Questions?** Check `BAN_SYSTEM_QUICK_REFERENCE.md` or full documentation in `BAN_SYSTEM_IMPLEMENTATION.md`
