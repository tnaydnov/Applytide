# Admin Dashboard Deployment Guide

## 🎯 What Was Fixed

The admin dashboard was showing "Failed to fetch dashboard stats" because:

1. **Backend endpoints** were not passing the new LLM tracking fields to the response
2. **DTO** (SystemHealthDTO) was missing required fields
3. **Repository** needed to calculate total LLM calls/cost

## ✅ Changes Made

### Backend Files Modified:

1. **`backend/app/api/routers/admin/dashboard.py`**
   - Added `active_sessions` field to DashboardStatsResponse
   - Added 8 LLM fields to DashboardStatsResponse (total_llm_calls, total_llm_cost, llm_calls_24h/7d/30d, llm_cost_24h/7d/30d)
   - Added 3 missing LLM fields to SystemHealthResponse (total_llm_calls, total_llm_cost, llm_calls_30d)

2. **`backend/app/domain/admin/dto.py`**
   - Added `total_llm_calls`, `total_llm_cost`, `llm_calls_30d` to SystemHealthDTO

3. **`backend/app/domain/admin/repository.py`**
   - Added calculation of `total_llm_calls` and `total_llm_cost` in `get_system_health()` method
   - Added these fields to SystemHealthDTO return statement

### Frontend Files Modified:

4. **`frontend/components/nav/NavBar.jsx`**
   - Removed admin dropdown menu (Dashboard, Users, Analytics, System Logs subItems)
   - Changed to simple "Admin" button linking to `/admin`
   - Admin section now has its own internal navigation

## 🚀 Deployment Steps

### On Ubuntu Server:

```bash
# Navigate to project directory
cd ~/Applytide

# Option 1: Restart API container only (fastest - 10 seconds)
docker-compose restart api

# Option 2: Full rebuild if restart doesn't work (slower - 2-3 minutes)
docker-compose down
docker-compose build api
docker-compose up -d
```

### Verify Deployment:

```bash
# Check API is running
docker-compose ps

# Check logs for errors
docker-compose logs -f api --tail=50

# Test admin endpoints (replace with your session token)
curl -s http://localhost/api/admin/dashboard/stats \
  -H "Cookie: session_token=YOUR_TOKEN" | jq

curl -s http://localhost/api/admin/system/health \
  -H "Cookie: session_token=YOUR_TOKEN" | jq
```

## 📊 What Should Work Now

After deployment:

1. ✅ Admin dashboard will load without errors
2. ✅ LLM Usage stats will display (0 initially)
3. ✅ Security Events will display
4. ✅ Error Logs will display
5. ✅ Active Sessions will display
6. ✅ System Health page will load
7. ✅ Navbar shows simple "Admin" button (no dropdown)

## 🔍 Troubleshooting

### If dashboard still shows errors:

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check backend logs**:
   ```bash
   docker-compose logs api --tail=100 | grep -i error
   ```
3. **Verify database tables exist**:
   ```bash
   docker exec -i applytide_pg psql -U applytide_user -d applytide_prod -c "\dt" | grep -E "llm_usage|error_logs|security_events"
   ```

### If you see Python import errors:

Rebuild the API container:
```bash
cd ~/Applytide
docker-compose down
docker-compose build api --no-cache
docker-compose up -d
```

## 📝 Database Schema

The migration created these tables:

- **`llm_usage`** (16 columns) - Tracks all LLM API calls
- **`error_logs`** (17 columns) - Tracks application errors  
- **`security_events`** (16 columns) - Tracks security incidents
- **`active_sessions`** (updated) - Enhanced session tracking

All tables are ready and working!

## 🎉 Success Indicators

You'll know it's working when:

1. Admin dropdown is gone from navbar
2. Admin dashboard loads showing stats (even if 0)
3. All 4 monitoring pages load without errors:
   - `/admin` - Dashboard overview
   - `/admin/llm-usage` - LLM tracking
   - `/admin/security-events` - Security monitoring
   - `/admin/errors` - Error tracking
   - `/admin/sessions` - Active sessions
   - `/admin/users` - User management
   - `/admin/analytics` - Analytics
   - `/admin/system` - System logs

## 💡 Notes

- LLM usage will be 0 until you start using AI features
- Error logs will accumulate as errors occur
- Security events will log failed logins, etc.
- Active sessions show currently logged-in users

---

**Generated**: October 22, 2025
**Database Migration**: 20251021_llm_sessions (applied ✅)
**Files Modified**: 4 files (3 backend, 1 frontend)
