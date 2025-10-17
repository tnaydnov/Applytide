"""
Shared utilities for authentication modules.
Extracted from api.routers.auth during refactoring.
"""
from __future__ import annotations

from fastapi import Request


def get_client_info(request: Request) -> tuple[str, str]:
    """
    Extract client information from request.
    
    Returns:
        tuple: (user_agent, ip_address)
    """
    user_agent = request.headers.get("user-agent", "")[:500]
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = getattr(request.client, "host", "unknown")
    return user_agent, ip
