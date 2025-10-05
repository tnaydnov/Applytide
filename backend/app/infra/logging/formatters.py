"""
Custom log formatters for structured and pretty logging
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any


class JSONFormatter(logging.Formatter):
    """
    Format log records as JSON for machine parsing
    
    Output example:
    {
        "timestamp": "2025-10-04T10:30:45.123Z",
        "level": "INFO",
        "logger": "app.domain.auth.service",
        "message": "User logged in successfully",
        "request_id": "abc-123-def",
        "user_id": "uuid-here",
        "endpoint": "/api/auth/login",
        "method": "POST",
        "ip_address": "192.168.1.1",
        "extra_field": "custom_value"
    }
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string"""
        
        # Base log data
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info) if record.exc_info else None
            }
        
        # Add all extra fields from record
        # These come from logger.info("msg", extra={...})
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName', 
                'levelname', 'levelno', 'lineno', 'module', 'msecs', 
                'message', 'pathname', 'process', 'processName', 'relativeCreated',
                'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info',
                'getMessage', 'request_id', 'user_id', 'session_id', 'ip_address',
                'user_agent', 'endpoint', 'method', 'status_code'
            ]:
                try:
                    # Try to serialize value
                    json.dumps(value)
                    extra_fields[key] = value
                except (TypeError, ValueError):
                    extra_fields[key] = str(value)
        
        # Add context fields (set by ContextFilter)
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'session_id'):
            log_data['session_id'] = record.session_id
        if hasattr(record, 'ip_address'):
            log_data['ip_address'] = record.ip_address
        if hasattr(record, 'user_agent'):
            log_data['user_agent'] = record.user_agent
        if hasattr(record, 'endpoint'):
            log_data['endpoint'] = record.endpoint
        if hasattr(record, 'method'):
            log_data['method'] = record.method
        if hasattr(record, 'status_code'):
            log_data['status_code'] = record.status_code
        
        # Add remaining extra fields
        if extra_fields:
            log_data['extra'] = extra_fields
        
        # Add source location for errors
        if record.levelno >= logging.ERROR:
            log_data['source'] = {
                'file': record.pathname,
                'line': record.lineno,
                'function': record.funcName
            }
        
        return json.dumps(log_data, default=str, ensure_ascii=False)


class PrettyFormatter(logging.Formatter):
    """
    Format log records for human-readable console output
    
    Uses colors and nice formatting for development
    
    Output example:
    2025-10-04 10:30:45.123 | INFO     | app.domain.auth | User logged in | request_id=abc-123 user_id=uuid
    """
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def __init__(self, use_colors: bool = True):
        super().__init__()
        self.use_colors = use_colors and self._supports_color()
    
    def _supports_color(self) -> bool:
        """Check if terminal supports colors"""
        import sys
        return hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as pretty string"""
        
        # Timestamp
        timestamp = datetime.utcfromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        # Level with color
        level = record.levelname
        if self.use_colors:
            color = self.COLORS.get(level, self.COLORS['RESET'])
            level = f"{color}{level:8}{self.COLORS['RESET']}"
        else:
            level = f"{level:8}"
        
        # Logger name (truncate if too long)
        logger_name = record.name
        if len(logger_name) > 30:
            parts = logger_name.split('.')
            if len(parts) > 3:
                logger_name = f"{parts[0]}...{parts[-1]}"
            logger_name = logger_name[:30]
        logger_name = f"{logger_name:30}"
        
        # Message
        message = record.getMessage()
        
        # Build base log line
        log_line = f"{timestamp} | {level} | {logger_name} | {message}"
        
        # Add context fields
        context_parts = []
        if hasattr(record, 'request_id') and record.request_id:
            context_parts.append(f"request_id={record.request_id}")
        if hasattr(record, 'user_id') and record.user_id:
            context_parts.append(f"user_id={record.user_id}")
        if hasattr(record, 'endpoint') and record.endpoint:
            context_parts.append(f"endpoint={record.endpoint}")
        if hasattr(record, 'method') and record.method:
            context_parts.append(f"method={record.method}")
        
        if context_parts:
            context_str = " | " + " ".join(context_parts)
            if self.use_colors:
                context_str = f"\033[90m{context_str}\033[0m"  # Gray
            log_line += context_str
        
        # Add exception if present
        if record.exc_info:
            log_line += "\n" + self.formatException(record.exc_info)
        
        return log_line


class SecurityFormatter(JSONFormatter):
    """
    Special formatter for security events
    
    Adds security-specific fields and ensures sensitive data is not logged
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format security log record"""
        
        # Use parent JSON formatter
        log_str = super().format(record)
        log_data = json.loads(log_str)
        
        # Add security marker
        log_data['security_event'] = True
        log_data['severity'] = self._get_security_severity(record)
        
        # Ensure no sensitive data in message
        log_data['message'] = self._sanitize_message(log_data.get('message', ''))
        
        return json.dumps(log_data, default=str, ensure_ascii=False)
    
    def _get_security_severity(self, record: logging.LogRecord) -> str:
        """Map log level to security severity"""
        if record.levelno >= logging.CRITICAL:
            return "CRITICAL"
        elif record.levelno >= logging.ERROR:
            return "HIGH"
        elif record.levelno >= logging.WARNING:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _sanitize_message(self, message: str) -> str:
        """Remove sensitive data from log messages"""
        import re
        
        # Remove potential passwords
        message = re.sub(r'password["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'password=***', message, flags=re.IGNORECASE)
        
        # Remove potential tokens
        message = re.sub(r'token["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'token=***', message, flags=re.IGNORECASE)
        
        # Remove potential API keys
        message = re.sub(r'api[_-]?key["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'api_key=***', message, flags=re.IGNORECASE)
        
        return message
