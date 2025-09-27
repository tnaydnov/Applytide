from __future__ import annotations
from typing import Protocol, Optional
from pathlib import Path

class CoverLetterProvider(Protocol):
    async def generate_intelligent_cover_letter(
        self, *, job_id: str, resume_content: str, user_profile: dict,
        tone: str = "professional", length: str = "medium",
    ) -> dict: ...

class TextExtractor(Protocol):
    def extract_text(self, *, path: Path, bytes_data: Optional[bytes] = None) -> str: ...

class DocumentStore(Protocol):
    def save(self, *, user_id: str, filename: str, content: bytes) -> Path: ...
    def load(self, *, path: Path) -> bytes: ...
