import os

class Settings:
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    @property
    def FRONTEND_URL(self) -> str:
        if self.ENVIRONMENT == "production":
            return os.getenv("FRONTEND_URL", "https://applytide.com")
        else:
            return os.getenv("FRONTEND_URL", "http://localhost")

    # Core URLs / secrets from environment (docker-compose sets defaults)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://jobflow:jobflow@pg:5432/jobflow")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # JWT settings - different defaults for production vs development
    def _get_jwt_secret(self, key: str, dev_default: str) -> str:
        value = os.getenv(key, "")
        if not value or len(value) < 32:
            # In production, require strong secrets
            if self.ENVIRONMENT == "production":
                raise ValueError(f"{key} must be set with a secure random string (32+ chars) in production")
            # In dev, use default
            return dev_default
        return value
    
    @property
    def JWT_SECRET(self) -> str:
        return self._get_jwt_secret("JWT_SECRET", "dev-insecure-jwt-key-replace-in-production-environment")
    
    @property
    def REFRESH_SECRET(self) -> str:
        return self._get_jwt_secret("REFRESH_SECRET", "dev-insecure-refresh-key-replace-in-production-environment")
    
    ACCESS_TTL_MIN: int = int(os.getenv("ACCESS_TTL_MIN", "15"))
    
    @property
    def REFRESH_TTL_DAYS(self) -> int:
        # Shorter refresh token lifetime in development
        return int(os.getenv("REFRESH_TTL_DAYS", "7" if self.ENVIRONMENT == "production" else "1"))
    
    REFRESH_TTL_EXTENDED_DAYS: int = int(os.getenv("REFRESH_TTL_EXTENDED_DAYS", "30"))

    # Add new security settings
    SECURE_COOKIES: bool = os.getenv("SECURE_COOKIES", "false").lower() == "true"
    SAME_SITE_COOKIES: str = os.getenv("SAME_SITE_COOKIES", "lax")

    # Email settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "maildev")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@applytide.com")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@applytide.com")
    
    # Additional email addresses
    CONTACT_EMAIL: str = os.getenv("CONTACT_EMAIL", "contact@applytide.com")
    SUPPORT_EMAIL: str = os.getenv("SUPPORT_EMAIL", "support@applytide.com")
    BILLING_EMAIL: str = os.getenv("BILLING_EMAIL", "billing@applytide.com")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@applytide.com")

    # Legacy compatibility
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")
    
    # Security settings
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    ALLOWED_HOSTS: list = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    
    # Rate limiting
    GLOBAL_RATE_LIMIT_REQUESTS: int = int(os.getenv("GLOBAL_RATE_LIMIT_REQUESTS", "1000"))
    GLOBAL_RATE_LIMIT_WINDOW: int = int(os.getenv("GLOBAL_RATE_LIMIT_WINDOW", "3600"))

    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true" if os.getenv("ENVIRONMENT","development")=="production" else "false").lower() == "true"
    SECURITY_HEADERS_ENABLED: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"

    # Security Headers / CSP optional extras (comma-separated)
    CSP_CONNECT_SRC_EXTRA: str = os.getenv("CSP_CONNECT_SRC_EXTRA", "")
    CSP_IMG_SRC_EXTRA: str     = os.getenv("CSP_IMG_SRC_EXTRA", "")
    CSP_SCRIPT_SRC_EXTRA: str  = os.getenv("CSP_SCRIPT_SRC_EXTRA", "")
    CSP_STYLE_SRC_EXTRA: str   = os.getenv("CSP_STYLE_SRC_EXTRA", "")
    CSP_FRAME_SRC_EXTRA: str   = os.getenv("CSP_FRAME_SRC_EXTRA", "")

    # Cross-origin isolation (off by default; can break embeds)
    ENABLE_CROSS_ORIGIN_ISOLATION: bool = os.getenv("ENABLE_CROSS_ORIGIN_ISOLATION", "false").lower() == "true"
    
    # Logging
    SECURITY_LOG_FILE: str = os.getenv("SECURITY_LOG_FILE", "/app/logs/security.log")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    @property
    def GOOGLE_REDIRECT_URI(self) -> str:
        base_url = self.FRONTEND_URL
        # Remove trailing slash if present
        base_url = base_url.rstrip('/')
        
        # Use environment variable with dynamic fallback
        return os.getenv("GOOGLE_REDIRECT_URI", f"{base_url}/api/auth/google/callback")
    GOOGLE_SCOPES = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar.events"
    ]

settings = Settings()
