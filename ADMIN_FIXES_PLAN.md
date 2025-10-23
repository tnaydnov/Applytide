# Admin Panel Comprehensive Fix Implementation Plan

## Status Summary
- ✅ #7: Sessions fix - Code ready, needs deployment
- 🔄 #1: Color scheme - Partially done (AdminLayout, StatCard, index page)
- ⏳ #2-6: Pending implementation

## Remaining Color Scheme Updates (#1)

### Files to Update:
1. **ActivityFeed.jsx** - Replace all `bg-white` → `bg-slate-800`, `text-gray-*` → `text-slate-*`, `border-gray-*` → `border-slate-*`
2. **SimpleChart.jsx** - Same color replacements + update Chart.js theme colors
3. **All admin pages** (users, errors, sessions, system) - Apply dark theme

### Pattern for all files:
```javascript
// Old colors → New colors
bg-white → bg-slate-800
border-gray-200 → border-slate-700
text-gray-900 → text-white
text-gray-600 → text-slate-400
text-gray-500 → text-slate-500
hover:bg-gray-100 → hover:bg-slate-700
bg-blue-50 → bg-indigo-600/20
text-blue-600 → text-indigo-400
```

## Recent Activity Redesign (#2 & #4)

### Problem:
Current activity feed shows HTTP request logs (GET/POST requests) which are not meaningful for admins.

### Solution:
Filter `ApplicationLog` to show only business events that have `event_type` in the `extra` JSON field.

### Backend Changes Needed:

**File: `backend/app/domain/admin/service.py`**

Update `get_activity_feed()` method:
```python
def get_activity_feed(self, limit: int = 20) -> List[dto.ActivityEventDTO]:
    """Get recent business events (not HTTP logs)."""
    # Filter for logs with event_type in extra field
    stmt = (
        select(models.ApplicationLog)
        .where(
            models.ApplicationLog.extra['event_type'].astext.isnot(None)
        )
        .order_by(desc(models.ApplicationLog.timestamp))
        .limit(limit)
    )
    
    logs = self.db.scalars(stmt).all()
    
    # ... rest of the method remains the same
```

Update `get_user_activity()` similarly:
```python
def get_user_activity(self, user_id: UUID, limit: int = 50) -> List[dto.ActivityEventDTO]:
    """Get user's recent business events (not HTTP logs)."""
    stmt = (
        select(models.ApplicationLog)
        .where(
            models.ApplicationLog.user_id == user_id,
            models.ApplicationLog.extra['event_type'].astext.isnot(None)
        )
        .order_by(desc(models.ApplicationLog.timestamp))
        .limit(limit)
    )
    # ...
```

### Event Type Mapping:
Business logger already logs these event_types:
- `user_registration` - New user signup
- `user_login` - User login (filter out token_refresh)
- `user_logout` - User logout
- `job_created` - Job saved/created
- `job_updated` - Job details updated
- `job_deleted` - Job removed
- `application_submitted` - Application created
- `application_status_changed` - Status update
- `document_uploaded` - Resume/doc upload
- `profile_updated` - Profile changes
- `premium_upgraded` - Premium purchased
- `password_reset` - Password reset request

## Active Users Metric (#3)

### Problem:
"Active Sessions" count shows refresh token count, not unique users.

### Solution:
Query distinct users with recent activity (ApplicationLog entries in last 24h/7d).

### Backend Changes:

**File: `backend/app/domain/admin/service.py`**

Update `get_dashboard_stats()`:
```python
def get_dashboard_stats(self) -> dto.DashboardStatsDTO:
    # ... existing queries ...
    
    # Replace active_sessions calculation:
    # OLD:
    # active_sessions = self.db.scalar(
    #     select(func.count()).select_from(models.RefreshToken)
    #     .where(models.RefreshToken.revoked_at.is_(None))
    # )
    
    # NEW: Count unique users with activity in last 24 hours
    from datetime import datetime, timedelta
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    
    active_users_24h = self.db.scalar(
        select(func.count(distinct(models.ApplicationLog.user_id)))
        .where(
            models.ApplicationLog.user_id.isnot(None),
            models.ApplicationLog.timestamp >= twenty_four_hours_ago
        )
    )
    
    return dto.DashboardStatsDTO(
        # ...
        active_users=active_users_24h,  # Rename field
        # ...
    )
```

**File: `backend/app/domain/admin/dto.py`**

Update DTO:
```python
@dataclass
class DashboardStatsDTO:
    # ... existing fields ...
    active_users: int  # Rename from active_sessions
    # ...
```

**File: `frontend/pages/admin/index.jsx`**

Update frontend:
```jsx
<StatCard
  title="Active Users (24h)"  // Update label
  value={stats?.active_users}  // Update field name
  icon={FiActivity}
  loading={loading}
/>
```

## Enhanced Error Tracking (#5)

### Architecture:
1. **Frontend error handler** - Catch all unhandled errors
2. **Backend error endpoint** - Receive and store frontend errors
3. **Extension error handler** - Catch extension errors
4. **Enhanced backend logging** - Already has file/function/line info

### Implementation:

**1. Backend: Add Frontend Error Endpoint**

**File: `backend/app/api/routers/errors.py`** (new file)
```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ...db.session import get_db
from ...db import models
from ...api.deps_auth import get_current_user
from ...infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/frontend-error")
async def log_frontend_error(
    error_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Receive and log frontend JavaScript errors"""
    try:
        # Store in ApplicationLog
        log = models.ApplicationLog(
            timestamp=datetime.now(timezone.utc),
            level="ERROR",
            logger="frontend",
            message=error_data.get("message", "Frontend error"),
            user_id=current_user.id if current_user else None,
            endpoint=error_data.get("url"),
            method="FRONTEND",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            module=error_data.get("file"),
            function=error_data.get("function"),
            line_number=error_data.get("line"),
            exception_type=error_data.get("error_type"),
            exception_message=error_data.get("message"),
            stack_trace=error_data.get("stack"),
            extra={
                "event_type": "frontend_error",
                "component": error_data.get("component"),
                "browser": error_data.get("browser")
            }
        )
        db.add(log)
        db.commit()
        
        return {"status": "logged"}
    except Exception as e:
        logger.error(f"Failed to log frontend error: {e}")
        return {"status": "failed"}
```

Register in `backend/app/main.py`:
```python
from .api.routers import errors
app.include_router(errors.router, prefix="/api/errors", tags=["errors"])
```

**2. Frontend: Global Error Handler**

**File: `frontend/pages/_app.js`**

Add error handler:
```javascript
import { useEffect } from 'react';
import { api } from '../lib/api';

// Global error handler
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    // Send to backend
    fetch('/api/errors/frontend-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: message,
        file: source,
        line: lineno,
        column: colno,
        error_type: error?.name || 'Error',
        stack: error?.stack,
        url: window.location.href,
        browser: navigator.userAgent
      })
    }).catch(console.error);
    
    return false; // Let default handler run too
  };
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    fetch('/api/errors/frontend-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        error_type: 'UnhandledPromiseRejection',
        stack: event.reason?.stack,
        url: window.location.href
      })
    }).catch(console.error);
  });
}

function MyApp({ Component, pageProps }) {
  // ... existing code
}
```

**3. Extension: Error Handler**

**File: `chrome-extension/background.js`**

Add at top:
```javascript
// Global error handler for extension
self.addEventListener('error', function(event) {
  fetch('https://applytide.com/api/errors/frontend-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message: event.message,
      file: event.filename,
      line: event.lineno,
      error_type: 'ExtensionError',
      stack: event.error?.stack,
      url: 'chrome-extension://background',
      browser: 'Chrome Extension'
    })
  }).catch(console.error);
});
```

**4. Enhanced Error Logs Page**

**File: `frontend/pages/admin/errors.jsx`**

Add filter/search capabilities:
- Filter by source (frontend/backend/extension)
- Filter by file/function
- Search by message
- Group by error type
- Show stack traces in expandable rows

## LLM & Security Tracking (#6)

### Check Existing Implementation:

**Search for:**
1. LLM API calls tracking
2. Security event logging
3. Rate limiter stats

**Files to check:**
```bash
backend/app/infra/external/*
backend/app/infra/logging/security_logging.py
backend/app/domain/*/service.py
```

### If Missing, Add:

**1. LLM Usage Tracking**

Create new model in `backend/app/db/models.py`:
```python
class LLMUsage(Base):
    __tablename__ = "llm_usage"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    provider: Mapped[str] = mapped_column(String(50))  # "openai", "anthropic"
    model: Mapped[str] = mapped_column(String(100))  # "gpt-4", "claude-3"
    endpoint: Mapped[str] = mapped_column(String(200))  # API endpoint called
    
    prompt_tokens: Mapped[int] = mapped_column(Integer)
    completion_tokens: Mapped[int] = mapped_column(Integer)
    total_tokens: Mapped[int] = mapped_column(Integer)
    
    estimated_cost: Mapped[float] = mapped_column(Float)  # USD
    response_time_ms: Mapped[int] = mapped_column(Integer)
    
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

**2. Security Events Page**

Add to admin:
- Failed login attempts (from ApplicationLog)
- Suspicious activity (multiple failed logins from same IP)
- Rate limit violations
- Token revocations

**3. Admin Pages to Add:**

- `/admin/llm-usage` - LLM API calls, costs, usage trends
- `/admin/security` - Security events, failed logins, suspicious IPs
- `/admin/rate-limits` - Rate limiter stats, blocked requests

## Deployment Checklist

1. ✅ Commit all frontend color changes
2. ✅ Commit backend activity feed filter changes
3. ✅ Commit active users metric changes
4. ✅ Commit frontend error handler
5. ✅ Commit extension error handler
6. ✅ Run database migration (if adding LLM usage table)
7. ✅ Deploy backend
8. ✅ Deploy frontend
9. ✅ Test all admin pages
10. ✅ Verify error tracking works

## Testing Plan

### Color Scheme:
- [ ] Check all admin pages load with dark theme
- [ ] Verify text readability
- [ ] Test mobile responsive

### Activity Feed:
- [ ] Verify only business events show (no GET/POST requests)
- [ ] Test event icons display correctly
- [ ] Check timestamps format properly

### Active Users:
- [ ] Verify count shows unique users with recent activity
- [ ] Test 24h window calculation
- [ ] Compare with old session count

### Error Tracking:
- [ ] Trigger frontend error, verify it appears in admin
- [ ] Trigger backend error, verify stack trace captured
- [ ] Test extension error reporting
- [ ] Verify file/function/line info accurate

### LLM Tracking (if implemented):
- [ ] Make LLM API call, verify usage logged
- [ ] Check cost calculation accurate
- [ ] Test usage charts display

## Priority Order

Given limited time, implement in this order:

1. **#1 Color Scheme** (1-2 hours) - Visual polish, user-facing
2. **#7 Sessions Fix** (5 min) - Just deploy, already done
3. **#2/#4 Activity Feed** (30 min) - Backend filter change, improves usability
4. **#3 Active Users** (20 min) - Simple query change, more accurate metric
5. **#5 Error Tracking** (2-3 hours) - Most complex, high value for debugging
6. **#6 LLM/Security** (3-4 hours) - Nice to have, can be phase 2

Total estimated time: 7-10 hours for all features

## Quick Wins (Do First):

1. Deploy sessions fix (5 min)
2. Finish color scheme updates (1 hour)
3. Update activity feed filter (30 min)
4. Change active users metric (20 min)

These 4 changes take ~2 hours total and fix the most visible issues.
