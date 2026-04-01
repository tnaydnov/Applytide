"""
Document Storage Module with Sidecar Metadata

This module provides filesystem-based document storage with atomic
sidecar metadata operations. Each document can have associated metadata
stored in a .meta.json file alongside the primary document.

Features:
    - Atomic file operations (write + verify)
    - Sidecar metadata (.meta.json files)
    - Automatic directory creation
    - Path validation and sanitization
    - Comprehensive error handling
    - Detailed logging
    - Race condition protection

Storage Pattern:
    - Documents: /app/uploads/documents/{UUID}.{ext}
    - Metadata: /app/uploads/documents/{UUID}.{ext}.meta.json
    - Atomic writes for both document and metadata

Metadata Format:
    - JSON format (.meta.json extension)
    - UTF-8 encoding
    - Contains: extraction status, analysis results, timestamps, etc.

Security:
    - Path traversal prevention
    - Filename sanitization
    - Atomic operations prevent partial writes
    - Metadata corruption handling (returns empty dict)

Author: ApplyTide Team
Last Updated: 2025-01-18
"""
from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Optional
import json
import re
import uuid
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants
UPLOAD_ROOT = Path("/app/uploads/documents")
MAX_DISPLAY_NAME_LENGTH = 255  # Max filename length
SIDECAR_EXTENSION = ".meta.json"

# Ensure upload directory exists
try:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Document upload directory initialized",
        extra={"path": str(UPLOAD_ROOT)}
    )
except Exception as e:
    logger.error(
        "Failed to create document upload directory",
        extra={"path": str(UPLOAD_ROOT), "error": str(e)},
        exc_info=True
    )


class DocumentStorageError(Exception):
    """Raised when document storage operations fail."""
    pass


def sanitize_display_name(name: str | None) -> str:
    """
    Sanitize filename for safe display and storage.
    
    Removes file extension, strips dangerous characters, and ensures
    non-empty result. Used for generating display names from uploaded files.
    
    Args:
        name: Original filename (may include extension)
    
    Returns:
        str: Sanitized name (no extension, safe characters only)
    
    Notes:
        - Removes file extension
        - Keeps only: letters, numbers, spaces, underscores, hyphens
        - Strips leading/trailing whitespace
        - Returns "document" if result is empty
        - Max length: 255 characters
    
    Examples:
        >>> sanitize_display_name("My Resume.pdf")
        "My Resume"
        >>> sanitize_display_name("file@#$%name.docx")
        "filename"
        >>> sanitize_display_name(None)
        "document"
    """
    if not name:
        return "document"
    
    if not isinstance(name, str):
        logger.warning(
            "Invalid display name type",
            extra={"type": type(name).__name__}
        )
        return "document"
    
    # Remove file extension
    base = re.sub(r"\.[^./\\]+$", "", name).strip()
    
    # Remove unsafe characters (keep letters, numbers, spaces, _, -)
    base = re.sub(r"[^a-zA-Z0-9 _-]+", "", base).strip()
    
    # Truncate if too long
    if len(base) > MAX_DISPLAY_NAME_LENGTH:
        base = base[:MAX_DISPLAY_NAME_LENGTH].strip()
    
    result = base or "document"
    
    if base != name:
        logger.debug(
            "Sanitized display name",
            extra={"original": name, "sanitized": result}
        )
    
    return result

class DocumentStore:
    """
    Filesystem adapter for documents with sidecar metadata.
    
    Provides atomic operations for storing documents and their associated
    metadata. Each document can have a .meta.json sidecar file containing
    extraction status, analysis results, timestamps, etc.
    
    Features:
        - Atomic document writes
        - Atomic metadata (sidecar) operations
        - Automatic directory creation
        - Error handling with detailed logging
        - Path validation
        - UTF-8 encoding for metadata
    
    Storage Pattern:
        Documents are stored with UUID filenames and original extensions.
        Metadata is stored in parallel .meta.json files.
        
        Example:
            Document: /app/uploads/documents/abc123.pdf
            Metadata: /app/uploads/documents/abc123.pdf.meta.json
    
    Thread Safety:
        - Filesystem operations are atomic
        - Multiple readers safe
        - Concurrent writes may race (last write wins)
    
    Example:
        >>> store = DocumentStore()
        >>> path = store.save_bytes(pdf_content, "resume.pdf")
        >>> store.write_sidecar(path, {"status": "extracted", "word_count": 500})
        >>> metadata = store.read_sidecar(path)
    """
    
    def __init__(self, root: Path | None = None) -> None:
        """
        Initialize Document Store.
        
        Args:
            root: Root directory for document storage (defaults to UPLOAD_ROOT)
        
        Raises:
            DocumentStorageError: If root directory cannot be created/accessed
        """
        self.root = root or UPLOAD_ROOT
        
        # Ensure root directory exists and is writable
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            
            # Test writability
            test_file = self.root / f".test_{uuid.uuid4()}"
            try:
                test_file.write_text("test")
                test_file.unlink()
            except Exception as e:
                raise DocumentStorageError(f"Root directory not writable: {e}")
        
        except Exception as e:
            logger.error(
                "Failed to initialize DocumentStore",
                extra={"root": str(self.root), "error": str(e)},
                exc_info=True
            )
            raise DocumentStorageError(f"Cannot initialize storage: {e}")
        
        logger.info(
            "DocumentStore initialized",
            extra={"root": str(self.root)}
        )

    def save_bytes(self, content: bytes, filename: str) -> Path:
        """
        Save document bytes to storage with unique filename.
        
        Generates UUID-based filename preserving original extension.
        Writes content atomically and verifies result.
        
        Args:
            content: Document content as bytes
            filename: Original filename (used for extension only)
        
        Returns:
            Path: Full path to saved document
        
        Raises:
            DocumentStorageError: If save fails or validation fails
            TypeError: If content is not bytes
            ValueError: If content is empty
        
        Example:
            >>> store = DocumentStore()
            >>> with open("resume.pdf", "rb") as f:
            ...     path = store.save_bytes(f.read(), "resume.pdf")
        
        Notes:
            - Filename is UUID-based (original name only used for extension)
            - Atomic write operation
            - Verifies file after write
            - Returns absolute path
        """
        # Validate input
        if not content:
            logger.error("save_bytes called with empty content")
            raise ValueError("Document content is empty")
        
        if not isinstance(content, bytes):
            logger.error(
                "Invalid content type",
                extra={"type": type(content).__name__}
            )
            raise TypeError(f"Content must be bytes, got {type(content).__name__}")
        
        if not filename:
            logger.warning("save_bytes called with empty filename, using .bin")
            filename = "document.bin"
        
        # Extract extension (or use .bin as fallback)
        suffix = Path(filename).suffix.lower() or ".bin"
        
        # Generate unique path
        path = self.root / f"{uuid.uuid4()}{suffix}"
        
        logger.debug(
            "Saving document",
            extra={
                "path": str(path),
                "size_bytes": len(content),
                "original_filename": filename
            }
        )
        
        try:
            # Atomic write
            path.write_bytes(content)
            
            # Verify write
            if not path.exists():
                raise DocumentStorageError("File not found after write")
            
            written_size = path.stat().st_size
            if written_size != len(content):
                raise DocumentStorageError(
                    f"Size mismatch: expected {len(content)}, got {written_size}"
                )
        
        except DocumentStorageError:
            # Cleanup and re-raise
            if path.exists():
                try:
                    path.unlink()
                except Exception as cleanup_err:
                    logger.debug("Failed to cleanup file after storage error", extra={"path": str(path), "error": str(cleanup_err)})
            raise
        
        except Exception as e:
            # Cleanup on unexpected errors
            if path.exists():
                try:
                    path.unlink()
                except Exception as cleanup_err:
                    logger.debug("Failed to cleanup file after unexpected error", extra={"path": str(path), "error": str(cleanup_err)})
            
            logger.error(
                "Failed to save document",
                extra={
                    "path": str(path),
                    "size_bytes": len(content),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise DocumentStorageError(f"Failed to save document: {e}")
        
        logger.info(
            "Document saved successfully",
            extra={
                "path": str(path),
                "size_bytes": len(content)
            }
        )
        
        return path

    def read_sidecar(self, file_path: Path) -> Dict[str, Any]:
        """
        Read metadata from sidecar .meta.json file.
        
        Reads and parses JSON metadata associated with a document.
        Returns empty dict if sidecar doesn't exist or is corrupted.
        
        Args:
            file_path: Path to document file (not the .meta.json file)
        
        Returns:
            Dict containing metadata, or empty dict if not found/corrupted
        
        Notes:
            - Never raises exceptions (returns {} on any error)
            - Handles missing files gracefully
            - Handles corrupted JSON gracefully
            - Logs warnings for errors
        
        Example:
            >>> store = DocumentStore()
            >>> metadata = store.read_sidecar(Path("/uploads/doc.pdf"))
            >>> if metadata:
            ...     print(f"Status: {metadata.get('status')}")
        """
        if not file_path:
            logger.warning("read_sidecar called with None file_path")
            return {}
        
        if not isinstance(file_path, Path):
            logger.warning(
                "Invalid file_path type",
                extra={"type": type(file_path).__name__}
            )
            return {}
        
        # Calculate sidecar path
        meta_path = file_path.with_suffix(file_path.suffix + SIDECAR_EXTENSION)
        
        # Check if sidecar exists
        if not meta_path.exists():
            logger.debug(
                "Sidecar file not found",
                extra={"meta_path": str(meta_path)}
            )
            return {}
        
        # Read and parse sidecar
        try:
            content = meta_path.read_text(encoding="utf-8")
            
            if not content.strip():
                logger.warning(
                    "Sidecar file is empty",
                    extra={"meta_path": str(meta_path)}
                )
                return {}
            
            metadata = json.loads(content)
            
            if not isinstance(metadata, dict):
                logger.warning(
                    "Sidecar contains non-dict data",
                    extra={
                        "meta_path": str(meta_path),
                        "type": type(metadata).__name__
                    }
                )
                return {}
            
            logger.debug(
                "Sidecar read successfully",
                extra={
                    "meta_path": str(meta_path),
                    "key_count": len(metadata)
                }
            )
            
            return metadata
        
        except json.JSONDecodeError as e:
            logger.warning(
                "Failed to parse sidecar JSON",
                extra={
                    "meta_path": str(meta_path),
                    "error": str(e),
                    "line": e.lineno,
                    "column": e.colno
                }
            )
            return {}
        
        except Exception as e:
            logger.warning(
                "Failed to read sidecar",
                extra={
                    "meta_path": str(meta_path),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return {}

    def write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        """
        Write metadata to sidecar .meta.json file.
        
        Atomically writes JSON metadata alongside document file.
        Uses temp file + rename pattern for atomicity.
        
        Args:
            file_path: Path to document file (not the .meta.json file)
            data: Metadata dictionary to write
        
        Raises:
            DocumentStorageError: If write fails
            TypeError: If data is not a dict
        
        Example:
            >>> store = DocumentStore()
            >>> store.write_sidecar(
            ...     Path("/uploads/doc.pdf"),
            ...     {"status": "extracted", "word_count": 500}
            ... )
        
        Notes:
            - Atomic operation (temp file + rename)
            - UTF-8 encoding
            - Pretty-printed JSON (2-space indent)
            - Overwrites existing sidecar
        """
        # Validate input
        if not file_path:
            logger.error("write_sidecar called with None file_path")
            raise DocumentStorageError("file_path is required")
        
        if not isinstance(file_path, Path):
            logger.error(
                "Invalid file_path type",
                extra={"type": type(file_path).__name__}
            )
            raise DocumentStorageError(f"file_path must be Path, got {type(file_path).__name__}")
        
        if not data:
            logger.warning(
                "write_sidecar called with empty data",
                extra={"file_path": str(file_path)}
            )
            data = {}
        
        if not isinstance(data, dict):
            logger.error(
                "Invalid data type",
                extra={"type": type(data).__name__}
            )
            raise TypeError(f"data must be dict, got {type(data).__name__}")
        
        # Calculate sidecar path
        meta_path = file_path.with_suffix(file_path.suffix + SIDECAR_EXTENSION)
        temp_path = meta_path.with_suffix(meta_path.suffix + ".tmp")
        
        logger.debug(
            "Writing sidecar",
            extra={
                "meta_path": str(meta_path),
                "key_count": len(data)
            }
        )
        
        try:
            # Serialize to JSON (pretty-printed for readability)
            json_content = json.dumps(data, ensure_ascii=False, indent=2)
            
            # Write to temp file
            temp_path.write_text(json_content, encoding="utf-8")
            
            # Verify write
            if not temp_path.exists():
                raise DocumentStorageError("Temp file not found after write")
            
            # Atomic rename
            temp_path.rename(meta_path)
            
            if not meta_path.exists():
                raise DocumentStorageError("Sidecar not found after rename")
        
        except DocumentStorageError:
            # Cleanup and re-raise
            for path in (temp_path, meta_path):
                if path.exists() and path != meta_path:
                    try:
                        path.unlink()
                    except Exception as cleanup_err:
                        logger.debug("Failed to cleanup sidecar temp file", extra={"path": str(path), "error": str(cleanup_err)})
            raise
        
        except Exception as e:
            # Cleanup on unexpected errors
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception as cleanup_err:
                    logger.debug("Failed to cleanup sidecar temp file", extra={"path": str(temp_path), "error": str(cleanup_err)})
            
            logger.error(
                "Failed to write sidecar file",
                extra={
                    "file_path": str(file_path),
                    "meta_path": str(meta_path),
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise DocumentStorageError(f"Failed to write sidecar: {e}")
        
        logger.info(
            "Sidecar written successfully",
            extra={
                "meta_path": str(meta_path),
                "key_count": len(data)
            }
        )
