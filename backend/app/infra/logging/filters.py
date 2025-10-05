"""
Custom log filters for adding context to log records
"""

import logging
import contextvars
from typing import Optional
import uuid


# Context variables for request tracking
request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('request_id', default=None)
user_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('user_id', default=None)
session_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('session_id', default=None)
ip_address_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('ip_address', default=None)
user_agent_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('user_agent', default=None)
endpoint_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('endpoint', default=None)
method_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('method', default=None)


class ContextFilter(logging.Filter):
    """
    Add request context to all log records
    
    Automatically adds:
    - request_id: Unique ID for each request (for tracing)
    - user_id: ID of authenticated user
    - session_id: Session identifier
    - ip_address: Client IP
    - user_agent: Client user agent
    - endpoint: API endpoint being called
    - method: HTTP method
    
    These are set by the logging middleware and available
    throughout the request lifecycle.
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add context variables to log record"""
        
        # Add request ID (or generate one if not set)
        record.request_id = request_id_var.get() or self._generate_request_id()
        
        # Add user context
        record.user_id = user_id_var.get()
        record.session_id = session_id_var.get()
        
        # Add request metadata
        record.ip_address = ip_address_var.get()
        record.user_agent = user_agent_var.get()
        record.endpoint = endpoint_var.get()
        record.method = method_var.get()
        
        return True
    
    def _generate_request_id(self) -> str:
        """Generate a unique request ID"""
        return str(uuid.uuid4())[:8]


class SensitiveDataFilter(logging.Filter):
    """
    Filter out sensitive data from logs
    
    Prevents accidentally logging:
    - Passwords
    - API keys
    - Tokens
    - Credit card numbers
    - SSN
    """
    
    SENSITIVE_PATTERNS = [
        'password',
        'passwd',
        'pwd',
        'secret',
        'token',
        'api_key',
        'apikey',
        'authorization',
        'auth',
        'credit_card',
        'creditcard',
        'ssn',
        'social_security'
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Sanitize log message"""
        
        # Sanitize message
        message = record.getMessage()
        record.msg = self._sanitize(message)
        
        # Sanitize args if present
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: self._sanitize_value(k, v) for k, v in record.args.items()}
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple(self._sanitize_value('', v) for v in record.args)
        
        return True
    
    def _sanitize(self, text: str) -> str:
        """Remove sensitive data from text"""
        import re
        
        # Replace common patterns
        text = re.sub(
            r'(password|token|api[_-]?key|authorization|secret)\s*[=:]\s*[\'"]?([^\s\'"]+)[\'"]?',
            r'\1=***',
            text,
            flags=re.IGNORECASE
        )
        
        return text
    
    def _sanitize_value(self, key: str, value: any) -> any:
        """Sanitize a single value based on key name"""
        
        # Check if key indicates sensitive data
        key_lower = str(key).lower()
        if any(pattern in key_lower for pattern in self.SENSITIVE_PATTERNS):
            return '***'
        
        # Sanitize string values
        if isinstance(value, str):
            return self._sanitize(value)
        
        # Recursively sanitize dicts
        if isinstance(value, dict):
            return {k: self._sanitize_value(k, v) for k, v in value.items()}
        
        # Recursively sanitize lists
        if isinstance(value, (list, tuple)):
            return [self._sanitize_value('', v) for v in value]
        
        return value


class LevelFilter(logging.Filter):
    """
    Filter logs by level range
    
    Useful for sending only certain log levels to specific handlers
    """
    
    def __init__(self, min_level: int = logging.NOTSET, max_level: int = logging.CRITICAL):
        super().__init__()
        self.min_level = min_level
        self.max_level = max_level
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Only allow logs within level range"""
        return self.min_level <= record.levelno <= self.max_level


# Helper functions to set context

def set_request_context(
    request_id: str = None,
    user_id: str = None,
    session_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    endpoint: str = None,
    method: str = None
):
    """
    Set request context for logging
    
    Call this at the start of each request (in middleware)
    """
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)
    if session_id:
        session_id_var.set(session_id)
    if ip_address:
        ip_address_var.set(ip_address)
    if user_agent:
        user_agent_var.set(user_agent)
    if endpoint:
        endpoint_var.set(endpoint)
    if method:
        method_var.set(method)


def clear_request_context():
    """
    Clear request context
    
    Call this at the end of each request (in middleware)
    """
    request_id_var.set(None)
    user_id_var.set(None)
    session_id_var.set(None)
    ip_address_var.set(None)
    user_agent_var.set(None)
    endpoint_var.set(None)
    method_var.set(None)


def get_request_id() -> Optional[str]:
    """Get current request ID"""
    return request_id_var.get()


def get_user_id() -> Optional[str]:
    """Get current user ID"""
    return user_id_var.get()
