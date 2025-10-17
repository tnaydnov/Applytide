"""Document preview and download functionality."""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import Dict, Any, Tuple
from pathlib import Path
import uuid
import mimetypes
from fastapi import HTTPException

from ....db import models
from ....infra.logging import get_logger

logger = get_logger(__name__)


class DocumentPreview:
    """Handles document preview and download operations."""
    
    def __init__(self, utils):
        self.utils = utils
    
    def resolve_download(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str
    ) -> Tuple[Path, str, str]:
        """Prepare document for download - returns (path, filename, media_type)."""
        doc = (
            db.query(models.Resume)
            .filter(
                models.Resume.id == uuid.UUID(document_id),
                models.Resume.user_id == uuid.UUID(user_id)
            )
            .first()
        )
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        path = Path(doc.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Stored file missing")
        
        # Get display name from sidecar
        side = self.utils.sidecar(path)
        display_name = (side.get("name") or doc.label or path.stem).strip()
        safe_name = "".join(c for c in display_name if c.isalnum() or c in " _-").strip() or "document"
        filename = f"{safe_name}{path.suffix}"
        
        # Determine media type
        media, _ = mimetypes.guess_type(str(path))
        if not media:
            media = "application/octet-stream"
        
        logger.debug("Document download prepared", extra={
            "document_id": document_id,
            "filename": filename,
            "media_type": media
        })
        
        return path, filename, media
    
    def get_preview_payload(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Get preview payload for document.
        Returns (preview_type, payload_data) where type is:
        - "inline_file": Direct file preview (PDF, audio)
        - "html": HTML preview content
        - "text": Plain text preview
        """
        doc = (
            db.query(models.Resume)
            .filter(
                models.Resume.id == uuid.UUID(document_id),
                models.Resume.user_id == uuid.UUID(user_id)
            )
            .first()
        )
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        p = Path(doc.file_path)
        ext = p.suffix.lower()
        
        # PDF files - direct preview
        if ext == ".pdf" and p.exists():
            media, _ = mimetypes.guess_type(str(p))
            return "inline_file", {"path": str(p), "media": media or "application/pdf"}
        
        # Audio files - direct preview
        if ext in {".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus"} and p.exists():
            media, _ = mimetypes.guess_type(str(p))
            return "inline_file", {"path": str(p), "media": media or "audio/mpeg"}
        
        # DOCX files - try multiple preview methods
        if ext == ".docx":
            # 1. Check for pre-generated PDF preview
            preview_pdf = p.with_suffix(".preview.pdf")
            if preview_pdf.exists():
                return "inline_file", {"path": str(preview_pdf), "media": "application/pdf"}
            
            # 2. Try OpenAI HTML generation
            if self.utils._llm is not None:
                try:
                    html_content = self.utils.generate_html_via_openai(doc.text or "")
                    return "html", {"content": html_content}
                except Exception as e:
                    logger.warning("Failed to generate HTML preview via OpenAI", extra={
                        "document_id": str(doc.id),
                        "error": str(e)
                    })
            
            # 3. Fallback to simple HTML formatting
            try:
                processed = (doc.text or "")
                processed = processed.replace('•', '<div class="bullet">')
                processed = processed.replace('\n•', '</div>\n<div class="bullet">')
                processed = processed.replace('\n', '<br>')
                html_content = f"""<!DOCTYPE html>
<html><head><title>Resume Preview</title>
<style>
body {{ font-family: 'Calibri', Arial, sans-serif; line-height:1.4; padding:40px; max-width:800px; margin:0 auto; color:#333; }}
h1 {{ font-size:18px; font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:8px; margin-top:20px; }}
.bullet {{ margin-left:20px; position:relative; }}
.bullet:before {{ content:"•"; position:absolute; left:-15px; }}
</style></head><body>
<h1>Resume Preview</h1>
<div style="white-space: pre-wrap;">{processed}</div>
</body></html>"""
                return "html", {"content": html_content}
            except Exception as e:
                logger.warning("Failed to generate simple HTML preview", extra={
                    "document_id": str(doc.id),
                    "error": str(e)
                })
        
        # Default - return plain text
        text = doc.text or ""
        return "text", {"text": text or "(no preview text available)"}
