"""Security logging configuration"""
import logging
import os
from datetime import datetime


def setup_security_logging():
    """Setup security event logging"""
    
    # Create security logger
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # File handler for security events
    if os.getenv("ENVIRONMENT") == "production":
        log_file = os.getenv("SECURITY_LOG_FILE", "/app/logs/security.log")
        
        # Ensure log directory exists
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        security_logger.addHandler(file_handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    security_logger.addHandler(console_handler)
    
    return security_logger


def log_security_event(event_type: str, details: dict, request=None):
    """Log security events with structured data"""
    security_logger = logging.getLogger("security")
    
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        **details
    }
    
    if request:
        log_data.update({
            "ip": getattr(request.client, "host", "unknown") if hasattr(request, "client") else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown") if hasattr(request, "headers") else "unknown",
            "method": getattr(request, "method", "unknown"),
            "url": str(getattr(request, "url", "unknown")),
        })
    
    security_logger.info(f"Security Event: {log_data}")


# Setup logging when module is imported
security_logger = setup_security_logging()
