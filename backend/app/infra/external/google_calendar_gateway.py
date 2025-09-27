from __future__ import annotations
from typing import Optional, Tuple, List
from uuid import UUID
from datetime import datetime
import uuid as _uuid
import httpx

from ...auth.oauth.google import get_valid_google_token
from ...domain.reminders.ports import ICalendarGateway

class GoogleCalendarGateway(ICalendarGateway):
    def __init__(self, *, http_timeout: float = 10.0):
        self._client = httpx.AsyncClient(timeout=http_timeout)

    async def _token(self, *, user_id: UUID, db) -> Optional[str]:
        return await get_valid_google_token(db, user_id)  # expects Session in DI layer call-sites

    async def is_connected(self, *, user_id: UUID, db=None) -> bool:  # db is injected by DI provider via lambda
        tok = await get_valid_google_token(db, user_id)
        return bool(tok)

    async def create_event(self, *, user_id: UUID, title: str, description: str | None,
                           start: datetime, end: datetime, timezone_str: str,
                           calendar_id: str, add_meet_link: bool, private_props: Optional[dict] = None,
                           db=None) -> Tuple[str, Optional[str]]:
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            raise RuntimeError("Google Calendar not connected")

        event = {
            "summary": title,
            "description": description or "",
            "start": {"dateTime": start.isoformat(), "timeZone": timezone_str},
            "end": {"dateTime": end.isoformat(), "timeZone": timezone_str},
            "reminders": {"useDefault": False, "overrides": [{"method": "email", "minutes": 1440}, {"method": "popup", "minutes": 30}]},
        }
        if private_props:
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

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
        r = await self._client.post(url, headers=headers, params=params, json=event)
        r.raise_for_status()
        data = r.json()
        meet_url = data.get("hangoutLink")
        if not meet_url:
            for ep in (data.get("conferenceData", {}) or {}).get("entryPoints", []) or []:
                if ep.get("entryPointType") == "video" and ep.get("uri"):
                    meet_url = ep["uri"]; break
        return data.get("id"), meet_url

    async def update_event(self, *, user_id: UUID, event_id: str, title: Optional[str], description: Optional[str],
                           start: Optional[datetime], end: Optional[datetime], timezone_str: Optional[str] = None,
                           calendar_id: str = "primary", db=None) -> None:
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token: return
        body = {}
        if title is not None: body["summary"] = title
        if description is not None: body["description"] = description or ""
        if start is not None and end is not None:
            body["start"] = {"dateTime": start.isoformat(), "timeZone": timezone_str or "UTC"}
            body["end"]   = {"dateTime": end.isoformat(), "timeZone": timezone_str or "UTC"}
        if not body: return
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
        r = await self._client.patch(url, headers=headers, json=body)
        r.raise_for_status()

    async def delete_event(self, *, user_id: UUID, event_id: str, calendar_id: str = "primary", db=None) -> None:
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token: return
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
        await self._client.delete(url, headers=headers)

    async def get_event(self, *, user_id: UUID, event_id: str, calendar_id: str = "primary", db=None) -> dict:
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            raise RuntimeError("Google Calendar not connected")
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
        r = await self._client.get(url, headers=headers)
        r.raise_for_status()
        return r.json()

    async def list_events(self, *, user_id: UUID, calendar_id: str = "primary",
                          time_min: Optional[str] = None, time_max: Optional[str] = None, max_results: int = 100, db=None) -> List[dict]:
        access_token = await self._token(user_id=user_id, db=db)
        if not access_token:
            raise RuntimeError("Google Calendar not connected")
        params = {"maxResults": max_results, "singleEvents": "true", "orderBy": "startTime"}
        if time_min: params["timeMin"] = time_min
        if time_max: params["timeMax"] = time_max
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
        r = await self._client.get(url, headers=headers, params=params)
        r.raise_for_status()
        return r.json().get("items", [])
