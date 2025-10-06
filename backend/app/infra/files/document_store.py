from __future__ import annotations
from pathlib import Path
from typing import Dict, Any
import json
import re
from ..logging import get_logger

logger = get_logger(__name__)

UPLOAD_ROOT = Path("/app/uploads/documents")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

def sanitize_display_name(name: str | None) -> str:
    if not name:
        return "document"
    base = re.sub(r"\.[^./\\]+$", "", name).strip()
    base = re.sub(r"[^a-zA-Z0-9 _-]+", "", base).strip()
    return base or "document"

class DocumentStore:
    """Filesystem adapter for documents + sidecar metadata."""
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or UPLOAD_ROOT
        self.root.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, content: bytes, filename: str) -> Path:
        suffix = Path(filename).suffix.lower() or ".bin"
        # Random filename from caller (already generated), just write here
        # or if not generated, make a unique name:
        import uuid
        path = self.root / f"{uuid.uuid4()}{suffix}"
        path.write_bytes(content)
        return path

    def read_sidecar(self, file_path: Path) -> Dict[str, Any]:
        meta_path = file_path.with_suffix(file_path.suffix + ".meta.json")
        if meta_path.exists():
            try:
                return json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        meta_path = file_path.with_suffix(file_path.suffix + ".meta.json")
        try:
            meta_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error("Failed to write sidecar file", extra={
                "file_path": str(file_path),
                "error": str(e)
            })
