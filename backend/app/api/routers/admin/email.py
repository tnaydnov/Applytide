# backend/app/api/routers/admin/email.py
"""Email monitoring"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.email_service import EmailAdminService
from ....infra.logging import get_logger


router = APIRouter(tags=["admin-email"])
logger = get_logger(__name__)

# Disk usage analysis and orphaned file cleanup

class StorageStatsResponse(BaseModel):
    total_documents: int