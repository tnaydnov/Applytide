# 🔧 Fix Migration Conflict - Production

## Issue
Multiple head migrations exist:
- `c5d6e7f8g9h0` (admin features) 
- `f2a3b4c5d6e7` (document types)

## Solution

### Step 1: Pull Latest Code

The migration file has been fixed locally. Pull the latest changes:

```bash
# On production server
cd ~/Applytide
git pull origin main
```

### Step 2: Verify Migration Chain

```bash
cd backend
alembic heads
```

Should now show **only ONE head**:
```
c5d6e7f8g9h0 (head)
```

### Step 3: Check Current Database State

```bash
alembic current
```

This shows what's currently applied to your database.

### Step 4: Apply Migration

```bash
# Backup first!
pg_dump -U postgres applytide > backup_before_admin_$(date +%Y%m%d_%H%M%S).sql

# Apply migration
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade f2a3b4c5d6e7 -> c5d6e7f8g9h0, add admin features
```

### Step 5: Verify

```bash
alembic current
```

Should show:
```
c5d6e7f8g9h0 (head)
```

---

## If You Get Errors

### Error: "Can't locate revision identified by 'f2a3b4c5d6e7'"

This means the document_type migration hasn't been applied yet. Apply it first:

```bash
alembic upgrade f2a3b4c5d6e7
alembic upgrade head
```

### Error: "Target database is not up to date"

Check what's applied:
```bash
alembic current
alembic history
```

Then upgrade step by step:
```bash
alembic upgrade +1  # Apply next migration
alembic current     # Check progress
# Repeat until at head
```

---

## Manual Fix (If Needed)

If you're still stuck, you can manually fix the migration file on production:

```bash
# On production server
cd ~/Applytide/backend/app/db/migrations/versions

# Edit the admin migration
nano c5d6e7f8g9h0_add_admin_features.py

# Change line 13:
# FROM: down_revision = 'b4d5a72fc891'
# TO:   down_revision = 'f2a3b4c5d6e7'

# Save and exit (Ctrl+X, Y, Enter)
```

---

## Quick Commands

```bash
# 1. Pull latest code
cd ~/Applytide && git pull

# 2. Backup database
pg_dump -U postgres applytide > backup.sql

# 3. Apply migration
cd backend && alembic upgrade head

# 4. Verify
alembic current  # Should show: c5d6e7f8g9h0 (head)

# 5. Restart API
sudo systemctl restart applytide-api
```

---

## What Changed

The admin migration now correctly points to `f2a3b4c5d6e7` (document types) as its parent, creating a linear migration chain:

```
... -> f1a2b3c4d5e6 -> f2a3b4c5d6e7 -> c5d6e7f8g9h0 (head)
       (profiles)     (doc types)     (admin)
```

---

## After Migration Succeeds

Then you can make yourself admin:

```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

And access: `https://applytide.com/admin`
