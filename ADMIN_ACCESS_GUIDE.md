# 🚀 How to Access the Admin Dashboard

## Quick Start Guide

Follow these steps to set up and access the admin dashboard:

---

## Step 1: Make Yourself an Admin

You need to manually set `is_admin=true` for your user account in the database.

### Option A: Using Database GUI (Easiest)

If you have a database GUI tool (pgAdmin, DBeaver, etc.):

1. Open your database tool
2. Connect to your database
3. Find your user in the `users` table (search by your email)
4. Set `is_admin = true` for your user
5. Save changes

### Option B: Using SQL Command

```bash
# Connect to your database
psql -U postgres applytide

# Or if using Docker:
docker exec -it applytide-db psql -U postgres applytide
```

Then run this SQL:

```sql
-- Find your user ID first (replace with your email)
SELECT id, email, is_admin FROM users WHERE email = 'your-email@example.com';

-- Make yourself admin (replace with your user ID)
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT id, email, is_admin FROM users WHERE email = 'your-email@example.com';
-- Should show: is_admin = t (true)
```

### Option C: Using Python Script (Automated)

Create a script to make any user an admin:

```python
# backend/scripts/make_admin.py
import sys
from app.db.session import SessionLocal
from app.db import models

def make_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            return
        
        if user.is_admin:
            print(f"✅ {email} is already an admin")
            return
        
        user.is_admin = True
        db.commit()
        print(f"✅ Successfully made {email} an admin!")
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    make_admin(email)
```

Run it:
```bash
cd backend
python scripts/make_admin.py your-email@example.com
```

---

## Step 2: Install Dependencies (If Not Done)

```bash
cd backend
pip install -r requirements.api.txt
```

This installs:
- `slowapi>=0.1.9` (for rate limiting)
- All other required packages

---

## Step 3: Run Database Migration

Apply the admin system migration:

```bash
cd backend
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade ... -> c5d6e7f8g9h0, add admin features
```

---

## Step 4: Start the Backend (If Not Running)

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or if you have a different startup script, use that.

---

## Step 5: Start the Frontend (If Not Running)

```bash
cd frontend
npm install  # If first time
npm run dev
```

Frontend should run on: `http://localhost:3000`

---

## Step 6: Access the Admin Dashboard

1. **Login to your account**:
   - Go to: `http://localhost:3000/login`
   - Login with your email (the one you made admin)

2. **Navigate to Admin Dashboard**:
   - Go to: `http://localhost:3000/admin`
   - Or click "Admin" in the navigation menu (if visible)

### Available Admin Pages:

| Page | URL | Description |
|------|-----|-------------|
| **Dashboard** | `/admin` | Main dashboard with stats |
| **Users** | `/admin/users` | User management |
| **Analytics** | `/admin/analytics` | Advanced analytics |
| **System** | `/admin/system` | System health & logs |

---

## Step 7: Verify Everything Works

### Test 1: Access Dashboard
```bash
# Should return admin stats (not 403)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/dashboard
```

### Test 2: Check Rate Limiting
The API should include rate limit headers:
```bash
curl -I -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/dashboard
```

Should see headers like:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

### Test 3: Try Admin Functions
- View user list
- Check system health
- View audit logs
- Try CSV export

---

## Troubleshooting

### ❌ "403 Forbidden: Admin access required"

**Problem**: Your user doesn't have admin privileges.

**Solution**: 
```sql
-- Check your admin status
SELECT email, is_admin FROM users WHERE email = 'your-email@example.com';

-- If is_admin is false, make it true
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### ❌ "401 Unauthorized"

**Problem**: Not logged in or token expired.

**Solution**:
1. Logout and login again
2. Check if JWT token is being sent in cookie or Authorization header
3. Verify token hasn't expired

### ❌ "404 Not Found" on /admin routes

**Problem**: Frontend routing issue or admin pages not found.

**Solution**:
1. Verify admin pages exist: `frontend/pages/admin/index.js`
2. Check Next.js is running: `npm run dev`
3. Clear browser cache and refresh

### ❌ "Import could not be resolved" errors in VSCode

**Problem**: Python packages not installed or virtualenv not activated.

**Solution**:
```bash
cd backend
pip install -r requirements.api.txt
```

These are just IDE warnings - code will still run.

### ❌ Rate Limit Errors Immediately

**Problem**: Redis not running or configured incorrectly.

**Solution**:
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it
# Windows (if installed): redis-server
# Linux/Mac: sudo systemctl start redis
# Docker: docker run -d -p 6379:6379 redis:alpine
```

### ❌ Step-Up Authentication Not Working

**Problem**: Cache service not configured or Redis not running.

**Solution**:
1. Check Redis is running (see above)
2. Verify `REDIS_URL` in environment variables
3. Check `backend/app/infra/cache/service.py` exists

---

## Navigation Menu Integration (Optional)

If you want to add "Admin" link to your navigation:

### Update Nav Component

```jsx
// frontend/components/nav/MainNav.js (or similar)

import { useAuth } from '../../contexts/AuthContext';

export const MainNav = () => {
  const { user } = useAuth();

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/jobs">Jobs</Link>
      <Link href="/applications">Applications</Link>
      
      {/* Show Admin link only for admin users */}
      {user?.is_admin && (
        <Link href="/admin" className="admin-link">
          <span className="admin-badge">Admin</span>
        </Link>
      )}
      
      <Link href="/profile">Profile</Link>
    </nav>
  );
};
```

**Note**: Make sure `is_admin` is included in your auth context/user object.

---

## Security Checklist

Before using admin features in production:

- [ ] Change default admin password
- [ ] Enable HTTPS (required for SameSite cookies)
- [ ] Configure CORS properly
- [ ] Set up monitoring/alerts
- [ ] Test rate limiting
- [ ] Test step-up authentication
- [ ] Verify audit logging works
- [ ] Test CSV export
- [ ] Test log purge (with caution!)

---

## Quick Reference

### Admin API Endpoints

```bash
# Dashboard stats
GET /api/admin/dashboard

# System health
GET /api/admin/health

# Analytics
GET /api/admin/analytics

# List users
GET /api/admin/users?page=1&page_size=50

# Get user details
GET /api/admin/users/{user_id}

# Update admin status (requires step-up)
PATCH /api/admin/users/{user_id}/admin-status
Body: {"is_admin": true, "reason": "Detailed justification..."}

# Update premium status
PATCH /api/admin/users/{user_id}/premium-status
Body: {"is_premium": true, "reason": "Detailed justification..."}

# Get audit logs
GET /api/admin/logs?page=1&page_size=50

# Export logs (CSV)
GET /api/admin/logs/export?days=30

# Verify password (step-up)
POST /api/admin/verify-password
Body: {"password": "your_password"}

# Purge old logs (requires step-up)
DELETE /api/admin/logs/purge?days=365
```

### Environment Variables

```bash
# backend/.env
SAME_SITE_COOKIES=lax
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost/applytide
JWT_SECRET=your-secret-key
```

---

## Testing the Setup

Run this command to verify everything is configured:

```bash
# Test 1: Check if you're admin
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'
# Should return: is_admin: true

# Test 2: Access admin dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/admin/dashboard
# Should return: dashboard stats (not 403)

# Test 3: Rate limiting
for i in {1..5}; do curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/dashboard; done
# Should succeed (rate limit is 100/min)
```

---

## 🎉 You're All Set!

Once you've completed these steps, you can:

✅ Access admin dashboard at `/admin`  
✅ Manage users (view, promote, revoke access)  
✅ View system analytics  
✅ Monitor audit logs  
✅ Export logs to CSV  
✅ Purge old logs (with step-up auth)  

**Admin Dashboard URL**: `http://localhost:3000/admin`

Enjoy your bulletproof admin system! 🛡️

---

## Need Help?

- **Backend logs**: Check terminal running `uvicorn`
- **Frontend logs**: Check browser console (F12)
- **Database issues**: Check PostgreSQL logs
- **Redis issues**: `redis-cli ping` should return PONG

**Documentation**:
- Full implementation: `ADMIN_IMPLEMENTATION_COMPLETE.md`
- Frontend integration: `FRONTEND_INTEGRATION_GUIDE.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`
