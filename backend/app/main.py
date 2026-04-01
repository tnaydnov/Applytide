import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
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

ENV = os.getenv("ENVIRONMENT", "development").lower()

limiter = Limiter(key_func=get_remote_address)

# Enforce debug=False in non-development environments
_debug = ENV == "development"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # --- Startup ---
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

    # ── Scheduled cleanup jobs ───────────────────────────────────────────
    from .infra.workers.cleanup_tasks import (
        purge_expired_email_actions,
        purge_expired_refresh_tokens,
        purge_old_llm_usage,
    )

    # Token cleanup every 6 hours
    app.state.scheduler.add_job(
        purge_expired_email_actions,
        "interval",
        hours=6,
        id="cleanup_email_actions",
        replace_existing=True,
    )
    app.state.scheduler.add_job(
        purge_expired_refresh_tokens,
        "interval",
        hours=6,
        id="cleanup_refresh_tokens",
        replace_existing=True,
    )

    # LLM usage log cleanup daily at 03:00 UTC
    app.state.scheduler.add_job(
        purge_old_llm_usage,
        "cron",
        hour=3,
        minute=0,
        id="cleanup_llm_usage",
        replace_existing=True,
    )

    logger.info("Cleanup jobs registered (email_actions/6h, refresh_tokens/6h, llm_usage/daily)")

    yield  # --- Application runs ---

    # --- Shutdown ---
    logger.info("Application shutting down")
    
    try:
        app.state.scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")
    
    # Close Google Calendar gateway httpx client
    try:
        from .infra.external.google_calendar_gateway import get_calendar_gateway, _calendar_gateway
        if _calendar_gateway is not None:
            await get_calendar_gateway().aclose()
            logger.info("Google Calendar gateway closed")
    except Exception as e:
        logger.error(f"Error closing calendar gateway: {e}")
    
    # Cleanup logging (flushes database handler)
    shutdown_logging()
    logger.info("Logging system shut down")


app = FastAPI(
    title="Applytide API",
    debug=_debug,
    docs_url="/docs" if _debug else None,
    redoc_url="/redoc" if _debug else None,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup global exception handlers
setup_exception_handlers(app)

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
# Always allow localhost in development
if os.getenv("ENVIRONMENT", "development") != "production":
    for dev_host in ["localhost", "127.0.0.1"]:
        if dev_host not in allowed_hosts:
            allowed_hosts.append(dev_host)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# ADMIN CLEANUP: Removed ErrorLoggingMiddleware (used deleted error_tracking module)

# --- Versioned API router
from fastapi import APIRouter as _APIRouter

v1 = _APIRouter(prefix="/api/v1")
v1.include_router(auth_router)
v1.include_router(errors_router)
v1.include_router(jobs_router)
v1.include_router(applications_router)
v1.include_router(ws_router)
v1.include_router(dashboard_router)
v1.include_router(analytics_router)
v1.include_router(documents_router)
v1.include_router(profile_router)
v1.include_router(preferences_router)
v1.include_router(ai_router)
v1.include_router(feedback_router)
v1.include_router(reminders_router)
v1.include_router(google_calendar_router)
v1.include_router(admin_router)
app.include_router(v1)

# --- Proxy headers (outermost - must be first in middleware stack)
if ProxyHeadersMiddleware is not None and os.getenv("TRUST_PROXY_HEADERS", "1") == "1":
    app.add_middleware(ProxyHeadersMiddleware)

# --- Security headers (MUST be after ProxyHeaders to detect HTTPS correctly)
# Force enable in production regardless of setting
if ENV == "production" or settings.SECURITY_HEADERS_ENABLED:
    app.add_middleware(SecurityHeadersMiddleware)
    logger.info("Security headers middleware enabled")

@app.get("/health", tags=["monitoring"])
def health_check(db: Session = Depends(get_db)):
    """Liveness/readiness probe for orchestrators and monitoring."""
    try:
        result = db.execute(text("SELECT 1"))
        db_status = "healthy" if result else "unhealthy"
    except Exception as e:
        logger.error("Health check: DB unhealthy", exc_info=True)
        db_status = "unhealthy"

    try:
        redis = get_redis()
        redis_status = "healthy" if redis.ping() else "unhealthy"
    except Exception as e:
        logger.error("Health check: Redis unhealthy", exc_info=True)
        redis_status = "unhealthy"

    overall = "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy"
    status_code = 200 if overall == "healthy" else 503
    import json as json_mod
    return Response(
        content=json_mod.dumps({
            "status": overall,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {"database": db_status, "redis": redis_status},
            "version": "1.0.0",
        }),
        media_type="application/json",
        status_code=status_code,
    )


@app.get("/")
def root():
    return {"message": "Applytide API"}
