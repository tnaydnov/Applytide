import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from .middleware.security import SecurityHeadersMiddleware
from .middleware.rate_limiting import GlobalRateLimitMiddleware
from .auth.router import router as auth_router
from .jobs.router import router as jobs_router
from .applications.router import router as applications_router
from .ws.router import router as ws_router
from .dashboard.router import router as dashboard_router
from .match.router import router as match_router
from .io.router import router as io_router
from .analytics.router import router as analytics_router
# Search functionality removed - using page-specific searches instead
from .documents.router import router as documents_router
# Enhanced documents API removed - using standard documents router
from .api.profile import router as profile_router  # User Profile Management
from .api.kanban import router as kanban_router  # Kanban/Pipeline Management
from .preferences.router import router as preferences_router  # User Preferences
from .auth.sessions import router as sessions_router
from app.ai.router import router as ai_router
from .tasks.cleanup import cleanup_expired_sessions
from apscheduler.schedulers.background import BackgroundScheduler





raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
# Normalize and extend with common local variants automatically
_norm = set(o.strip().rstrip('/') for o in raw_origins if o.strip())
for extra in ["http://127.0.0.1:3000", "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3001"]:
    _norm.add(extra)

# Add support for Chrome extensions and common job sites
chrome_ext_origins = [
    "https://www.linkedin.com",
    "https://linkedin.com", 
    "https://www.indeed.com",
    "https://indeed.com",
    "https://www.glassdoor.com",
    "https://glassdoor.com"
]
for origin in chrome_ext_origins:
    _norm.add(origin)

ALLOWED_ORIGINS = list(_norm)

app = FastAPI(title="Applytide API")

# Add security middleware
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    )
    # Add global rate limiting in production
    app.add_middleware(
        GlobalRateLimitMiddleware,
        max_requests=int(os.getenv("GLOBAL_RATE_LIMIT_REQUESTS", "1000")),
        window_seconds=int(os.getenv("GLOBAL_RATE_LIMIT_WINDOW", "3600")),
        enabled=True
    )

# Unified CORS configuration.
# Always use explicit origin list from ALLOWED_ORIGINS env to guarantee header reflection.
# If you truly want wildcard in local dev, add '*' to ALLOWED_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"] ,  # be permissive during dev
    expose_headers=["X-Total-Count", "Content-Disposition"],
)

# Debug middleware (safe to keep in dev) to trace CORS behavior
if os.getenv("CORS_DEBUG", "0") == "1":
    from starlette.responses import Response
    @app.middleware("http")
    async def cors_debug_mw(request, call_next):
        origin = request.headers.get('origin')
        if origin:  # Only log when there's an Origin header (CORS request)
            print(f"[CORS-DEBUG] Incoming Origin={origin} Method={request.method} Path={request.url.path}")
        resp: Response = await call_next(request)
        if origin:
            acao = resp.headers.get('access-control-allow-origin')
            print(f"[CORS-DEBUG] Outgoing ACAO={acao} Status={resp.status_code} Path={request.url.path}")
        return resp

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(ws_router)
app.include_router(dashboard_router)
app.include_router(match_router)
app.include_router(io_router)
app.include_router(analytics_router)
# Search router removed - using page-specific searches instead
app.include_router(documents_router)
# Enhanced intelligent document analysis removed - using standard documents router
app.include_router(profile_router)  # User Profile Management for Personalization
app.include_router(kanban_router)  # Kanban/Pipeline Management
app.include_router(preferences_router)  # User Preferences Storage
app.include_router(ai_router)


@app.on_event("startup")
async def startup_event():
    # Set up scheduler to run cleanup every day
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_expired_sessions, 'interval', hours=24)
    scheduler.start()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Applytide API"}
