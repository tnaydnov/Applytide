import os

class Settings:
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Core URLs / secrets from environment (docker-compose sets defaults)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://jobflow:jobflow@pg:5432/jobflow")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # JWT settings - different defaults for production vs development
    def _get_jwt_secret(self, key: str, dev_default: str) -> str:
        value = os.getenv(key)
        if value:
            return value
        
        if self.ENVIRONMENT == "production":
            raise ValueError(f"{key} must be set in production environment")
        
        return dev_default
    
    @property
    def JWT_SECRET(self) -> str:
        return self._get_jwt_secret("JWT_SECRET", "dev-access-secret")
    
    @property
    def REFRESH_SECRET(self) -> str:
        return self._get_jwt_secret("REFRESH_SECRET", "dev-refresh-secret")
    
    ACCESS_TTL_MIN: int = int(os.getenv("ACCESS_TTL_MIN", "15"))
    
    @property
    def REFRESH_TTL_DAYS(self) -> int:
        # Shorter refresh token lifetime in production
        default = "7" if self.ENVIRONMENT == "production" else "30"
        return int(os.getenv("REFRESH_TTL_DAYS", default))

    # Email settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "maildev")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@applytide.local")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Legacy compatibility
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@applytide.local")
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")
    
    # Security settings
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    ALLOWED_HOSTS: list = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    
    # Rate limiting
    GLOBAL_RATE_LIMIT_REQUESTS: int = int(os.getenv("GLOBAL_RATE_LIMIT_REQUESTS", "1000"))
    GLOBAL_RATE_LIMIT_WINDOW: int = int(os.getenv("GLOBAL_RATE_LIMIT_WINDOW", "3600"))
    
    # Logging
    SECURITY_LOG_FILE: str = os.getenv("SECURITY_LOG_FILE", "/app/logs/security.log")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
