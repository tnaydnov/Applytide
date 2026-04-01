"""
Application configuration via environment variables.

All settings are loaded once at startup.  Secrets MUST come from env vars;
nothing sensitive is hardcoded for production.

Environment flag (ENVIRONMENT):
    development   → relaxed defaults, debug logging, insecure cookie flags
    staging       → production-like but with relaxed secrets
    production    → strict: strong secrets required, secure cookies, JSON logs
"""
from __future__ import annotations

import os
from typing import List, Literal


class Settings:
    """Centralised application settings - all values from env vars."""

    # ── Environment ──────────────────────────────────────────────────────
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    # ── Core URLs ────────────────────────────────────────────────────────
    @property
    def FRONTEND_URL(self) -> str:
        if self.is_production:
            return os.getenv("FRONTEND_URL", "https://applytide.com")
        return os.getenv("FRONTEND_URL", "http://localhost")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@pg:5432/applytide_dev",
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # ── JWT ──────────────────────────────────────────────────────────────
    def _get_jwt_secret(self, key: str, dev_default: str) -> str:
        value = os.getenv(key, "")
        if not value or len(value) < 32:
            env = os.getenv("ENVIRONMENT", "development")
            if env == "production":
                raise ValueError(
                    f"{key} must be set with a secure random string (32+ chars) in production"
                )
            return dev_default
        return value

    @property
    def JWT_SECRET(self) -> str:
        return self._get_jwt_secret(
            "JWT_SECRET", "dev-insecure-jwt-key-replace-in-production-environment"
        )

    @property
    def REFRESH_SECRET(self) -> str:
        return self._get_jwt_secret(
            "REFRESH_SECRET", "dev-insecure-refresh-key-replace-in-production-environment"
        )

    ACCESS_TTL_MIN: int = int(os.getenv("ACCESS_TTL_MIN", "15"))

    @property
    def REFRESH_TTL_DAYS(self) -> int:
        return int(os.getenv("REFRESH_TTL_DAYS", "7" if self.is_production else "1"))

    REFRESH_TTL_EXTENDED_DAYS: int = int(os.getenv("REFRESH_TTL_EXTENDED_DAYS", "30"))

    # ── Cookie security ─────────────────────────────────────────────────
    @property
    def SECURE_COOKIES(self) -> bool:
        """Defaults to True in production, False in development."""
        default = "true" if os.getenv("ENVIRONMENT", "development") == "production" else "false"
        return os.getenv("SECURE_COOKIES", default).lower() == "true"

    SAME_SITE_COOKIES: str = os.getenv("SAME_SITE_COOKIES", "lax")

    # ── Email ────────────────────────────────────────────────────────────
    SMTP_HOST: str = os.getenv("SMTP_HOST", "maildev")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@applytide.com")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@applytide.com")

    CONTACT_EMAIL: str = os.getenv("CONTACT_EMAIL", "contact@applytide.com")
    SUPPORT_EMAIL: str = os.getenv("SUPPORT_EMAIL", "support@applytide.com")
    BILLING_EMAIL: str = os.getenv("BILLING_EMAIL", "billing@applytide.com")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@applytide.com")

    # Legacy compatibility
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")

    # ── Security ─────────────────────────────────────────────────────────
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def ALLOWED_HOSTS(self) -> List[str]:
        raw = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
        return [h.strip() for h in raw.split(",") if h.strip()]

    # Rate limiting
    GLOBAL_RATE_LIMIT_REQUESTS: int = int(os.getenv("GLOBAL_RATE_LIMIT_REQUESTS", "1000"))
    GLOBAL_RATE_LIMIT_WINDOW: int = int(os.getenv("GLOBAL_RATE_LIMIT_WINDOW", "3600"))

    @property
    def RATE_LIMIT_ENABLED(self) -> bool:
        default = "true" if os.getenv("ENVIRONMENT", "development") == "production" else "false"
        return os.getenv("RATE_LIMIT_ENABLED", default).lower() == "true"

    SECURITY_HEADERS_ENABLED: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"

    # CSP extras (comma-separated)
    CSP_CONNECT_SRC_EXTRA: str = os.getenv("CSP_CONNECT_SRC_EXTRA", "")
    CSP_IMG_SRC_EXTRA: str = os.getenv("CSP_IMG_SRC_EXTRA", "")
    CSP_SCRIPT_SRC_EXTRA: str = os.getenv("CSP_SCRIPT_SRC_EXTRA", "")
    CSP_STYLE_SRC_EXTRA: str = os.getenv("CSP_STYLE_SRC_EXTRA", "")
    CSP_FRAME_SRC_EXTRA: str = os.getenv("CSP_FRAME_SRC_EXTRA", "")

    ENABLE_CROSS_ORIGIN_ISOLATION: bool = (
        os.getenv("ENABLE_CROSS_ORIGIN_ISOLATION", "false").lower() == "true"
    )

    # ── Logging ──────────────────────────────────────────────────────────
    SECURITY_LOG_FILE: str = os.getenv("SECURITY_LOG_FILE", "/app/logs/security.log")

    @property
    def LOG_LEVEL(self) -> str:
        default = "DEBUG" if self.is_development else "INFO"
        return os.getenv("LOG_LEVEL", default)

    LOG_TO_CONSOLE: bool = os.getenv("LOG_TO_CONSOLE", "true").lower() == "true"

    @property
    def LOG_TO_FILE(self) -> bool:
        default = "false" if self.is_development else "true"
        return os.getenv("LOG_TO_FILE", default).lower() == "true"

    @property
    def LOG_TO_DB(self) -> bool:
        default = "false" if self.is_development else "true"
        return os.getenv("LOG_TO_DB", default).lower() == "true"

    @property
    def LOG_DIR(self) -> str:
        default = "./logs" if self.is_development else "/app/logs"
        return os.getenv("LOG_DIR", default)

    @property
    def LOG_FORMAT(self) -> str:
        default = "pretty" if self.is_development else "json"
        return os.getenv("LOG_FORMAT", default)

    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "104857600"))  # 100 MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "30"))
    DB_LOG_LEVEL: str = os.getenv("DB_LOG_LEVEL", "INFO")
    DB_LOG_BATCH_SIZE: int = int(os.getenv("DB_LOG_BATCH_SIZE", "100"))
    DB_LOG_FLUSH_INTERVAL: int = int(os.getenv("DB_LOG_FLUSH_INTERVAL", "10"))

    # ── OpenAI ───────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_DAILY_BUDGET_USD: float = float(os.getenv("LLM_DAILY_BUDGET_USD", "50.0"))

    # ── Google OAuth ─────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    @property
    def GOOGLE_REDIRECT_URI(self) -> str:
        base_url = self.FRONTEND_URL.rstrip("/")
        return os.getenv("GOOGLE_REDIRECT_URI", f"{base_url}/api/auth/google/callback")

    GOOGLE_SCOPES: List[str] = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar.events",
    ]


settings = Settings()
