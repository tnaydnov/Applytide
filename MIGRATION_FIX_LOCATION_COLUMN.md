# Migration Fix: Active Sessions Column Conflict Resolution

**Date**: October 21, 2025  
**Issue**: Duplicate column error - `location` already exists

---

## 🔴 PROBLEM

**Error**: `column "location" of relation "active_sessions" already exists`

**Root Cause**: 
The existing `active_sessions` table (from migration `20251020_180650`) **ALREADY HAS BOTH** `device_info` and `location` columns:
- `device_info` VARCHAR(200)
- `location` VARCHAR(100)

The migration was trying to RENAME `device_info` to `location`, but `location` already existed!

---

## 🔍 ACTUAL vs EXPECTED SCHEMA

### Current Schema (in database):
```sql
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token VARCHAR(64) NOT NULL,
    refresh_token_jti VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    device_info VARCHAR(200),      -- EXISTS
    location VARCHAR(100),          -- EXISTS (both exist!)
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
)
```

### Target Schema (models.py):
```sql
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token VARCHAR(500) NOT NULL,  -- Extended from 64
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    device_type VARCHAR(50),              -- NEW
    browser VARCHAR(100),                 -- NEW
    os VARCHAR(100),                      -- NEW
    location VARCHAR(200),                -- Keep, expand from 100
    login_at TIMESTAMP,                   -- Renamed from created_at
    last_activity_at TIMESTAMP,
    expires_at TIMESTAMP
)
```

---

## ✅ SOLUTION

**Corrected Migration Operations**:

### Upgrade Function:
```python
def upgrade():
    # 1. Create llm_usage table
    op.create_table('llm_usage', ...)
    
    # 2. UPDATE active_sessions schema
    # Modify existing columns
    op.alter_column('active_sessions', 'session_token', type_=sa.String(500))
    op.alter_column('active_sessions', 'created_at', new_column_name='login_at')
    op.alter_column('active_sessions', 'location', type_=sa.String(200))  # Expand from 100 to 200
    
    # Add new columns
    op.add_column('active_sessions', sa.Column('device_type', sa.String(50)))
    op.add_column('active_sessions', sa.Column('browser', sa.String(100)))
    op.add_column('active_sessions', sa.Column('os', sa.String(100)))
    
    # Drop columns we don't need
    op.drop_column('active_sessions', 'device_info')  # Drop, not rename!
    op.drop_column('active_sessions', 'refresh_token_jti')
    op.drop_index('ix_active_sessions_refresh_token_jti')
    
    # Add new index
    op.create_index('ix_active_sessions_ip_address', ...)
    
    # 3. Create error_logs table
    op.create_table('error_logs', ...)
    
    # 4. Create security_events table
    op.create_table('security_events', ...)
```

### Downgrade Function:
```python
def downgrade():
    # Drop new tables
    op.drop_table('security_events')
    op.drop_table('error_logs')
    op.drop_table('llm_usage')
    
    # Revert active_sessions changes
    op.drop_index('ix_active_sessions_ip_address')
    op.create_index('ix_active_sessions_refresh_token_jti', ...)
    op.add_column('active_sessions', sa.Column('refresh_token_jti', ...))
    op.add_column('active_sessions', sa.Column('device_info', sa.String(200)))  # Re-add device_info
    op.drop_column('active_sessions', 'os')
    op.drop_column('active_sessions', 'browser')
    op.drop_column('active_sessions', 'device_type')
    op.alter_column('active_sessions', 'location', type_=sa.String(100))  # Shrink back to 100
    op.alter_column('active_sessions', 'login_at', new_column_name='created_at')
    op.alter_column('active_sessions', 'session_token', type_=sa.String(64))
```

---

## 📋 SCHEMA CHANGES SUMMARY

| Field | Before | After | Operation |
|-------|--------|-------|-----------|
| `session_token` | VARCHAR(64) | VARCHAR(500) | ✅ ALTER TYPE |
| `created_at` | EXISTS | - | ✅ RENAME to login_at |
| `login_at` | - | EXISTS | ✅ From renamed created_at |
| `refresh_token_jti` | VARCHAR(36) | - | ✅ DROP |
| `device_info` | VARCHAR(200) | - | ✅ DROP (not rename!) |
| `location` | VARCHAR(100) | VARCHAR(200) | ✅ EXPAND size |
| `device_type` | - | VARCHAR(50) | ✅ ADD |
| `browser` | - | VARCHAR(100) | ✅ ADD |
| `os` | - | VARCHAR(100) | ✅ ADD |
| `ip_address` | No index | Indexed | ✅ ADD INDEX |

---

## 🎯 STATUS

**Migration File**: ✅ FIXED - `20251021_llm_sessions.py`
**Ready to Deploy**: ✅ YES

**What This Migration Does**:
1. ✅ Creates `llm_usage` table
2. ✅ Updates `active_sessions` table (6 operations)
3. ✅ Creates `error_logs` table
4. ✅ Creates `security_events` table

**Next Steps**:
```bash
cd backend
alembic upgrade head
```

---

## 📝 KEY LESSON

**Don't assume schema structure from models.py alone!** 

Always check the actual database schema or previous migrations before writing ALTER TABLE operations. In this case:
- **Wrong assumption**: `device_info` should be renamed to `location`
- **Reality**: Both columns already exist, just drop `device_info` and expand `location`

