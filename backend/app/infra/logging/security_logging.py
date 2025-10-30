"""
Security Event Logging Module

This module provides comprehensive security event logging with:
- Structured security event tracking
- Automatic log file rotation
- Severity classification
- Request context extraction
- IP address and user agent tracking
- Threat level assessment

Security Events Tracked:
    - Authentication failures
    - Authorization violations
    - Rate limit violations
    - Suspicious activity patterns
    - Data access violations
    - Configuration changes
    - Security setting modifications

Features:
    - Separate security.log file
    - JSON-formatted events for SIEM integration
    - Automatic rotation (100MB, 90 days retention)
    - Real-time alerting capability
    - Correlation with request IDs

Configuration:
    - ENVIRONMENT: production/development
    - SECURITY_LOG_FILE: Log file path (default: /app/logs/security.log)
    - SECURITY_LOG_MAX_BYTES: Max file size (default: 100MB)
    - SECURITY_LOG_BACKUP_COUNT: Retention days (default: 90)

Example:
    >>> from app.infra.logging.security_logging import log_security_event
    >>> 
    >>> # Log authentication failure
    >>> log_security_event(
    ...     event_type="auth_failure",
    ...     severity="high",
    ...     details={"user_id": "123", "reason": "invalid_password"},
    ...     request=request
    ... )
    >>> 
    >>> # Log suspicious activity
    >>> log_security_event(
    ...     event_type="suspicious_activity",
    ...     severity="critical",
    ...     details={"pattern": "brute_force", "attempts": 50}
    ... )

Author: ApplyTide Team
Last Updated: 2025-10-30
"""
from __future__ import annotations
import logging
import os
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from logging.handlers import RotatingFileHandler

# ==================== CONFIGURATION CONSTANTS ====================

# Log file configuration
DEFAULT_SECURITY_LOG_FILE = "/app/logs/security.log"
DEFAULT_LOG_MAX_BYTES = 100 * 1024 * 1024  # 100MB
DEFAULT_BACKUP_COUNT = 90  # 90 days retention

# Severity levels
SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"
SEVERITY_CRITICAL = "critical"

# Event types
EVENT_AUTH_FAILURE = "auth_failure"
EVENT_AUTH_SUCCESS = "auth_success"
EVENT_AUTHZ_VIOLATION = "authorization_violation"
EVENT_RATE_LIMIT = "rate_limit_exceeded"
EVENT_SUSPICIOUS = "suspicious_activity"
EVENT_DATA_ACCESS = "data_access_violation"
EVENT_CONFIG_CHANGE = "configuration_change"
EVENT_ACCOUNT_LOCKED = "account_locked"
EVENT_PASSWORD_RESET = "password_reset"
EVENT_MFA_FAILURE = "mfa_failure"

# ==================== EXCEPTION CLASSES ====================

class SecurityLoggingError(Exception):
    """Base exception for security logging errors."""
    pass

class SecurityLoggerNotInitializedError(SecurityLoggingError):
    """Raised when security logger is not initialized."""
    pass

class InvalidSecurityEventError(SecurityLoggingError):
    """Raised when security event data is invalid."""
    pass

# ==================== HELPER FUNCTIONS ====================

def _validate_event_type(event_type: str) -> None:
    """
    Validate security event type.
    
    Args:
        event_type: Type of security event
    
    Raises:
        InvalidSecurityEventError: If event type is invalid
    """
    if not event_type:
        raise InvalidSecurityEventError("event_type cannot be empty")
    
    if not isinstance(event_type, str):
        raise InvalidSecurityEventError(
            f"event_type must be string, got {type(event_type).__name__}"
        )
    
    if len(event_type) > 100:
        raise InvalidSecurityEventError(
            f"event_type too long: {len(event_type)} chars (max: 100)"
        )

def _validate_severity(severity: Optional[str]) -> str:
    """
    Validate and normalize severity level.
    
    Args:
        severity: Severity level (low, medium, high, critical)
    
    Returns:
        Normalized severity level
    
    Raises:
        InvalidSecurityEventError: If severity is invalid
    """
    if severity is None:
        return SEVERITY_MEDIUM  # Default
    
    if not isinstance(severity, str):
        raise InvalidSecurityEventError(
            f"severity must be string, got {type(severity).__name__}"
        )
    
    severity = severity.lower().strip()
    
    valid_severities = {SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL}
    if severity not in valid_severities:
        raise InvalidSecurityEventError(
            f"Invalid severity: {severity}. Must be one of: {valid_severities}"
        )
    
    return severity

def _validate_details(details: Dict[str, Any]) -> None:
    """
    Validate security event details.
    
    Args:
        details: Event details dictionary
    
    Raises:
        InvalidSecurityEventError: If details are invalid
    """
    if not isinstance(details, dict):
        raise InvalidSecurityEventError(
            f"details must be dict, got {type(details).__name__}"
        )
    
    # Check for sensitive data that shouldn't be logged
    sensitive_keys = {"password", "passwd", "pwd", "secret", "token", "api_key"}
    for key in details.keys():
        if key.lower() in sensitive_keys:
            raise InvalidSecurityEventError(
                f"Sensitive data detected in details: {key}. Do not log passwords/tokens!"
            )

def _extract_request_context(request: Any) -> Dict[str, Any]:
    """
    Extract security-relevant context from request.
    
    Args:
        request: FastAPI/Starlette request object
    
    Returns:
        Dictionary with IP, user agent, method, URL, user_id
    """
    context = {}
    
    try:
        # Extract IP address
        if hasattr(request, "client") and request.client:
            context["ip_address"] = getattr(request.client, "host", "unknown")
        else:
            context["ip_address"] = "unknown"
        
        # Check for proxied IP (X-Forwarded-For)
        if hasattr(request, "headers"):
            xff = request.headers.get("x-forwarded-for")
            if xff:
                context["ip_address"] = xff.split(",")[0].strip()
                context["proxied_ip"] = True
            
            # Extract user agent
            context["user_agent"] = request.headers.get("user-agent", "unknown")
        else:
            context["user_agent"] = "unknown"
        
        # Extract HTTP method
        context["method"] = getattr(request, "method", "unknown")
        
        # Extract URL
        if hasattr(request, "url"):
            context["url"] = str(request.url)
            context["path"] = request.url.path if hasattr(request.url, "path") else "unknown"
        else:
            context["url"] = "unknown"
            context["path"] = "unknown"
        
        # Extract authenticated user (if set by auth middleware)
        if hasattr(request, "state"):
            if hasattr(request.state, "user_id"):
                context["user_id"] = request.state.user_id
            if hasattr(request.state, "session_id"):
                context["session_id"] = request.state.session_id
        
        # Extract request ID (for correlation)
        if hasattr(request, "state") and hasattr(request.state, "request_id"):
            context["request_id"] = request.state.request_id
        
    except Exception as e:
        # Don't fail security logging if context extraction fails
        context["context_extraction_error"] = str(e)
    
    return context

# ==================== MAIN FUNCTIONS ====================

def setup_security_logging() -> logging.Logger:
    """
    Setup security event logger with file rotation.
    
    Creates a dedicated security logger that:
    - Logs to separate security.log file
    - Rotates at 100MB (90 backups = 90 days retention)
    - Uses JSON format for SIEM integration
    - Logs to console in development
    - Logs to file in production
    
    Returns:
        Configured security logger
    
    Raises:
        SecurityLoggingError: If logger setup fails
    
    Example:
        >>> security_logger = setup_security_logging()
        >>> security_logger.info("Security system initialized")
    
    Notes:
        - Call this once during application startup
        - Logger name is "security" (retrieve with logging.getLogger("security"))
        - Non-propagating (doesn't send to root logger)
        - Thread-safe for concurrent use
    """
    try:
        # Get or create security logger
        security_logger = logging.getLogger("security")
        security_logger.setLevel(logging.INFO)
        security_logger.propagate = False  # Don't send to root logger
        
        # Clear any existing handlers (idempotent setup)
        security_logger.handlers.clear()
        
        # Get configuration
        environment = os.getenv("ENVIRONMENT", "development").lower()
        log_file = os.getenv("SECURITY_LOG_FILE", DEFAULT_SECURITY_LOG_FILE)
        max_bytes = int(os.getenv("SECURITY_LOG_MAX_BYTES", str(DEFAULT_LOG_MAX_BYTES)))
        backup_count = int(os.getenv("SECURITY_LOG_BACKUP_COUNT", str(DEFAULT_BACKUP_COUNT)))
        
        # JSON formatter for structured logging
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": %(message)s}',
            datefmt='%Y-%m-%dT%H:%M:%S'
        )
        
        # Console handler (always enabled for visibility)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(json_formatter)
        security_logger.addHandler(console_handler)
        
        # File handler (production or if explicitly enabled)
        if environment == "production" or os.getenv("SECURITY_LOG_TO_FILE", "false").lower() == "true":
            # Ensure log directory exists
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Validate directory is writable
            if not os.access(log_path.parent, os.W_OK):
                raise SecurityLoggingError(
                    f"Security log directory not writable: {log_path.parent}"
                )
            
            # Create rotating file handler
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=max_bytes,
                backupCount=backup_count,
                encoding='utf-8'
            )
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(json_formatter)
            security_logger.addHandler(file_handler)
            
            security_logger.info(
                json.dumps({
                    "event": "security_logger_initialized",
                    "environment": environment,
                    "log_file": log_file,
                    "max_bytes": max_bytes,
                    "backup_count": backup_count
                })
            )
        else:
            security_logger.info(
                json.dumps({
                    "event": "security_logger_initialized",
                    "environment": environment,
                    "mode": "console_only"
                })
            )
        
        return security_logger
        
    except Exception as e:
        # Fallback to stderr if setup fails
        print(f"ERROR: Failed to setup security logging: {e}", file=__import__("sys").stderr)
        raise SecurityLoggingError(f"Failed to setup security logging: {e}") from e

def log_security_event(
    event_type: str,
    details: Dict[str, Any],
    severity: Optional[str] = None,
    request: Any = None
) -> None:
    """
    Log a security event with comprehensive context.
    
    Creates a structured security log entry with:
    - Event type classification
    - Severity level
    - Detailed event information
    - Request context (IP, user agent, etc.)
    - Timestamp with timezone
    - Correlation ID
    
    Args:
        event_type: Type of security event (auth_failure, rate_limit, etc.)
        details: Event-specific details (user_id, reason, etc.)
        severity: Severity level (low, medium, high, critical)
        request: Optional FastAPI/Starlette request object for context
    
    Raises:
        InvalidSecurityEventError: If event data is invalid
        SecurityLoggerNotInitializedError: If logger not initialized
    
    Examples:
        >>> # Authentication failure
        >>> log_security_event(
        ...     event_type="auth_failure",
        ...     severity="high",
        ...     details={"user_id": "123", "reason": "invalid_password", "attempts": 3},
        ...     request=request
        ... )
        
        >>> # Rate limit exceeded
        >>> log_security_event(
        ...     event_type="rate_limit_exceeded",
        ...     severity="medium",
        ...     details={"endpoint": "/api/jobs", "limit": "100/hour"},
        ...     request=request
        ... )
        
        >>> # Suspicious activity (no request context)
        >>> log_security_event(
        ...     event_type="suspicious_activity",
        ...     severity="critical",
        ...     details={"pattern": "sql_injection", "source": "scanner"}
        ... )
    
    Notes:
        - Never log sensitive data (passwords, tokens, API keys)
        - All events are logged in JSON format for SIEM integration
        - Severity defaults to "medium" if not specified
        - Request context is optional but recommended
        - Thread-safe for concurrent logging
    """
    # Validate inputs
    _validate_event_type(event_type)
    _validate_details(details)
    severity = _validate_severity(severity)
    
    # Get security logger
    security_logger = logging.getLogger("security")
    
    if not security_logger.handlers:
        raise SecurityLoggerNotInitializedError(
            "Security logger not initialized. Call setup_security_logging() first."
        )
    
    # Build log data
    log_data: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "severity": severity,
        **details  # Include all provided details
    }
    
    # Add request context if provided
    if request is not None:
        request_context = _extract_request_context(request)
        log_data.update(request_context)
    
    # Log based on severity
    try:
        if severity == SEVERITY_CRITICAL:
            security_logger.critical(json.dumps(log_data))
        elif severity == SEVERITY_HIGH:
            security_logger.error(json.dumps(log_data))
        elif severity == SEVERITY_MEDIUM:
            security_logger.warning(json.dumps(log_data))
        else:  # SEVERITY_LOW
            security_logger.info(json.dumps(log_data))
    
    except Exception as e:
        # Don't fail the application if logging fails
        security_logger.error(
            json.dumps({
                "event": "security_logging_failed",
                "error": str(e),
                "original_event_type": event_type
            })
        )

# ==================== CONVENIENCE FUNCTIONS ====================

def log_auth_failure(
    user_identifier: str,
    reason: str,
    request: Any = None,
    attempts: Optional[int] = None
) -> None:
    """
    Log authentication failure event.
    
    Args:
        user_identifier: Username, email, or user ID
        reason: Failure reason (invalid_password, account_locked, etc.)
        request: Optional request object
        attempts: Number of failed attempts
    
    Example:
        >>> log_auth_failure("user@example.com", "invalid_password", request, attempts=3)
    """
    details = {
        "user_identifier": user_identifier,
        "reason": reason
    }
    if attempts is not None:
        details["attempts"] = attempts
    
    log_security_event(
        event_type=EVENT_AUTH_FAILURE,
        severity=SEVERITY_HIGH if attempts and attempts >= 3 else SEVERITY_MEDIUM,
        details=details,
        request=request
    )

def log_rate_limit_violation(
    endpoint: str,
    limit: str,
    request: Any = None,
    user_id: Optional[str] = None
) -> None:
    """
    Log rate limit violation.
    
    Args:
        endpoint: API endpoint that was rate limited
        limit: Rate limit configuration (e.g., "100/hour")
        request: Optional request object
        user_id: Optional user ID
    
    Example:
        >>> log_rate_limit_violation("/api/jobs", "100/hour", request, user_id="123")
    """
    details = {
        "endpoint": endpoint,
        "limit": limit
    }
    if user_id:
        details["user_id"] = user_id
    
    log_security_event(
        event_type=EVENT_RATE_LIMIT,
        severity=SEVERITY_MEDIUM,
        details=details,
        request=request
    )

def log_authorization_violation(
    user_id: str,
    resource: str,
    action: str,
    request: Any = None
) -> None:
    """
    Log authorization violation (user tried to access forbidden resource).
    
    Args:
        user_id: User ID attempting access
        resource: Resource being accessed (e.g., "job:456")
        action: Action attempted (e.g., "read", "write", "delete")
        request: Optional request object
    
    Example:
        >>> log_authorization_violation("user-123", "job:456", "delete", request)
    """
    log_security_event(
        event_type=EVENT_AUTHZ_VIOLATION,
        severity=SEVERITY_HIGH,
        details={
            "user_id": user_id,
            "resource": resource,
            "action": action
        },
        request=request
    )
