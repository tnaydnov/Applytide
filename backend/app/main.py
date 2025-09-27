import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

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
from .infra.tasks.cleanup import cleanup_expired_sessions
from .db.session import get_db
from .infra.cache.redis_client import get_redis
from .api.routers.reminders import router as reminders_router
from .api.routers.auth import router as auth_router
from .api.routers.auth_sessions import router as auth_sessions_router

app = FastAPI(title="Applytide API")

def _split_env_list(value: str, default: list[str]) -> list[str]:
    if not value:
        return default
    return [x.strip() for x in value.split(",") if x.strip()]

ENV = os.getenv("ENVIRONMENT", "development").lower()

# --- Trust proxy headers if middleware available (nice-to-have, not required)
if ProxyHeadersMiddleware is not None and os.getenv("TRUST_PROXY_HEADERS", "1") == "1":
    app.add_middleware(ProxyHeadersMiddleware)

# --- CORS
if ENV == "production":
    origins = _split_env_list(
        os.getenv("ALLOWED_ORIGINS", "https://applytide.com,https://www.applytide.com"),
        ["https://applytide.com", "https://www.applytide.com"],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )
else:
    origins = _split_env_list(
        os.getenv("ALLOWED_ORIGINS", "http://localhost:3000"),
        ["http://localhost:3000"],
    )
    if os.getenv("CORS_DEBUG") == "1":
        origins.extend([
            "https://www.linkedin.com",
            "https://www.indeed.com",
            "https://www.glassdoor.com",
        ])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# --- Trusted hosts
allowed_hosts = _split_env_list(
    os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1"),
    ["localhost", "127.0.0.1"],
)
allowed_hosts += ["backend", "frontend"]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# --- Routers
app.include_router(auth_router)
app.include_router(auth_sessions_router)
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
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GlobalRateLimitMiddleware,
                   max_requests=1000,
                   window_seconds=3600,
                   enabled=True)

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

@app.on_event("startup")
async def startup_event():
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_expired_sessions, "interval", hours=24)
    scheduler.start()

@app.get("/")
def root():
    return {"message": "Applytide API"}
