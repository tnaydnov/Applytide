"""
Shared Utilities for Applications Router

Provides common functionality used across all application router modules:
- Pagination calculation helpers
- WebSocket event broadcasting (best-effort)
- Centralized logging instances

These utilities reduce code duplication and ensure consistent
behavior across all application endpoints.
"""
from __future__ import annotations
from typing import Tuple
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

# Initialize logging instances for all application routers
logger = get_logger(__name__)
event_logger = BusinessEventLogger()


def paginate(total: int, page: int, page_size: int) -> Tuple[int, bool, bool]:
    """
    Calculate pagination metadata.
    
    Args:
        total: Total number of items
        page: Current page number (1-based)
        page_size: Items per page
        
    Returns:
        Tuple of (pages, has_next, has_prev)
    """
    pages = (total + page_size - 1) // page_size if total > 0 else 1
    has_next = page < pages
    has_prev = page > 1
    return pages, has_next, has_prev


def broadcast_event(event_type: str, application_id: str, **kwargs):
    """
    Broadcast WebSocket event to connected clients (best-effort).
    
    Attempts to send real-time updates via WebSocket to all connected
    clients. Failures are logged but do not interrupt request processing.
    This is a non-blocking, best-effort operation.
    
    Args:
        event_type (str): Event type identifier:
            - 'stage_changed': Application status changed
            - 'stage_added': New stage added
            - 'stage_updated': Stage modified
            - 'stage_deleted': Stage removed
            - 'note_added': Note added
            - 'attachment_added': Attachment uploaded
            - 'attachment_deleted': Attachment removed
            - 'application_deleted': Application deleted
        application_id (str): UUID of the affected application
        **kwargs: Additional event-specific data to include in broadcast
        
    Notes:
        - Never raises exceptions - failures are logged as debug messages
        - Requires WebSocket infrastructure to be available
        - Uses anyio for async execution from sync context
        - All connected clients receive the event
        - Event data is JSON-serialized before transmission
        
    Example:
        broadcast_event("stage_changed", str(app_id), status="interview")
        Notifies clients that application status changed to interview
    """
    try:
        import anyio
        from ..ws import broadcast
        
        event_data = {
            "type": event_type,
            "application_id": application_id,
            **kwargs
        }
        
        anyio.from_thread.run(broadcast, event_data)
        
        logger.debug(
            f"Broadcast {event_type} event",
            extra={
                "event_type": event_type,
                "application_id": application_id,
                "additional_data": list(kwargs.keys())
            }
        )
        
    except Exception as e:
        # Log but don't fail the request
        logger.debug(
            f"Failed to broadcast {event_type}",
            extra={
                "error": str(e),
                "application_id": application_id,
                "event_type": event_type
            }
        )
