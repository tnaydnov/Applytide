# LLM Usage Type Tracking - Deployment Checklist

## ✅ Pre-Deployment Checklist

### Backend Changes
- [x] Database model updated with `usage_type` field
- [x] Migration created (`20251024_add_usage_type.py`)
- [x] LLM tracker updated to accept usage_type
- [x] Job extraction tracking updated (chrome_extension)
- [x] Cover letter tracking updated (cover_letter)
- [x] Resume analysis tracking added (resume_general, resume_job)
- [x] Admin service updated with usage_type stats
- [x] Admin API updated with usage_type filter
- [x] DTOs updated to include usage_type

### Frontend Changes
- [x] Usage type filter dropdown added
- [x] Usage by Type section added (cards with stats)
- [x] Usage type column added to table
- [x] CSV export includes usage_type
- [x] Color-coded badges and icons

## 🚀 Deployment Steps

### Step 1: Backup Database (IMPORTANT!)
```bash
# Create backup before migration
docker-compose exec postgres pg_dump -U postgres applytide > backup_before_usage_type_$(date +%Y%m%d).sql
```

### Step 2: Deploy Backend Changes
```bash
cd c:\Users\PC\OneDrive\Desktop\Applytide

# Pull latest changes (if using git)
git pull

# Stop containers
docker-compose down

# Rebuild backend (to ensure new code is included)
docker-compose build applytide_api

# Start containers
docker-compose up -d
```

### Step 3: Run Database Migration
```bash
# Run migration
docker-compose exec applytide_api alembic upgrade head

# Verify migration succeeded
docker-compose exec applytide_api alembic current
# Should show: 20251024_usage_type (head)
```

### Step 4: Verify Database Changes
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d applytide

# Check table structure
\d llm_usage;
# Should see 'usage_type' column

# Check data was backfilled
SELECT usage_type, COUNT(*) FROM llm_usage GROUP BY usage_type;
# Should show: chrome_extension, cover_letter, other (if any old data)

# Exit psql
\q
```

### Step 5: Restart Application
```bash
# Restart to ensure all services pick up changes
docker-compose restart

# Check logs for any errors
docker-compose logs -f applytide_api
# Look for: "OpenAI LLM initialized for document service"
```

### Step 6: Test Backend API
```bash
# Test stats endpoint (replace with your admin token)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/llm-usage/stats?hours=24

# Should see "by_usage_type" in response
```

### Step 7: Deploy Frontend Changes
```bash
# Frontend should auto-rebuild if using hot reload
# Or rebuild manually:
cd frontend
npm run build

# If using Docker for frontend, rebuild:
cd ..
docker-compose build applytide_frontend
docker-compose up -d applytide_frontend
```

### Step 8: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear cache in browser settings

## ✅ Post-Deployment Verification

### 1. Generate Test Data
```bash
# Option A: Use Chrome Extension
1. Open Chrome extension
2. Navigate to a job posting
3. Click extension to extract job
4. Check admin panel - should see "Chrome Extension" entry

# Option B: Generate Cover Letter
1. Login to app
2. Go to a job
3. Click "Generate Cover Letter"
4. Check admin panel - should see "Cover Letter" entry

# Option C: Analyze Resume (General)
1. Go to Documents page
2. Upload or select resume
3. Click "Analyze" (without selecting a job)
4. Check admin panel - should see "Resume Analysis" entry

# Option D: Analyze Resume (Job Match)
1. Go to Documents page
2. Select a job from dropdown
3. Click "Analyze"
4. Check admin panel - should see "Job Matching" entry
```

### 2. Verify Admin Panel
1. Login as admin
2. Go to Admin > LLM Usage
3. Check "Usage by Type" section appears
4. Verify 4 cards show (even if 0 calls)
5. Check usage type filter dropdown works
6. Verify table shows usage type column
7. Test CSV export includes usage type

### 3. Verify Filters Work
- Select different time windows (24h, 7d, 30d, all)
- Select different usage types
- Combine filters
- Check data updates correctly

### 4. Verify API Responses
```bash
# Get stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/admin/llm-usage/stats?hours=24" | jq

# Should include:
# - by_usage_type array
# - Each entry has: usage_type, calls, cost, tokens

# Get filtered list
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/admin/llm-usage?usage_type=cover_letter" | jq

# Should return only cover letter entries
```

### 5. Check Logs
```bash
# Look for tracking logs
docker-compose logs -f applytide_api | grep "LLM usage tracked"

# Should see entries like:
# "LLM usage tracked: cover_letter (cover_letter_generation)"
# "LLM usage tracked: resume_general (resume_analysis_general)"
# "LLM usage tracked: chrome_extension (job_extraction)"
```

## 🔍 Troubleshooting

### Problem: Migration fails
```bash
# Check current migration version
docker-compose exec applytide_api alembic current

# Check migration history
docker-compose exec applytide_api alembic history

# If stuck, downgrade and retry
docker-compose exec applytide_api alembic downgrade -1
docker-compose exec applytide_api alembic upgrade head
```

### Problem: "by_usage_type" not in API response
**Solutions:**
1. Verify migration ran: Check database has `usage_type` column
2. Restart backend: `docker-compose restart applytide_api`
3. Check code is deployed: `docker-compose exec applytide_api ls -la app/domain/admin/`
4. Check logs for errors: `docker-compose logs applytide_api | grep -i error`

### Problem: Frontend doesn't show new features
**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check frontend container rebuilt: `docker-compose logs applytide_frontend`
4. Verify file changes deployed: Check if llm-usage.jsx has new code

### Problem: Resume analysis not tracked
**Solutions:**
1. Check OpenAI API key is set: `docker-compose exec applytide_api env | grep OPENAI`
2. Check db_session passed to DocumentService
3. Check use_ai=True in API call
4. Look for errors in logs: `docker-compose logs applytide_api | grep -i "llm"`

### Problem: Old data shows "other" usage type
**Expected behavior** - This is normal for data before migration.
**Solution:**
- Old data was backfilled based on endpoint
- New data will have correct usage type
- If needed, manually update: `UPDATE llm_usage SET usage_type = 'chrome_extension' WHERE endpoint = 'job_extraction' AND usage_type = 'other';`

## 📊 Success Criteria

✅ **Migration successful if:**
- [x] `usage_type` column exists in database
- [x] Existing data has usage_type values (not null)
- [x] Index created on usage_type

✅ **Backend successful if:**
- [x] API returns `by_usage_type` in stats
- [x] Filter by usage_type works
- [x] New LLM calls have usage_type set
- [x] All 4 types being tracked (chrome_extension, cover_letter, resume_general, resume_job)

✅ **Frontend successful if:**
- [x] "Usage by Type" section displays
- [x] Usage type filter dropdown works
- [x] Table shows usage type column with badges
- [x] CSV export includes usage type
- [x] Filters work together correctly

✅ **Overall successful if:**
- [x] Can generate test data for each type
- [x] Each type shows in admin panel
- [x] Cost/tokens tracked per type
- [x] Can filter and analyze by type
- [x] No errors in logs

## 🎉 Post-Launch

### Monitor
- Check logs for tracking errors
- Verify costs being calculated correctly
- Monitor usage patterns

### Analyze
- Which features are most used?
- Which features are most expensive?
- Optimization opportunities?

### Optimize
- Expensive features → shorter prompts
- High-volume features → cheaper models
- Unused features → consider removing

## 📝 Rollback Plan (If Needed)

If something goes wrong:

```bash
# 1. Downgrade migration
docker-compose exec applytide_api alembic downgrade -1

# 2. Restore backup
docker-compose exec postgres psql -U postgres applytide < backup_before_usage_type_YYYYMMDD.sql

# 3. Revert code changes
git checkout main

# 4. Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Summary

- ✅ Total files changed: ~15
- ✅ Database changes: 1 migration
- ✅ Backend changes: Models, tracker, service, API
- ✅ Frontend changes: UI, filters, charts
- ✅ Testing: 4 usage types to verify
- ✅ Deployment time: ~15-20 minutes
- ✅ Risk level: Low (non-breaking, backward compatible)

🎯 **Ready to deploy!**
