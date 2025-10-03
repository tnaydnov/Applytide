# Admin System Documentation

## Overview

The admin system provides a comprehensive dashboard for managing users, monitoring system health, viewing analytics, and tracking admin actions. It follows the application's domain-driven design pattern on the backend and feature-based architecture on the frontend.

## Architecture

### Backend Structure

```
backend/app/
├── db/
│   └── models.py                      # User.is_admin field, AdminLog model
├── api/
│   ├── deps_auth.py                   # get_admin_user() dependency
│   └── routers/
│       └── admin.py                   # Admin API endpoints
└── domain/
    └── admin/
        ├── service.py                 # AdminService (business logic)
        ├── repository.py              # AdminRepository (data access)
        └── dto.py                     # Data Transfer Objects
```

### Frontend Structure

```
frontend/
├── pages/
│   └── admin/
│       ├── index.js                   # Dashboard overview
│       ├── users.js                   # User management
│       ├── analytics.js               # Usage analytics
│       └── system.js                  # System logs
├── features/
│   └── admin/
│       ├── hooks/
│       │   └── useAdminData.js        # Data fetching hooks
│       └── components/
│           ├── DashboardStats.jsx     # Stats cards
│           ├── SystemHealthCard.jsx   # System health metrics
│           └── UsersTable.jsx         # User list table
├── services/
│   └── admin.js                       # API client
└── components/
    └── guards/
        └── AdminGuard.js              # Route protection
```

## Database Schema

### Users Table Changes
- Added `is_admin` boolean field (default: false)

### Admin Logs Table (New)
- `id` (UUID) - Primary key
- `admin_id` (UUID) - Reference to admin user
- `action` (String) - Action performed
- `target_type` (String) - Type of entity affected
- `target_id` (UUID) - ID of affected entity
- `details` (JSONB) - Additional action details
- `ip_address` (String) - Admin's IP address
- `user_agent` (String) - Admin's browser info
- `created_at` (DateTime) - Timestamp

## API Endpoints

All endpoints require admin authentication via the `get_admin_user()` dependency.

### Dashboard
- `GET /api/admin/dashboard` - Overview statistics

### System Health
- `GET /api/admin/system-health` - System health metrics

### Analytics
- `GET /api/admin/analytics?days={days}` - Usage analytics

### User Management
- `GET /api/admin/users?page={page}&limit={limit}&search={search}&premium={bool}&is_admin={bool}` - List users
- `GET /api/admin/users/{user_id}` - User details
- `PATCH /api/admin/users/{user_id}/admin-status` - Update admin status
- `PATCH /api/admin/users/{user_id}/premium-status` - Update premium status

### Audit Logs
- `GET /api/admin/logs?page={page}&limit={limit}` - Admin action logs

## Features

### Dashboard (`/admin`)
- **Overview Stats**: Total users, active users (30d), premium users, OAuth users, applications, documents, jobs, cache hit rate
- **System Health Card**: 
  - LLM usage and costs (24h, 7d, 30d)
  - Cache performance (hit rate, hits, misses, size)
  - Database stats (size, connection pool)
  - API health (calls, response time, errors)
- **Quick Actions**: Links to users, analytics, and system logs

### User Management (`/admin/users`)
- **User List**: Paginated table with user info
- **Search**: Filter by email or name
- **Filters**: Premium status, admin status
- **User Details Modal**:
  - View user information
  - Toggle admin status
  - Toggle premium status
  - View activity stats (applications, documents, jobs)
  - View account age and last login

### Analytics (`/admin/analytics`)
- **Feature Usage**: Counts for each feature
- **Application Pipeline**: Status breakdown
- **Top Users**: Most active users by activity score
- **Time Range Selector**: 7d, 30d, 90d

### System Logs (`/admin/system`)
- **Action Log Table**: All admin actions with details
- **Pagination**: Navigate through log history
- **Color-Coded Actions**: 
  - Create (green)
  - Update (amber)
  - Delete (red)
  - Other (cyan)

## Security

### Backend Security
- `get_admin_user()` dependency checks `current_user.is_admin`
- Returns 401 if not authenticated
- Returns 403 if not admin
- All admin endpoints use this dependency

### Frontend Security
- `AdminGuard` component wraps all admin pages
- Redirects to `/login` if not authenticated
- Redirects to `/dashboard` if not admin
- Navigation only shows "Admin" link if `user.is_admin` is true

### Audit Trail
- All admin actions are automatically logged
- Logs include: admin, action, target, details, IP, user agent, timestamp
- Immutable log entries for compliance

## Setup Instructions

### 1. Run Migration

```bash
cd backend
alembic upgrade head
```

This will:
- Add `is_admin` column to `users` table
- Create `admin_logs` table with indexes

### 2. Create Admin User

You need to manually update a user to be an admin in the database:

```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

Or use psql:
```bash
docker-compose exec db psql -U postgres applytide -c "UPDATE users SET is_admin = true WHERE email = 'your-admin-email@example.com';"
```

### 3. Access Admin Panel

1. Log in with admin user
2. Navigate to the "Admin" dropdown in the navbar
3. Access Dashboard, Users, Analytics, or System Logs

## Development

### Adding New Admin Features

1. **Backend**: Add endpoint to `api/routers/admin.py`
2. **Backend**: Add business logic to `domain/admin/service.py`
3. **Backend**: Add data access to `domain/admin/repository.py`
4. **Frontend**: Add API call to `services/admin.js`
5. **Frontend**: Add hook to `features/admin/hooks/useAdminData.js`
6. **Frontend**: Create component or page as needed

### Testing Admin Endpoints

```bash
# Get admin dashboard
curl -X GET http://localhost:8000/api/admin/dashboard \
  -H "Cookie: access_token=YOUR_TOKEN"

# List users
curl -X GET "http://localhost:8000/api/admin/users?page=1&limit=20" \
  -H "Cookie: access_token=YOUR_TOKEN"

# Update user admin status
curl -X PATCH http://localhost:8000/api/admin/users/{user_id}/admin-status \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'
```

## Monitoring

### Key Metrics Tracked

1. **User Metrics**:
   - Total users
   - Active users (last 30 days)
   - Premium vs free users
   - OAuth adoption rate

2. **Feature Usage**:
   - Applications created
   - Documents uploaded
   - Jobs saved
   - Reminders set

3. **System Health**:
   - LLM API costs
   - Cache hit rate
   - Database size
   - API performance

4. **Admin Actions**:
   - All admin operations logged
   - Searchable audit trail
   - Compliance tracking

## Troubleshooting

### Admin Not Seeing Admin Link
- Verify `is_admin = true` in database
- Check user object in AuthContext includes `is_admin`
- Clear browser cache and re-login

### 403 Forbidden on Admin Endpoints
- Verify user has `is_admin = true`
- Check JWT token is valid
- Verify `get_admin_user()` dependency is working

### Admin Logs Not Recording
- Check `AdminService` is being used (not `AdminRepository` directly)
- Verify database write permissions
- Check for errors in backend logs

## Future Enhancements

Potential features to add:

1. **Advanced Analytics**:
   - User cohort analysis
   - Retention metrics
   - Conversion funnels

2. **User Communication**:
   - Send announcements
   - Email users
   - In-app notifications

3. **System Configuration**:
   - Feature flags
   - Rate limits
   - Maintenance mode

4. **Export Capabilities**:
   - CSV export of users
   - Analytics reports
   - Audit log export

5. **Real-time Monitoring**:
   - WebSocket updates
   - Live metrics dashboard
   - Alert system
