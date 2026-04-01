# Applytide - Full Technical Architecture & Stack Summary

## 1. High-Level Architecture

**Pattern:** Microservices / Docker Compose multi-container architecture with a **reverse proxy** fronting all traffic.

| Container | Role | Port |
|---|---|---|
| `applytide_nginx` | Reverse proxy, TLS termination, rate limiting | 80 / 443 |
| `applytide_api` | REST API + WebSocket server | 8000 (internal) |
| `applytide_web` | Static frontend (Vite/React SPA) | 3000 (internal) |
| `applytide_worker` | Background job runner (reminders, emails) | - |
| `applytide_email_service` | Email HTML rendering micro-service | 3001 (internal) |
| `applytide_pg` | Primary relational database | 5432 (internal) |
| `applytide_redis` | Cache, rate-limit counters, session state | 6379 (internal) |
| `applytide_maildev` | Dev-only SMTP mock + web UI | 1025 / 1080 |

All containers communicate over a single Docker bridge network (`applytide_network`). Named volumes persist data for Postgres (`pgdata`), Redis (`redis_data`), uploaded documents (`documents`), and application attachments (`attachments`).

---

## 2. Backend (Python / FastAPI)

### Runtime & Framework

| Item | Version |
|---|---|
| **Language** | Python 3.11 (slim Docker base) |
| **Web Framework** | FastAPI >= 0.104.1 |
| **ASGI Server** | Uvicorn (standard) >= 0.24.0 behind **Gunicorn 21.2.0** (2 UvicornWorkers, 300 s timeout) |
| **ORM** | SQLAlchemy (sync mode, `pool_pre_ping=True`, `future=True`) |
| **Migrations** | Alembic |
| **Validation** | Pydantic v2 (ships with FastAPI) |

### Backend Architecture - Layered / Hexagonal

```
app/
├── api/            ← Presentation layer (routers, schemas, deps)
│   ├── routers/    ← FastAPI routers: auth, jobs, applications, documents,
│   │                  profile, preferences, analytics, dashboard, reminders,
│   │                  ws (WebSocket), ai, feedback, admin, errors
│   ├── schemas/    ← Pydantic request/response models
│   └── deps/       ← Dependency injection (auth, document service, etc.)
│
├── domain/         ← Business logic (pure Python, no framework imports)
│   ├── admin/      ← Admin dashboard, user mgmt, LLM usage, security services
│   ├── analytics/  ← Activity / application / company / interview / timeline metrics
│   ├── applications/ ← Application CRUD, stages, notes, attachments (DTOs + ports)
│   ├── auth/       ← OAuth service, DTOs, ports
│   ├── documents/  ← CRUD, upload, analysis, LLM analysis, generation, preview
│   ├── jobs/       ← Job CRUD, extraction orchestrator (DOM / JSON-LD / LLM)
│   └── reminders/  ← Reminder CRUD, DTOs, ports
│
├── infra/          ← Infrastructure implementations
│   ├── cache/      ← Redis client, service, stats
│   ├── external/   ← OpenAI LLM, Google Calendar, Google OAuth, LLM tracker
│   ├── extractors/ ← PDF extractor, text extractor
│   ├── files/      ← Document store, attachment store, storage stats
│   ├── http/       ← Client IP detection, HTTP client, middleware (rate limit, security headers)
│   ├── logging/    ← Structured logging (JSON prod / pretty dev), file rotation, DB handler
│   ├── middleware/  ← Request logging middleware
│   ├── notifications/ ← Email service, renderer, templates
│   ├── parsing/    ← DOM title/company extraction, HTML main content, structured job (JSON-LD)
│   ├── repositories/ ← SQLAlchemy repository implementations (analytics, applications, jobs, oauth, reminders)
│   ├── search/     ← Full-text search, search gateway
│   ├── security/   ← Ban service, passwords (bcrypt), rate limiter, JWT tokens
│   └── workers/    ← Background workers (reminders runner, reminder email worker)
│
├── db/             ← Database layer
│   ├── models.py   ← 20 SQLAlchemy ORM models
│   ├── session.py  ← Engine + SessionLocal factory
│   ├── base.py     ← Declarative base
│   └── migrations/ ← Alembic migration scripts
│
├── config.py       ← Centralized settings (env-var driven)
└── main.py         ← FastAPI app creation, middleware stack, router registration
```

### Key Backend Dependencies

| Library | Version | Purpose |
|---|---|---|
| fastapi | >= 0.104.1 | Web framework |
| uvicorn[standard] | >= 0.24.0 | ASGI server |
| gunicorn | 21.2.0 | Process manager |
| SQLAlchemy | latest | ORM |
| alembic | latest | Database migrations |
| psycopg2-binary | latest | PostgreSQL driver |
| redis | >= 5.0.0 | Redis client |
| slowapi | >= 0.1.9 | Per-endpoint rate limiting |
| passlib[bcrypt] | >= 1.7.4 | Password hashing |
| bcrypt | 3.2.2 | Bcrypt backend |
| python-jose[cryptography] | >= 3.3.0 | JWT tokens |
| python-dotenv | >= 1.0.0 | Environment variables |
| httpx | 0.27.2 | Async HTTP client |
| openai | 1.40.0 | OpenAI LLM API |
| beautifulsoup4 | latest | HTML parsing |
| lxml | latest | XML/HTML parser |
| extruct | >= 0.16.0 | Structured data extraction (JSON-LD) |
| readability-lxml | >= 0.8.1 | Article content extraction |
| PyPDF2 | 3.0.1 | PDF reading |
| pdfplumber | 0.10.3 | PDF text extraction |
| PyMuPDF | 1.23.8 | PDF rendering |
| pypdf | latest | PDF utilities |
| python-docx | latest | DOCX parsing |
| reportlab | >= 4.0.0 | PDF generation |
| html2docx | >= 1.1.0 | HTML to DOCX conversion |
| python-magic | 0.4.27 | MIME type detection |
| nltk | 3.8.1 | Natural language processing |
| scikit-learn | latest | TF-IDF, similarity scoring |
| numpy | >= 1.24.0 | Numerical computation |
| pandas | >= 2.0.0 | Data manipulation |
| scipy | >= 1.10.0 | Statistical functions |
| faker | >= 20.0.0 | Test data generation |
| apscheduler | >= 3.10.0 | Background task scheduling |
| google-auth | latest | Google authentication |
| google-auth-oauthlib | latest | Google OAuth flow |
| google-api-python-client | latest | Google APIs |
| pyotp | >= 2.9.0 | TOTP 2FA |
| qrcode[pil] | >= 7.4.2 | QR code generation |
| python-multipart | latest | Multipart form uploads |
| email-validator | >= 1.1.3 | Email validation |
| w3lib | >= 2.1.2 | URL normalization |
| anyio | latest | Async compatibility |

### Worker-Only Dependencies

| Library | Version | Purpose |
|---|---|---|
| playwright | >= 1.40.0 | Headless Chromium browser (PDF rendering) |
| weasyprint | >= 60.1 | HTML to PDF rendering |

---

## 3. Database - PostgreSQL 16 (Alpine)

### ORM Models (20 total)

| Model | Purpose |
|---|---|
| `User` | Account (email, name, avatar, subscription, OAuth, 2FA, preferences) - 46 columns |
| `UserProfile` | Career preferences (target roles, industries, skills, experience) |
| `OAuthToken` | Google OAuth tokens (access, refresh, scopes, expiry) |
| `Company` | Company records (name, logo, location, industry, size) |
| `Job` | Saved job listings (title, company, URL, description, salary, requirements) |
| `Resume` | Uploaded documents (resumes, cover letters, PDFs) |
| `Application` | Job applications with status pipeline |
| `Stage` | Pipeline stage history per application |
| `Note` | Application notes |
| `MatchResult` | AI-computed resume-job match scores |
| `ApplicationAttachment` | File attachments linked to applications |
| `RefreshToken` | JWT refresh token tracking |
| `EmailAction` | Email verification & password reset tokens |
| `Reminder` | Scheduled reminders with recurrence, Google Calendar sync |
| `ReminderNote` | Notes attached to reminders |
| `UserPreferences` | User settings (language, theme, notifications) |
| `ApplicationLog` | Application timeline/activity log |
| `LLMUsage` | OpenAI API call tracking (model, tokens, cost) |
| `BannedEntity` | IP/email/domain ban records for security |

### Data Conventions

- All IDs are **UUIDs** (PostgreSQL `UUID` type)
- Timestamps use `DateTime(timezone=True)` with UTC
- JSON/JSONB columns for structured data (skills lists, requirements, etc.)
- Soft delete via `deleted_at` / `deletion_scheduled_at` on User model

---

## 4. Authentication & Security

| Feature | Implementation |
|---|---|
| **Auth method** | JWT (access + refresh tokens) in **HttpOnly cookies** |
| **Access token TTL** | 15 minutes (configurable) |
| **Refresh token TTL** | 1 day dev / 7 days prod (extendable to 30 days) |
| **Password hashing** | bcrypt 3.2.2 via passlib |
| **OAuth** | Google OAuth 2.0 (google-auth, google-auth-oauthlib) |
| **2FA** | TOTP via pyotp >= 2.9.0, QR codes via qrcode[pil] >= 7.4.2 |
| **Rate limiting** | SlowAPI >= 0.1.9 (per-endpoint) + custom GlobalRateLimitMiddleware (Redis-backed) |
| **Security headers** | Custom SecurityHeadersMiddleware (CSP, HSTS, X-Frame-Options, etc.) |
| **Cookie settings** | SameSite=Lax, Secure flag configurable per environment |
| **Proxy trust** | ProxyHeadersMiddleware (Starlette/Uvicorn) |
| **Trusted hosts** | TrustedHostMiddleware |
| **Ban system** | IP/email/domain ban service with BannedEntity model |

---

## 5. AI / LLM Integration

| Item | Detail |
|---|---|
| **Provider** | OpenAI (openai == 1.40.0) |
| **Default model** | gpt-4.1-mini (configurable via `JOB_EXTRACT_MODEL` env var) |
| **Use cases** | Job extraction from HTML, resume analysis, cover letter generation, interview preparation |
| **Cost tracking** | LLMUsage model tracks every call (model, prompt/completion tokens, cost) |

### Job Extraction Pipeline (3-stage)

1. **JSON-LD / Schema.org** - `extruct` >= 0.16.0 parses structured data from HTML
2. **DOM parsing** - BeautifulSoup4 + lxml + readability-lxml for main content extraction
3. **LLM fallback** - OpenAI for intelligent field inference when structured data is insufficient

### Document Processing

| Library | Use |
|---|---|
| PyPDF2 3.0.1, pdfplumber 0.10.3, PyMuPDF 1.23.8, pypdf | PDF text extraction & reading |
| python-docx | DOCX parsing |
| reportlab >= 4.0.0 | PDF generation |
| html2docx >= 1.1.0 | HTML to DOCX conversion |
| python-magic 0.4.27 | MIME type detection |

---

## 6. Background Workers

- **APScheduler** >= 3.10.0 - in-process scheduler (BackgroundScheduler) in the API container
- **Worker container** (`applytide_worker`) - runs `reminders_runner.py` for reminder email processing
- Worker uses **Playwright** >= 1.40.0 (Chromium) and **WeasyPrint** >= 60.1 for PDF rendering

---

## 7. Caching

- **Redis 7** (Alpine) with password authentication
- Backend Redis used for rate-limit counters, session state, and cache service
- Frontend `apiFetch` wrapper caches `GET` responses for 5 minutes (in-memory `Map`)

---

## 8. Real-time Communication

- **WebSocket** endpoint at `/api/ws/*` (native FastAPI/Starlette WebSocket support)
- Token-based authentication (cookie or query param)
- Per-user connection tracking
- Targeted and broadcast messaging
- Automatic cleanup of dead connections

---

## 9. Logging

- **Structured logging** - JSON format in production, pretty-print in development
- **Multi-handler** - Console, rotating file (100 MB max / 30 backups), optional database logging
- **Request correlation IDs** for distributed tracing
- **Security audit logging** to separate file
- **Slow request warnings** - threshold configurable (default 1 s)

---

## 10. Frontend (`newfront/`)

### Core Stack

| Item | Version |
|---|---|
| **Bundler** | Vite ^6.0.0 + @vitejs/plugin-react ^4.3.0 |
| **Language** | TypeScript ^5.7.0 (strict mode, ES2020 target, bundler module resolution) |
| **React** | ^18.3.1 |
| **Routing** | react-router-dom ^6.28.0 (client-side SPA, v7 flags enabled) |
| **Styling** | Tailwind CSS **v4** (^4.0.0) via @tailwindcss/vite plugin, CSS-native config (`@import "tailwindcss"`) |
| **Animation** | motion ^11.15.0 (Framer Motion successor) |
| **Toast** | Sonner ^2.0.3 |
| **Icons** | Lucide React ^0.487.0 |
| **Dates** | date-fns ^3.6.0 |
| **Charts** | Recharts ^2.15.2 |
| **Forms** | react-hook-form ^7.55.0 |
| **Effects** | canvas-confetti ^1.9.3 |
| **Drag & Drop** | @dnd-kit/core ^6.3.1, @dnd-kit/sortable ^10.0.0, @dnd-kit/utilities ^3.2.2 |
| **Carousel** | embla-carousel-react ^8.6.0 |
| **Resizable panels** | react-resizable-panels ^2.1.7 |
| **OTP input** | input-otp ^1.4.2 |
| **Date picker** | react-day-picker ^8.10.1 |
| **Bottom drawer** | vaul ^1.1.2 |
| **Command palette** | cmdk ^1.1.1 |
| **Utility** | clsx ^2.1.1, tailwind-merge ^2.6.0, class-variance-authority ^0.7.1 |

### UI Component Library - shadcn/ui (Radix UI primitives)

48 component files in `components/ui/`, all built on Radix UI:

| Radix Primitive | Version |
|---|---|
| @radix-ui/react-dialog | ^1.1.6 |
| @radix-ui/react-dropdown-menu | ^2.1.6 |
| @radix-ui/react-select | ^2.1.6 |
| @radix-ui/react-popover | ^1.1.6 |
| @radix-ui/react-tabs | ^1.1.3 |
| @radix-ui/react-tooltip | ^1.1.8 |
| @radix-ui/react-checkbox | ^1.1.4 |
| @radix-ui/react-switch | ^1.1.3 |
| @radix-ui/react-accordion | ^1.2.3 |
| @radix-ui/react-alert-dialog | ^1.1.6 |
| @radix-ui/react-avatar | ^1.1.3 |
| @radix-ui/react-collapsible | ^1.1.3 |
| @radix-ui/react-context-menu | ^2.2.6 |
| @radix-ui/react-hover-card | ^1.1.6 |
| @radix-ui/react-label | ^2.1.2 |
| @radix-ui/react-menubar | ^1.1.6 |
| @radix-ui/react-navigation-menu | ^1.2.5 |
| @radix-ui/react-progress | ^1.1.2 |
| @radix-ui/react-radio-group | ^1.2.3 |
| @radix-ui/react-scroll-area | ^1.2.3 |
| @radix-ui/react-separator | ^1.1.2 |
| @radix-ui/react-slider | ^1.2.3 |
| @radix-ui/react-slot | ^1.1.2 |
| @radix-ui/react-toggle | ^1.1.2 |
| @radix-ui/react-toggle-group | ^1.1.2 |
| @radix-ui/react-aspect-ratio | ^1.1.2 |

### Frontend Architecture (newfront)

```
newfront/
├── App.tsx           ← Root: BrowserRouter, providers, route definitions
├── main.tsx          ← Entry point: createRoot, mount
├── pages/            ← Route-level page components (14 page groups)
│   ├── auth/         ← SignIn, SignUp, ForgotPassword, ResetPassword, GoogleCallback
│   ├── dashboard/    ← Main dashboard with metrics
│   ├── jobs/         ← Job search & saved jobs
│   ├── pipeline/     ← Kanban application pipeline
│   ├── documents/    ← Document management
│   ├── analytics/    ← Application analytics & charts
│   ├── reminders/    ← Reminder management
│   ├── profile/      ← Profile & settings (personal info, notifications, security, danger zone)
│   ├── admin/        ← Admin panel (dashboard, users, errors, LLM usage, security, sessions, system)
│   ├── pricing/      ← Subscription plans
│   ├── legal/        ← Terms, Privacy, Copyright, Cookies
│   ├── company/      ← Contact, About, Accessibility
│   └── home/         ← Landing page
│
├── features/         ← Feature-scoped API clients (one per domain)
│   ├── admin/api.ts
│   ├── analytics/api.ts
│   ├── applications/api.ts
│   ├── dashboard/api.ts
│   ├── documents/api.ts
│   ├── jobs/api.ts
│   ├── profile/api.ts
│   └── reminders/api.ts
│
├── components/       ← Shared components
│   ├── ui/           ← 48 shadcn/ui primitive components
│   ├── layout/       ← PageContainer, Navbar, Footer, Sidebar, PageTransition
│   ├── guards/       ← AuthGuard, AdminGuard
│   ├── auth/         ← GoogleLoginButton
│   ├── shared/       ← LoadingSpinner, SkeletonLoader, etc.
│   ├── onboarding/   ← WelcomeModal, onboarding flows
│   ├── feedback/     ← Feedback components
│   ├── premium/      ← Premium feature gates
│   └── ...           ← admin, analytics, pricing, legal, gamification, help, etc.
│
├── contexts/         ← React Context providers
│   ├── AuthContext.tsx   ← Auth state, login/logout, token refresh
│   └── LanguageContext.tsx ← i18n (English + Hebrew)
│
├── hooks/            ← Custom React hooks (analytics unlock, card tilt, scroll, window size)
├── lib/              ← Core utilities
│   ├── api/core.ts   ← apiFetch (auto token refresh, 5-min GET cache, cookie credentials)
│   ├── api/websocket.ts ← WebSocket client
│   ├── routes.ts     ← Route path constants
│   ├── theme.ts      ← Dark mode management
│   └── toast.tsx     ← Toast utilities
│
├── styles/globals.css ← Tailwind v4 CSS-native config, CSS variables, dark mode, RTL support
├── constants/        ← Countries, phone codes, etc.
├── types/            ← Shared TypeScript interfaces
└── utils/            ← Utility functions
```

### i18n

- **Bilingual** - English (LTR) and Hebrew (RTL)
- Language switching via `LanguageContext`
- RTL support via CSS custom variant: `@custom-variant rtl (:root[dir="rtl"] &)`

### Theming

- **Dark mode** - class-based toggling (`.dark` on root)
- CSS custom properties for all design tokens in both light/dark
- Brand colors: `#9F5F80` (primary/accent), `#383e4e` (dark), `#b6bac5` (muted)

---

## 12. Email Service (Node.js micro-service)

| Item | Version |
|---|---|
| **Runtime** | Node.js 20 Alpine |
| **Framework** | Express ^4.21.1 |
| **Template engine** | React Email (@react-email/components ^0.5.7, @react-email/render ^1.4.0) |
| **React** | ^18.3.1 (server-side rendering of email templates) |

Renders HTML emails from React components, called internally by the Python backend's email service over HTTP on port 3001.

---

## 13. Chrome Extension

| Item | Detail |
|---|---|
| **Manifest** | v3 (MV3) |
| **Version** | 1.3.0 |
| **Architecture** | Service Worker (`background.js`) + Popup (`popup.html/js`) + Content Script (`site-bridge.js`) |
| **Content parsing** | Readability.js (Mozilla) for article extraction |
| **Permissions** | `activeTab`, `scripting`, `tabs`, `alarms`, `windows` |
| **Host permissions** | `http://localhost/*` + optional `https://*/*` |

Extracts job postings from any website and saves them to the user's Applytide account via the API.

---

## 14. Reverse Proxy - Nginx

| Item | Version |
|---|---|
| **Image** | nginx:1.27-alpine |
| **Routing** | `/api/*` → backend:8000, `/api/ws/*` → backend:8000 (WebSocket upgrade), `/*` → newfront:3000 |
| **Rate limiting** | `limit_req_zone` 10 r/s per IP |
| **Upload limit** | 8 MB (`client_max_body_size`) |
| **WebSocket** | `proxy_http_version 1.1`, `Upgrade` / `Connection` headers |
| **Timeouts** | 120 s proxy read/send, 600 s for WebSocket |
| **Security** | `server_tokens off` (hides version) |

---

## 15. DevOps

| Item | Detail |
|---|---|
| **Containerization** | Docker Compose (`docker-compose.yml`) |
| **Logging** | JSON file driver, 10 MB max, 3 file rotation (all containers) |
| **Health check** | `GET /health` - verifies Postgres + Redis connectivity |
| **Dev SMTP** | MailDev (web UI on port 1080, SMTP on 1025) |

---

## 16. API Design

- **REST** with resource-based URLs under `/api/`
- **WebSocket** at `/api/ws/`
- **Auth** - Cookie-based JWT (HttpOnly, SameSite=Lax)
- **Content-Type** - JSON (`application/json`), multipart for file uploads
- **Error format** - FastAPI default (`{"detail": "..."}`) with HTTP status codes
- **Rate limiting** - Global (1000 req/hr) + per-endpoint (SlowAPI)
- **CORS** - Restricted origins in production, permissive in development
- **ID format** - UUIDs for all entities

### API Routers (14 total)

| Router | Prefix | Domain |
|---|---|---|
| `auth` | `/api/auth` | Login, register, OAuth, password, 2FA, sessions, avatar |
| `jobs` | `/api/jobs` | Job CRUD, search, extraction from URL |
| `applications` | `/api/applications` | Application CRUD, stages, notes, attachments |
| `documents` | `/api/documents` | Upload, download, preview, analysis, generation |
| `profile` | `/api/profile` | User profile + career preferences, data export, account deletion |
| `preferences` | `/api/preferences` | User preferences (theme, language, notifications) |
| `dashboard` | `/api/dashboard` | Dashboard metrics and overview stats |
| `analytics` | `/api/analytics` | Application analytics, timeline, insights |
| `reminders` | `/api/reminders` | Reminder CRUD, notes, Google Calendar sync |
| `ai` | `/api/ai` | Cover letter generation, resume analysis, interview prep |
| `feedback` | `/api/feedback` | User feedback submission |
| `admin` | `/api/admin` | User management, system stats, error logs, LLM usage, security |
| `errors` | `/api/errors` | Client-side error reporting |
| `ws` | `/api/ws` | WebSocket real-time updates |

---

## 17. Middleware Stack (order matters)

1. **ProxyHeadersMiddleware** - trusts `X-Forwarded-*` from Nginx (outermost)
2. **SecurityHeadersMiddleware** - CSP, HSTS, X-Frame-Options, etc.
3. **TrustedHostMiddleware** - restricts allowed `Host` headers
4. **CORSMiddleware** - cross-origin request handling
5. **GlobalRateLimitMiddleware** - Redis-backed global rate limiting (1000 req/hr)
6. **LoggingMiddleware** - request/response logging, correlation IDs, slow request warnings

---

## 18. Key Technical Decisions Summary

| Decision | Choice |
|---|---|
| SPA vs SSR | Migrating from Next.js SSR → Vite SPA (TypeScript) |
| State management | React Context (no Redux) |
| Styling approach | Tailwind CSS (v3 legacy, v4 new) + shadcn/ui components |
| API communication | Custom `apiFetch` wrapper (auto-refresh, caching) - no Axios in new frontend |
| Database | PostgreSQL (relational, JSONB for flexible fields) |
| Caching layer | Redis (server) + in-memory Map (client) |
| Auth strategy | HttpOnly JWT cookies (not localStorage) |
| File storage | Local filesystem (Docker volumes), not cloud storage |
| AI provider | OpenAI GPT (configurable model) |
| Build system | Docker Compose for all environments |
| Backend pattern | Hexagonal / Ports & Adapters |
| Frontend pattern | Feature-sliced with shared UI library |
| Component library | shadcn/ui (copy-paste, not npm dependency) |
| Animation library | motion (Framer Motion successor) |
| i18n approach | Context-based, inline translations (EN + HE) |
