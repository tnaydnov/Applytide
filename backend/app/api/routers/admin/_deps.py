# backend/app/api/routers/admin/_deps.py
"""Shared dependencies for admin routers"""
from typing import Optional, Tuple
from fastapi import Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ....db.session import get_db
from ....domain.admin.repository import AdminRepository
from ....domain.admin.service import AdminService


# Rate limiter for admin endpoints
limiter = Limiter(key_func=get_remote_address)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Dependency to get admin service"""
    repo = AdminRepository(db)
    return AdminService(repo)


def get_client_info(request: Request) -> Tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent
