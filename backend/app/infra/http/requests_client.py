from __future__ import annotations
from typing import Dict, Any, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from ...domain.auth.ports import IHTTPClient

_DEFAULT_TIMEOUT = (5, 10)  # (connect, read) seconds

class _TimeoutSession(requests.Session):
    def __init__(self, timeout: tuple[int, int] = _DEFAULT_TIMEOUT) -> None:
        super().__init__()
        self._timeout = timeout

    def request(self, *args, **kwargs):
        if "timeout" not in kwargs or kwargs["timeout"] is None:
            kwargs["timeout"] = self._timeout
        return super().request(*args, **kwargs)

def _build_session() -> requests.Session:
    s = _TimeoutSession()
    retry = Retry(
        total=3,
        backoff_factor=0.2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=50)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

class RequestsHTTPClient(IHTTPClient):
    def __init__(self) -> None:
        self._session = _build_session()

    def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        timeout: Optional[int | float | tuple[int, int]] = None,
    ):
        return self._session.get(url, headers=headers, params=params, timeout=timeout)

    def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        timeout: Optional[int | float | tuple[int, int]] = None,
    ):
        return self._session.post(url, data=data, json=json, headers=headers, params=params, timeout=timeout)
