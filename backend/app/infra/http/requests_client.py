from __future__ import annotations
from typing import Dict, Any
import requests
from ...domain.auth.ports import IHTTPClient

class RequestsHTTPClient(IHTTPClient):
    def get(self, url: str, headers: Dict[str, str] | None = None, params: Dict[str, str] | None = None, timeout: int = 10):
        return requests.get(url, headers=headers, params=params, timeout=timeout)
    def post(self, url: str, data: Dict[str, Any] | None = None, json: Dict[str, Any] | None = None, headers: Dict[str, str] | None = None, params: Dict[str, str] | None = None, timeout: int = 10):
        return requests.post(url, data=data, json=json, headers=headers, params=params, timeout=timeout)
