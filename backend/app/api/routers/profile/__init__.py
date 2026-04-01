"""
User Profile API Router
Handles user profile creation, updates, retrieval, and account management

This module aggregates all profile-related endpoints:
- Profile management (get, update, export, completeness)
- Job preferences and career goals
- Account and profile deletion (GDPR compliance)
- Welcome modal onboarding status
"""
from __future__ import annotations

from fastapi import APIRouter

from . import management, preferences, deletion, onboarding

router = APIRouter(prefix="/profile", tags=["User Profile"])

# Include all sub-routers
router.include_router(management.router)
router.include_router(preferences.router)
router.include_router(deletion.router)
router.include_router(onboarding.router)
