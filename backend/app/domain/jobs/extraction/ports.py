from __future__ import annotations
from typing import Protocol, Optional, Dict, Any, List

class MainContentExtractor(Protocol):
    def extract(self, html: str) -> str: ...

class TitleCompanyExtractor(Protocol):
    def extract(self, html: str) -> Dict[str, str]: ...  # {"title": str, "company_name": str}

class StructuredDataExtractor(Protocol):
    def find_job(self, html: str, url: str) -> Optional[Dict[str, Any]]: ...
    def map_job(self, obj: Dict[str, Any], url: str) -> Dict[str, Any]: ...

class LLMExtractor(Protocol):
    def extract_job(self, url: str, text: str, hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]: ...

class RequirementStripper(Protocol):
    def split(self, description: str, existing_reqs: Optional[List[str]] = None) -> tuple[str, List[str]]: ...
