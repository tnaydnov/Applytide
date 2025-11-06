# User and IP Banning System - Implementation Summary

## Overview
Comprehensive ban management system implemented to prevent abusive users from accessing the platform via email or IP address banning.

## ✅ What Was Implemented

### 1. Database Layer (`backend/app/db/models.py`)
**New Model: `BannedEntity`**
- Tracks banned emails and IP addresses
- Supports both permanent and temporary bans (with expiration)
- Complete audit trail (who banned, when, why, who unbanned)
- Soft delete support (`is_active` flag)
- Unique constraint prevents duplicate bans
- Foreign keys to User table for relationship tracking

**Key Fields:**
- `entity_type`: "email" or "ip"
- `entity_value`: The actual email or IP address
- `reason`: Optional ban reason (max 2000 chars)
- `banned_user_id`: Original user who was banned
- `banned_by`: Admin who issued the ban
- `unbanned_by`: Admin who removed the ban
- `expires_at`: Optional expiration (NULL = permanent)
- `is_active`: Whether ban is currently enforced

### 2. Ban Service (`backend/app/infra/security/ban_service.py`)
**Comprehensive ban management with best practices:**

#### Features:
- ✅ Input validation and normalization (case-insensitive emails, IP format validation)
- ✅ Comprehensive error handling with custom exceptions
- ✅ Detailed logging for all operations
- ✅ Duplicate ban prevention
- ✅ Batch operations (ban/unban all user's bans)
- ✅ Expired ban cleanup utility
- ✅ Fail-open design (service errors don't block authentication)

#### Key Methods:
```python
# Check if banned (used in login/registration)
BanService.is_email_banned(db, email) -> bool
BanService.is_ip_banned(db, ip_address) -> bool

# Ban operations (admin only)
BanService.ban_user(db, user_id, email, ip_address, reason, ...) -> (email_ban, ip_ban)
BanService.ban_email(db, email, reason, ...) -> BannedEntity
BanService.ban_ip(db, ip_address, reason, ...) -> BannedEntity

# Unban operations (admin only)
BanService.unban_user(db, user_id, ...) -> (email_count, ip_count)
BanService.unban_email(db, email, ...) -> bool
BanService.unban_ip(db, ip_address, ...) -> bool

# Utility
BanService.get_user_bans(db, user_id) -> List[BannedEntity]
BanService.cleanup_expired_bans(db) -> int
```

#### Error Handling:
- `InvalidBanDataError`: Email/IP format validation failed
- `DuplicateBanError`: Entity already banned
- `BanServiceError`: General service errors

### 3. Client IP Extraction (`backend/app/infra/http/client_ip.py`)
**Reliable IP address extraction from HTTP requests:**
- Handles X-Forwarded-For (load balancers)
- Handles X-Real-IP (some proxies)
- Fallback to direct connection IP
- IPv4 and IPv6 support
- Input validation and sanitization
- Detailed logging

```python
get_client_ip(request) -> str
```

### 4. Authentication Layer Updates

#### Registration (`backend/app/api/routers/auth/registration.py`)
**Ban checks added before user creation:**
```python
# Check if email is banned
if BanService.is_email_banned(db, payload.email):
    raise HTTPException(403, "Access denied. Your account has been suspended.")

# Check if IP is banned  
if BanService.is_ip_banned(db, ip_address):
    raise HTTPException(403, "Access denied. This IP address has been blocked.")
```

#### Login (`backend/app/api/routers/auth/core/login.py`)
**Ban checks added before authentication:**
- Same checks as registration
- Logged as failed login attempts
- Business events logged with failure reason

### 5. Admin API Endpoints (`backend/app/api/routers/admin/users/bans.py`)
**Complete admin interface for ban management:**

#### Endpoints:

1. **POST /api/admin/users/ban** - Ban a user (email + optional IP)
   ```json
   {
     "user_id": "uuid",
     "reason": "Violated terms of service",
     "ban_ip": true,
     "ban_duration_days": 30  // or null for permanent
   }
   ```

2. **POST /api/admin/users/unban** - Unban a user (all bans)
   ```json
   {
     "user_id": "uuid"
   }
   ```

3. **GET /api/admin/bans** - List all bans
   - Query params: `active_only=true`, `entity_type=email|ip`
   - Returns: List of bans with counts

4. **GET /api/admin/users/{user_id}/bans** - Get user's ban history
   - Returns: All bans (active + inactive) for user

5. **POST /api/admin/bans/email** - Ban email directly
   ```json
   {
     "email": "spam@example.com",
     "reason": "Spam account",
     "ban_duration_days": null
   }
   ```

6. **POST /api/admin/bans/ip** - Ban IP directly
   ```json
   {
     "ip_address": "1.2.3.4",
     "reason": "Malicious activity",
     "ban_duration_days": 7
   }
   ```

7. **DELETE /api/admin/bans/email** - Unban email
8. **DELETE /api/admin/bans/ip** - Unban IP

#### Security Features:
- ✅ Admin authentication required (all endpoints)
- ✅ Prevents admins from banning other admins
- ✅ Complete audit trail (who, when, why)
- ✅ Comprehensive request/response validation (Pydantic)
- ✅ Detailed logging for all actions
- ✅ Input sanitization and validation

### 6. Router Integration
**Bans router added to admin users module:**
- File: `backend/app/api/routers/admin/users/__init__.py`
- URL prefix: `/api/admin/users`
- All ban endpoints accessible under admin panel

## 🔄 Data Flow

### Registration/Login Flow:
```
1. User attempts registration/login
2. Extract client IP from request
3. Check if email is banned -> 403 if yes
4. Check if IP is banned -> 403 if yes
5. Continue with normal registration/login flow
```

### Ban User Flow (Admin):
```
1. Admin clicks "Ban User" in admin panel
2. Frontend sends POST /api/admin/users/ban
3. Backend validates admin permissions
4. Fetches user details from database
5. BanService creates BannedEntity records (email + IP)
6. Logs action with admin ID
7. Returns success with ban IDs
```

### Unban User Flow (Admin):
```
1. Admin clicks "Unban User" in admin panel
2. Frontend sends POST /api/admin/users/unban
3. Backend finds all active bans for user
4. Sets is_active=False, records unbanned_at and unbanned_by
5. Logs action with admin ID
6. Returns success with counts
```

## 📋 Database Migration

**Alembic migration will be auto-generated on next backend start:**
```sql
CREATE TABLE banned_entities (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,  -- 'email' or 'ip'
    entity_value VARCHAR(320) NOT NULL, -- email or IP
    reason TEXT,
    banned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unbanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    banned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    unbanned_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uix_entity_type_value UNIQUE (entity_type, entity_value)
);

CREATE INDEX idx_banned_entities_type ON banned_entities(entity_type);
CREATE INDEX idx_banned_entities_value ON banned_entities(entity_value);
CREATE INDEX idx_banned_entities_active ON banned_entities(is_active);
CREATE INDEX idx_banned_entities_user ON banned_entities(banned_user_id);
```

## 🎨 Frontend Integration (TODO)

### Required Frontend Changes:

1. **Add Ban Button to User Detail Page** (`frontend/pages/admin/users/[id].jsx`)
   ```jsx
   // Add to action buttons section
   <button 
     onClick={() => handleBanUser(user.id)}
     className="btn-danger"
   >
     <FiBan /> Ban User
   </button>
   ```

2. **Create Ban Modal Component** (`frontend/components/admin/BanUserModal.jsx`)
   ```jsx
   // Modal with:
   // - Reason input (textarea)
   // - Ban IP checkbox
   // - Duration selector (permanent, 7 days, 30 days, custom)
   // - Confirm/Cancel buttons
   ```

3. **Add Ban Status Badge**
   ```jsx
   {userBans.some(b => b.is_active) && (
     <span className="badge-danger">
       🚫 Banned
     </span>
   )}
   ```

4. **Ban History Section**
   ```jsx
   <div className="card">
     <h3>Ban History</h3>
     {bans.map(ban => (
       <div key={ban.id}>
         <Badge type={ban.entity_type} />
         <span>{ban.reason}</span>
         <span>{format(ban.banned_at, 'MMM d, yyyy')}</span>
         {ban.is_active && <button onClick={() => unban(ban)}>Unban</button>}
       </div>
     ))}
   </div>
   ```

5. **Add API Client Methods** (`frontend/features/admin/api.js`)
   ```javascript
   export const banUser = async (userId, data) => {
     return await apiFetch(`/api/admin/users/ban`, {
       method: 'POST',
       body: JSON.stringify(data)
     });
   };

   export const unbanUser = async (userId) => {
     return await apiFetch(`/api/admin/users/unban`, {
       method: 'POST',
       body: JSON.stringify({ user_id: userId })
     });
   };

   export const getUserBans = async (userId) => {
     return await apiFetch(`/api/admin/users/${userId}/bans`);
   };
   ```

## 🔍 Testing Checklist

### Backend Testing:
- [ ] Create migration and run it
- [ ] Test ban_email with valid email
- [ ] Test ban_email with invalid email (should error)
- [ ] Test ban_email twice (should error - duplicate)
- [ ] Test ban_ip with valid IPv4 and IPv6
- [ ] Test is_email_banned returns true for banned email
- [ ] Test is_ip_banned returns true for banned IP
- [ ] Test registration blocked for banned email
- [ ] Test registration blocked for banned IP
- [ ] Test login blocked for banned email
- [ ] Test login blocked for banned IP
- [ ] Test unban_email removes ban
- [ ] Test unban_user removes all bans
- [ ] Test temporary bans expire correctly
- [ ] Test admin can ban user via API
- [ ] Test admin can unban user via API
- [ ] Test non-admin cannot access ban endpoints (403)
- [ ] Test admin cannot ban other admins
- [ ] Test cleanup_expired_bans deactivates expired bans

### Frontend Testing:
- [ ] Ban button appears on user detail page
- [ ] Ban modal opens with form
- [ ] Ban form validates input
- [ ] Ban success shows toast and updates UI
- [ ] Banned user shows badge/indicator
- [ ] Ban history section displays correctly
- [ ] Unban button works and updates UI
- [ ] Error messages display correctly

## 📊 Logging & Monitoring

**All ban operations are logged with:**
- Admin ID who performed action
- Target user/email/IP
- Timestamp
- Reason
- Success/failure status

**Log messages to monitor:**
- `"Banned email attempted access"` - Blocked registration/login
- `"Banned IP attempted access"` - Blocked registration/login
- `"User banned successfully"` - Admin banned user
- `"User unbanned successfully"` - Admin unbanned user

## 🚀 Deployment Steps

1. **Backend Deployment:**
   ```bash
   # Backend will auto-generate migration
   cd backend
   alembic revision --autogenerate -m "Add banned_entities table"
   alembic upgrade head
   
   # Restart backend services
   docker-compose restart backend
   ```

2. **Frontend Deployment:**
   ```bash
   # After adding UI components
   cd frontend
   npm run build
   docker-compose restart frontend
   ```

3. **Verify:**
   - Check admin panel loads
   - Test ban user functionality
   - Check logs for errors

## ⚠️ Important Notes

### Security Considerations:
- **Fail-open design**: If ban service errors, authentication is NOT blocked (prevents service outages from locking everyone out)
- **Generic error messages**: Users see "Access denied" without specifics (prevents information leakage)
- **Admin protection**: Cannot ban other admins (prevents admin lockout)
- **Audit trail**: All actions logged with admin ID (compliance & accountability)

### Performance:
- Ban checks use database indexes (entity_type + entity_value + is_active)
- Checks are fast (single query per check)
- Consider caching for high-traffic sites (Redis cache of banned emails/IPs)

### Maintenance:
- Run `BanService.cleanup_expired_bans(db)` daily (cron job or scheduled task)
- Monitor ban logs for abuse patterns
- Review ban reasons regularly for policy compliance

## 🎯 Usage Examples

### Ban a spammer:
```bash
# Admin panel: User detail page -> Ban button
# Reason: "Spam - mass fake registrations"
# Ban IP: Yes
# Duration: Permanent
```

### Temporary ban for TOS violation:
```bash
# Reason: "Violated TOS - inappropriate content"
# Ban IP: Yes
# Duration: 7 days
```

### Ban an email domain (preventive):
```bash
# Direct email ban (no user yet)
# Email: "abuse@spam-domain.com"
# Reason: "Known spam domain"
# Duration: Permanent
```

### Check if user is banned:
```bash
# User detail page will show ban badge
# Ban history section shows all bans
# Active bans highlighted
```

## 🔧 Configuration

### Environment Variables (none required):
All configuration is code-based. Optional enhancements:

```python
# config.py (optional)
BAN_CACHE_TTL = 300  # Cache ban checks for 5 minutes
BAN_CLEANUP_SCHEDULE = "0 0 * * *"  # Daily at midnight
BAN_MAX_REASON_LENGTH = 2000
```

## 📚 API Documentation

Full API docs will be auto-generated by FastAPI at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Search for "ban" in the API docs to find all ban-related endpoints.

---

## ✨ Summary

**What's Complete:**
✅ Database model with full audit trail
✅ Comprehensive ban service with validation & logging
✅ IP extraction utility
✅ Registration ban checks
✅ Login ban checks  
✅ Complete admin API endpoints
✅ Router integration
✅ Documentation

**What's Next (Frontend):**
- Add ban button to user detail page
- Create ban modal component
- Add ban history section
- Add API client methods
- Add ban status indicators

**Testing:**
- Backend is ready to test immediately
- Run migrations on next backend start
- Frontend requires UI implementation
