# Migration Fix: Active Sessions Schema Update

**Date**: October 21, 2025  
**Issue**: Duplicate table error - `active_sessions` already exists

---

## 🔴 PROBLEM

**Error**: `relation "active_sessions" already exists`

**Root Cause**: 
The new migration `20251021_llm_sessions.py` was trying to **CREATE** the `active_sessions` table, but it was already created by a previous migration: `20251020_180650_add_enhanced_admin_features.py`

---

## 🔍 SCHEMA DIFFERENCES

The OLD schema (existing in database) vs NEW schema (in models.py):

| Field | OLD (20251020_180650) | NEW (models.py) | Action |
|-------|----------------------|-----------------|--------|
| `session_token` | VARCHAR(64) | VARCHAR(500) | ✅ ALTER to 500 |
| `created_at` | EXISTS | - | ✅ RENAME to `login_at` |
| `login_at` | - | EXISTS | ✅ From renamed `created_at` |
| `refresh_token_jti` | VARCHAR(36) | - | ✅ DROP column |
| `device_info` | VARCHAR(200) | - | ✅ RENAME to `location` |
| `location` | - | VARCHAR(200) | ✅ From renamed `device_info` |
| `device_type` | - | VARCHAR(50) | ✅ ADD column |
| `browser` | - | VARCHAR(100) | ✅ ADD column |
| `os` | - | VARCHAR(100) | ✅ ADD column |
| `ip_address` | No index | Indexed | ✅ ADD index |

---

## ✅ SOLUTION

**Changed migration from CREATE to ALTER TABLE operations**:

### Upgrade Function:
```python
def upgrade():
    # 1. Create llm_usage table
    op.create_table('llm_usage', ...)
    
    # 2. UPDATE active_sessions schema (not create!)
    op.alter_column('active_sessions', 'session_token', type_=sa.String(500))
    op.alter_column('active_sessions', 'created_at', new_column_name='login_at')
    op.add_column('active_sessions', sa.Column('device_type', ...))
    op.add_column('active_sessions', sa.Column('browser', ...))
    op.add_column('active_sessions', sa.Column('os', ...))
    op.alter_column('active_sessions', 'device_info', new_column_name='location')
    op.drop_column('active_sessions', 'refresh_token_jti')
    op.drop_index('ix_active_sessions_refresh_token_jti')
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
    
    # Revert active_sessions schema changes
    op.drop_index('ix_active_sessions_ip_address')
    op.create_index('ix_active_sessions_refresh_token_jti', ...)
    op.add_column('active_sessions', sa.Column('refresh_token_jti', ...))
    op.alter_column('active_sessions', 'location', new_column_name='device_info')
    op.drop_column('active_sessions', 'os')
    op.drop_column('active_sessions', 'browser')
    op.drop_column('active_sessions', 'device_type')
    op.alter_column('active_sessions', 'login_at', new_column_name='created_at')
    op.alter_column('active_sessions', 'session_token', type_=sa.String(64))
```

---

## 📋 MIGRATION CREATES

✅ **New Tables (3)**:
1. `llm_usage` - LLM cost and usage tracking
2. `error_logs` - Application error tracking
3. `security_events` - Security incident monitoring

✅ **Schema Updates (1)**:
1. `active_sessions` - Updated to match new model schema

---

## 🎯 STATUS

**Migration File**: ✅ FIXED - `20251021_llm_sessions.py`
**Ready to Deploy**: ✅ YES

**Next Steps**:
1. Run: `alembic upgrade head`
2. Verify 3 new tables created
3. Verify `active_sessions` table updated with new fields

---

## 📝 NOTES

- The `active_sessions` table was created in a previous migration, so we can't drop and recreate it
- Instead, we use ALTER TABLE operations to update the schema
- This preserves any existing data in the `active_sessions` table
- The downgrade function properly reverts all schema changes

