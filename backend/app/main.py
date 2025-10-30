import os
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import logging infrastructure
from .infra.logging import setup_logging, shutdown_logging, get_logger
from .infra.logging.exception_handlers import setup_exception_handlers
from .infra.middleware.logging_middleware import LoggingMiddleware


# Try ProxyHeadersMiddleware from Starlette, then Uvicorn, else disable
ProxyHeadersMiddleware = None
try:
    from starlette.middleware.proxy_headers import ProxyHeadersMiddleware as _PHM
    ProxyHeadersMiddleware = _PHM
except Exception:
    try:
        from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware as _UPHM
        ProxyHeadersMiddleware = _UPHM
    except Exception:
        ProxyHeadersMiddleware = None

from .infra.http.middleware.security_headers import SecurityHeadersMiddleware
from .infra.http.middleware.rate_limit import GlobalRateLimitMiddleware
# ADMIN CLEANUP: Removed error_logging middleware import
from .api.routers.jobs import router as jobs_router
from .api.routers.applications import router as applications_router
from .api.routers.ws import router as ws_router
from .api.routers.dashboard import router as dashboard_router
from .api.routers.analytics import router as analytics_router
from .api.routers.documents import router as documents_router
from .api.routers.profile import router as profile_router
from .api.routers.preferences import router as preferences_router
from .api.routers.ai import router as ai_router
from .api.routers.feedback import router as feedback_router
from .db.session import get_db
from .infra.cache.redis_client import get_redis
from .api.routers.reminders import router as reminders_router, google_calendar_router
from .api.routers.auth import router as auth_router
from .api.routers.admin import router as admin_router
from .api.routers.errors import router as errors_router
from .config import settings

# Setup logging FIRST (before creating FastAPI app)
setup_logging()

# Create logger for this module
logger = get_logger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Applytide API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup global exception handlers
setup_exception_handlers(app)

ENV = os.getenv("ENVIRONMENT", "development").lower()

# --- Logging middleware (FIRST - before rate limiting and CORS)
app.add_middleware(
    LoggingMiddleware,
    slow_request_threshold=1.0,  # Warn on requests > 1 second
    skip_paths={"/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico"}
)

# --- Rate limit (apply early)
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(
        GlobalRateLimitMiddleware,
        max_requests=settings.GLOBAL_RATE_LIMIT_REQUESTS,
        window_seconds=settings.GLOBAL_RATE_LIMIT_WINDOW,
        enabled=True,
        key_prefix="grl",
        exempt_paths={"/health", "/docs", "/redoc", "/openapi.json"},
        identify_by="ip",  # set to "user_or_ip" once request.state.user_id is available
    )

# --- CORS
if ENV == "production":
    origins = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "https://applytide.com,https://www.applytide.com").split(",") if x.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )
else:
    origins = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
    if os.getenv("CORS_DEBUG") == "1":
        origins += ["https://www.linkedin.com", "https://www.indeed.com", "https://www.glassdoor.com"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


allowed_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
allowed_hosts += ["backend", "frontend"]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# ADMIN CLEANUP: Removed ErrorLoggingMiddleware (used deleted error_tracking module)

# --- Routers
app.include_router(auth_router)
app.include_router(errors_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(ws_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(documents_router)
app.include_router(profile_router)
app.include_router(preferences_router)
app.include_router(ai_router)
app.include_router(feedback_router)
app.include_router(reminders_router)
app.include_router(google_calendar_router)
app.include_router(admin_router)

# --- Proxy headers (outermost - must be first in middleware stack)
if ProxyHeadersMiddleware is not None and os.getenv("TRUST_PROXY_HEADERS", "1") == "1":
    app.add_middleware(ProxyHeadersMiddleware)

# --- Security headers (MUST be after ProxyHeaders to detect HTTPS correctly)
# Force enable in production regardless of setting
if ENV == "production" or settings.SECURITY_HEADERS_ENABLED:
    app.add_middleware(SecurityHeadersMiddleware)
    logger.info("Security headers middleware enabled")

@app.get("/health", tags=["monitoring"])
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        db_status = "healthy" if result else "unhealthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    try:
        redis = get_redis()
        redis_status = "healthy" if redis.ping() else "unhealthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    overall = "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy"
    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {"database": db_status, "redis": redis_status},
        "version": "1.0.0",
    }

log = logging.getLogger("uvicorn.error")


@app.on_event("startup")
async def startup_event():
    logger.info(
        "Application starting",
        extra={
            "environment": settings.ENVIRONMENT,
            "log_level": settings.LOG_LEVEL,
            "log_to_console": settings.LOG_TO_CONSOLE,
            "log_to_file": settings.LOG_TO_FILE,
            "log_to_db": settings.LOG_TO_DB,
            "security_headers": settings.SECURITY_HEADERS_ENABLED,
            "rate_limit": settings.RATE_LIMIT_ENABLED,
            "rate_limit_requests": settings.GLOBAL_RATE_LIMIT_REQUESTS,
            "rate_limit_window": settings.GLOBAL_RATE_LIMIT_WINDOW,
        }
    )
    
    app.state.scheduler = BackgroundScheduler(daemon=True)
    app.state.scheduler.start()
    logger.info("Background scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
    
    try:
        app.state.scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")
    
    # Cleanup logging (flushes database handler)
    shutdown_logging()
    logger.info("Logging system shut down")

@app.get("/")
def root():
    return {"message": "Applytide API"}
