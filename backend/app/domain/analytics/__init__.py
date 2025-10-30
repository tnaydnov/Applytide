"""
Analytics Domain Module

Business logic for job application analytics and insights.

This module provides comprehensive analytics capabilities for tracking
job applications, calculating success metrics, identifying patterns,
and providing actionable insights to users.

Modules:
    - service: AnalyticsService for metrics calculation
    - dto: Data Transfer Objects for analytics data
    - ports: Repository interfaces
    - metrics: Pure functions for metric calculations

Key Features:
    - Overview metrics (applications, interviews, offers)
    - Application tracking and analysis
    - Interview performance metrics  
    - Company-specific analytics
    - Timeline and funnel analysis
    - Activity streaks and patterns
    - Source effectiveness tracking
    - A/B testing support
    - Best time recommendations
    - Response time expectations

Architecture:
    - Pure domain layer (framework-agnostic)
    - Functional metric calculations
    - DTO pattern for data transfer
    - Repository pattern via ports
    - Comprehensive error handling

Usage:
    from app.domain.analytics import AnalyticsService
    
    service = AnalyticsService(repo)
    analytics = service.get_analytics(
        user_id=user_id,
        range_param="3m"
    )
"""
