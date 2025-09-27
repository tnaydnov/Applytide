from __future__ import annotations
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import HTTPException, UploadFile

ATTACH_UPLOAD_DIR = Path("app/uploads/app_attachments")
ATTACH_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class AttachmentStore:
    def __init__(self, base_dir: Path | None = None, max_bytes: int = 10 * 1024 * 1024):
        self.base = base_dir or ATTACH_UPLOAD_DIR
        self.max = max_bytes

    def copy_from_path(self, src: Path, suggested_name: Optional[str], media_type: Optional[str]) -> Tuple[Path, int, str, str]:
        if not src.exists():
            raise HTTPException(status_code=404, detail="Source document file not found")
        dst = self.base / f"{uuid.uuid4()}{src.suffix}"
        data = src.read_bytes()
        dst.write_bytes(data)
        size = len(data)
        filename = suggested_name or src.name or "document"
        content_type = media_type or "application/octet-stream"
        return dst, size, filename, content_type

    async def save_upload(self, file: UploadFile) -> Tuple[Path, int, str, str]:
        dst = self.base / f"{uuid.uuid4()}{Path(file.filename or '').suffix}"
        total = 0
        try:
            with open(dst, "wb") as buf:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > self.max:
                        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
                    buf.write(chunk)
        except Exception:
            dst.unlink(missing_ok=True)
            raise
        filename = file.filename or "unknown"
        content_type = file.content_type or "application/octet-stream"
        return dst, total, filename, content_type
