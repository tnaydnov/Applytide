# Applytide Backend - Complete API Reference

> Generated for frontend wiring. Every route path, HTTP method, request/response shape, auth requirement, and service call is documented below.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Cookies](#2-authentication--cookies)
3. [Database Models](#3-database-models)
4. [API Endpoints by Resource](#4-api-endpoints-by-resource)
   - [Health](#health)
   - [Auth](#auth)
   - [Jobs](#jobs)
   - [Applications](#applications)
   - [Dashboard](#dashboard)
   - [Analytics](#analytics)
   - [Documents](#documents)
   - [Preferences](#preferences)
   - [AI](#ai)
   - [Feedback](#feedback)
   - [Errors (Client Logging)](#errors-client-logging)
   - [WebSocket](#websocket)
   - [Reminders & Google Calendar](#reminders--google-calendar)
   - [Profile](#profile)
   - [Admin](#admin)
5. [Config / Environment Variables](#5-config--environment-variables)
6. [Infrastructure Summary](#6-infrastructure-summary)

---

## 1. Architecture Overview

| Layer | Tech |
|-------|------|
| Framework | **FastAPI** (Python 3.11+) |
| ORM | **SQLAlchemy 2.x** (sync `Session` + async `AsyncSession`) |
| Database | **PostgreSQL** (`postgresql+psycopg2`) |
| Cache/Sessions | **Redis** (`redis://redis:6379/0`) |
| Auth | JWT access (15 min) + refresh (7-30 day) tokens, **httpOnly cookies** |
| OAuth | Google OAuth 2.0 (email, profile, calendar scopes) |
| AI | OpenAI API (GPT-4o-mini / GPT-4o) |
| Background | APScheduler (`BackgroundScheduler`, daemon) |
| Rate Limiting | SlowAPI + custom `GlobalRateLimitMiddleware` |
| Email | SMTP (`maildev` in dev) |
| PDF | ReportLab |
| WebSocket | FastAPI native WS |

### Middleware Stack (applied in order)
1. `LoggingMiddleware` - request/response logging to `ApplicationLog`
2. `GlobalRateLimitMiddleware` - IP-based rate limiting
3. `CORSMiddleware` - origin whitelist
4. `TrustedHostMiddleware`
5. `ProxyHeadersMiddleware`
6. `SecurityHeadersMiddleware` - CSP, X-Frame, etc.

### Router Mount Points (from `main.py`)
```
/health                         → health check
/api/auth                       → auth router
/api/jobs                       → jobs router
/api/applications               → applications router
/api/dashboard                  → dashboard router
/api/analytics                  → analytics router
/api/documents                  → documents router
/api/preferences                → preferences router
/api/ai                         → AI router
/api                            → feedback router
/api/errors                     → error logging router
/api/ws                         → WebSocket router
/api/calendars/reminders        → reminders router
/api/calendars                  → google calendar router
/api/admin                      → admin router
/api/profile                    → profile router
```

---

## 2. Authentication & Cookies

### Cookie Names
| Cookie | Purpose | Flags |
|--------|---------|-------|
| `access_token` | JWT access token (15 min TTL) | httpOnly, Secure*, SameSite=Lax, Path=/ |
| `refresh_token` | JWT refresh token (7-30 day TTL) | httpOnly, Secure*, SameSite=Lax, Path=/api/auth/refresh |

\* `Secure=True` only in production (when `ENVIRONMENT != "development"`).

### Auth Dependencies (from `api/deps/`)
| Dependency | Usage |
|------------|-------|
| `get_current_user` | Extracts JWT from `access_token` cookie or `Authorization` header → returns `User` |
| `get_current_user_optional` | Same but returns `None` if unauthenticated |
| `get_admin_user` | `get_current_user` + verifies `user.role == "admin"` |

### Token Flow
1. **Login** → server sets `access_token` + `refresh_token` cookies
2. **API calls** → browser sends cookies automatically
3. **Token expired** → client calls `POST /api/auth/refresh` (uses `refresh_token` cookie)
4. **Refresh** → server rotates both tokens (token family rotation for replay detection)
5. **Logout** → server revokes tokens and clears cookies

---

## 3. Database Models

All models use UUID primary keys. PostgreSQL with JSONB for list/dict fields.

| Model | Table | Key Columns |
|-------|-------|-------------|
| `User` | `users` | email, full_name, password_hash, role, subscription_plan/status/period, google_id, is_oauth_user, language, theme_preference, avatar_url, has_seen_welcome_modal, terms_accepted_at |
| `UserProfile` | `user_profiles` | user_id (FK→users), preferred_locations (JSON), country, remote_preference, target_roles (JSON), target_industries (JSON), experience_level, skills (JSON), career_goals (JSON) |
| `Company` | `companies` | name, website, location, notes |
| `Job` | `jobs` | user_id, company_id, source_url, title, location, remote_type, job_type, description, requirements (JSONB), skills (JSONB) |
| `Resume` | `resumes` | user_id, label, file_path, text |
| `Application` | `applications` | user_id, job_id, resume_id, status, source, is_archived |
| `Stage` | `stages` | application_id, name, scheduled_at, outcome, notes |
| `Note` | `notes` | application_id, user_id, body |
| `MatchResult` | `match_results` | user_id, resume_id, job_id, score, keywords_present, keywords_missing |
| `ApplicationAttachment` | `application_attachments` | application_id, filename, file_size, content_type, file_path, document_type |
| `RefreshToken` | `refresh_tokens` | user_id, jti, family_id, expires_at, revoked_at, user_agent, ip_address, is_active |
| `EmailAction` | `email_actions` | user_id, type (VERIFY/RESET), token, expires_at, used_at |
| `OAuthToken` | `oauth_tokens` | user_id, provider, access_token, refresh_token, expires_at, scope |
| `Reminder` | `reminders` | user_id, application_id, title, description, due_date, google_event_id, meet_url, email_notifications_enabled, notification_schedule (JSONB), event_type, ai_prep_tips_enabled, ai_prep_tips_generated |
| `ReminderNote` | `reminder_notes` | reminder_id (FK), user_id (FK), body |
| `UserPreferences` | `user_preferences` | user_id, preference_key, preference_value (JSONB) |
| `ApplicationLog` | `application_logs` | timestamp, level, logger, message, request_id, user_id, endpoint, method, status_code, ip_address, user_agent, exception_type, stack_trace, extra (JSONB) |
| `LLMUsage` | `llm_usage` | user_id, provider, model, endpoint, usage_type, prompt_tokens, completion_tokens, total_tokens, estimated_cost, response_time_ms, success |
| `BannedEntity` | `banned_entities` | entity_type (email/ip), entity_value, banned_user_id, reason, banned_by, is_active, expires_at |

### Subscription Plans
The `User` model has a full subscription system:
- **Plans**: `starter` (free), `pro`, `premium`
- **Statuses**: `active`, `canceled`, `expired`, `past_due`
- **Periods**: `monthly`, `yearly`, `null` (free)
- Helper properties: `is_premium`, `is_pro`, `has_paid_plan`, `is_subscription_active`, `has_feature_access(feature)`
- Feature gating via `has_feature_access()` method (e.g., `unlimited_ai`, `ai_agent`, `resume_generation`)

---

## 4. API Endpoints by Resource

### Health

| Method | Path | Auth | Description | Response |
|--------|------|------|-------------|----------|
| `GET` | `/health` | None | Health check (DB + Redis ping) | `{ "status": "ok", "database": "ok"/"error", "redis": "ok"/"error" }` |

---

### Auth

**Prefix:** `/api/auth`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `POST` | `/api/auth/login` | None | `{ email, password }` | Sets cookies. Returns `{ user: {...}, expires_in: int }` | Email/password login |
| `POST` | `/api/auth/refresh` | Cookie (`refresh_token`) | - | Rotates both tokens (new cookies) → `{ user, expires_in }` | Token refresh (rotation) |
| `POST` | `/api/auth/logout` | None (graceful) | - | Clears cookies, returns `{ message }` | Single-device logout |
| `POST` | `/api/auth/logout_all` | Required | - | `{ message }` | Revoke ALL refresh tokens (all devices) |
| `POST` | `/api/auth/register` | None | `{ email, password, full_name?, terms_accepted?, privacy_accepted?, ip? }` | `{ access_token, refresh_token }` | User registration |
| `POST` | `/api/auth/send_verification` | None | `{ email }` | `{ message }` | Send email verification link |
| `POST` | `/api/auth/verify_email` | None | `{ token }` | `{ message }` | Verify email with token |
| `POST` | `/api/auth/password_reset_request` | None | `{ email }` | `{ message }` | Request password reset email |
| `POST` | `/api/auth/password_reset` | None | `{ token, new_password }` | `{ message }` | Reset password with token |
| `POST` | `/api/auth/change-password` | Required | `{ current_password, new_password }` | `{ message }` | Change password (logged-in user) |
| `GET` | `/api/auth/me` | Required | - | User profile dict (full fields) | Get current user info |
| `PUT` | `/api/auth/profile` | Required | Partial user fields | Updated user dict | Update profile fields |
| `PUT` | `/api/auth/preferences` | Required | `{ language?, theme?, notifications? }` | Updated user dict | Update user preferences |
| `POST` | `/api/auth/welcome-modal-seen` | Required | - | `{ message }` | Mark welcome modal as seen |
| `POST` | `/api/auth/extension-banner-dismissed` | Required | - | `{ message }` | Dismiss extension banner |
| `POST` | `/api/auth/upload-avatar` | Required | `multipart/form-data` (file, max 5MB) | `{ avatar_url }` | Upload avatar image |
| `POST` | `/api/auth/extension-token` | Required | - | `{ token }` | Generate chrome extension token |
| `POST` | `/api/auth/ws-ticket` | Required | - | `{ ticket }` | Generate WebSocket ticket |
| `GET` | `/api/auth/google/login` | None | - | Redirect to Google OAuth | Initiate Google OAuth |
| `GET` | `/api/auth/google/callback` | None | Query: `code`, `state` | Redirect to `/dashboard` with cookies set | Google OAuth callback |
| `POST` | `/api/auth/google/store-agreements` | Cookie | `{ terms_accepted, privacy_accepted, ip? }` | `{ message }` | Store legal agreements for OAuth users |

---

### Jobs

**Prefix:** `/api/jobs`

| Method | Path | Auth | Request Body / Params | Response | Description |
|--------|------|------|----------------------|----------|-------------|
| `POST` | `/api/jobs/` | Required | `JobCreate` (extracted job data) | `JobOut` | Create job from extracted data |
| `GET` | `/api/jobs/` | Required | Query: `skip`, `limit`, `location`, `remote_type`, `sort_by`, `sort_order` | `PaginatedResponse[JobOut]` | List jobs with filtering |
| `GET` | `/api/jobs/{job_id}` | Required | - | `JobOut` | Get single job |
| `PUT` | `/api/jobs/{job_id}` | Required | `JobUpdate` (full replace) | `JobOut` | Update job |
| `DELETE` | `/api/jobs/{job_id}` | Required | - | 204 | Delete job |
| `GET` | `/api/jobs/search` | Required | Query: `q`, `location`, `remote_type`, `job_type`, `sort_by`, `page`, `per_page` | `PaginatedResponse[JobSearchOut]` | Advanced search with relevance scoring |
| `GET` | `/api/jobs/suggestions` | Required | Query: `q`, `limit` | `List[str]` | Search autocomplete suggestions |
| `POST` | `/api/jobs/extension` | Required | ExtensionJobCreate (from browser extension) | `JobOut` | Create job from extension |
| `POST` | `/api/jobs/manual` | Required | ManualJobCreate | `JobOut` | Create job manually |

---

### Applications

**Prefix:** `/api/applications`

| Method | Path | Auth | Request Body / Params | Response | Description |
|--------|------|------|----------------------|----------|-------------|
| `POST` | `/api/applications/` | Required | `ApplicationCreate { job_id, status?, resume_id?, source? }` | `ApplicationOut` | Create application |
| `GET` | `/api/applications/` | Required | Query: `skip`, `limit`, `status`, `source`, `include_archived` | `PaginatedResponse[ApplicationOut]` | List applications |
| `GET` | `/api/applications/statuses` | Required | - | `List[str]` | Get unique statuses used |
| `GET` | `/api/applications/cards` | Required | Query: `status` | `List[ApplicationCard]` | Kanban card format |
| `GET` | `/api/applications/with-stages` | Required | - | `List[dict]` | Applications with stage arrays |
| `GET` | `/api/applications/{app_id}` | Required | - | `ApplicationOut` | Get single application |
| `GET` | `/api/applications/{app_id}/detail` | Required | - | `ApplicationDetail` (includes job, stages, notes, attachments) | Full detail view |
| `PATCH` | `/api/applications/{app_id}` | Required | Partial update fields | `ApplicationOut` | Partial update |
| `PUT` | `/api/applications/{app_id}/archive` | Required | - | `ApplicationOut` | Toggle archive status |
| `POST` | `/api/applications/{app_id}/stages` | Required | `StageCreate { name, scheduled_at?, outcome?, notes? }` | `StageOut` | Add stage |
| `GET` | `/api/applications/{app_id}/stages` | Required | - | `List[StageOut]` | List stages |
| `PATCH` | `/api/applications/{app_id}/stages/{stage_id}` | Required | Partial stage fields | `StageOut` | Update stage |
| `DELETE` | `/api/applications/{app_id}/stages/{stage_id}` | Required | - | 204 | Delete stage |
| `POST` | `/api/applications/{app_id}/notes` | Required | `{ body }` | `NoteOut` | Add note |
| `GET` | `/api/applications/{app_id}/notes` | Required | - | `List[NoteOut]` | List notes |
| `PATCH` | `/api/applications/{app_id}/notes/{note_id}` | Required | `{ body }` | `NoteOut` | Update note |
| `DELETE` | `/api/applications/{app_id}/notes/{note_id}` | Required | - | 204 | Delete note |
| `POST` | `/api/applications/{app_id}/attachments/from-document` | Required | `{ document_id, document_type? }` | `AttachmentOut` | Attach existing document |
| `POST` | `/api/applications/{app_id}/attachments` | Required | `multipart/form-data` (file) | `AttachmentOut` | Upload new attachment |
| `GET` | `/api/applications/{app_id}/attachments` | Required | - | `List[AttachmentOut]` | List attachments |
| `GET` | `/api/applications/{app_id}/attachments/{id}/download` | Required | - | File stream | Download attachment |
| `DELETE` | `/api/applications/{app_id}/attachments/{id}` | Required | - | 204 | Delete attachment |

---

### Dashboard

**Prefix:** `/api/dashboard`

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/api/dashboard/metrics` | Required | `{ total_jobs, total_resumes, total_applications, status_breakdown: {}, recent_activity: [] }` | Overview metrics |
| `GET` | `/api/dashboard/insights` | Required | `{ insights: [...], weekly_goal: { target, current, percentage } }` | AI-generated actionable insights |

---

### Analytics

**Prefix:** `/api/analytics`

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/api/analytics` | Required | Query: `range` (1m/3m/6m/1y/all) | `{ overview, applications, interviews, companies, timeline, sources, bestTime }` | Comprehensive analytics |
| `GET` | `/api/analytics/export/csv` | Required | Query: `range` | CSV file download | Export analytics as CSV |
| `GET` | `/api/analytics/export/pdf` | Required | Query: `range` | PDF file download (ReportLab) | Export analytics as PDF |

---

### Documents

**Prefix:** `/api/documents`

| Method | Path | Auth | Request Body / Params | Response | Description |
|--------|------|------|----------------------|----------|-------------|
| `POST` | `/api/documents/upload` | Required | `multipart/form-data` (file, label) | `DocumentResponse` | Upload document (MIME validated) |
| `GET` | `/api/documents/` | Required | Query: `skip`, `limit`, `label`, `status` | `DocumentListResponse` | List documents |
| `GET` | `/api/documents/{id}` | Required | - | `DocumentResponse` | Get single document |
| `DELETE` | `/api/documents/{id}` | Required | - | 204 | Delete document (DB + file) |
| `PUT` | `/api/documents/{id}/status` | Required | `{ status }` | `DocumentResponse` | Update document status |
| `GET` | `/api/documents/{id}/download` | Required | - | File stream | Download document |
| `GET` | `/api/documents/{id}/preview` | Required | - | HTML/text/inline PDF | Preview document |
| `POST` | `/api/documents/{id}/analyze` | Required | `{ job_id? }` | `DocumentAnalysis { score, sections, keywords_found, keywords_missing, suggestions }` | ATS analysis (optional AI) |
| `POST` | `/api/documents/optimize` | Required | `{ document_id, job_id }` | AI optimization result | AI-powered ATS optimization |
| `GET` | `/api/documents/templates/` | None | - | `List[Template]` | List document templates |
| `POST` | `/api/documents/cover-letter/generate` | Required | `{ job_id, resume_id?, tone?, additional_info? }` | Generated cover letter | AI cover letter generation |
| `GET` | `/api/documents/health/missing-files` | Required | - | `{ missing: [...] }` | Check for missing physical files |
| `POST` | `/api/documents/cleanup/orphaned` | Required | - | `{ archived: int }` | Archive docs with missing files |

---

### Preferences

**Prefix:** `/api/preferences`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `GET` | `/api/preferences` | Required | - | `List[PreferenceOut]` | Get all preferences |
| `GET` | `/api/preferences/{key}` | Required | - | `PreferenceOut` | Get single preference |
| `POST` | `/api/preferences` | Required | `{ key, value }` | `PreferenceOut` | Create/update (upsert) |
| `PUT` | `/api/preferences/{key}` | Required | `{ value }` | `PreferenceOut` | Update existing (strict) |
| `DELETE` | `/api/preferences/{key}` | Required | - | 204 | Delete preference |

---

### AI

**Prefix:** `/api/ai`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `POST` | `/api/ai/extract` | None | `{ url?, html?, text?, json_ld? }` | `ExtractOut { title, company, location, ... }` | Extract job data from web page using LLM |

---

### Feedback

**Prefix:** `/api`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `POST` | `/api/feedback` | None | `multipart/form-data` (category, message, email?, screenshot?) | `{ message }` | Submit beta feedback |

---

### Errors (Client Logging)

**Prefix:** `/api/errors`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `POST` | `/api/errors/log` | Optional | `{ message, level?, source?, stack_trace?, url?, user_agent?, metadata? }` | `{ logged: true }` | Log frontend/extension errors |

---

### WebSocket

**Prefix:** `/api/ws`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `WS` | `/api/ws/updates` | Required (token query param or cookie) | Real-time updates. Connect with `?token=<ws_ticket>` |

---

### Reminders & Google Calendar

**Prefix:** `/api/calendars/reminders` and `/api/calendars`

| Method | Path | Auth | Request Body / Params | Response | Description |
|--------|------|------|----------------------|----------|-------------|
| `POST` | `/api/calendars/reminders/` | Required | `ReminderCreate { title, due_date, description?, application_id?, event_type?, email_notifications_enabled?, notification_schedule?, google_event_id?, ai_prep_tips_enabled? }` | `ReminderResponse` | Create reminder (syncs to Google Cal, sends email, generates AI prep tips for premium) |
| `GET` | `/api/calendars/reminders/` | Required | - | `List[ReminderResponse]` | List all reminders |
| `PATCH` | `/api/calendars/reminders/{id}` | Required | Partial fields | `ReminderResponse` | Update reminder |
| `DELETE` | `/api/calendars/reminders/{id}` | Required | - | 204 | Delete reminder |
| `GET` | `/api/calendars/reminders/{id}/notes` | Required | - | `List[ReminderNoteOut]` | List reminder notes |
| `POST` | `/api/calendars/reminders/{id}/notes` | Required | `{ body }` | `ReminderNoteOut` | Create reminder note |
| `PUT` | `/api/calendars/reminder-notes/{note_id}` | Required | `{ body }` | `ReminderNoteOut` | Update reminder note |
| `DELETE` | `/api/calendars/reminder-notes/{note_id}` | Required | - | 204 | Delete reminder note |
| `GET` | `/api/calendars/google/check-connection` | Required | - | `{ connected: bool, email? }` | Check Google Calendar connection |
| `GET` | `/api/calendars/google/events` | Required | Query: `time_min?, time_max?, max_results?` | `List[GoogleEvent]` | List Google Calendar events |
| `POST` | `/api/calendars/reminders/import-google-event` | Required | `{ event_id }` | `ReminderResponse` | Import Google Calendar event as reminder |

---

### Profile

**Prefix:** `/api/profile`

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `GET` | `/api/profile/` | Required | - | Profile object (preferred_locations, country, remote_preference, target_roles, target_industries, experience_level, skills, career_goals) | Get user profile |
| `PUT` | `/api/profile/` | Required | `ProfileRequest { preferred_locations, current_location, country, remote_preference, target_roles, target_industries, experience_level, career_goals, core_skills, learning_goals, years_experience, job_search_status, availability, currency }` | Updated profile | Create or update profile (upsert) |
| `DELETE` | `/api/profile/` | Required | - | `{ message }` | Delete profile only (keeps account) |
| `GET` | `/api/profile/export` | Required | - | Full data export JSON (GDPR Article 20) | Export all user data |
| `GET` | `/api/profile/completeness` | Required | - | `{ is_complete: bool, completeness_percentage: int, message: str }` | Profile completeness check (75% threshold for AI features) |
| `DELETE` | `/api/profile/account` | Required | `{ password?, confirmation?: "DELETE" }` | `{ message, deleted_user_id, deletion_timestamp }` | **PERMANENT** account deletion (GDPR Article 17). Password required for non-OAuth users |
| `GET` | `/api/profile/job-preferences` | Required | - | `{ company_size, company_stage, company_culture, team_size, management_interest }` | Get job preferences (placeholder) |
| `PUT` | `/api/profile/job-preferences` | Required | Dict of preferences | `{ message }` | Update job preferences (placeholder, not persisted) |
| `GET` | `/api/profile/career-goals` | Required | - | `{ short_term_goals, long_term_goals, career_path }` | Get career goals |
| `PUT` | `/api/profile/career-goals` | Required | Dict of goals | `{ message }` | Update career goals (placeholder, not persisted) |
| `GET` | `/api/profile/welcome-modal-status` | Required | - | `{ has_seen_welcome_modal: bool, welcome_modal_seen_at: datetime? }` | Check welcome modal status |
| `POST` | `/api/profile/welcome-modal-seen` | Required | - | `{ message, has_seen_welcome_modal, welcome_modal_seen_at }` | Mark welcome modal as seen |

---

### Admin

**Prefix:** `/api/admin` - All endpoints require **admin role** (`get_admin_user` dependency).

#### Admin Dashboard (`/api/admin/dashboard`)

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Admin | `DashboardStatsDTO { total_users, new_today, new_this_week, premium_users, verified_users, total_applications, active_sessions, recent_errors }` | Dashboard statistics |
| `GET` | `/api/admin/dashboard/activity` | Admin | `List[ActivityEventDTO]` (Query: `limit`, max 100) | Recent activity feed |
| `GET` | `/api/admin/dashboard/charts` | Admin | `DashboardChartsDTO { daily_signups, daily_applications, daily_errors }` (7-day series) | Chart data |

#### Admin Users (`/api/admin/users`)

| Method | Path | Auth | Params / Body | Response | Description |
|--------|------|------|--------------|----------|-------------|
| `GET` | `/api/admin/users/` | Admin | Query: `page`, `page_size`, `search`, `role`, `is_premium`, `email_verified` | `PaginatedUsersDTO { items: List[UserSummaryDTO], total, page, page_size, total_pages }` | List users with filtering |
| `GET` | `/api/admin/users/{user_id}` | Admin | - | `UserDetailDTO { id, email, full_name, role, is_premium, avatar_url, statistics: { applications_count, jobs_count, documents_count, activity_count } }` | Get user details |
| `DELETE` | `/api/admin/users/{user_id}` | Admin | - | `{ success, message, deleted_user_id }` | Delete user (prevents self-deletion) |
| `PATCH` | `/api/admin/users/{user_id}/premium` | Admin | `{ subscription_plan, subscription_status, subscription_ends_at? }` | `{ success, message, user_id, subscription_plan, subscription_status }` | Change subscription |
| `PATCH` | `/api/admin/users/{user_id}/role` | Admin | `{ role: "user"|"admin" }` | `{ success, message, user_id, old_role, new_role }` | Change user role |
| `POST` | `/api/admin/users/{user_id}/revoke-sessions` | Admin | - | `{ success, message, user_id, sessions_revoked: int }` | Force logout (revoke all sessions) |
| `GET` | `/api/admin/users/{user_id}/applications` | Admin | Query: `limit` (default 50) | `List[UserApplicationDTO]` | Get user's applications |
| `GET` | `/api/admin/users/{user_id}/jobs` | Admin | Query: `limit` (default 50) | `List[UserJobDTO]` | Get user's saved jobs |
| `GET` | `/api/admin/users/{user_id}/activity` | Admin | Query: `limit` (default 50) | `List[ActivityEventDTO]` | Get user's activity |
| `GET` | `/api/admin/users/{user_id}/bans` | Admin | - | `List[BanInfo]` | Get user's ban history |

#### Admin Bans (`/api/admin`)

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| `POST` | `/api/admin/users/ban` | Admin | `{ user_id, reason?, ban_ip?: true, ban_duration_days?: null(permanent) }` | `BanOperationResponse { success, message, email_ban_id, ip_ban_id }` | Ban user (email + optional IP) |
| `POST` | `/api/admin/users/unban` | Admin | `{ user_id }` | `BanOperationResponse` | Unban user (removes all bans) |
| `GET` | `/api/admin/bans` | Admin | Query: `active_only` (default true), `entity_type` (email/ip) | `BanListResponse { bans: List[BanInfo], total, active_count, inactive_count }` | List all bans |
| `POST` | `/api/admin/bans/email` | Admin | `{ email, reason?, ban_duration_days? }` | `BanOperationResponse` | Ban email address directly |
| `POST` | `/api/admin/bans/ip` | Admin | `{ ip_address, reason?, ban_duration_days? }` | `BanOperationResponse` | Ban IP address directly |
| `DELETE` | `/api/admin/bans/email` | Admin | `{ email }` | `BanOperationResponse` | Unban email |
| `DELETE` | `/api/admin/bans/ip` | Admin | `{ ip_address }` | `BanOperationResponse` | Unban IP |

#### Admin Errors (`/api/admin/errors`)

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/api/admin/errors/` | Admin | Query: `page`, `page_size`, `level` (ERROR/CRITICAL/WARNING), `user_id`, `endpoint`, `hours` | `PaginatedErrorsDTO` | List error logs with filtering |
| `GET` | `/api/admin/errors/summary` | Admin | - | `ErrorSummaryDTO { total_errors, critical_count, error_count, warning_count, errors_today, errors_this_week }` | Error statistics |
| `GET` | `/api/admin/errors/{log_id}` | Admin | - | Full error detail with metadata, stack traces, user info | Error detail |

#### Admin Sessions (`/api/admin/sessions`)

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/api/admin/sessions/` | Admin | Query: `page`, `page_size`, `user_id`, `active_only` (default true) | `PaginatedSessionsDTO { items: List[SessionDTO], total, page, page_size, total_pages }` | List sessions |
| `GET` | `/api/admin/sessions/stats` | Admin | - | `SessionStatsDTO { total_active, expiring_soon, expired_uncleaned }` | Session statistics |
| `DELETE` | `/api/admin/sessions/{session_id}` | Admin | - | `{ success, message, session_id, user_id }` | Revoke specific session |

#### Admin System (`/api/admin/system`)

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/api/admin/system/database` | Admin | `DatabaseHealthDTO { total_size_mb, table_count, connection_pool_size, active_connections, users_count, applications_count, jobs_count, logs_count, sessions_count }` | Database health metrics |
| `GET` | `/api/admin/system/storage` | Admin | `StorageUsageDTO { total_documents, total_size_mb, documents_by_user, avatars_count }` | Storage usage |
| `GET` | `/api/admin/system/api` | Admin | `APIHealthDTO { status: "healthy"|"degraded"|"down", uptime_seconds, requests_last_hour, errors_last_hour, avg_response_time_ms }` | API health status |

#### Admin LLM Usage (`/api/admin/llm-usage`)

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/api/admin/llm-usage/stats` | Admin | Query: `hours` (default 24, null for all-time) | `LLMUsageStatsDTO { total_calls, success_count, failure_count, total_cost, total_tokens, avg_response_time_ms, by_endpoint, by_model }` | LLM usage statistics |
| `GET` | `/api/admin/llm-usage/` | Admin | Query: `page`, `page_size`, `endpoint`, `usage_type`, `user_id`, `success_only`, `hours` | `PaginatedLLMUsageDTO` | List individual LLM calls |

#### Admin Security (`/api/admin/security`)

| Method | Path | Auth | Params | Response | Description |
|--------|------|------|--------|----------|-------------|
| `GET` | `/api/admin/security/stats` | Admin | Query: `hours` (default 24) | `SecurityStatsDTO { failed_logins, rate_limit_violations, token_revocations, suspicious_activity, blocked_ips, account_lockouts }` | Security statistics |
| `GET` | `/api/admin/security/events` | Admin | Query: `hours`, `event_type` (failed_login/rate_limit_exceeded/token_revoked/suspicious_activity), `page`, `page_size` | Paginated security events | Security event timeline |

---

## 5. Config / Environment Variables

Key settings from `config.py` `Settings` class:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg2://jobflow:jobflow@pg:5432/jobflow` | PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `SECRET_KEY` | (generated) | JWT signing secret |
| `JWT_SECRET_KEY` | (generated) | Separate JWT secret |
| `REFRESH_TOKEN_SECRET_KEY` | (generated) | Refresh token secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `ENVIRONMENT` | `development` | Environment mode |
| `ALLOWED_ORIGINS` | `""` | CORS origins (comma-separated) |
| `SMTP_HOST` | `maildev` | Email SMTP host |
| `SMTP_PORT` | `1025` | Email SMTP port |
| `SMTP_USER` / `SMTP_PASS` | `""` | SMTP credentials |
| `FROM_EMAIL` | `noreply@localhost` | Sender email |
| `OPENAI_API_KEY` | `""` | OpenAI API key for AI features |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `""` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `""` | Google OAuth callback URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend base URL |
| `UPLOAD_DIR` | `uploads` | File upload directory |
| `MAX_UPLOAD_SIZE` | `10485760` (10MB) | Max upload file size |

---

## 6. Infrastructure Summary

### Domain Layer (`domain/`)
Business logic services organized by resource:
- `admin/` - AdminService, DashboardService, SecurityService, LLMService, UserService, DTOs
- `analytics/` - AnalyticsService
- `applications/` - ApplicationService
- `auth/` - OAuthService, DTOs, Ports
- `documents/` - DocumentService
- `jobs/` - JobService
- `reminders/` - ReminderService

### Infrastructure Layer (`infra/`)
| Directory | Purpose |
|-----------|---------|
| `cache/` | Redis caching utilities |
| `external/` | Third-party API clients |
| `extractors/` | Job data extraction from HTML |
| `files/` | File storage and management |
| `http/` | HTTP client, IP resolution (`get_client_ip`) |
| `logging/` | Structured logging, DB log handler |
| `middleware/` | Custom middleware (logging, rate limiting, security headers) |
| `notifications/` | Email service (SMTP, templates) |
| `parsing/` | Document parsing (PDF, DOCX) |
| `repositories/` | Data access layer |
| `search/` | Search utilities |
| `security/` | Password hashing, JWT, ban service, rate limiting |
| `workers/` | Background task workers |

### Scripts (`scripts/`)
| Script | Purpose |
|--------|---------|
| `make_admin.py` | Promote a user to admin role |
| `test_react_email.py` | Test email template rendering |
