# Ban System - Quick Reference

## 🚀 For Developers

### Check if Banned (in any endpoint):
```python
from app.infra.security.ban_service import BanService
from app.infra.http.client_ip import get_client_ip

# In any endpoint
client_ip = get_client_ip(request)

if BanService.is_email_banned(db, email):
    raise HTTPException(403, "Access denied")
    
if BanService.is_ip_banned(db, client_ip):
    raise HTTPException(403, "Access denied")
```

### Ban a User (admin only):
```python
from app.infra.security.ban_service import BanService

# Ban user (email + IP, permanent)
email_ban, ip_ban = BanService.ban_user(
    db=db,
    user_id=user.id,
    email=user.email,
    ip_address=user_ip,  # optional
    reason="Violated terms of service",
    banned_by_admin_id=admin.id,
    ban_duration_days=None  # None = permanent, or integer for days
)
```

### Unban a User:
```python
# Remove all bans for user
email_count, ip_count = BanService.unban_user(
    db=db,
    user_id=user_id,
    unbanned_by_admin_id=admin.id
)
```

## 📡 API Endpoints (Admin Only)

### Ban User
```http
POST /api/admin/users/ban
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "user_id": "uuid-here",
  "reason": "Spam activity",
  "ban_ip": true,
  "ban_duration_days": 30
}
```

### Unban User
```http
POST /api/admin/users/unban
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "user_id": "uuid-here"
}
```

### List All Bans
```http
GET /api/admin/bans?active_only=true&entity_type=email
Authorization: Bearer {admin_token}
```

### Get User's Ban History
```http
GET /api/admin/users/{user_id}/bans
Authorization: Bearer {admin_token}
```

### Ban Email Directly
```http
POST /api/admin/bans/email
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "spam@example.com",
  "reason": "Known spam domain",
  "ban_duration_days": null
}
```

### Ban IP Directly
```http
POST /api/admin/bans/ip
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "ip_address": "1.2.3.4",
  "reason": "Malicious activity",
  "ban_duration_days": 7
}
```

## 🎨 Frontend Integration

### Add to admin API client:
```javascript
// frontend/features/admin/api.js

export const adminApi = {
  // ... existing methods ...
  
  // Ban management
  banUser: async (userId, data) => {
    return await apiFetch(`/api/admin/users/ban`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  unbanUser: async (userId) => {
    return await apiFetch(`/api/admin/users/unban`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    });
  },
  
  getUserBans: async (userId) => {
    return await apiFetch(`/api/admin/users/${userId}/bans`);
  },
  
  listBans: async (activeOnly = true, entityType = null) => {
    const params = new URLSearchParams();
    if (activeOnly !== null) params.append('active_only', activeOnly);
    if (entityType) params.append('entity_type', entityType);
    return await apiFetch(`/api/admin/bans?${params}`);
  }
};
```

### Add to user detail page:
```jsx
// frontend/pages/admin/users/[id].jsx

import { FiBan } from 'react-icons/fi';

// Add state
const [bans, setBans] = useState([]);
const [showBanModal, setShowBanModal] = useState(false);

// Load bans
useEffect(() => {
  if (id) {
    adminApi.getUserBans(id)
      .then(setBans)
      .catch(console.error);
  }
}, [id]);

// Ban handler
const handleBanUser = async (data) => {
  try {
    await adminApi.banUser(id, data);
    toast.success('User banned successfully');
    loadUser(); // Refresh
    loadBans(); // Refresh ban list
  } catch (error) {
    toast.error(error.message || 'Failed to ban user');
  }
};

// In JSX - add button to actions section
<button
  onClick={() => setShowBanModal(true)}
  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
  disabled={user.role === 'admin'}
>
  <FiBan className="inline mr-2" />
  Ban User
</button>

// Add ban status badge
{bans.some(b => b.is_active) && (
  <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-900/30 text-red-300 border border-red-600">
    🚫 Banned
  </span>
)}
```

## 🧪 Testing Commands

### Test ban checks:
```python
# Python shell
from app.db.session import SessionLocal
from app.infra.security.ban_service import BanService

db = SessionLocal()

# Test email ban
BanService.is_email_banned(db, "test@example.com")  # Should return False

# Test IP ban
BanService.is_ip_banned(db, "1.2.3.4")  # Should return False
```

### Test via curl:
```bash
# Ban user
curl -X POST http://localhost:8000/api/admin/users/ban \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "reason": "Test ban",
    "ban_ip": true,
    "ban_duration_days": 1
  }'

# List bans
curl http://localhost:8000/api/admin/bans?active_only=true \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔧 Maintenance

### Cleanup expired bans (run daily):
```python
# In scheduled task or cron job
from app.db.session import SessionLocal
from app.infra.security.ban_service import BanService

db = SessionLocal()
try:
    count = BanService.cleanup_expired_bans(db)
    print(f"Cleaned up {count} expired bans")
finally:
    db.close()
```

### Query banned entities directly:
```sql
-- Find all active bans
SELECT * FROM banned_entities WHERE is_active = true;

-- Find bans for specific user
SELECT * FROM banned_entities WHERE banned_user_id = 'user-uuid';

-- Find expired bans that should be cleaned up
SELECT * FROM banned_entities 
WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW();
```

## ⚠️ Common Issues

### Issue: "Access denied" even though user should be able to login
**Solution:** Check if email or IP is banned
```sql
SELECT * FROM banned_entities 
WHERE entity_value IN ('user@example.com', '1.2.3.4') 
  AND is_active = true;
```

### Issue: Cannot ban user (duplicate ban error)
**Solution:** User already banned, unban first or check ban status
```python
bans = BanService.get_user_bans(db, user_id)
for ban in bans:
    print(f"{ban.entity_type}: {ban.entity_value} - Active: {ban.is_active}")
```

### Issue: IP not being captured
**Solution:** Check proxy configuration
- Ensure nginx/load balancer forwards X-Forwarded-For header
- Check `get_client_ip()` logs for warnings

## 📊 Monitoring

### Key metrics to track:
- Number of active bans
- Ban attempts blocked (login/registration)
- Expired bans cleaned up
- Admin ban actions

### Log queries:
```bash
# Banned access attempts
grep "Banned email attempted access" logs/app.log

# Ban operations
grep "User banned successfully" logs/app.log
grep "User unbanned successfully" logs/app.log
```

## 🎯 Best Practices

1. **Always provide a reason** when banning
2. **Use temporary bans** for first-time offenders
3. **Ban both email and IP** for repeat offenders
4. **Review ban logs** regularly for patterns
5. **Document ban policies** for consistency
6. **Monitor unban requests** for policy violations
7. **Cleanup expired bans** daily to keep DB clean

## 🚨 Emergency Procedures

### Accidentally banned legitimate user:
```bash
# Quick unban via API
curl -X POST http://localhost:8000/api/admin/users/unban \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid"}'

# Or via SQL (emergency only)
UPDATE banned_entities 
SET is_active = false, 
    unbanned_at = NOW() 
WHERE banned_user_id = 'user-uuid';
```

### Mass unban (IP range banned by mistake):
```sql
-- Deactivate all bans for IP range
UPDATE banned_entities 
SET is_active = false,
    unbanned_at = NOW()
WHERE entity_type = 'ip' 
  AND entity_value LIKE '192.168.1.%'
  AND is_active = true;
```

---

**Need help?** Check the full documentation in `BAN_SYSTEM_IMPLEMENTATION.md`
