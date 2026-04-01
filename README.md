<p align="center">
  <img src="newfront/public/images/logomark.svg" alt="Applytide Logo" width="80" height="80" />
</p>

<h1 align="center">Applytide</h1>

<p align="center">
  <strong>Enterprise-grade job application tracking platform</strong><br/>
  Organize your job search, track applications, and land your next role — powered by AI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11-blue?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4.1--mini-412991?logo=openai&logoColor=white" alt="OpenAI" />
</p>

---

## Overview

Applytide is a full-stack job application management platform that helps users organize their entire job search lifecycle — from discovering and saving job postings to tracking application status, managing documents, and preparing for interviews.

The platform combines a modern React SPA with a robust Python API backend, AI-powered document analysis, a browser extension for one-click job capture, and a dedicated email microservice — all orchestrated with Docker Compose.

---

## Features

### Application Pipeline
- **Kanban Board** — Drag-and-drop application tracking across customizable stages (Wishlist → Applied → Interview → Offer → Accepted / Rejected)
- **Smart Job Extraction** — Paste any job URL and the AI extracts title, company, location, salary, requirements, and description automatically
- **Notes & Attachments** — Attach files and keep per-application notes

### Documents
- **Resume Management** — Upload, organize, and manage multiple resume versions
- **AI Resume Analysis** — Get instant feedback on your resume with actionable improvement suggestions
- **Cover Letter Generator** — AI-generated cover letters tailored to specific job descriptions
- **Document Preview** — In-app PDF preview and download

### Analytics & Insights
- **Dashboard** — At-a-glance metrics: total applications, response rate, interview rate, offers
- **Charts & Trends** — Visual timeline of application activity, stage distribution, and weekly trends
- **Application Insights** — AI-powered analysis of your job search patterns

### Job Search
- **Job Board Integration** — Search and browse jobs directly within the platform
- **Saved Jobs** — Save interesting positions for later review
- **Quick Apply** — Move saved jobs into your application pipeline with one click

### Chrome Extension
- **One-Click Capture** — Extract job postings from any website with a single click
- **Smart Parsing** — 3-stage extraction pipeline: JSON-LD structured data → DOM parsing → LLM fallback
- **Readability.js** — Mozilla's content extraction library for clean article parsing

### Reminders & Notifications
- **Custom Reminders** — Set follow-up reminders for applications
- **Email Notifications** — Receive beautiful HTML email reminders
- **Google Calendar Sync** — Sync interview dates and reminders to your calendar

### Security & Auth
- **JWT Authentication** — Secure HttpOnly cookie-based sessions
- **Google OAuth 2.0** — One-click Google sign-in
- **Two-Factor Authentication** — TOTP-based 2FA with QR code setup
- **Session Management** — View and revoke active sessions
- **Ban System** — Admin-controlled account suspension with configurable ban types

### Admin Panel
- **User Management** — View, search, and manage all registered users
- **System Monitoring** — Real-time system stats, error logs, and health checks
- **LLM Usage Tracking** — Monitor AI API calls, token usage, and costs per user
- **Security Dashboard** — Session overview, rate limit monitoring, and security events

### Internationalization
- **Bilingual** — Full English and Hebrew support
- **RTL Layout** — Complete right-to-left layout support for Hebrew
- **Dynamic Switching** — Change language on-the-fly with context-aware translations

---

## Architecture

Applytide runs as a multi-container Docker Compose application:

```
┌──────────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)                     │
│                Port 80 / 443 · Rate limiting · SSL               │
└──────┬──────────────────┬──────────────────────┬─────────────────┘
       │                  │                      │
       ▼                  ▼                      ▼
┌──────────────┐  ┌──────────────┐      ┌──────────────────┐
│   Frontend   │  │   Backend    │      │  Email Service   │
│  React SPA   │  │   FastAPI    │      │   Node.js +      │
│  Vite · TS   │  │  Python 3.11 │      │   React Email    │
│  Port 3000   │  │  Port 8000   │      │   Port 3001      │
└──────────────┘  └──────┬───────┘      └──────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
       ┌───────────┐ ┌───────┐ ┌────────┐
       │ PostgreSQL │ │ Redis │ │ Worker │
       │    16      │ │   7   │ │ Celery │
       │ Port 5432  │ │ 6379  │ │  Jobs  │
       └───────────┘ └───────┘ └────────┘
```

| Service | Technology | Purpose |
|---|---|---|
| **nginx** | Nginx 1.27 Alpine | Reverse proxy, TLS termination, rate limiting |
| **web** | React 18.3, Vite 6, TypeScript 5.7 | Single-page application |
| **api** | Python 3.11, FastAPI | REST API, WebSocket, auth, business logic |
| **worker** | Python 3.11, APScheduler | Background jobs, scheduled cleanup, email dispatch |
| **email_service** | Node.js 20, Express, React Email | HTML email rendering |
| **pg** | PostgreSQL 16 Alpine | Primary database (20 models) |
| **redis** | Redis 7 Alpine | Caching, rate limiting, session store |
| **maildev** | MailDev | Dev-only SMTP server with web UI |

---

## Tech Stack

### Backend
| Category | Technologies |
|---|---|
| **Framework** | FastAPI ≥0.104, Pydantic v2, Uvicorn |
| **Database** | SQLAlchemy (sync), Alembic migrations, PostgreSQL 16 |
| **Auth** | python-jose (JWT), bcrypt, pyotp (TOTP 2FA), Google OAuth |
| **AI** | OpenAI API (gpt-4.1-mini), token tracking, budget controls |
| **Cache** | Redis 7 (rate limiting, caching, budget tracking) |
| **Tasks** | APScheduler (background jobs, cleanup, email dispatch) |
| **Email** | SMTP via aiosmtplib, HTML rendering via React Email service |
| **Files** | python-multipart, PyPDF2, python-docx |

### Frontend
| Category | Technologies |
|---|---|
| **Framework** | React 18.3, TypeScript 5.7 (strict mode) |
| **Build** | Vite 6, SWC |
| **Styling** | TailwindCSS 4, CSS variables, dark mode, RTL |
| **Components** | 48 shadcn/ui components (Radix UI primitives) |
| **Animation** | Motion (Framer Motion) |
| **Forms** | react-hook-form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Toasts** | Sonner |

### Infrastructure
| Category | Technologies |
|---|---|
| **Containers** | Docker Compose (dev + prod configs) |
| **Proxy** | Nginx 1.27 (rate limiting, WebSocket, TLS) |
| **Registry** | GitHub Container Registry (ghcr.io) |
| **Backups** | Automated shell scripts with cron scheduling |

---

## Project Structure

```
applytide/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entry point, middleware, scheduler
│   │   ├── config.py           # Environment configuration
│   │   ├── api/                # API layer
│   │   │   ├── routers/        # 14 route modules (auth, jobs, applications, ...)
│   │   │   ├── schemas/        # Pydantic request/response models
│   │   │   └── dependencies/   # FastAPI dependency injection
│   │   ├── domain/             # Business logic & services
│   │   ├── db/                 # SQLAlchemy models & database setup
│   │   └── infra/              # Infrastructure (email, LLM, security, workers)
│   ├── alembic.ini             # Database migration config
│   └── requirements.*.txt      # Separated API & worker dependencies
│
├── newfront/                   # React TypeScript frontend
│   ├── App.tsx                 # Root component, routing, providers
│   ├── pages/                  # 14 page groups
│   ├── features/               # Feature-scoped API clients
│   ├── components/             # Shared & UI components (48 shadcn/ui)
│   ├── contexts/               # Auth & Language providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API client, routing, theme
│   ├── styles/                 # Tailwind config, global styles
│   └── constants/              # Static data (countries, navigation, pricing)
│
├── chrome-extension/           # Browser extension (Manifest V3)
│   ├── background.js           # Service worker
│   ├── popup.html/js           # Extension popup UI
│   ├── site-bridge.js          # Content script for page extraction
│   └── Readability.js          # Mozilla content parser
│
├── backend/emails/             # Email microservice
│   ├── server.js               # Express server
│   └── templates/              # React Email templates
│
├── nginx/                      # Reverse proxy configuration
│   ├── main.conf               # Primary Nginx config
│   └── conf.d/                 # Additional route configs
│
├── scripts/                    # DevOps & backup scripts
│   ├── backup.sh               # Automated PostgreSQL backups
│   ├── restore.sh              # Backup restoration
│   └── setup-backup-cron.sh    # Cron job setup
│
├── docs/                       # Documentation
├── docker-compose.yml          # Development environment
└── docker-compose.prod.yml     # Production environment
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (for frontend development)
- [Python 3.11+](https://www.python.org/) (for backend development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/applytide.git
   cd applytide
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

3. **Start the development environment**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   | Service | URL |
   |---|---|
   | Frontend | [http://localhost](http://localhost) |
   | API Docs (Swagger) | [http://localhost/api/docs](http://localhost/api/docs) |
   | MailDev (dev email) | [http://localhost:1080](http://localhost:1080) |

5. **Run database migrations**
   ```bash
   docker-compose exec api alembic upgrade head
   ```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET_KEY` | Secret key for JWT token signing | Yes |
| `JWT_REFRESH_SECRET_KEY` | Secret key for refresh tokens | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google login |
| `SMTP_HOST` | SMTP server hostname | For emails |
| `SMTP_PORT` | SMTP server port | For emails |
| `SMTP_USER` | SMTP username | For emails |
| `SMTP_PASSWORD` | SMTP password | For emails |
| `STRIPE_SECRET_KEY` | Stripe API key | For payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | For payments |
| `LLM_DAILY_BUDGET_USD` | Daily AI spending limit (default: $50) | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | Production |
| `IMAGE_TAG` | Docker image tag for deployments | Production |

---

## API Overview

The backend exposes 14 RESTful API routers under `/api/`:

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | Email/password login |
| `POST /api/auth/google` | Google OAuth login |
| `GET /api/auth/2fa/setup` | TOTP 2FA setup |
| `GET /api/jobs/search` | Search job listings |
| `POST /api/jobs/extract` | Extract job data from URL |
| `GET /api/applications` | List user's applications |
| `POST /api/applications` | Create new application |
| `PATCH /api/applications/:id/stage` | Update application stage |
| `POST /api/documents/upload` | Upload document (PDF/DOCX) |
| `POST /api/documents/optimize` | AI resume analysis |
| `POST /api/documents/cover-letter/generate` | AI cover letter generation |
| `GET /api/dashboard` | Dashboard metrics |
| `GET /api/analytics` | Application analytics |
| `GET /api/reminders` | List reminders |
| `GET /api/admin/stats` | System statistics (admin) |
| `GET /api/health` | Health check (Postgres + Redis) |
| `WS /api/ws` | WebSocket real-time updates |

Full interactive API documentation is available at `/api/docs` (Swagger UI) when running the development server.

---

## Database Schema

The application uses 20 SQLAlchemy models with PostgreSQL:

| Model | Description |
|---|---|
| `User` | User accounts, auth, roles |
| `UserProfile` | Extended profile & career preferences |
| `UserPreferences` | Theme, language, notification settings |
| `Job` | Job postings (extracted or manual) |
| `Application` | Job applications with stage tracking |
| `ApplicationNote` | Per-application notes |
| `ApplicationAttachment` | File attachments on applications |
| `Document` | Uploaded documents (resumes, cover letters) |
| `DocumentAnalysis` | AI analysis results for documents |
| `Reminder` | Follow-up reminders |
| `ReminderNote` | Notes on reminders |
| `EmailAction` | Email verification & password reset tokens |
| `RefreshToken` | JWT refresh token tracking |
| `ActiveSession` | User session management |
| `UserBan` | Account suspension records |
| `Feedback` | User feedback submissions |
| `ErrorLog` | Client-side error reports |
| `LLMUsageLog` | AI API call tracking (tokens, cost) |
| `SubscriptionPlan` | Available subscription tiers |
| `UserSubscription` | User subscription status |

All entities use **UUIDs** as primary keys. Timestamps are stored in **UTC**. Flexible fields use **JSONB** columns.

---

## Chrome Extension

The Applytide Chrome Extension enables one-click job capture from any website.

**3-Stage Extraction Pipeline:**
1. **JSON-LD** — Checks for structured `JobPosting` schema data
2. **DOM Parsing** — Extracts from page structure (headings, meta tags, known selectors)
3. **LLM Fallback** — Sends page content to OpenAI for intelligent extraction

Install from the `chrome-extension/` directory by loading it as an unpacked extension in Chrome Dev Mode.

See [chrome-extension/README.md](chrome-extension/README.md) for detailed setup instructions.

---

## Development

### Frontend Development
```bash
cd newfront
npm install
npm run dev
```
The frontend dev server runs on port 5173 with hot module replacement.

### Backend Development
```bash
cd backend
pip install -r requirements.api.txt
uvicorn app.main:app --reload --port 8000
```

### Running with Docker
```bash
# Development (with hot reload & MailDev)
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Database Migrations
```bash
# Create a new migration
docker-compose exec api alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec api alembic upgrade head

# Rollback one migration
docker-compose exec api alembic downgrade -1
```

---

## Deployment

### Production Setup

1. Configure production environment variables in `.env`
2. Set up SSL certificates in `nginx/ssl/`
3. Update `docker-compose.prod.yml` with your container registry images
4. Deploy:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Backups

Automated PostgreSQL backup scripts are included:

```bash
# Set up automated daily backups
./scripts/setup-backup-cron.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh <backup-file>

# Check backup status
./scripts/check-backup-status.sh
```

See [scripts/BACKUP_README.md](scripts/BACKUP_README.md) for more details.

---

## Security

- **Authentication** — JWT tokens in HttpOnly cookies (not localStorage)
- **Password hashing** — bcrypt with salt rounds
- **Two-Factor Auth** — TOTP with RFC 6238 compliance
- **Rate Limiting** — Global (1000 req/hr) + per-endpoint limits on AI routes
- **CORS** — Restricted origins in production
- **Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Input Validation** — Pydantic v2 schemas on all endpoints
- **SQL Injection** — SQLAlchemy parameterized queries
- **LLM Budget Controls** — Daily spending cap with Redis-backed tracking
- **Session Management** — Trackable sessions with remote revocation
- **Ban System** — Configurable account suspension (temporary/permanent)

---

## License

This project is proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ by the Applytide team
</p>
