"""Security logging configuration"""
import logging
import os
from datetime import datetime

def setup_security_logging():
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    if os.getenv("ENVIRONMENT") == "production":
        log_file = os.getenv("SECURITY_LOG_FILE", "/app/logs/security.log")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        fh = logging.FileHandler(log_file)
        fh.setLevel(logging.INFO)
        fh.setFormatter(fmt)
        security_logger.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    security_logger.addHandler(ch)
    return security_logger

def log_security_event(event_type: str, details: dict, request=None):
    security_logger = logging.getLogger("security")
    log_data = {"timestamp": datetime.utcnow().isoformat(), "event_type": event_type, **details}
    if request:
        log_data.update({
            "ip": getattr(request.client, "host", "unknown") if hasattr(request, "client") else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown") if hasattr(request, "headers") else "unknown",
            "method": getattr(request, "method", "unknown"),
            "url": str(getattr(request, "url", "unknown")),
        })
    security_logger.info(f"Security Event: {log_data}")
