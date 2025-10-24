# LLM Usage Type - Frontend Implementation Summary

## Changes Made

### 1. Added Usage Type Filter
**Location:** `frontend/pages/admin/llm-usage.jsx`

Added a new dropdown filter to filter LLM usage by type:
- 🔌 Chrome Extension
- 📝 Cover Letter
- 📄 Resume Analysis (General)
- 🎯 Job Matching

### 2. Added "Usage by Type" Section
A new full-width card displaying statistics for each usage type showing:
- Total calls
- Total cost
- Total tokens
- Average cost per call
- Percentage of total cost (visual progress bar)

### 3. Added Usage Type Column to Table
The usage table now includes a "Usage Type" column with:
- Color-coded badges
- Icons for each type
- Human-readable labels

### 4. Updated CSV Export
CSV export now includes the "Usage Type" column for better data analysis.

## Visual Design

### Usage Type Cards
Each card shows:
```
🔌 Chrome Extension
Calls: 50
Cost: $0.0120
Tokens: 25,000
Avg Cost/Call: $0.000240
% of Total Cost: 51.3% [███████████░░░░░]
```

### Color Scheme
- **Chrome Extension**: Green (🔌)
- **Cover Letter**: Blue (📝)
- **Resume Analysis**: Purple (📄)
- **Job Matching**: Orange (🎯)

### Filter Options
All filters work together:
- Time Window: 24 Hours / 7 Days / 30 Days / All Time
- Usage Type: All / Chrome Extension / Cover Letter / Resume Analysis / Job Matching
- Endpoint: All / Specific endpoints
- Status: All / Success / Failures

## How It Works

### Data Flow
1. User selects filters (time window, usage type, endpoint, status)
2. Frontend makes API call with filters: `/api/admin/llm-usage?usage_type=cover_letter&hours=24`
3. Backend returns filtered data + statistics with `by_usage_type` breakdown
4. Frontend displays:
   - Stats cards (total calls, cost, tokens, latency)
   - Usage by Type section (breakdown by each type)
   - Cost by Endpoint chart
   - Usage by Model chart
   - Filtered table with all records

### Example API Response
```json
{
  "total_calls": 150,
  "total_cost": 0.0234,
  "total_tokens": 70000,
  "avg_response_time_ms": 1250,
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
      "tokens": 10000
    },
    {
      "usage_type": "chrome_extension",
      "calls": 10,
      "cost": 0.0010,
      "tokens": 5000
    }
  ],
  "by_endpoint": [...],
  "by_model": [...]
}
```

## Features

### ✅ Filter by Usage Type
Users can now:
- See all LLM calls
- Filter to see only cover letter requests
- Filter to see only resume analysis
- Filter to see only Chrome extension usage
- Combine with other filters (time, status, endpoint)

### ✅ Cost Analysis by Type
Users can answer:
- "How much did cover letters cost this week?"
- "Which feature is most expensive?"
- "What's the average cost per resume analysis?"
- "How many tokens does job matching use?"

### ✅ Visual Breakdown
- Color-coded cards for each usage type
- Progress bars showing cost distribution
- Icons for quick identification
- Clear metrics (calls, cost, tokens, avg)

### ✅ Detailed Table
- Usage type column with badges
- Sortable and filterable
- Shows all relevant data
- Exports to CSV with usage type

## Testing

### Test Scenarios

**1. Filter by Usage Type**
- Select "Cover Letter" from usage type dropdown
- Table should show only cover letter requests
- Stats should update to show totals for cover letters only

**2. View Usage Type Breakdown**
- Look at "Usage by Type" section
- Should see 4 cards (one for each type)
- Each card shows metrics for that type
- Progress bars show percentage of total cost

**3. CSV Export**
- Click "Export CSV"
- Open CSV file
- Should include "Usage Type" column
- Data should match what's visible in table

**4. Combined Filters**
- Select "24 Hours" time window
- Select "Cover Letter" usage type
- Select "Success Only" status
- Should show only successful cover letter requests from last 24 hours

### Expected Behavior

**After Migration + Restart:**
1. Old data (before migration) will show usage types based on endpoint backfill
2. New data will have proper usage type from tracking
3. Resume analysis calls will start appearing (previously not tracked!)

**Usage Type Distribution:**
- Chrome Extension calls should be relatively low (only when extension is used)
- Cover Letter calls depend on user behavior
- Resume Analysis calls should be highest (most common feature)
- Job Matching calls when users analyze resume against specific job

## Troubleshooting

**Issue: "by_usage_type" undefined**
- **Cause:** Backend not returning the field
- **Solution:** Ensure migration is run and backend is restarted

**Issue: No data in Usage by Type section**
- **Cause:** No LLM calls in selected time window
- **Solution:** Generate some activity (analyze resume, generate cover letter)

**Issue: Usage types showing as "N/A" or "other"**
- **Cause:** Old data before migration, or tracking not working
- **Solution:** Generate new activity to see proper tracking

**Issue: Filters not working**
- **Cause:** Frontend state not syncing with API
- **Solution:** Check browser console for errors, verify API endpoint

## Future Enhancements

### Possible Additions:
1. **Time Series Chart** - Show usage type trends over time
2. **User-Specific Analysis** - Filter by user + usage type
3. **Cost Alerts** - Set budget limits per usage type
4. **Usage Recommendations** - Suggest cheaper alternatives
5. **Export by Type** - Separate CSV per usage type
6. **Comparison View** - Compare current vs previous period

### Analytics Queries:
```javascript
// Most expensive feature this week
stats.by_usage_type.sort((a, b) => b.cost - a.cost)[0];

// Most popular feature (by calls)
stats.by_usage_type.sort((a, b) => b.calls - a.calls)[0];

// Average cost per feature
stats.by_usage_type.map(t => ({
  type: t.usage_type,
  avg: (t.cost / t.calls).toFixed(6)
}));

// Token efficiency (tokens per dollar)
stats.by_usage_type.map(t => ({
  type: t.usage_type,
  efficiency: Math.round(t.tokens / t.cost)
}));
```

## Summary

The LLM Usage admin page now provides complete visibility into:
- ✅ What features users are using
- ✅ How much each feature costs
- ✅ Which features use the most tokens
- ✅ Performance by feature type
- ✅ Cost trends and distribution

You can now make data-driven decisions about:
- Feature optimization
- Prompt engineering
- Cost management
- User behavior patterns
- Resource allocation
