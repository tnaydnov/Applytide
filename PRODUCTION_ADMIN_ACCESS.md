# 🔒 Production Admin Access - applytide.com

## ⚠️ IMPORTANT - Production Environment

This guide is for **production** (applytide.com), not local development.

---

## Step 1: Connect to Production Database

You need to access your production database to make yourself an admin.

### Option A: SSH into Production Server

```bash
# SSH into your server
ssh user@applytide.com
# Or wherever your production server is hosted

# Connect to PostgreSQL
psql -U postgres applytide

# Or if using Docker:
docker exec -it applytide-db psql -U postgres applytide
```

### Option B: Remote Database Connection

If you have remote database access configured:

```bash
# Connect remotely (replace with your actual connection details)
psql -h your-db-host -U your-db-user -d applytide
```

---

## Step 2: Make Yourself Admin

Once connected to the database:

```sql
-- Find your user (replace with your actual email)
SELECT id, email, is_admin FROM users WHERE email = 'your-email@example.com';

-- Make yourself admin
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT id, email, is_admin, created_at FROM users WHERE email = 'your-email@example.com';
```

Expected output:
```
 id                                   | email                    | is_admin | created_at
--------------------------------------+--------------------------+----------+------------
 123e4567-e89b-12d3-a456-426614174000 | your-email@example.com  | t        | 2024-...
```

---

## Step 3: Apply Database Migration (If Not Done)

**⚠️ IMPORTANT**: Test migration in staging first if possible!

```bash
# SSH into production server
ssh user@applytide.com

# Navigate to backend directory
cd /path/to/applytide/backend

# Backup database first!
pg_dump -U postgres applytide > backup_before_admin_migration_$(date +%Y%m%d_%H%M%S).sql

# Run migration
alembic upgrade head
```

**What this migration does**:
- Changes `admin_logs.admin_id` from NOT NULL to nullable
- Adds `admin_logs.admin_email` column
- Changes foreign key from CASCADE to SET NULL
- Creates indexes

---

## Step 4: Install Dependencies (If Not Done)

```bash
# SSH into production
ssh user@applytide.com

cd /path/to/applytide/backend

# Install new dependencies (slowapi for rate limiting)
pip install -r requirements.api.txt

# Or if using virtual environment:
source venv/bin/activate
pip install -r requirements.api.txt
```

---

## Step 5: Restart Production Services

```bash
# Restart API server
sudo systemctl restart applytide-api

# Or if using Docker:
docker-compose restart api

# Or if using PM2:
pm2 restart applytide-api

# Verify services are running
sudo systemctl status applytide-api
# Or
docker-compose ps
# Or
pm2 list
```

---

## Step 6: Verify Redis is Running

The admin system needs Redis for:
- Rate limiting
- Step-up authentication cache

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it:
sudo systemctl start redis
# Or
docker-compose up -d redis
```

---

## Step 7: Access Production Admin Dashboard

1. **Login**: Go to `https://applytide.com/login`
2. **Navigate**: Go to `https://applytide.com/admin`
3. **Done!** 🎉

---

## 🔐 Security Checklist for Production

Before using admin features in production:

### Required:
- [x] HTTPS enabled (you have this already)
- [ ] Your user has `is_admin = true` in database
- [ ] Database migration applied (`alembic upgrade head`)
- [ ] Dependencies installed (`pip install -r requirements.api.txt`)
- [ ] Redis running (for rate limiting and step-up auth)
- [ ] Backend restarted after changes

### Recommended:
- [ ] Test admin access with your account
- [ ] Verify rate limiting works (check response headers)
- [ ] Test step-up authentication (try changing admin status)
- [ ] Monitor error logs after deployment
- [ ] Set up alerts for unusual admin activity

---

## 🚨 Production Safety

### Database Backup (CRITICAL)

**Before any database changes**:
```bash
# Backup database
pg_dump -U postgres applytide > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if remote:
pg_dump -h your-db-host -U your-db-user applytide > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Test in Staging First (If Available)

If you have a staging environment:
1. Apply all changes to staging first
2. Test thoroughly
3. Then apply to production

### Rollback Plan

If something goes wrong:

```bash
# Restore database from backup
psql -U postgres applytide < backup_YYYYMMDD_HHMMSS.sql

# Downgrade migration (only if needed)
cd backend
alembic downgrade -1

# Restart services
sudo systemctl restart applytide-api
```

---

## 🔍 Verify Production Setup

### Test 1: Check Database Changes

```sql
-- Connect to production database
psql -U postgres applytide

-- Check admin_logs table structure
\d admin_logs

-- Should show:
--   admin_id: uuid (nullable)
--   admin_email: character varying(320) NOT NULL
--   Foreign key with ON DELETE SET NULL
```

### Test 2: Test API Access

```bash
# Replace YOUR_TOKEN with your actual JWT token from browser
# (Open browser console, find token in cookies or localStorage)

# Test admin dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" https://applytide.com/api/admin/dashboard

# Should return stats (not 403 or 401)
```

### Test 3: Check Rate Limiting

```bash
# Check response headers
curl -I -H "Authorization: Bearer YOUR_TOKEN" https://applytide.com/api/admin/dashboard

# Should include:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

---

## 🎯 Quick Production Access Steps

**TL;DR for production**:

1. **SSH into server**: `ssh user@applytide.com`
2. **Access database**: `psql -U postgres applytide`
3. **Make admin**: `UPDATE users SET is_admin = true WHERE email = 'you@example.com';`
4. **Install deps**: `pip install -r requirements.api.txt`
5. **Run migration**: `alembic upgrade head`
6. **Restart API**: `sudo systemctl restart applytide-api`
7. **Access**: `https://applytide.com/admin`

---

## 📞 Production Troubleshooting

### Issue: "403 Forbidden"

```sql
-- Check your admin status in production database
SELECT email, is_admin FROM users WHERE email = 'your-email@example.com';

-- If is_admin is false:
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### Issue: "500 Internal Server Error"

```bash
# Check API logs
sudo journalctl -u applytide-api -n 100

# Or if Docker:
docker logs applytide-api --tail 100

# Or if PM2:
pm2 logs applytide-api
```

Common causes:
- Migration not applied
- Dependencies not installed (slowapi missing)
- Redis not running

### Issue: Rate Limiting Not Working

```bash
# Check Redis is running
redis-cli ping

# If not running:
sudo systemctl start redis
# Or
docker-compose up -d redis
```

### Issue: Migration Fails

```bash
# Check current migration state
alembic current

# Check migration history
alembic history

# If stuck, check database:
psql -U postgres applytide
SELECT * FROM alembic_version;
```

---

## 🔒 Production Security Best Practices

### 1. Strong Admin Password
- Use a strong, unique password
- Enable 2FA if available
- Don't share admin credentials

### 2. Monitor Admin Activity
```sql
-- Check recent admin actions
SELECT * FROM admin_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check who has admin access
SELECT email, full_name, is_admin, created_at
FROM users
WHERE is_admin = true;
```

### 3. Set Up Alerts

Monitor for:
- Multiple failed login attempts
- Unusual admin activity patterns
- Rate limit violations
- Step-up authentication failures

### 4. Regular Security Audits
- Review admin user list monthly
- Check audit logs regularly
- Export logs for compliance
- Purge old logs per retention policy

---

## 📊 Production Monitoring

### Check Admin System Health

```bash
# API health check
curl https://applytide.com/api/admin/health

# Should return system metrics
```

### Monitor Database Size

```sql
-- Check admin_logs table size
SELECT pg_size_pretty(pg_total_relation_size('admin_logs'));

-- Check number of logs
SELECT COUNT(*) FROM admin_logs;

-- Old logs (for purging consideration)
SELECT COUNT(*) FROM admin_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 🎉 Production Access Complete!

Once you've completed these steps:

✅ You can access: `https://applytide.com/admin`  
✅ Manage users in production  
✅ Monitor system health  
✅ View audit logs  
✅ Export compliance reports  

---

## 🆘 Need Help?

- Check API logs first
- Verify database migration applied
- Ensure Redis is running
- Test with `curl` commands above
- Check `DEPLOYMENT_CHECKLIST.md` for full verification

**Production Documentation**:
- Full implementation: `ADMIN_IMPLEMENTATION_COMPLETE.md`
- Deployment guide: `DEPLOYMENT_CHECKLIST.md`
- Security audit: `ADMIN_SECURITY_AUDIT.md`
