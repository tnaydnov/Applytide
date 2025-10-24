# Session Management Fix: Single Session Per Device

**Date:** October 24, 2025  
**Issue:** Multiple active sessions created for the same user from the same device  
**Solution:** Automatic revocation of old sessions when logging in from the same device

---

## Problem Description

### What Was Happening
- Every login created a NEW `RefreshToken` (session) in the database
- No check for existing active sessions from the same device
- Users ended up with multiple simultaneous sessions from the same browser/device
- Even server restarts didn't clear these sessions (JWT tokens remain valid until expiry)

### Why It Happened
The `create_refresh_token()` function in `backend/app/infra/security/tokens.py` would:
1. Create a new RefreshToken entry every time
2. Never check if the user already had an active session from the same `user_agent`
3. Never revoke old sessions automatically

---

## Solution Implemented

### Single Session Per Device Logic

When a user logs in:
1. **Check for existing active sessions** from the same device (matching `user_agent`)
2. **Automatically revoke** all existing sessions from that device
3. **Create the new session**
4. Result: Only ONE active session per device at any time

### Code Changes

**File:** `backend/app/infra/security/tokens.py`

**Changes Made:**
1. Added logging import for better debugging
2. Modified `create_refresh_token()` function to:
   - Query for existing active sessions with same `user_id` and `user_agent`
   - Revoke them by setting `revoked_at` and `is_active = False`
   - Log the action for monitoring
   - Handle errors gracefully (won't fail login if revocation fails)

**Key Code Addition:**
```python
# Revoke existing active sessions from the same device (same user_agent)
# This ensures only one active session per device
if user_agent:
    try:
        existing_sessions = db.query(RefreshToken).filter(
            RefreshToken.user_id == uuid.UUID(user_id),
            RefreshToken.user_agent == user_agent,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > _now()
        ).all()
        
        if existing_sessions:
            revoked_count = len(existing_sessions)
            for session in existing_sessions:
                session.revoked_at = _now()
                session.is_active = False
            
            logger.info(
                f"Revoked {revoked_count} existing session(s) from same device",
                extra={
                    "user_id": user_id,
                    "user_agent": user_agent[:100],
                    "revoked_count": revoked_count
                }
            )
    except Exception as e:
        # Log error but don't fail the login
        logger.error(
            "Failed to revoke existing sessions from same device",
            extra={"user_id": user_id, "error": str(e)},
            exc_info=True
        )
```

---

## Affected Login Flows

This fix automatically applies to **ALL** login methods:

1. ✅ **Regular Email/Password Login** (`auth/core.py`)
2. ✅ **Google OAuth Login** (`auth/oauth.py`)
3. ✅ **New User Registration** (`auth/registration.py`)

All three flows call `create_refresh_token()` with `user_agent` and `ip_address`, so they all benefit from the fix.

---

## Database Impact

### No Migration Required
- ✅ No schema changes
- ✅ No new columns or tables
- ✅ Uses existing `RefreshToken` fields: `user_agent`, `revoked_at`, `is_active`

### Handling Existing Duplicate Sessions

**Option 1: Let them expire naturally**
- Old sessions will expire based on their `expires_at` timestamp
- No action needed, they'll disappear automatically
- Admin panel will show them until they expire

**Option 2: Clean up existing duplicates (optional)**
```sql
-- This query would revoke all but the most recent session per user+device
-- RUN THIS ONLY IF YOU WANT TO CLEAN UP IMMEDIATELY
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
```

**Recommendation:** Option 1 (let them expire). The fix prevents NEW duplicates, and old ones will naturally expire within 7-28 days.

---

## Testing

### Manual Testing Steps

1. **Clear existing sessions:**
   - Go to Admin panel → Active Sessions
   - Note your current session count
   - Revoke all your sessions manually

2. **Test multiple logins:**
   - Login from browser (Chrome)
   - Check Active Sessions → Should see 1 session
   - Refresh the page (stay logged in)
   - Open new tab, navigate to your app
   - Check Active Sessions → Should STILL see 1 session (same device)
   - Login again from same browser → Should STILL see 1 session

3. **Test different devices:**
   - Login from Chrome → 1 session
   - Login from Firefox → 2 sessions (different user_agent)
   - Login from mobile → 3 sessions (different user_agent)
   - Login again from Chrome → Still 3 sessions (Chrome session was replaced)

### Automated Test Script

Run the test script to verify the fix:
```bash
cd backend
python test_session_fix.py
```

The test will:
- Simulate 3 logins from the same device
- Verify only 1 active session exists after each login
- Clean up test data

---

## Logs to Monitor

After deployment, check logs for these messages:

**Success:**
```
INFO: Revoked 1 existing session(s) from same device
  user_id: <uuid>
  user_agent: Mozilla/5.0...
  revoked_count: 1
```

**Errors (if any):**
```
ERROR: Failed to revoke existing sessions from same device
  user_id: <uuid>
  error: <description>
```

---

## Deployment Steps

### 1. Deploy Code
```bash
# No database migration needed, just deploy the updated code
git add backend/app/infra/security/tokens.py
git commit -m "Fix: Implement single session per device logic"
git push
```

### 2. Restart Backend Services
```bash
# Docker
docker-compose restart api worker

# Or if you have a deployment script
./deploy.sh
```

### 3. Monitor Logs
```bash
# Watch for session revocation logs
docker logs -f applytide-api | grep "Revoked.*session"

# Check for any errors
docker logs -f applytide-api | grep "Failed to revoke"
```

### 4. Verify in Admin Panel
- Login to your app
- Go to Admin → Active Sessions
- You should see only 1 active session for your account
- Try logging in again → Should still see only 1 session

---

## Expected Behavior After Fix

### Before Fix ❌
```
User logs in from Chrome at 10:00 AM → Session 1 created
User logs in from Chrome at 10:05 AM → Session 2 created
User logs in from Chrome at 10:10 AM → Session 3 created
Active Sessions: 3 sessions (all active)
```

### After Fix ✅
```
User logs in from Chrome at 10:00 AM → Session 1 created
User logs in from Chrome at 10:05 AM → Session 1 revoked, Session 2 created
User logs in from Chrome at 10:10 AM → Session 2 revoked, Session 3 created
Active Sessions: 1 session (only most recent)
```

---

## Edge Cases Handled

### 1. No user_agent provided
- **Behavior:** Skips revocation check, creates new session
- **Reason:** Can't identify "same device" without user_agent
- **Impact:** Rare (all modern browsers send user_agent)

### 2. Database error during revocation
- **Behavior:** Logs error, continues with login
- **Reason:** Don't want login to fail just because we can't clean up old sessions
- **Impact:** Worst case = duplicate sessions (same as before fix)

### 3. Multiple simultaneous logins
- **Behavior:** Each login revokes previous sessions at that moment
- **Reason:** Race condition possible, but last login wins
- **Impact:** Minimal - still ends up with 1 or 2 sessions max

### 4. Different devices
- **Behavior:** Each device maintains its own session
- **Reason:** Different `user_agent` = different device
- **Impact:** User can be logged in on multiple devices simultaneously ✅

---

## Future Enhancements (Optional)

### 1. Device Fingerprinting
- Add more robust device identification beyond just `user_agent`
- Consider: IP + user_agent + screen resolution + timezone
- Benefit: More accurate device detection

### 2. Session Limit Per User
- Allow max N concurrent sessions across all devices
- When limit reached, revoke oldest session
- Benefit: Prevents session accumulation

### 3. Session Activity Dashboard
- Show user their active sessions in their profile
- Allow users to revoke sessions themselves
- Show last activity timestamp, location, device info

### 4. Suspicious Login Detection
- Detect login from new device/location
- Send email notification to user
- Require 2FA for new devices

---

## Rollback Plan (If Needed)

If the fix causes issues, rollback is simple:

**Revert the commit:**
```bash
git revert <commit-hash>
git push
```

**Or manually remove the code:**
In `backend/app/infra/security/tokens.py`, remove the session revocation block (lines 63-91) and keep only the original session creation logic.

**No database changes to rollback** - the fix only uses existing fields.

---

## Summary

✅ **Fixed:** Multiple sessions per device  
✅ **Implementation:** Automatic revocation of old sessions on login  
✅ **Scope:** All login methods (email, OAuth, registration)  
✅ **Database:** No migration required  
✅ **Testing:** Automated test script provided  
✅ **Monitoring:** Logs added for visibility  
✅ **Risk:** Low - graceful error handling, no breaking changes  

The fix is **production-ready** and can be deployed immediately. Old duplicate sessions will naturally expire, and new logins will maintain only one session per device.
