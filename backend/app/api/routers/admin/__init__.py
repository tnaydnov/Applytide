# backend/app/api/routers/admin/__init__.py
"""
Admin Router Module - Feature-based organization

This module aggregates all admin sub-routers into a single cohesive admin router.
Each sub-router handles a specific domain/feature for better maintainability.

Structure:
- dashboard.py: Dashboard stats, system health, analytics overview, password verification
- users.py: User management (list, detail, admin/premium status)
- logs.py: Admin logs (list, export CSV, purge)
- jobs.py: Job management (CRUD, bulk operations, analytics)
- applications.py: Application management (CRUD, bulk operations, analytics)
- documents.py: Document management (CRUD, orphaned docs, analytics)
- database.py: Database query interface (execute queries, table schemas)
- cache.py: Cache management (stats, keys, delete, flush)
- email.py: Email monitoring (stats, activity, test email)
- storage.py: Storage management (stats, by user, orphaned files cleanup)
- security.py: Security monitoring (failed logins, blocked IPs, sessions)
- gdpr.py: GDPR compliance (stats, requests, data export/delete)
- analytics_advanced.py: Enhanced analytics (cohort, churn, adoption, funnel, velocity)

Shared modules:
- _deps.py: Common dependencies (limiter, service getters, client info)
- _schemas.py: Shared Pydantic schemas (user, dashboard, logs, auth)
"""
from fastapi import APIRouter

from . import (
    dashboard,
    users,
    logs,
    jobs,
    applications,
    documents,
    database,
    cache,
    email,
    storage,
    security,
    gdpr,
    analytics_advanced,
    sessions,
    errors,
    llm_usage,
)


# Create main admin router with prefix and tags
router = APIRouter(prefix="/api/admin", tags=["admin"])

# Include all sub-routers (order matches logical grouping)
# Core & Overview
router.include_router(dashboard.router)

# User & Access Management
router.include_router(users.router)
router.include_router(logs.router)

# Content Management
router.include_router(jobs.router)
router.include_router(applications.router)
router.include_router(documents.router)

# System & Infrastructure
router.include_router(database.router)
router.include_router(cache.router)
router.include_router(email.router)
router.include_router(storage.router)

# Security & Compliance
router.include_router(security.router)
router.include_router(sessions.router)
router.include_router(errors.router)
router.include_router(gdpr.router)

# Advanced Analytics & Monitoring
router.include_router(analytics_advanced.router)
router.include_router(llm_usage.router)


# Export router for use in main.py
__all__ = ["router"]
