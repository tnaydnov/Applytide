"""
Client IP Address Extraction Utility

Provides reliable methods to extract client IP addresses from HTTP requests,
handling various proxy and load balancer scenarios.

Security Considerations:
- Trusts X-Forwarded-For header (assumes you're behind a trusted proxy/load balancer)
- Falls back to X-Real-IP if X-Forwarded-For is not available
- Uses request.client.host as last resort
- Validates and normalizes IP addresses

Usage:
    from app.infra.http.client_ip import get_client_ip
    
    @app.post("/login")
    async def login(request: Request, db: Session = Depends(get_db)):
        client_ip = get_client_ip(request)
        if BanService.is_ip_banned(db, client_ip):
            raise HTTPException(status_code=403, detail="Access denied")
"""

import logging
from typing import Optional
from fastapi import Request

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """
    Extract the client's IP address from the request.
    
    This function handles multiple proxy scenarios by checking headers
    in the following order:
    1. X-Forwarded-For (standard for load balancers/proxies)
    2. X-Real-IP (some proxies use this)
    3. request.client.host (direct connection)
    
    For X-Forwarded-For, we take the first IP (leftmost) which represents
    the original client IP. Subsequent IPs are proxy/load balancer IPs.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Client IP address as string (IPv4 or IPv6)
        Returns "unknown" if IP cannot be determined
        
    Notes:
        - Assumes you're behind a trusted reverse proxy (nginx, load balancer)
        - If not using a proxy, this will return the direct connection IP
        - X-Forwarded-For format: "client, proxy1, proxy2"
    """
    # Check X-Forwarded-For header (most common with load balancers)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        # The first IP is the original client
        client_ip = x_forwarded_for.split(",")[0].strip()
        if client_ip and _is_valid_ip_format(client_ip):
            logger.debug(f"Client IP from X-Forwarded-For: {client_ip}")
            return client_ip
        else:
            logger.warning(f"Invalid IP in X-Forwarded-For: {x_forwarded_for}")
    
    # Check X-Real-IP header (alternative used by some proxies)
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        client_ip = x_real_ip.strip()
        if client_ip and _is_valid_ip_format(client_ip):
            logger.debug(f"Client IP from X-Real-IP: {client_ip}")
            return client_ip
        else:
            logger.warning(f"Invalid IP in X-Real-IP: {x_real_ip}")
    
    # Fallback to direct connection IP
    if request.client and request.client.host:
        client_ip = request.client.host
        logger.debug(f"Client IP from direct connection: {client_ip}")
        return client_ip
    
    # Unable to determine IP
    logger.error("Unable to determine client IP address from request")
    return "unknown"


def _is_valid_ip_format(ip: str) -> bool:
    """
    Basic validation to check if string looks like a valid IP address.
    
    This is a simple check - doesn't guarantee the IP is valid,
    but filters out obviously invalid values.
    
    Args:
        ip: String to validate
        
    Returns:
        True if string looks like an IP address
    """
    if not ip or not isinstance(ip, str):
        return False
    
    ip = ip.strip()
    
    # Empty or too long
    if not ip or len(ip) > 45:  # IPv6 max length
        return False
    
    # Check for private/reserved marker strings that might leak through
    invalid_markers = ["unknown", "localhost", "127.0.0.1", "::1", "0.0.0.0"]
    if ip.lower() in invalid_markers:
        logger.warning(f"Detected potentially spoofed/invalid IP: {ip}")
        # Still return True as these are technically valid IPs, just not useful
        # The ban service will handle them
    
    # Must contain only valid IP characters
    valid_chars = set("0123456789abcdefABCDEF.:[]")
    if not all(c in valid_chars for c in ip):
        return False
    
    # IPv4: must have dots and be reasonable length
    if "." in ip:
        parts = ip.split(".")
        if len(parts) != 4:
            return False
        # Each part should be a number 0-255
        try:
            for part in parts:
                num = int(part)
                if num < 0 or num > 255:
                    return False
        except ValueError:
            return False
    
    # IPv6: must have colons
    elif ":" in ip:
        # Basic check - has colons and reasonable structure
        if ip.count(":") < 2 or ip.count(":") > 7:
            return False
    else:
        # No dots or colons - not an IP
        return False
    
    return True


def get_client_ip_with_fallback(request: Request, fallback: str = "unknown") -> str:
    """
    Extract client IP with custom fallback value.
    
    Use this when you want to specify a custom fallback for logging/tracking
    but don't want to use "unknown".
    
    Args:
        request: FastAPI Request object
        fallback: Value to return if IP cannot be determined
        
    Returns:
        Client IP address or fallback value
    """
    ip = get_client_ip(request)
    return ip if ip != "unknown" else fallback
