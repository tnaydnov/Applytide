import os

class Settings:
    # Core URLs / secrets from environment (docker-compose sets defaults)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://jobflow:jobflow@pg:5432/jobflow")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # JWT settings (you can later expose these via .env)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-access-secret")
    REFRESH_SECRET: str = os.getenv("REFRESH_SECRET", "dev-refresh-secret")
    ACCESS_TTL_MIN: int = int(os.getenv("ACCESS_TTL_MIN", "15"))
    REFRESH_TTL_DAYS: int = int(os.getenv("REFRESH_TTL_DAYS", "30"))

    # Email settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "maildev")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@jobflow.local")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Legacy compatibility
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@jobflow.local")
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")

settings = Settings()
