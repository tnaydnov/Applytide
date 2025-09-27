from __future__ import annotations
from typing import Protocol, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime

class IOAuthTokenRepo(Protocol):
    def upsert_token(self, *, user_id: UUID, provider: str, token_data: Dict[str, Any]) -> None: ...
    def get_token(self, *, user_id: UUID, provider: str) -> Optional[object]: ...
    def token_is_valid(self, token_obj: object) -> bool: ...

class IHTTPClient(Protocol):
    def get(self, url: str, headers: Dict[str, str] | None = None, params: Dict[str, str] | None = None, timeout: int = 10): ...
    def post(self, url: str, data: Dict[str, Any] | None = None, json: Dict[str, Any] | None = None, headers: Dict[str, str] | None = None, params: Dict[str, str] | None = None, timeout: int = 10): ...

class ISettings(Protocol):
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    GOOGLE_SCOPES: list[str]
    FRONTEND_URL: str
    REFRESH_SECRET: str
