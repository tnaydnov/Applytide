"""
Centralized Logging System for Applytide

This module provides enterprise-grade logging with:
- Structured JSON logging for production
- Pretty console output for development
- Automatic request correlation IDs
- Database logging for searchability
- File rotation with retention
- Security event tracking

Usage:
    # In main.py (startup)
    from app.infra.logging import setup_logging, shutdown_logging
    setup_logging()
    
    # In any module
    from app.infra.logging import get_logger
    logger = get_logger(__name__)
    
    logger.info("User logged in", extra={"user_id": "123", "ip": "1.2.3.4"})
    logger.warning("Rate limit exceeded", extra={"user_id": "123"})
    logger.error("Database connection failed", exc_info=True)
    
    # In middleware (set context)
    from app.infra.logging.filters import set_request_context
    set_request_context(
        request_id="abc-123",
        user_id="user-uuid",
        endpoint="/api/jobs",
        method="GET",
        ip_address="1.2.3.4"
    )
"""

from .config import setup_logging, shutdown_logging, get_logger, config

__all__ = [
    'setup_logging',
    'shutdown_logging',
    'get_logger',
    'config'
]
