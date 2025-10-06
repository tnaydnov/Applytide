"""
Centralized logging configuration for Applytide

This module provides enterprise-grade logging setup with:
- Structured JSON logging for production
- Pretty console logging for development
- File rotation with retention policies
- Request correlation IDs
- Multiple log levels and handlers
"""

import logging
import logging.handlers
import os
import sys
from typing import Dict, Any
from pathlib import Path


class LogConfig:
    """Logging configuration settings"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
        
        # Log levels
        self.log_level = os.getenv("LOG_LEVEL", "DEBUG" if self.environment == "development" else "INFO")
        
        # Output destinations
        self.log_to_console = os.getenv("LOG_TO_CONSOLE", "true").lower() == "true"
        self.log_to_file = os.getenv("LOG_TO_FILE", "true" if self.environment == "production" else "false").lower() == "true"
        self.log_to_db = os.getenv("LOG_TO_DB", "true" if self.environment == "production" else "false").lower() == "true"
        
        # File logging settings
        self.log_dir = Path(os.getenv("LOG_DIR", "/app/logs" if self.environment == "production" else "./logs"))
        self.log_file_name = os.getenv("LOG_FILE_NAME", "applytide.log")
        self.log_file_path = self.log_dir / self.log_file_name
        
        # Rotation settings
        self.max_bytes = int(os.getenv("LOG_MAX_BYTES", "104857600"))  # 100MB
        self.backup_count = int(os.getenv("LOG_BACKUP_COUNT", "30"))  # 30 days
        
        # Format
        self.log_format = os.getenv("LOG_FORMAT", "pretty" if self.environment == "development" else "json")
        
        # Database logging
        self.db_log_level = os.getenv("DB_LOG_LEVEL", "INFO")  # Only log INFO+ to database
        self.db_batch_size = int(os.getenv("DB_LOG_BATCH_SIZE", "100"))
        self.db_flush_interval = int(os.getenv("DB_LOG_FLUSH_INTERVAL", "10"))  # seconds
        
        # Security logging
        self.security_log_file = self.log_dir / "security.log"
        
        # Ensure log directory exists
        if self.log_to_file:
            self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def get_log_level(self, level_name: str = None) -> int:
        """Convert string log level to logging constant"""
        level = level_name or self.log_level
        return getattr(logging, level.upper(), logging.INFO)
    
    def to_dict(self) -> Dict[str, Any]:
        """Return configuration as dictionary"""
        return {
            "environment": self.environment,
            "log_level": self.log_level,
            "log_to_console": self.log_to_console,
            "log_to_file": self.log_to_file,
            "log_to_db": self.log_to_db,
            "log_file_path": str(self.log_file_path),
            "log_format": self.log_format,
            "max_bytes": self.max_bytes,
            "backup_count": self.backup_count,
        }


# Global config instance
config = LogConfig()


def get_logger(name: str = None) -> logging.Logger:
    """
    Get a configured logger instance
    
    Usage:
        from app.infra.logging import get_logger
        logger = get_logger(__name__)
        logger.info("Something happened", extra={"user_id": "123"})
    """
    logger_name = name or __name__
    logger = logging.getLogger(logger_name)
    
    # Don't add handlers multiple times
    if not logger.handlers:
        # Will be configured by setup_logging()
        pass
    
    return logger


def setup_logging():
    """
    Setup application-wide logging configuration
    
    Call this once during application startup (in main.py)
    """
    from .formatters import JSONFormatter, PrettyFormatter
    from .filters import ContextFilter
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(config.get_log_level())
    
    # Remove any existing handlers
    root_logger.handlers.clear()
    
    # Add context filter to all logs
    context_filter = ContextFilter()
    root_logger.addFilter(context_filter)
    
    # 1. Console Handler
    if config.log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(config.get_log_level())
        
        if config.log_format == "json":
            console_handler.setFormatter(JSONFormatter())
        else:
            console_handler.setFormatter(PrettyFormatter())
        
        root_logger.addHandler(console_handler)
    
    # 2. File Handler with Rotation
    if config.log_to_file:
        file_handler = logging.handlers.RotatingFileHandler(
            filename=config.log_file_path,
            maxBytes=config.max_bytes,
            backupCount=config.backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(config.get_log_level())
        
        # Always use JSON for file logs (easier parsing)
        file_handler.setFormatter(JSONFormatter())
        
        root_logger.addHandler(file_handler)
    
    # 3. Database Handler (if enabled)
    if config.log_to_db:
        try:
            from .handlers import DatabaseHandler
            db_handler = DatabaseHandler()
            db_handler.setLevel(config.get_log_level(config.db_log_level))
            db_handler.setFormatter(JSONFormatter())
            root_logger.addHandler(db_handler)
        except Exception as e:
            # Don't fail startup if DB handler fails
            # Use basic logging since this is the logging setup itself
            import sys
            sys.stderr.write(f"Warning: Could not setup database logging: {e}\n")
    
    # 4. Separate Security Logger
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.INFO)
    security_logger.propagate = False  # Don't send to root logger
    
    if config.log_to_file:
        security_handler = logging.handlers.RotatingFileHandler(
            filename=config.security_log_file,
            maxBytes=config.max_bytes,
            backupCount=config.backup_count,
            encoding='utf-8'
        )
        security_handler.setFormatter(JSONFormatter())
        security_logger.addHandler(security_handler)
    
    # Also log security to console
    if config.log_to_console:
        security_console = logging.StreamHandler(sys.stdout)
        if config.log_format == "json":
            security_console.setFormatter(JSONFormatter())
        else:
            security_console.setFormatter(PrettyFormatter())
        security_logger.addHandler(security_console)
    
    # Log startup message
    logger = get_logger(__name__)
    logger.info(
        "Logging system initialized",
        extra={
            "config": config.to_dict()
        }
    )
    
    return root_logger


def shutdown_logging():
    """
    Cleanup logging handlers
    
    Call this during application shutdown
    """
    logger = get_logger(__name__)
    logger.info("Shutting down logging system")
    
    # Flush all handlers
    for handler in logging.getLogger().handlers:
        handler.flush()
        handler.close()
    
    logging.shutdown()
