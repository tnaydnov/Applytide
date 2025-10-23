# Admin Panel Implementation Plan for Applytide

## Current App Analysis

### Backend Structure
- **Auth System**: 
  - Uses `get_current_user` dependency for authentication
  - Role stored in `users.role` (default: "user")
  - No admin-specific code exists yet
  
- **Router Organization** (modular):
  - Main routers in `/backend/app/api/routers/`
  - Each feature has its own router (jobs, applications, auth, etc.)
  - Sub-routers organized in folders (e.g., `/applications/` has crud.py, queries.py, stages.py, etc.)

- **Service Layer**:
  - Domain logic in `/backend/app/domain/[feature]/service.py`
  - Services use dependency injection with `Depends(get_[feature]_service)`

- **Database**:
  - Models in `/backend/app/db/models.py`
  - 17 tables including: users, applications, jobs, application_logs, refresh_tokens, etc.
  - User role field exists but only "user" is used

### Frontend Structure
- **Pages**: `/frontend/pages/` - Next.js routing
- **Components**: Organized by feature (`/nav/`, `/guards/`, `/feedback/`, etc.)
- **API Client**: 
  - Core in `/lib/api/core.js`
  - Feature APIs in `/features/[feature]/api.js`
  - Main export in `/lib/api.js`
  
- **Auth Context**: `/contexts/AuthContext.js` - manages user state, includes `user.role`
- **Navigation**: `/components/nav/NavBar.jsx` - currently shows different links based on auth state

---

## Implementation Plan

### Phase 1: Backend Foundation (Admin Auth & Core APIs)

#### 1.1 Admin Authentication Middleware
**File**: `backend/app/api/deps_admin.py` (NEW)
```python
# Admin-only dependency
def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return current_user
```

#### 1.2 Admin Router Structure
**Folder**: `backend/app/api/routers/admin/` (NEW)
```
admin/
  __init__.py          # Main router that includes all sub-routers
  dashboard.py         # Dashboard stats & metrics
  users.py             # User management
  errors.py            # Error monitoring
  sessions.py          # Active sessions
  system.py            # System health
  security.py          # Security monitoring (Phase 2)
```

#### 1.3 Admin Services
**Folder**: `backend/app/domain/admin/` (NEW)
```
admin/
  service.py           # Main admin service with all business logic
  dto.py               # Data Transfer Objects for admin responses
```

---

### Phase 2: Backend API Endpoints

#### 2.1 Dashboard API (`admin/dashboard.py`)
**Endpoints**:
- `GET /api/admin/dashboard/stats` - Quick stats cards
- `GET /api/admin/dashboard/activity` - Recent activity feed (20 events)
- `GET /api/admin/dashboard/charts` - Chart data (signups, applications, errors)

**Data Sources**:
- Users table (total, premium count, new signups)
- Applications table (total created)
- Refresh_tokens table (active sessions)
- Application_logs table (recent errors)

#### 2.2 Users Management API (`admin/users.py`)
**Endpoints**:
- `GET /api/admin/users` - List users with filters & pagination
- `GET /api/admin/users/{user_id}` - User detail
- `PATCH /api/admin/users/{user_id}/premium` - Toggle premium
- `PATCH /api/admin/users/{user_id}/role` - Change role (user/admin)
- `DELETE /api/admin/users/{user_id}` - Delete user
- `POST /api/admin/users/{user_id}/revoke-sessions` - Revoke all sessions
- `GET /api/admin/users/{user_id}/applications` - User's applications
- `GET /api/admin/users/{user_id}/jobs` - User's jobs
- `GET /api/admin/users/{user_id}/reminders` - User's reminders
- `GET /api/admin/users/{user_id}/activity` - User's recent actions from logs

**Filters**: premium, email_verified, role, search by email/name

#### 2.3 Error Monitoring API (`admin/errors.py`)
**Endpoints**:
- `GET /api/admin/errors` - List errors with filters & pagination
- `GET /api/admin/errors/summary` - Error summary stats
- `GET /api/admin/errors/{log_id}` - Error detail

**Data Source**: `application_logs` table filtered by `level="ERROR"` or `level="CRITICAL"`

#### 2.4 Active Sessions API (`admin/sessions.py`)
**Endpoints**:
- `GET /api/admin/sessions` - List active sessions
- `GET /api/admin/sessions/stats` - Session statistics
- `DELETE /api/admin/sessions/{session_id}` - Revoke single session

**Data Source**: `refresh_tokens` table where `is_active=True` and not expired

#### 2.5 System Health API (`admin/system.py`)
**Endpoints**:
- `GET /api/admin/system/database` - Database health & sizes
- `GET /api/admin/system/storage` - Storage usage breakdown
- `GET /api/admin/system/api` - API health metrics

---

### Phase 3: Frontend Foundation

#### 3.1 Admin Route Guard
**File**: `frontend/components/guards/AdminGuard.jsx` (NEW)
```jsx
// Checks if user.role === 'admin', redirects if not
```

#### 3.2 Admin Layout
**File**: `frontend/components/admin/AdminLayout.jsx` (NEW)
```jsx
// Sidebar navigation for admin section
// Breadcrumbs, admin-specific header
```

#### 3.3 Admin API Client
**File**: `frontend/features/admin/api.js` (NEW)
```javascript
// All admin API calls
export const adminApi = {
  getDashboard: () => ...
  getUsers: (filters) => ...
  // etc.
}
```

#### 3.4 Admin Pages
**Folder**: `frontend/pages/admin/` (NEW)
```
admin/
  index.jsx            # Dashboard (landing page)
  users/
    index.jsx          # Users list
    [id].jsx           # User detail page
  errors/
    index.jsx          # Error monitoring
    [id].jsx           # Error detail
  sessions.jsx         # Active sessions
  system.jsx           # System health
```

---

### Phase 4: UI Components

#### 4.1 Admin Shared Components
**Folder**: `frontend/components/admin/` (NEW)
```
admin/
  AdminLayout.jsx      # Sidebar + layout
  StatCard.jsx         # Dashboard stat cards
  ActivityFeed.jsx     # Activity feed component
  UserTable.jsx        # Users list table
  ErrorTable.jsx       # Errors list table
  SessionTable.jsx     # Sessions list table
  Chart.jsx            # Simple chart component
  Filters.jsx          # Reusable filter component
```

#### 4.2 Admin Navigation Integration
**File**: `frontend/components/nav/NavBar.jsx` (UPDATE)
```jsx
// Add "Admin" link to authenticated links when user.role === 'admin'
```

---

### Phase 5: Database Schema (NO CHANGES NEEDED!)

**Existing fields we'll use**:
- `users.role` - Already exists, just need to set to "admin"
- `users.is_premium`, `premium_expires_at` - For premium management
- `users.email_verified_at`, `last_login_at` - For user info
- `refresh_tokens` - For session management
- `application_logs` - For error monitoring & user activity

**NO NEW TABLES NEEDED** - Everything uses existing schema!

---

### Phase 6: Implementation Order

**Step 1: Backend Core** (1-2 hours)
1. Create `deps_admin.py` with admin auth
2. Create `domain/admin/service.py` with core logic
3. Create `domain/admin/dto.py` with response models

**Step 2: Dashboard API** (1 hour)
4. Create `admin/dashboard.py` router
5. Implement stats, activity feed, charts endpoints
6. Test with Postman/curl

**Step 3: Users API** (2 hours)
7. Create `admin/users.py` router
8. Implement list, detail, toggle premium, change role endpoints
9. Test user management flows

**Step 4: Frontend Foundation** (1-2 hours)
10. Create `AdminGuard.jsx`
11. Create `admin/api.js` client
12. Create `AdminLayout.jsx`

**Step 5: Dashboard Page** (2 hours)
13. Create `pages/admin/index.jsx`
14. Create dashboard components (StatCard, ActivityFeed, Chart)
15. Connect to API

**Step 6: Users Management Pages** (3 hours)
16. Create `pages/admin/users/index.jsx` (list)
17. Create `pages/admin/users/[id].jsx` (detail)
18. Create user management components
19. Connect to API

**Step 7: Error Monitoring** (1-2 hours)
20. Create `admin/errors.py` router
21. Create `pages/admin/errors/` pages
22. Create error components

**Step 8: Sessions & System** (1-2 hours)
23. Create `admin/sessions.py` and `admin/system.py` routers
24. Create corresponding pages
25. Final testing

---

## File Size Management Strategy

### Backend Files (keep under 300 lines each)
- **Split by feature**: Each sub-router handles one concern
- **Use service layer**: Heavy logic goes in `domain/admin/service.py`
- **DTOs separate**: Response models in `domain/admin/dto.py`

### Frontend Files (keep under 300 lines each)
- **Component composition**: Break down into smaller components
- **Shared components**: Reusable pieces in `components/admin/`
- **Feature folders**: Group related components together

---

## Testing Strategy

1. **Backend**: Test each endpoint with curl/Postman as we build
2. **Frontend**: Test in browser after each component
3. **Integration**: Test full user flow (admin login → dashboard → user management)
4. **Edge cases**: Test non-admin trying to access admin routes

---

## Security Considerations

1. **Admin auth**: Always use `Depends(get_admin_user)` on admin routes
2. **CORS**: Admin routes already protected by existing CORS config
3. **Rate limiting**: Existing rate limiting middleware applies
4. **Audit logging**: Log all admin actions in `application_logs`

---

## Next Steps

Ready to start implementation? I recommend we:
1. Start with backend foundation (deps_admin.py + service.py)
2. Build dashboard API + frontend
3. Gradually add users, errors, sessions, system features

This keeps the scope manageable and lets you test each feature as we go.

**Ready to begin? Let's start with Phase 1!**
