# LLM Usage Type Tracking - Implementation Guide

## Overview

This document describes the implementation of **LLM usage type tracking**, which allows you to distinguish between different types of LLM API calls and analyze costs/usage patterns for each type.

## What Was Added

### 1. New Database Field: `usage_type`

A new field `usage_type` has been added to the `llm_usage` table to categorize LLM API calls by their purpose.

**Usage Types:**
- `chrome_extension` - Job extraction from Chrome extension
- `cover_letter` - AI cover letter generation
- `resume_general` - General resume analysis (without job context)
- `resume_job` - Job-specific resume analysis (matching resume to specific job)

### 2. Updated Database Schema

**Migration File:** `backend/app/db/migrations/versions/20251024_add_usage_type.py`

The migration:
- Adds `usage_type` column to `llm_usage` table
- Creates an index for efficient filtering
- Backfills existing data based on endpoint names
- Makes the column non-nullable

### 3. Enhanced Tracking System

**Updated Files:**
- `backend/app/db/models.py` - Added `usage_type` field to LLMUsage model
- `backend/app/infra/external/llm_tracker.py` - Updated tracker to accept and store usage_type
- `backend/app/infra/external/openai_llm.py` - Added usage_type for job extraction
- `backend/app/infra/external/ai_cover_letter_provider.py` - Added usage_type for cover letters
- `backend/app/domain/documents/service/utils.py` - Added tracking to resume analysis
- `backend/app/domain/documents/service/analysis.py` - Pass usage_type for resume analysis types

### 4. Resume Analysis Tracking (Previously Missing!)

**Important:** Resume analysis was NOT being tracked before. Now it is fully tracked with two distinct types:
- **General Analysis** (`resume_general`) - When user analyzes resume without selecting a job
- **Job-Specific Analysis** (`resume_job`) - When user analyzes resume against a specific job

### 5. Backend API Updates

**Updated Files:**
- `backend/app/domain/admin/dto.py` - Added `usage_type` field to DTOs and `by_usage_type` stats
- `backend/app/domain/admin/service.py` - Added usage_type filtering and statistics
- `backend/app/api/routers/admin/llm_usage.py` - Added usage_type query parameter

**New API Features:**
- Filter by usage_type: `/api/admin/llm-usage?usage_type=cover_letter`
- Stats now include `by_usage_type` breakdown showing calls, cost, and tokens per type

## How to Deploy

### Step 1: Run the Migration

```bash
# From backend directory
cd backend

# Run the migration
alembic upgrade head
```

This will:
1. Add the `usage_type` column
2. Backfill existing records based on their endpoint
3. Create the necessary index

### Step 2: Restart the Application

```bash
# Development
docker-compose down
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Step 3: Verify the Migration

Check that existing data was properly migrated:

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d applytide

# Check usage_type distribution
SELECT usage_type, COUNT(*), SUM(estimated_cost) as total_cost 
FROM llm_usage 
GROUP BY usage_type;

# Should show:
# chrome_extension | count | cost
# cover_letter     | count | cost
# other            | count | cost (if any unrecognized endpoints existed)
```

## How to Use

### Backend API Examples

**Get stats with usage type breakdown:**
```bash
curl -X GET "http://localhost:8000/api/admin/llm-usage/stats?hours=24" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response includes:
```json
{
  "total_calls": 150,
  "total_cost": 0.0234,
  "by_usage_type": [
    {
      "usage_type": "cover_letter",
      "calls": 50,
      "cost": 0.0120,
      "tokens": 25000
    },
    {
      "usage_type": "resume_general",
      "calls": 60,
      "cost": 0.0080,
      "tokens": 30000
    },
    {
      "usage_type": "resume_job",
      "calls": 30,
      "cost": 0.0024,
      "tokens": 15000
    },
    {
      "usage_type": "chrome_extension",
      "calls": 10,
      "cost": 0.0010,
      "tokens": 5000
    }
  ]
}
```

**Filter by usage type:**
```bash
# Get only cover letter requests
curl -X GET "http://localhost:8000/api/admin/llm-usage?usage_type=cover_letter" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only resume analysis (general)
curl -X GET "http://localhost:8000/api/admin/llm-usage?usage_type=resume_general" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only job-specific resume analysis
curl -X GET "http://localhost:8000/api/admin/llm-usage?usage_type=resume_job" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Implementation (TODO)

To display usage type data in the admin UI, you'll need to update:

1. **Add Usage Type Filter Dropdown**
   - Location: `frontend/pages/admin/llm-usage.jsx`
   - Add dropdown alongside existing filters
   - Options: All, Chrome Extension, Cover Letter, Resume (General), Resume (Job)

2. **Add Usage Type Column to Table**
   - Add "Usage Type" column to the data table
   - Display human-readable labels

3. **Add Usage Type Chart**
   - Add a new chart showing "Cost by Usage Type"
   - Similar to "Cost by Endpoint" chart
   - Shows breakdown of costs across the 4 usage types

Example filter additions:
```jsx
<select value={usageTypeFilter} onChange={(e) => setUsageTypeFilter(e.target.value)}>
  <option value="">All Types</option>
  <option value="chrome_extension">Chrome Extension</option>
  <option value="cover_letter">Cover Letter</option>
  <option value="resume_general">Resume (General)</option>
  <option value="resume_job">Resume (Job Match)</option>
</select>
```

## Usage Type Mapping

| Usage Type | Endpoint | Description | User Action |
|------------|----------|-------------|-------------|
| `chrome_extension` | `job_extraction` | Extracting job details from URL/text via Chrome extension | User clicks extension on job page |
| `cover_letter` | `cover_letter_generation` | Generating AI cover letter for a job | User clicks "Generate Cover Letter" |
| `resume_general` | `resume_analysis_general` | Analyzing resume without job context | User uploads resume, clicks "Analyze" (no job selected) |
| `resume_job` | `resume_analysis_job` | Matching resume against specific job | User selects job, clicks "Analyze Match" |

## Cost Analysis Examples

With this implementation, you can now answer questions like:

1. **"How much did cover letter generation cost this month?"**
   ```sql
   SELECT SUM(estimated_cost) 
   FROM llm_usage 
   WHERE usage_type = 'cover_letter' 
   AND timestamp >= DATE_TRUNC('month', NOW());
   ```

2. **"Which feature uses the most tokens?"**
   ```sql
   SELECT usage_type, SUM(total_tokens) as tokens
   FROM llm_usage 
   GROUP BY usage_type 
   ORDER BY tokens DESC;
   ```

3. **"What's the average cost per resume analysis?"**
   ```sql
   SELECT AVG(estimated_cost) 
   FROM llm_usage 
   WHERE usage_type IN ('resume_general', 'resume_job');
   ```

4. **"How many users are using each feature?"**
   ```sql
   SELECT usage_type, COUNT(DISTINCT user_id) as unique_users
   FROM llm_usage 
   WHERE user_id IS NOT NULL
   GROUP BY usage_type;
   ```

## Benefits

1. **Cost Attribution** - Know exactly how much each feature costs
2. **Usage Insights** - See which AI features are most popular
3. **Optimization** - Identify expensive features that need prompt optimization
4. **User Behavior** - Understand how users interact with AI features
5. **Billing** - If you ever implement usage-based pricing, you have the data
6. **Monitoring** - Set alerts if specific usage types exceed cost thresholds

## Next Steps

1. ✅ Backend implementation complete
2. ✅ Database migration ready
3. ⏳ Deploy migration to production
4. ⏳ Update frontend to display usage types
5. ⏳ Add usage type chart to admin dashboard
6. ⏳ Add cost alerts based on usage type

## Testing

After deployment, test each usage type:

1. **Chrome Extension:**
   - Use extension to extract a job
   - Check admin panel - should see `chrome_extension` entry

2. **Cover Letter:**
   - Generate a cover letter
   - Check admin panel - should see `cover_letter` entry

3. **Resume General:**
   - Upload resume, analyze without selecting job
   - Check admin panel - should see `resume_general` entry

4. **Resume Job:**
   - Select a job, analyze resume against it
   - Check admin panel - should see `resume_job` entry

## Troubleshooting

**Issue:** Migration fails with "column already exists"
- **Solution:** The column might have been added manually. Drop it first:
  ```sql
  ALTER TABLE llm_usage DROP COLUMN IF EXISTS usage_type;
  ```
  Then run migration again.

**Issue:** Old records show as null
- **Solution:** Run the backfill query manually:
  ```sql
  UPDATE llm_usage 
  SET usage_type = CASE 
    WHEN endpoint = 'job_extraction' THEN 'chrome_extension'
    WHEN endpoint = 'cover_letter_generation' THEN 'cover_letter'
    ELSE 'other'
  END
  WHERE usage_type IS NULL;
  ```

**Issue:** Resume analysis not being tracked
- **Solution:** Ensure:
  1. OpenAI API key is set (`OPENAI_API_KEY` env variable)
  2. `db_session` is passed to `DocumentService`
  3. `use_ai=True` is passed in analyze API call

## Summary

You now have complete visibility into LLM usage across all features! You can:
- Track costs per feature
- See which features are most used
- Optimize expensive operations
- Monitor user behavior
- Make data-driven decisions about AI features

The system automatically categorizes every LLM call, so no manual tracking needed!
