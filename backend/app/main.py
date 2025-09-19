import os
from fastapi import FastAPI, Depends
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
from .feedback.router import router as feedback_router
from .tasks.cleanup import cleanup_expired_sessions
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from .db.session import get_db
from .services.redis_client import get_redis
from app.auth.oauth.router import router as oauth_router
from app.calendars.router import router as calendar_router


app = FastAPI(title="Applytide API")

# Add security middleware
# CORS Configuration
if os.getenv("ENVIRONMENT") == "production":
    # Production: strict CORS settings
    origins = os.getenv("ALLOWED_ORIGINS", "https://applytide.com").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )
else:
    # Development settings - more permissive
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if os.getenv("CORS_DEBUG") == "1":
        # Add job sites for extension development
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

# Add TrustedHostMiddleware after CORSMiddleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost").split(",")
)


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
app.include_router(feedback_router)
app.include_router(oauth_router)
app.include_router(calendar_router)

@app.get("/health", tags=["monitoring"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint for monitoring"""
    # Check database connection
    try:
        result = await db.execute("SELECT 1")
        db_status = "healthy" if result else "unhealthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check Redis connection
    try:
        redis = get_redis()
        redis_ping = await redis.ping()
        redis_status = "healthy" if redis_ping else "unhealthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
    
    # Overall status
    overall = "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy"
    
    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": db_status,
            "redis": redis_status
        },
        "version": "1.0.0"
    }

@app.on_event("startup")
async def startup_event():
    # Set up scheduler to run cleanup every day
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_expired_sessions, 'interval', hours=24)
    scheduler.start()

@app.get("/")
def root():
    return {"message": "Applytide API"}
