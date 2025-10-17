"""Shared utilities for applications router."""
from __future__ import annotations
from typing import Tuple
from ....infra.logging import get_logger
from ....infra.logging.business_logger import BusinessEventLogger

# Initialize logging
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
    Broadcast WebSocket event (best-effort, no exceptions raised).
    
    Args:
        event_type: Event type (e.g., 'stage_changed', 'application_deleted')
        application_id: Application ID
        **kwargs: Additional event data
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
    except Exception as e:
        logger.debug(
            f"Failed to broadcast {event_type}",
            extra={"error": str(e), "application_id": application_id}
        )
