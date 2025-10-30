"""
Google Calendar Gateway Module

This module provides integration with Google Calendar API for creating, updating,
deleting, and listing calendar events. It implements the ICalendarGateway port
for the reminders domain.

Features:
    - Create events with optional Meet links
    - Update and delete events
    - List events with time range filters
    - Automatic OAuth token management and refresh
    - Meet URL extraction from multiple sources

Architecture:
    - Implements ICalendarGateway port (Hexagonal Architecture)
    - Uses google_oauth module for token management
    - Async HTTP client with configurable timeout
    - Error handling with detailed logging

OAuth Flow:
    - Tokens are managed by google_oauth module
    - Automatic token refresh on expiration
    - Returns RuntimeError if user not connected

Usage Example:
    from app.infra.external.google_calendar_gateway import GoogleCalendarGateway
    from datetime import datetime, timedelta
    
    gateway = GoogleCalendarGateway()
    
    # Create event with Meet link
    event_id, meet_url = await gateway.create_event(
        user_id=user_id,
        title="Interview with Company",
        description="Technical interview round 2",
        start=datetime.now() + timedelta(days=1),
        end=datetime.now() + timedelta(days=1, hours=1),
        timezone_str="America/New_York",
        calendar_id="primary",
        add_meet_link=True,
        db=db
    )
    
    # List upcoming events
    events = await gateway.list_events(
        user_id=user_id,
        calendar_id="primary",
        time_min=datetime.now().isoformat() + "Z",
        max_results=10,
        db=db
    )

Security:
    - Access tokens are passed in Authorization header
    - Tokens are not logged (privacy)
    - User must have valid OAuth connection
    - Calendar ID defaults to "primary" (user's main calendar)

API Limits:
    - Google Calendar API: 1,000,000 queries/day (free tier)
    - Rate limiting: 10 queries/second per user
    - Consider implementing rate limiting if needed

Error Handling:
    - HTTP 401: OAuth token expired (refresh handled automatically)
    - HTTP 403: Insufficient permissions or calendar access denied
    - HTTP 404: Event or calendar not found
    - HTTP 429: Rate limit exceeded
    - HTTP 500: Google API server error
    - Network errors: Connection timeout, DNS failure
"""

from __future__ import annotations
from typing import Optional, Tuple, List
from uuid import UUID
from datetime import datetime
import uuid as _uuid
import httpx
from httpx import HTTPStatusError, ConnectError, ConnectTimeout, ReadTimeout

from .google_oauth import get_valid_google_token
from ...domain.reminders.ports import ICalendarGateway
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants
DEFAULT_HTTP_TIMEOUT: float = 10.0  # Timeout for Google API calls (seconds)
MAX_RESULTS_LIMIT: int = 2500  # Google Calendar API max (we default to 100)
DEFAULT_CALENDAR_ID: str = "primary"  # User's primary calendar
GOOGLE_CALENDAR_API_BASE: str = "https://www.googleapis.com/calendar/v3"


class GoogleCalendarGateway(ICalendarGateway):
    """
    Gateway for Google Calendar API integration.
    
    Implements the ICalendarGateway port from the reminders domain.
    Handles OAuth token management, API calls, and error handling.
    
    Attributes:
        _client: Async HTTP client for making API requests
    
    Thread Safety:
        - Async-safe (uses httpx.AsyncClient)
        - Can be shared across async tasks
        - Not thread-safe (use one instance per async context)
    """
    
    def __init__(self, *, http_timeout: float = DEFAULT_HTTP_TIMEOUT):
        """
        Initialize Google Calendar Gateway.
        
        Args:
            http_timeout: Timeout for HTTP requests to Google API (seconds).
                         Defaults to 10 seconds. Increase if experiencing timeouts.
        
        Notes:
            - Creates a new AsyncClient (expensive - reuse gateway instances)
            - Timeout applies to both connect and read operations
        """
        if http_timeout <= 0:
            logger.warning(
                "Invalid http_timeout provided, using default",
                extra={
                    "provided_timeout": http_timeout,
                    "default_timeout": DEFAULT_HTTP_TIMEOUT
                }
            )
            http_timeout = DEFAULT_HTTP_TIMEOUT
        
        self._client = httpx.AsyncClient(timeout=http_timeout)
        
        logger.debug(
            "GoogleCalendarGateway initialized",
            extra={"http_timeout": http_timeout}
        )

    async def _token(self, *, user_id: UUID, db) -> Optional[str]:
        """
        Get valid OAuth access token for user.
        
        Args:
            user_id: User's UUID
            db: Database session (injected by DI)
        
        Returns:
            Optional[str]: Valid access token, or None if user not connected
        
        Notes:
            - Handles token refresh automatically (via google_oauth module)
            - Returns None if user hasn't connected Google Calendar
            - Logs warnings if token retrieval fails
        """
        if user_id is None:
            logger.error("_token called with None user_id")
            return None
        
        try:
            token = get_valid_google_token(db, user_id)
            
            if not token:
                logger.warning(
                    "No valid Google token for user",
                    extra={"user_id": str(user_id)}
                )
            
            return token
            
        except Exception as e:
            logger.error(
                "Error getting valid Google token",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return None

    async def is_connected(self, *, user_id: UUID, db=None) -> bool:
        """
        Check if user has connected Google Calendar.
        
        Args:
            user_id: User's UUID
            db: Database session (injected by DI)
        
        Returns:
            bool: True if user has valid OAuth connection, False otherwise
        
        Example:
            >>> gateway = GoogleCalendarGateway()
            >>> if await gateway.is_connected(user_id=user_id, db=db):
            ...     print("User can create calendar events")
            ... else:
            ...     print("User needs to connect Google Calendar")
        
        Notes:
            - Doesn't make API calls (just checks token existence)
            - Fast operation (use for permission checks)
        """
        if user_id is None:
            logger.warning("is_connected called with None user_id")
            return False
        
        try:
            tok = get_valid_google_token(db, user_id)
            is_connected = bool(tok)
            
            logger.debug(
                "Google Calendar connection check",
                extra={
                    "user_id": str(user_id),
                    "is_connected": is_connected
                }
            )
            
            return is_connected
            
        except Exception as e:
            logger.error(
                "Error checking Google Calendar connection",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return False

    async def create_event(
        self, *, 
        user_id: UUID, 
        title: str, 
        description: str | None,
        start: datetime, 
        end: datetime, 
        timezone_str: str,
        calendar_id: str, 
        add_meet_link: bool, 
        private_props: Optional[dict] = None,
        db=None
    ) -> Tuple[str, Optional[str]]:
        """
        Create a calendar event with optional Meet link.
        
        Args:
            user_id: User's UUID
            title: Event title/summary
            description: Optional event description
            start: Event start datetime
            end: Event end datetime
            timezone_str: Timezone string (e.g., "America/New_York", "UTC")
            calendar_id: Google Calendar ID (use "primary" for main calendar)
            add_meet_link: If True, creates Google Meet link
            private_props: Optional extended properties (key-value pairs for metadata)
            db: Database session (injected by DI)
        
        Returns:
            Tuple[str, Optional[str]]: (event_id, meet_url)
                - event_id: Google Calendar event ID (for updates/deletes)
                - meet_url: Google Meet URL if requested, None otherwise
        
        Raises:
            RuntimeError: If user not connected to Google Calendar
            httpx.HTTPStatusError: If Google API returns error
            httpx.ConnectError: If cannot connect to Google API
            httpx.TimeoutException: If request times out
        
        Example:
            >>> event_id, meet_url = await gateway.create_event(
            ...     user_id=user_id,
            ...     title="Job Interview",
            ...     description="Technical interview with Acme Corp",
            ...     start=datetime(2024, 6, 15, 10, 0),
            ...     end=datetime(2024, 6, 15, 11, 0),
            ...     timezone_str="America/New_York",
            ...     calendar_id="primary",
            ...     add_meet_link=True,
            ...     private_props={"job_id": "123", "company": "Acme"},
            ...     db=db
            ... )
            >>> print(f"Created event {event_id} with Meet link: {meet_url}")
        
        Notes:
            - Default reminders: Email 1 day before, popup 30 min before
            - Meet link extraction tries multiple sources (hangoutLink, conferenceData)
            - Extended properties are private (not visible to attendees)
            - Timezone affects display in user's calendar
        """
        # Validate inputs
        if not title or not title.strip():
            logger.error(
                "create_event called with empty title",
                extra={"user_id": str(user_id)}
            )
            raise ValueError("Event title cannot be empty")
        
        if start >= end:
            logger.error(
                "create_event called with start >= end",
                extra={
                    "user_id": str(user_id),
                    "start": start.isoformat(),
                    "end": end.isoformat()
                }
            )
            raise ValueError("Event start must be before end")
        
        if not timezone_str:
            logger.warning(
                "create_event called without timezone_str, using UTC",
                extra={"user_id": str(user_id)}
            )
            timezone_str = "UTC"
        
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            logger.error(
                "create_event failed - user not connected",
                extra={"user_id": str(user_id)}
            )
            raise RuntimeError("Google Calendar not connected")

        # Build event payload
        event = {
            "summary": title,
            "description": description or "",
            "start": {"dateTime": start.isoformat(), "timeZone": timezone_str},
            "end": {"dateTime": end.isoformat(), "timeZone": timezone_str},
            "reminders": {
                "useDefault": False, 
                "overrides": [
                    {"method": "email", "minutes": 1440},  # 1 day before
                    {"method": "popup", "minutes": 30}     # 30 min before
                ]
            },
        }
        
        if private_props:
            if not isinstance(private_props, dict):
                logger.warning(
                    "create_event private_props not a dict, ignoring",
                    extra={
                        "user_id": str(user_id),
                        "private_props_type": type(private_props).__name__
                    }
                )
            else:
                event["extendedProperties"] = {"private": private_props}

        params = {}
        if add_meet_link:
            event["conferenceData"] = {
                "createRequest": {
                    "requestId": str(_uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }
            params["conferenceDataVersion"] = "1"

        headers = {
            "Authorization": f"Bearer {access_token}", 
            "Content-Type": "application/json"
        }
        url = f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events"
        
        try:
            logger.debug(
                "Creating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "calendar_id": calendar_id,
                    "title": title,
                    "start": start.isoformat(),
                    "add_meet_link": add_meet_link
                }
            )
            
            r = await self._client.post(url, headers=headers, params=params, json=event)
            r.raise_for_status()
            data = r.json()
            
            event_id = data.get("id")
            if not event_id:
                logger.error(
                    "Google Calendar event created but no ID returned",
                    extra={"user_id": str(user_id), "response_keys": list(data.keys())}
                )
                raise RuntimeError("Event created but no ID returned")
            
            # Extract Meet URL
            meet_url = data.get("hangoutLink")
            if not meet_url and add_meet_link:
                # Fallback: Check conferenceData.entryPoints
                for ep in (data.get("conferenceData", {}) or {}).get("entryPoints", []) or []:
                    if ep.get("entryPointType") == "video" and ep.get("uri"):
                        meet_url = ep["uri"]
                        break
                
                if not meet_url:
                    logger.warning(
                        "Meet link requested but not found in response",
                        extra={
                            "user_id": str(user_id),
                            "event_id": event_id,
                            "has_conference_data": "conferenceData" in data
                        }
                    )
            
            logger.info(
                "Google Calendar event created successfully",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "has_meet_link": bool(meet_url),
                    "title": title
                }
            )
            
            return event_id, meet_url
            
        except HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = e.response.text[:500]  # Limit error text
            
            logger.error(
                "Google Calendar API error creating event",
                extra={
                    "user_id": str(user_id),
                    "status_code": status_code,
                    "error_detail": error_detail,
                    "calendar_id": calendar_id,
                    "title": title
                },
                exc_info=True
            )
            
            if status_code == 401:
                raise RuntimeError("OAuth token expired or invalid") from e
            elif status_code == 403:
                raise RuntimeError("Insufficient permissions or calendar access denied") from e
            elif status_code == 404:
                raise RuntimeError(f"Calendar '{calendar_id}' not found") from e
            elif status_code == 429:
                raise RuntimeError("Rate limit exceeded - please retry later") from e
            else:
                raise
        
        except (ConnectError, ConnectTimeout, ReadTimeout) as e:
            logger.error(
                "Network error creating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "calendar_id": calendar_id
                },
                exc_info=True
            )
            raise RuntimeError("Failed to connect to Google Calendar API") from e
        
        except Exception as e:
            logger.error(
                "Unexpected error creating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "calendar_id": calendar_id,
                    "title": title
                },
                exc_info=True
            )
            raise

    async def update_event(
        self, *, 
        user_id: UUID, 
        event_id: str, 
        title: Optional[str], 
        description: Optional[str],
        start: Optional[datetime], 
        end: Optional[datetime], 
        timezone_str: Optional[str] = None,
        calendar_id: str = DEFAULT_CALENDAR_ID, 
        db=None
    ) -> None:
        """
        Update an existing calendar event.
        
        Args:
            user_id: User's UUID
            event_id: Google Calendar event ID (from create_event)
            title: Optional new title (None = no change)
            description: Optional new description (None = no change)
            start: Optional new start datetime (None = no change)
            end: Optional new end datetime (None = no change)
            timezone_str: Optional timezone (required if changing start/end)
            calendar_id: Google Calendar ID (defaults to "primary")
            db: Database session (injected by DI)
        
        Returns:
            None: Silently succeeds or fails (logs errors)
        
        Raises:
            No exceptions raised - logs errors and returns
        
        Example:
            >>> await gateway.update_event(
            ...     user_id=user_id,
            ...     event_id="abc123xyz",
            ...     title="Updated Interview Time",
            ...     start=datetime(2024, 6, 15, 14, 0),  # Change time
            ...     end=datetime(2024, 6, 15, 15, 0),
            ...     timezone_str="America/New_York",
            ...     db=db
            ... )
        
        Notes:
            - Only updates fields that are not None
            - If no fields to update, returns immediately
            - If user not connected, returns silently (check is_connected first)
            - HTTP errors are logged but not raised (graceful degradation)
        """
        # Validate event_id
        if not event_id or not event_id.strip():
            logger.error(
                "update_event called with empty event_id",
                extra={"user_id": str(user_id)}
            )
            return
        
        # Validate start/end combination
        if (start is not None) != (end is not None):
            logger.error(
                "update_event must specify both start and end, or neither",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "has_start": start is not None,
                    "has_end": end is not None
                }
            )
            return
        
        if start is not None and end is not None and start >= end:
            logger.error(
                "update_event called with start >= end",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "start": start.isoformat(),
                    "end": end.isoformat()
                }
            )
            return
        
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            logger.warning(
                "update_event called but user not connected",
                extra={"user_id": str(user_id), "event_id": event_id}
            )
            return
        
        # Build update payload
        body = {}
        if title is not None:
            if not title.strip():
                logger.warning(
                    "update_event called with empty title, ignoring",
                    extra={"user_id": str(user_id), "event_id": event_id}
                )
            else:
                body["summary"] = title
        
        if description is not None:
            body["description"] = description or ""
        
        if start is not None and end is not None:
            tz = timezone_str or "UTC"
            body["start"] = {"dateTime": start.isoformat(), "timeZone": tz}
            body["end"] = {"dateTime": end.isoformat(), "timeZone": tz}
        
        if not body:
            logger.debug(
                "update_event called with no changes",
                extra={"user_id": str(user_id), "event_id": event_id}
            )
            return
        
        headers = {
            "Authorization": f"Bearer {access_token}", 
            "Content-Type": "application/json"
        }
        url = f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events/{event_id}"
        
        try:
            logger.debug(
                "Updating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "calendar_id": calendar_id,
                    "fields_updated": list(body.keys())
                }
            )
            
            r = await self._client.patch(url, headers=headers, json=body)
            r.raise_for_status()
            
            logger.info(
                "Google Calendar event updated successfully",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "fields_updated": list(body.keys())
                }
            )
            
        except HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = e.response.text[:500]
            
            logger.error(
                "Google Calendar API error updating event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "status_code": status_code,
                    "error_detail": error_detail,
                    "calendar_id": calendar_id
                },
                exc_info=True
            )
            return  # Graceful degradation
        
        except (ConnectError, ConnectTimeout, ReadTimeout) as e:
            logger.error(
                "Network error updating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return
        
        except Exception as e:
            logger.error(
                "Unexpected error updating Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return

    async def delete_event(
        self, *, 
        user_id: UUID, 
        event_id: str, 
        calendar_id: str = DEFAULT_CALENDAR_ID, 
        db=None
    ) -> None:
        """
        Delete a calendar event.
        
        Args:
            user_id: User's UUID
            event_id: Google Calendar event ID
            calendar_id: Google Calendar ID (defaults to "primary")
            db: Database session (injected by DI)
        
        Returns:
            None: Silently succeeds or fails
        
        Raises:
            No exceptions raised - logs errors and returns
        
        Example:
            >>> await gateway.delete_event(
            ...     user_id=user_id,
            ...     event_id="abc123xyz",
            ...     db=db
            ... )
        
        Notes:
            - If user not connected, returns silently
            - HTTP errors are logged but not raised
            - Idempotent: Deleting non-existent event logs warning but succeeds
        """
        if not event_id or not event_id.strip():
            logger.error(
                "delete_event called with empty event_id",
                extra={"user_id": str(user_id)}
            )
            return
        
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            logger.warning(
                "delete_event called but user not connected",
                extra={"user_id": str(user_id), "event_id": event_id}
            )
            return
        
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events/{event_id}"
        
        try:
            logger.debug(
                "Deleting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "calendar_id": calendar_id
                }
            )
            
            r = await self._client.delete(url, headers=headers)
            r.raise_for_status()
            
            logger.info(
                "Google Calendar event deleted successfully",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id
                }
            )
            
        except HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = e.response.text[:500]
            
            logger.error(
                "Google Calendar API error deleting event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "status_code": status_code,
                    "error_detail": error_detail,
                    "calendar_id": calendar_id
                },
                exc_info=True
            )
            return
        
        except (ConnectError, ConnectTimeout, ReadTimeout) as e:
            logger.error(
                "Network error deleting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return
        
        except Exception as e:
            logger.error(
                "Unexpected error deleting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return

    async def get_event(
        self, *, 
        user_id: UUID, 
        event_id: str, 
        calendar_id: str = DEFAULT_CALENDAR_ID, 
        db=None
    ) -> dict:
        """
        Get a single calendar event by ID.
        
        Args:
            user_id: User's UUID
            event_id: Google Calendar event ID
            calendar_id: Google Calendar ID (defaults to "primary")
            db: Database session (injected by DI)
        
        Returns:
            dict: Event data from Google Calendar API
        
        Raises:
            RuntimeError: If user not connected or event not found
            httpx.HTTPStatusError: If Google API returns error
            httpx.ConnectError: If cannot connect to Google API
        
        Example:
            >>> event = await gateway.get_event(
            ...     user_id=user_id,
            ...     event_id="abc123xyz",
            ...     db=db
            ... )
            >>> print(f"Event: {event['summary']} at {event['start']['dateTime']}")
        
        Notes:
            - Returns full event data (see Google Calendar API docs)
            - Raises RuntimeError if event not found (404)
        """
        if not event_id or not event_id.strip():
            logger.error(
                "get_event called with empty event_id",
                extra={"user_id": str(user_id)}
            )
            raise ValueError("Event ID cannot be empty")
        
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            logger.error(
                "get_event failed - user not connected",
                extra={"user_id": str(user_id), "event_id": event_id}
            )
            raise RuntimeError("Google Calendar not connected")
        
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events/{event_id}"
        
        try:
            logger.debug(
                "Getting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "calendar_id": calendar_id
                }
            )
            
            r = await self._client.get(url, headers=headers)
            r.raise_for_status()
            data = r.json()
            
            logger.debug(
                "Google Calendar event retrieved successfully",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "title": data.get("summary", "N/A")
                }
            )
            
            return data
            
        except HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = e.response.text[:500]
            
            logger.error(
                "Google Calendar API error getting event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "status_code": status_code,
                    "error_detail": error_detail,
                    "calendar_id": calendar_id
                },
                exc_info=True
            )
            
            if status_code == 404:
                raise RuntimeError(f"Event '{event_id}' not found") from e
            elif status_code == 401:
                raise RuntimeError("OAuth token expired or invalid") from e
            elif status_code == 403:
                raise RuntimeError("Insufficient permissions") from e
            else:
                raise
        
        except (ConnectError, ConnectTimeout, ReadTimeout) as e:
            logger.error(
                "Network error getting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise RuntimeError("Failed to connect to Google Calendar API") from e
        
        except Exception as e:
            logger.error(
                "Unexpected error getting Google Calendar event",
                extra={
                    "user_id": str(user_id),
                    "event_id": event_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise

    async def list_events(
        self, *, 
        user_id: UUID, 
        calendar_id: str = DEFAULT_CALENDAR_ID,
        time_min: Optional[str] = None, 
        time_max: Optional[str] = None, 
        max_results: int = 100, 
        db=None
    ) -> List[dict]:
        """
        List calendar events with optional time range filter.
        
        Args:
            user_id: User's UUID
            calendar_id: Google Calendar ID (defaults to "primary")
            time_min: Optional ISO 8601 datetime string for lower bound (e.g., "2024-06-01T00:00:00Z")
            time_max: Optional ISO 8601 datetime string for upper bound (e.g., "2024-06-30T23:59:59Z")
            max_results: Maximum number of events to return (default 100, max 2500)
            db: Database session (injected by DI)
        
        Returns:
            List[dict]: List of event dictionaries from Google Calendar API.
                       Empty list if no events found or error occurred.
        
        Raises:
            RuntimeError: If user not connected
            httpx.HTTPStatusError: If Google API returns error
        
        Example:
            >>> from datetime import datetime
            >>> events = await gateway.list_events(
            ...     user_id=user_id,
            ...     time_min=datetime.now().isoformat() + "Z",
            ...     max_results=10,
            ...     db=db
            ... )
            >>> for event in events:
            ...     print(f"Event: {event['summary']} at {event['start']['dateTime']}")
        
        Notes:
            - Events are sorted by start time (earliest first)
            - Recurring events are expanded to single instances
            - Returns empty list [] on errors (check logs)
            - Time strings should be in ISO 8601 format with 'Z' suffix for UTC
        """
        # Validate max_results
        if max_results <= 0:
            logger.warning(
                "list_events called with invalid max_results, using default",
                extra={
                    "user_id": str(user_id),
                    "provided_max": max_results,
                    "using_max": 100
                }
            )
            max_results = 100
        
        if max_results > MAX_RESULTS_LIMIT:
            logger.warning(
                "list_events max_results exceeds API limit, capping",
                extra={
                    "user_id": str(user_id),
                    "requested_max": max_results,
                    "capped_max": MAX_RESULTS_LIMIT
                }
            )
            max_results = MAX_RESULTS_LIMIT
        
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            logger.error(
                "list_events failed - user not connected",
                extra={"user_id": str(user_id)}
            )
            raise RuntimeError("Google Calendar not connected")
        
        params = {
            "maxResults": max_results, 
            "singleEvents": "true",  # Expand recurring events
            "orderBy": "startTime"
        }
        if time_min:
            params["timeMin"] = time_min
        if time_max:
            params["timeMax"] = time_max
        
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events"
        
        try:
            logger.debug(
                "Listing Google Calendar events",
                extra={
                    "user_id": str(user_id),
                    "calendar_id": calendar_id,
                    "time_min": time_min,
                    "time_max": time_max,
                    "max_results": max_results
                }
            )
            
            r = await self._client.get(url, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
            
            items = data.get("items", [])
            
            logger.info(
                "Google Calendar events listed successfully",
                extra={
                    "user_id": str(user_id),
                    "calendar_id": calendar_id,
                    "event_count": len(items)
                }
            )
            
            return items
            
        except HTTPStatusError as e:
            status_code = e.response.status_code
            error_detail = e.response.text[:500]
            
            logger.error(
                "Google Calendar API error listing events",
                extra={
                    "user_id": str(user_id),
                    "status_code": status_code,
                    "error_detail": error_detail,
                    "calendar_id": calendar_id
                },
                exc_info=True
            )
            
            if status_code == 404:
                raise RuntimeError(f"Calendar '{calendar_id}' not found") from e
            elif status_code == 401:
                raise RuntimeError("OAuth token expired or invalid") from e
            elif status_code == 403:
                raise RuntimeError("Insufficient permissions") from e
            else:
                raise
        
        except (ConnectError, ConnectTimeout, ReadTimeout) as e:
            logger.error(
                "Network error listing Google Calendar events",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise RuntimeError("Failed to connect to Google Calendar API") from e
        
        except Exception as e:
            logger.error(
                "Unexpected error listing Google Calendar events",
                extra={
                    "user_id": str(user_id),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise


# Export all public classes and constants
__all__ = [
    'GoogleCalendarGateway',
    'DEFAULT_HTTP_TIMEOUT',
    'DEFAULT_CALENDAR_ID',
]
