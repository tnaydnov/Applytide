# Session Fix Deployment Checklist

## Pre-Deployment

- [x] Code changes implemented in `backend/app/infra/security/tokens.py`
- [x] Syntax validation passed
- [x] Documentation created (`SESSION_FIX_DOCUMENTATION.md`)
- [x] Test script created (`backend/test_session_fix.py`)

## Deployment Steps

### 1. Optional: Clean Up Existing Duplicate Sessions
**Do you want to clean up existing duplicates NOW or let them expire naturally?**

**Option A: Let them expire naturally (Recommended)**
- No action needed
- Old sessions expire in 7-28 days based on their TTL
- New fix prevents new duplicates from being created
- ✅ Simpler, zero risk

**Option B: Clean up immediately**
```bash
# SSH into your server
ssh your-server

# Connect to PostgreSQL
docker exec -it applytide-postgres psql -U your_user -d your_db_name

# Run this SQL to keep only the most recent session per user+device
WITH ranked_sessions AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, user_agent 
            ORDER BY created_at DESC
        ) as rn
    FROM refresh_tokens
    WHERE revoked_at IS NULL
      AND expires_at > NOW()
      AND user_agent IS NOT NULL
)
UPDATE refresh_tokens
SET 
    revoked_at = NOW(),
    is_active = FALSE
WHERE id IN (
    SELECT id FROM ranked_sessions WHERE rn > 1
);

# Exit
\q
```

### 2. Deploy the Code Changes
```bash
# Commit and push
git add backend/app/infra/security/tokens.py
git add SESSION_FIX_DOCUMENTATION.md
git add backend/test_session_fix.py
git add SESSION_FIX_CHECKLIST.md
git commit -m "Fix: Implement single session per device to prevent duplicate sessions"
git push
```

### 3. Restart Backend Services
```bash
# If using Docker Compose
docker-compose restart api worker

# Or if using deployment script
./deploy.sh

# Or manually restart containers
docker restart applytide-api applytide-worker
```

### 4. Monitor Deployment
```bash
# Watch API logs for session revocation
docker logs -f applytide-api | grep -i session

# Look for these messages:
# - "Revoked X existing session(s) from same device" (SUCCESS)
# - "Failed to revoke existing sessions" (ERROR - investigate)
```

## Post-Deployment Testing

### 5. Test in Browser
- [ ] Open browser (e.g., Chrome)
- [ ] Login to your app
- [ ] Go to Admin → Active Sessions
- [ ] Note: Should see 1 session for your account
- [ ] In same browser, open new tab
- [ ] Navigate to your app (should auto-login)
- [ ] Refresh Active Sessions page
- [ ] Verify: Still only 1 session (not 2)

### 6. Test Multiple Logins from Same Device
- [ ] Logout completely
- [ ] Login again
- [ ] Check Active Sessions → Should see 1 session
- [ ] Logout and login again
- [ ] Check Active Sessions → Should STILL see 1 session
- [ ] Check logs for "Revoked 1 existing session(s)" message

### 7. Test Different Devices (Optional)
- [ ] Login from Chrome on desktop → Check sessions: 1
- [ ] Login from Firefox on desktop → Check sessions: 2 (different browser)
- [ ] Login from mobile browser → Check sessions: 3 (different device)
- [ ] Login again from Chrome on desktop → Check sessions: 3 (Chrome session replaced)

### 8. Run Automated Test (Optional)
```bash
# SSH into server
ssh your-server

# Run test script
docker exec -it applytide-api python test_session_fix.py

# Expected output:
# Testing with user: tnaydnov@gmail.com
# --- Simulating 3 logins from same device ---
# Login #1:
#   Created token with family: <uuid>
#   Active sessions from this device: 1
# Login #2:
#   Created token with family: <uuid>
#   Active sessions from this device: 1
# Login #3:
#   Created token with family: <uuid>
#   Active sessions from this device: 1
# ✅ SUCCESS: Only 1 active session maintained across multiple logins
```

## Verification Checklist

- [ ] No errors in API logs
- [ ] Single session per device verified in admin panel
- [ ] Multiple logins from same device work correctly
- [ ] Different devices can have separate sessions
- [ ] Old duplicate sessions cleaned up (if Option B chosen) or marked to expire naturally
- [ ] Session revocation logs appear in logs
- [ ] Users can login/logout normally
- [ ] No authentication errors

## Rollback Plan (If Issues)

If something goes wrong:

```bash
# Option 1: Revert the commit
git revert HEAD
git push
docker-compose restart api worker

# Option 2: Emergency rollback
# SSH to server, manually edit tokens.py to remove lines 63-91
# Restart services
docker-compose restart api worker
```

## Expected Results

### Before Fix
```
User: tnaydnov@gmail.com
Active Sessions:
- Session 1 (Chrome, created 10:00 AM) ❌
- Session 2 (Chrome, created 10:05 AM) ❌
- Session 3 (Chrome, created 10:10 AM) ✓
Total: 3 sessions from same device
```

### After Fix
```
User: tnaydnov@gmail.com
Active Sessions:
- Session 1 (Chrome, created 10:10 AM) ✓
Total: 1 session from device
```

## Notes

- **No database migration required** - uses existing schema
- **Zero downtime** - can deploy during business hours
- **Backward compatible** - won't break existing sessions
- **Graceful degradation** - if revocation fails, login still succeeds
- **Immediate effect** - next login will trigger the fix

## Documentation

Full details in `SESSION_FIX_DOCUMENTATION.md`
