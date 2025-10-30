"""
Admin Domain Module

Business logic and data structures for administrative functionality.

This module provides comprehensive admin capabilities for platform management,
including dashboard metrics, user management, error monitoring, security
tracking, and system health checks.

Modules:
    - service: AdminService for business logic
    - dto: Data Transfer Objects for admin responses
    
Architecture:
    - Pure domain layer (no framework dependencies)
    - DTO pattern for clean data transfer
    - Repository pattern for data access
    - Comprehensive error handling

Usage:
    from app.domain.admin import AdminService, dto
    
    service = AdminService(db_session)
    stats = service.get_dashboard_stats()
    users = service.get_users(page=1, page_size=20)
"""
