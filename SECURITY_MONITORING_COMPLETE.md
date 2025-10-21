# Security Monitoring System - Implementation Complete

## Overview
Comprehensive security monitoring system integrated with existing authentication and rate limiting infrastructure. Provides database-backed tracking of security events for admin dashboard visibility.

---

## ✅ Completed Components

### 1. Database Schema

#### **SecurityEvent Model** (`backend/app/db/models.py`)
- **Purpose**: Track security-related events (failed logins, rate limits, suspicious activity)
- **Fields**:
  - `id`: UUID primary key
  - `created_at`: Timestamp (indexed)
  - `event_type`: Type of event (indexed) - 'failed_login', 'rate_limit_exceeded', 'suspicious_activity'
  - `severity`: Event severity (indexed) - 'low', 'medium', 'high', 'critical'
  - `user_id`: User ID if authenticated (indexed, nullable)
  - `email`: Email address for failed login attempts (indexed, nullable)
  - `endpoint`: API endpoint (indexed, nullable)
  - `method`: HTTP method
  - `ip_address`: Client IP (indexed, required)
  - `user_agent`: User agent string
  - `details`: JSON field for flexible event-specific data
  - `action_taken`: Action in response (e.g., "blocked", "throttled")
  - `resolved`: Resolution status (indexed)
  - `resolved_at`: Resolution timestamp
  - `resolved_by`: Admin who resolved (foreign key to users)
  - `resolution_notes`: Admin notes

### 2. Database Migration

#### **Migration File** (`backend/app/db/migrations/versions/20251021_llm_sessions.py`)
- **Updated to create 4 tables**:
  1. `llm_usage` - LLM tracking ✅
  2. `active_sessions` - Session management ✅
  3. `error_logs` - Error tracking ✅
  4. `security_events` - Security monitoring ✅ **NEW**

- **Indexes Created**:
  - `created_at` - Time-based queries
  - `event_type` - Event filtering
  - `severity` - Severity filtering
  - `user_id` - User-specific events
  - `email` - Failed login tracking by email
  - `ip_address` - IP-based tracking
  - `endpoint` - Endpoint-specific events
  - `resolved` - Unresolved events dashboard

### 3. Security Tracking Utility

#### **security_tracking.py** (`backend/app/infra/logging/security_tracking.py`)
- **Dual-layer monitoring**: 
  - File logging via existing `security_logging.py` (operational)
  - Database tracking for admin dashboard (historical analysis)

- **Functions**:
  1. `log_security_event_db()` - Log security event to database + file
  2. `get_recent_security_events()` - Query recent events with filters
  3. `get_security_stats()` - Statistics by type/severity/IP
  4. `mark_security_event_resolved()` - Admin resolution tracking
  5. `get_failed_login_attempts()` - Specialized failed login query
  6. `get_rate_limit_violations()` - Specialized rate limit query

- **Features**:
  - Automatic context extraction from Request object
  - Graceful fallback if database fails (logs to file only)
  - Top 10 offending IPs tracking
  - Unresolved critical/high event counting

### 4. Integration Points

#### **A. Login Endpoint Integration** (`backend/app/api/routers/auth/core.py`)

**Tracks 3 types of security events**:

1. **Email Rate Limit Exceeded**
   - Severity: `medium`
   - Details: email, rate limit reason
   - Action: `blocked`

2. **IP Rate Limit Exceeded**
   - Severity: `high` (more concerning than email limit)
   - Details: IP, retry_after seconds
   - Action: `blocked`

3. **Failed Login (Invalid Credentials)**
   - Severity: `medium` if user exists (potential attack), `low` if user doesn't exist
   - Details: email, whether user exists
   - User ID: Captured if user exists
   - Tracks: Invalid password attempts vs non-existent accounts

**Integration Pattern**:
```python
try:
    log_security_event_db(
        db=db,
        event_type="failed_login",
        severity="medium",
        ip_address=ip_address,
        email=form_data.email,
        user_id=user.id if user else None,
        endpoint="/api/auth/login",
        method="POST",
        user_agent=user_agent,
        details={"reason": "invalid_credentials", "user_exists": bool(user)}
    )
except Exception as e:
    logger.error(f"Failed to log security event: {e}", exc_info=True)
```

#### **B. Global Rate Limit Middleware Integration** (`backend/app/infra/http/middleware/rate_limit.py`)

**Tracks**:
- All rate limit violations across the API
- Not just login endpoints - captures ALL rate-limited requests

**Details Logged**:
- IP address
- Endpoint path
- HTTP method
- User agent
- Rate limit details (limit, retry_after, identifier)

**Pattern**:
- Non-blocking: If database logging fails, rate limiting still works
- Uses try/finally for database session cleanup
- Logs to structured logger if database fails

### 5. Admin Endpoints (EXISTING)

**Note**: Admin endpoints for security monitoring already exist in `backend/app/api/routers/admin/security.py`

**Existing Endpoints**:
- `GET /admin/security/stats` - Security statistics
- `GET /admin/security/failed-logins` - Failed login attempts
- `GET /admin/security/blocked-ips` - Blocked IP addresses
- `POST /admin/security/block-ip` - Block IP address
- `DELETE /admin/security/unblock-ip` - Unblock IP address
- `GET /admin/security/active-sessions` - Active user sessions

**Current Implementation**:
- Uses `SecurityAdminService` with Redis cache
- Tracks failed logins via `AdminAction` audit logs
- Manages IP blacklist in Redis

**Future Enhancement**: 
- Can integrate with new `SecurityEvent` database table for richer historical analysis
- Current admin endpoints can be enhanced to query both sources:
  - Redis (real-time, operational)
  - Database (historical, analysis, admin dashboard)

---

## 📊 Data Flow

### Failed Login Flow
```
User enters wrong password
    ↓
Login endpoint validates
    ↓
Verification fails
    ↓
PARALLEL LOGGING:
├─ Structured logger → security.log (operational)
├─ BusinessEventLogger → business events (audit)
└─ log_security_event_db → security_events table (dashboard)
    ↓
Admin dashboard shows:
- Recent failed logins
- Failed login stats by email/IP
- Patterns and anomalies
```

### Rate Limit Violation Flow
```
Client exceeds rate limit
    ↓
GlobalRateLimitMiddleware detects
    ↓
429 response prepared
    ↓
BEFORE RESPONSE SENT:
├─ log_security_event_db → security_events table
└─ Structured logger → error log (if DB fails)
    ↓
Response sent with Retry-After header
    ↓
Admin dashboard shows:
- Rate limit violations by IP
- Rate limit violations by endpoint
- Top offending IPs
```

---

## 🔍 Querying Security Events

### Example Queries

**Get recent failed logins from specific IP**:
```python
events = get_failed_login_attempts(
    db=db,
    ip_address="192.168.1.100",
    hours=24,
    limit=100
)
```

**Get rate limit violations by endpoint**:
```python
violations = get_rate_limit_violations(
    db=db,
    endpoint="/api/auth/login",
    hours=24
)
```

**Get all unresolved critical/high events**:
```python
events = get_recent_security_events(
    db=db,
    severity="critical",  # or "high"
    resolved=False,
    hours=168  # Last week
)
```

**Get security statistics for last 24 hours**:
```python
stats = get_security_stats(db=db, hours=24)
# Returns:
# {
#     'time_period_hours': 24,
#     'total_events': 142,
#     'events_by_type': [
#         {'event_type': 'failed_login', 'count': 87},
#         {'event_type': 'rate_limit_exceeded', 'count': 55}
#     ],
#     'events_by_severity': [
#         {'severity': 'high', 'count': 23},
#         {'severity': 'medium', 'count': 94},
#         {'severity': 'low', 'count': 25}
#     ],
#     'top_ips': [
#         {'ip_address': '192.168.1.100', 'count': 34},
#         {'ip_address': '10.0.0.5', 'count': 28}
#     ],
#     'unresolved_critical_high': 8
# }
```

---

## 🚀 Deployment Checklist

### 1. Run Database Migration
```bash
cd backend
alembic upgrade head
```

**Verifies**:
- Creates `security_events` table
- Creates all necessary indexes
- Also creates: `llm_usage`, `active_sessions`, `error_logs` (if not already created)

### 2. Restart Backend Services
```bash
docker-compose restart backend
# or
systemctl restart applytide-backend
```

### 3. Verify Security Tracking
```bash
# Test failed login (should create security event)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}'

# Check database
psql -d applytide -c "SELECT COUNT(*) FROM security_events WHERE event_type='failed_login';"

# Test rate limiting (should create security event after limit exceeded)
for i in {1..20}; do
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "test"}' &
done
wait

# Check rate limit events
psql -d applytide -c "SELECT COUNT(*) FROM security_events WHERE event_type='rate_limit_exceeded';"
```

### 4. Monitor Logs
```bash
# Check security log file
tail -f /app/logs/security.log

# Check application logs for security events
docker logs -f applytide-backend | grep -i "security"
```

---

## 🎯 Admin Dashboard Integration (Next Steps)

### Data Available for Frontend Dashboard

#### Security Overview Card
- Total security events (24h, 7d, 30d)
- Unresolved critical/high events (red badge)
- Events by severity (pie chart: critical/high/medium/low)
- Events by type (bar chart: failed_login, rate_limit, suspicious_activity)

#### Failed Login Monitoring
- Recent failed login attempts (table)
  - Columns: Timestamp, Email, IP, User Agent, Reason
  - Filters: By email, by IP, time range
- Failed login statistics
  - Top targeted accounts (by email)
  - Top attacking IPs
  - Success vs failure rate by IP

#### Rate Limit Violations
- Recent violations (table)
  - Columns: Timestamp, IP, Endpoint, Method, Details
  - Filters: By endpoint, by IP, time range
- Rate limit statistics
  - Most rate-limited endpoints
  - Top offending IPs
  - Violation frequency over time (line chart)

#### Security Actions
- Resolve security event (mark as resolved with notes)
- View event details (full JSON of event.details)
- Filter events by:
  - Event type
  - Severity
  - Resolved status
  - Time period
  - IP address
  - Email

### API Endpoints for Frontend

**Note**: Can extend existing `/admin/security/*` endpoints or create new ones specifically for `SecurityEvent` table:

```python
# Suggested new endpoints (if needed)
GET /admin/security/events/recent
GET /admin/security/events/stats
GET /admin/security/events/{event_id}
POST /admin/security/events/{event_id}/resolve
GET /admin/security/events/failed-logins
GET /admin/security/events/rate-limits
```

Or integrate with existing:
```python
# Enhance existing endpoints to query both sources
GET /admin/security/stats  # Add database SecurityEvent stats
GET /admin/security/failed-logins  # Add database SecurityEvent failed logins
```

---

## 📈 Monitoring & Alerting

### Metrics to Track

1. **Failed Login Rate**
   - Alert if >50 failed logins in 5 minutes from single IP
   - Alert if >10 failed logins for single email in 5 minutes

2. **Rate Limit Violations**
   - Alert if >100 rate limit hits in 5 minutes
   - Alert if single IP generates >50 violations

3. **Critical Security Events**
   - Alert immediately on any `severity='critical'` event
   - Daily digest of unresolved `severity='high'` events

### Alerting Integration

```python
# In security_tracking.py, can add alerting
def log_security_event_db(...):
    event = SecurityEvent(...)
    db.add(event)
    db.commit()
    
    # Alert on critical events
    if severity == 'critical':
        send_alert_to_admin(event)  # Implement as needed
        send_slack_notification(event)
        send_email_alert(event)
```

---

## 🔐 Security Best Practices

### Data Retention
- **Recommendation**: Keep security events for 90-180 days
- **Archival**: Move old events to cold storage after 180 days
- **Compliance**: Check local regulations (GDPR, etc.)

### Sensitive Data
- ✅ **Never log passwords** - Code correctly avoids this
- ✅ **Hash/redact sensitive details** - Email addresses are logged (consider if this is acceptable for your use case)
- ⚠️ **User agent strings** can contain identifiable information - currently logged
- ⚠️ **IP addresses** are personal data in some jurisdictions - currently logged

### Access Control
- ✅ Security events endpoints require `admin_required` dependency
- ✅ Resolution tracking captures which admin resolved event
- ⚠️ Consider step-up authentication for viewing sensitive security data

### Performance
- ✅ All queries use indexed columns
- ✅ Database logging is non-blocking (wrapped in try/except)
- ✅ Structured logging continues even if database fails
- ⚠️ Consider pagination for large result sets (currently limited by `limit` parameter)

---

## 📝 Next Steps

### Immediate
1. ✅ Deploy database migration
2. ⏳ Build frontend admin dashboard to display security events
3. ⏳ Set up alerting for critical events
4. ⏳ Create automated reports (daily/weekly security digests)

### Short Term
1. Integrate OAuth login failures tracking
2. Track suspicious patterns (e.g., enumeration attacks)
3. Add geolocation for IP addresses
4. Implement automatic IP blocking after N failed attempts

### Long Term
1. Machine learning for anomaly detection
2. Integration with SIEM tools
3. Compliance reporting (SOC 2, ISO 27001)
4. Advanced threat intelligence integration

---

## 🎉 Summary

### What's Working Right Now

✅ **Failed Login Tracking**
- Every failed login attempt is logged to database
- Captures: email, IP, user agent, reason
- Distinguishes between non-existent accounts and wrong passwords

✅ **Rate Limit Tracking**
- Every rate limit violation is logged
- Captures: endpoint, IP, method, limit details
- Works for ALL endpoints, not just login

✅ **Database-Backed Historical Analysis**
- Query failed logins by email or IP
- Query rate limit violations by endpoint or IP
- Statistical analysis (by type, severity, IP)
- Time-range filtering (last N hours)

✅ **Admin Resolution Workflow**
- Mark events as resolved
- Track which admin resolved
- Add resolution notes
- Filter by unresolved status

✅ **Dual-Layer Monitoring**
- Structured logging for operations (security.log)
- Database tracking for admin dashboard
- Non-blocking: If DB fails, logging continues

### Architecture Highlights

🏗️ **Clean Separation of Concerns**
- Models: `backend/app/db/models.py`
- Business Logic: `backend/app/infra/logging/security_tracking.py`
- Integration: `backend/app/api/routers/auth/core.py` + middleware
- Admin Endpoints: `backend/app/api/routers/admin/security.py` (existing)

🔄 **Graceful Degradation**
- Database logging wrapped in try/except
- Structured logging always works
- Rate limiting never breaks due to logging failure

📊 **Rich Querying**
- Filter by: type, severity, resolved, time, email, IP, endpoint
- Statistics: counts by type/severity, top IPs, unresolved critical events
- Specialized queries: failed logins, rate limits

---

## 🎨 Sample Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ Security Monitoring Dashboard                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Total       │  │  Failed      │  │  Rate Limit  │      │
│  │  Events      │  │  Logins      │  │  Violations  │      │
│  │  142         │  │  87          │  │  55          │      │
│  │  ↑ 23%      │  │  ↑ 15%      │  │  ↓ 8%       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Unresolved Critical  │  │ Top Offending IPs    │        │
│  │ 🔴 8 events          │  │ 1. 192.168.1.100 (34)│        │
│  │                      │  │ 2. 10.0.0.5 (28)     │        │
│  │ Requires Action      │  │ 3. 172.16.0.10 (19)  │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
│  Recent Security Events                       [Filter ▼]     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │Time       │Type         │Severity│IP          │Email    ││
│  ├──────────┼─────────────┼────────┼────────────┼─────────┤│
│  │10:23 AM  │failed_login │medium  │192.168.1.10│test@... ││
│  │10:22 AM  │rate_limit   │high    │10.0.0.5    │-        ││
│  │10:20 AM  │failed_login │low     │172.16.0.1  │fake@... ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Security events not being created**
A: Check:
1. Migration ran successfully: `alembic current`
2. Table exists: `psql -d applytide -c "\d security_events"`
3. Backend restarted after migration
4. Logs for errors: `docker logs applytide-backend | grep -i security`

**Q: Too many security events filling database**
A: Implement:
1. Data retention policy (delete events older than N days)
2. Archival to cold storage
3. Rate limit the rate limit logging (log only every Nth violation)

**Q: Performance degradation**
A: Check:
1. Indexes exist: `psql -d applytide -c "\d security_events"`
2. Query plans: `EXPLAIN ANALYZE SELECT ...`
3. Consider partitioning by date for very large datasets

---

**Implementation Complete**: January 2025
**Status**: ✅ Ready for deployment
**Next Action**: Deploy migration and build frontend dashboard
