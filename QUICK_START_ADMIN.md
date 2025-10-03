# ⚡ Quick Start - Access Admin Dashboard

## TL;DR - 3 Steps

```bash
# 1. Make yourself admin
cd backend
python scripts/make_admin.py your-email@example.com

# 2. Run migration (if not done)
alembic upgrade head

# 3. Access dashboard
# Go to: http://localhost:3000/admin
```

---

## Option A: Using the Script (Easiest) ⭐

### Windows:
```powershell
# From project root
.\make-admin.bat your-email@example.com
```

### Mac/Linux:
```bash
# From project root
cd backend
python scripts/make_admin.py your-email@example.com
```

### Examples:
```bash
# Make user an admin
python scripts/make_admin.py john@applytide.com

# Remove admin status
python scripts/make_admin.py john@applytide.com --remove

# List all admins
python scripts/make_admin.py --list
```

---

## Option B: Direct SQL

```sql
-- Connect to database
psql -U postgres applytide

-- Make user admin
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify
SELECT email, is_admin FROM users WHERE email = 'your-email@example.com';
```

---

## Then Access Dashboard

1. **Login**: Go to `http://localhost:3000/login`
2. **Navigate**: Go to `http://localhost:3000/admin`
3. **Done!** 🎉

---

## Admin Pages

- `/admin` - Dashboard (stats, overview)
- `/admin/users` - User management
- `/admin/analytics` - Advanced analytics  
- `/admin/system` - System health & audit logs

---

## Troubleshooting

### "403 Forbidden"
```bash
# Check if you're admin
python scripts/make_admin.py --list
# If your email not listed, run:
python scripts/make_admin.py your-email@example.com
```

### "401 Unauthorized"
- Logout and login again
- Token might be expired

### Script not working?
```bash
# Make sure you're in backend directory
cd backend

# Install dependencies
pip install -r requirements.api.txt

# Run migration
alembic upgrade head

# Try script again
python scripts/make_admin.py your-email@example.com
```

---

## Full Documentation

For complete setup instructions, see: `ADMIN_ACCESS_GUIDE.md`
