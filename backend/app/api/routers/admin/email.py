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
from ....domain.admin.email_service import EmailAdminService\n\n\nrouter = APIRouter(tags=["admin-email"])\n\n# Disk usage analysis and orphaned file cleanup\n\nclass StorageStatsResponse(BaseModel):\n    total_documents: int