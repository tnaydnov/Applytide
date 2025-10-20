# Quick Setup Guide - Enhanced Admin Features

## Step 1: Review Changes

All changes have been made to your codebase. Here's what was added:

### Backend Changes:
✅ Database models updated (User, ActiveSession, EmailHistory)
✅ New service layer for user management
✅ New API endpoints for ban/delete/sessions
✅ Auth middleware now checks for banned users
✅ Database migration created

### Files Created:
- `backend/app/domain/admin/user_management_service.py`
- `backend/app/db/migrations/versions/20251020_180650_add_enhanced_admin_features.py`
- `ADMIN_FEATURES_IMPLEMENTATION.md`

### Files Modified:
- `backend/app/db/models.py` (added ban fields, ActiveSession, EmailHistory)
- `backend/app/domain/admin/service.py` (integrated user management)
- `backend/app/api/routers/admin/users.py` (new endpoints)
- `backend/app/api/routers/admin/_schemas.py` (new schemas)
- `backend/app/api/deps_auth.py` (banned user check)

---

## Step 2: Update Migration File

**IMPORTANT**: Before running the migration, you need to update the `down_revision` in the migration file.

1. Find your latest migration file in `backend/app/db/migrations/versions/`
2. Get its revision ID (the timestamp or hash at the top)
3. Open `20251020_180650_add_enhanced_admin_features.py`
4. Update line 18: `down_revision = 'YOUR_LATEST_REVISION_HERE'`

Example:
```python
down_revision = '20251015_123456'  # Replace with your actual latest revision
```

---

## Step 3: Run Database Migration

```powershell
# Navigate to backend
cd backend

# Run the migration
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade -> 20251020_180650, add_enhanced_admin_features
```

---

## Step 4: Restart Backend

```powershell
# Stop the backend if running (Ctrl+C)
# Then restart it
python -m uvicorn app.main:app --reload
```

---

## Step 5: Test the New Features

### Test 1: Check API Docs
Visit: http://localhost:8000/docs

You should see new endpoints:
- `POST /api/admin/users/{user_id}/ban`
- `POST /api/admin/users/{user_id}/unban`
- `DELETE /api/admin/users/{user_id}`
- `POST /api/admin/users/{user_id}/reset-password`
- `GET /api/admin/users/{user_id}/sessions`
- `DELETE /api/admin/sessions/{session_id}`
- `DELETE /api/admin/users/{user_id}/sessions`

### Test 2: View User Sessions
1. Log in as admin
2. Call step-up auth: `POST /api/admin/verify-password` with your password
3. Get a user ID from `GET /api/admin/users`
4. View their sessions: `GET /api/admin/users/{user_id}/sessions`

### Test 3: Ban a Test User
1. Create a test user account
2. Log in as admin
3. Call step-up auth
4. Ban the test user: 
```json
POST /api/admin/users/{user_id}/ban
{
  "reason": "Testing ban functionality",
  "revoke_sessions": true
}
```
5. Try to log in as the banned user - should get "account suspended" error

### Test 4: Terminate Sessions
1. Get sessions for a user
2. Pick a session ID
3. Terminate it:
```json
DELETE /api/admin/sessions/{session_id}
{
  "reason": "Testing session termination"
}
```
4. User should be logged out of that device

---

## Step 6: Build Frontend UI (Next)

The backend is ready. Now you need frontend components to use these features.

### Components to Build:

1. **User Detail Page Enhancements**
   - Ban/Unban button
   - Delete user button with confirmation modal
   - Reset password button
   - View sessions button

2. **Session Viewer Component**
   - Table showing all active sessions
   - Location, device, IP address
   - "Terminate" button for each session
   - "Kick Out (All Devices)" button

3. **Confirmation Modals**
   - Email confirmation for deletes
   - Reason input for all actions
   - Hard delete warning (very dangerous!)

4. **Email History Viewer** (future)
   - Table of all emails sent to user
   - Status, timestamps, error messages

Would you like me to create these frontend components now?

---

## Troubleshooting

### Migration Fails
- Check your database connection
- Verify `down_revision` is set correctly
- Look for conflicting migrations

### ImportError for User Management Service
- Make sure all files are saved
- Restart backend
- Check for typos in imports

### Step-Up Auth Not Working
- Call `/api/admin/verify-password` first
- Password must be correct
- Valid for 5 minutes only

### Banned User Can Still Log In
- Check if `is_banned` field exists in database
- Verify auth middleware change is applied
- Restart backend

---

## What's Next?

Once the backend is working, we can:
1. ✅ Build frontend UI components
2. ✅ Add email history logging integration
3. ✅ Create automated alerts system
4. ✅ Add bulk user management
5. ✅ Implement feature flags
6. ✅ Add session analytics dashboard

Let me know if you run into any issues or want to proceed with the frontend!
