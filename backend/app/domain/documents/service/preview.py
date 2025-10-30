"""
Document Preview and Download Functionality

Provides preview generation and file download preparation for documents.
Supports multiple preview strategies based on file format:
- Direct file preview (PDF, audio)
- AI-generated HTML (via OpenAI)
- Simple HTML formatting with bullets
- Plain text fallback

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, Tuple
from pathlib import Path
import uuid
import mimetypes

from ....db import models
from ....infra.logging import get_logger

logger = get_logger(__name__)


class PreviewError(Exception):
    """Base exception for preview operations."""
    pass


class PreviewValidationError(PreviewError):
    """Raised when preview validation fails."""
    pass


class PreviewNotFoundError(PreviewError):
    """Raised when document not found."""
    pass


# Supported media types
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus"}
DIRECT_PREVIEW_EXTENSIONS = {".pdf"} | AUDIO_EXTENSIONS


class DocumentPreview:
    """
    Handles document preview and download operations.
    
    Provides multiple preview strategies based on document format and
    prepares files for download with proper metadata.
    """
    
    def __init__(self, utils):
        """
        Initialize preview handler with document utilities.
        
        Args:
            utils: DocumentUtils instance for metadata and LLM access
        
        Raises:
            PreviewValidationError: If utils is None
        """
        if not utils:
            logger.error("DocumentPreview initialized with None utils")
            raise PreviewValidationError("DocumentUtils instance is required")
        
        self.utils = utils
        logger.debug("DocumentPreview initialized successfully")
    
    def resolve_download(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str
    ) -> Tuple[Path, str, str]:
        """
        Prepare document for download.
        
        Validates access, resolves display name from sidecar, and determines
        proper media type for the file.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            document_id: Document ID (UUID string)
        
        Returns:
            Tuple of (file_path, filename, media_type)
        
        Raises:
            PreviewValidationError: If IDs are invalid
            PreviewNotFoundError: If document not found or file missing
            PreviewError: If database operation fails
        
        Example:
            path, filename, media_type = preview.resolve_download(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                document_id="987fcdeb-51a2-43f1-b2e3-123456789abc"
            )
        """
        try:
            # Validate inputs
            if not user_id:
                raise PreviewValidationError("user_id is required")
            
            if not document_id:
                raise PreviewValidationError("document_id is required")
            
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                raise PreviewValidationError(f"Invalid user_id format: {e}")
            
            try:
                uuid.UUID(document_id)
            except (ValueError, AttributeError) as e:
                raise PreviewValidationError(f"Invalid document_id format: {e}")
            
            logger.debug(
                f"Resolving download",
                extra={"document_id": document_id, "user_id": user_id}
            )
            
            # Query document
            try:
                doc = (
                    db.query(models.Resume)
                    .filter(
                        models.Resume.id == uuid.UUID(document_id),
                        models.Resume.user_id == uuid.UUID(user_id)
                    )
                    .first()
                )
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"document_id": document_id, "user_id": user_id},
                    exc_info=True
                )
                raise PreviewError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found for download",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise PreviewNotFoundError("Document not found")
            
            path = Path(doc.file_path)
            if not path.exists():
                logger.error(
                    f"Stored file missing",
                    extra={"document_id": document_id, "path": str(path)}
                )
                raise PreviewNotFoundError("Stored file missing")
            
            # Get display name from sidecar
            try:
                side = self.utils.sidecar(path)
                display_name = (side.get("name") or doc.label or path.stem).strip()
            except Exception as e:
                logger.warning(f"Could not read sidecar, using fallback name: {e}")
                display_name = doc.label or path.stem
            
            # Sanitize filename
            safe_name = "".join(c for c in display_name if c.isalnum() or c in " _-").strip() or "document"
            filename = f"{safe_name}{path.suffix}"
            
            # Determine media type
            media, _ = mimetypes.guess_type(str(path))
            if not media:
                media = "application/octet-stream"
                logger.debug(f"Unknown media type, using octet-stream")
            
            logger.info(
                "Document download prepared",
                extra={
                    "document_id": document_id,
                    "filename": filename,
                    "media_type": media,
                    "file_size": path.stat().st_size if path.exists() else 0
                }
            )
            
            return path, filename, media
            
        except (PreviewValidationError, PreviewNotFoundError, PreviewError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error preparing download: {e}",
                extra={"document_id": document_id, "user_id": user_id},
                exc_info=True
            )
            raise PreviewError(f"Failed to prepare download: {e}")
    
    def get_preview_payload(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Get preview payload for document with multiple fallback strategies.
        
        Returns preview in the best available format:
        1. Direct file preview (PDF, audio) - "inline_file"
        2. AI-generated HTML (DOCX via OpenAI) - "html"
        3. Simple HTML formatting - "html"
        4. Plain text - "text"
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            document_id: Document ID (UUID string)
        
        Returns:
            Tuple of (preview_type, payload_dict)
            - preview_type: "inline_file", "html", or "text"
            - payload_dict: Contains type-specific data
        
        Raises:
            PreviewValidationError: If IDs are invalid
            PreviewNotFoundError: If document not found
            PreviewError: If preview generation fails
        
        Example:
            preview_type, payload = preview.get_preview_payload(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                document_id="987fcdeb-51a2-43f1-b2e3-123456789abc"
            )
            if preview_type == "html":
                html_content = payload["content"]
        """
        try:
            # Validate inputs
            if not user_id:
                raise PreviewValidationError("user_id is required")
            
            if not document_id:
                raise PreviewValidationError("document_id is required")
            
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                raise PreviewValidationError(f"Invalid user_id format: {e}")
            
            try:
                uuid.UUID(document_id)
            except (ValueError, AttributeError) as e:
                raise PreviewValidationError(f"Invalid document_id format: {e}")
            
            logger.debug(
                f"Generating preview",
                extra={"document_id": document_id, "user_id": user_id}
            )
            
            # Query document
            try:
                doc = (
                    db.query(models.Resume)
                    .filter(
                        models.Resume.id == uuid.UUID(document_id),
                        models.Resume.user_id == uuid.UUID(user_id)
                    )
                    .first()
                )
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"document_id": document_id, "user_id": user_id},
                    exc_info=True
                )
                raise PreviewError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found for preview",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise PreviewNotFoundError("Document not found")
            
            p = Path(doc.file_path)
            ext = p.suffix.lower()
            
            logger.debug(
                f"Document located",
                extra={
                    "document_id": document_id,
                    "extension": ext,
                    "file_exists": p.exists()
                }
            )
            
            # Strategy 1: PDF files - direct preview
            if ext == ".pdf":
                if not p.exists():
                    logger.warning(f"PDF file missing: {p}")
                    raise PreviewNotFoundError("PDF file not found")
                
                media, _ = mimetypes.guess_type(str(p))
                logger.info("Preview: PDF direct", extra={"document_id": document_id})
                return "inline_file", {"path": str(p), "media": media or "application/pdf"}
            
            # Strategy 2: Audio files - direct preview
            if ext in AUDIO_EXTENSIONS:
                if not p.exists():
                    logger.warning(f"Audio file missing: {p}")
                    raise PreviewNotFoundError("Audio file not found")
                
                media, _ = mimetypes.guess_type(str(p))
                logger.info(
                    "Preview: Audio direct",
                    extra={"document_id": document_id, "extension": ext}
                )
                return "inline_file", {"path": str(p), "media": media or "audio/mpeg"}
            
            # Strategy 3: DOCX files - multiple fallbacks
            if ext == ".docx":
                # 3a. Check for pre-generated PDF preview
                preview_pdf = p.with_suffix(".preview.pdf")
                if preview_pdf.exists():
                    logger.info(
                        "Preview: Pre-generated PDF",
                        extra={"document_id": document_id}
                    )
                    return "inline_file", {"path": str(preview_pdf), "media": "application/pdf"}
                
                # 3b. Try OpenAI HTML generation
                if self.utils._llm is not None:
                    try:
                        logger.debug("Attempting OpenAI HTML generation")
                        html_content = self.utils.generate_html_via_openai(doc.text or "")
                        logger.info(
                            "Preview: AI-generated HTML",
                            extra={"document_id": document_id, "html_length": len(html_content)}
                        )
                        return "html", {"content": html_content}
                    except Exception as e:
                        logger.warning(
                            f"OpenAI HTML generation failed, trying simple HTML: {e}",
                            extra={"document_id": str(doc.id)}
                        )
                else:
                    logger.debug("LLM not available, skipping AI HTML generation")
                
                # 3c. Fallback to simple HTML formatting
                try:
                    logger.debug("Generating simple HTML preview")
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
                    logger.info(
                        "Preview: Simple HTML",
                        extra={"document_id": document_id, "html_length": len(html_content)}
                    )
                    return "html", {"content": html_content}
                except Exception as e:
                    logger.warning(
                        f"Simple HTML generation failed, using plain text: {e}",
                        extra={"document_id": str(doc.id)}
                    )
            
            # Strategy 4: Default - return plain text
            text = doc.text or ""
            if not text:
                logger.warning(
                    f"No text available for preview",
                    extra={"document_id": document_id}
                )
            
            logger.info(
                "Preview: Plain text",
                extra={"document_id": document_id, "text_length": len(text)}
            )
            return "text", {"text": text or "(no preview text available)"}
            
        except (PreviewValidationError, PreviewNotFoundError, PreviewError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error generating preview: {e}",
                extra={"document_id": document_id, "user_id": user_id},
                exc_info=True
            )
            raise PreviewError(f"Failed to generate preview: {e}")
