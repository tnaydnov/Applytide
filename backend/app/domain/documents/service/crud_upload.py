"""
Document Upload Operations

Handles document upload and validation including:
- File validation (size, type, content)
- Text extraction from various formats
- Database record creation
- Metadata management via sidecar files

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, Optional
from pathlib import Path
import uuid

from ....db import models
from ....infra.files.document_store import DocumentStore, sanitize_display_name
from ....infra.extractors.text_extractor import TextExtractor
from ....api.schemas.documents import DocumentType, DocumentStatus
from ....infra.logging import get_logger

logger = get_logger(__name__)

# File size limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.html', '.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus'}


class DocumentValidationError(Exception):
    """Raised when document validation fails."""
    pass


class DocumentStorageError(Exception):
    """Raised when document storage operations fail."""
    pass


class DocumentCRUDError(Exception):
    """Base exception for document CRUD operations."""
    pass


class DocumentUploader:
    """
    Handles document upload operations.
    
    Manages file validation, text extraction, database record creation,
    and metadata management with comprehensive error handling.
    """
    
    def __init__(self, store: DocumentStore, extractor: TextExtractor, utils):
        """
        Initialize document uploader.
        
        Args:
            store: Document storage adapter
            extractor: Text extraction service
            utils: Document utilities (for sidecar operations)
        
        Raises:
            ValueError: If any dependency is None
        """
        if not all([store, extractor, utils]):
            logger.error("DocumentUploader initialized with None dependencies")
            raise ValueError("All dependencies must be provided")
        
        self.store = store
        self.extractor = extractor
        self.utils = utils
        
        logger.debug("DocumentUploader initialized successfully")
    
    def validate_file(self, file_content: bytes, filename: str) -> None:
        """
        Validate file before upload.
        
        Checks file size, content, and extension against supported formats.
        
        Args:
            file_content: File bytes
            filename: Original filename
        
        Raises:
            DocumentValidationError: If validation fails (size, empty, unsupported type)
        
        Example:
            uploader.validate_file(b"...", "resume.pdf")  # Validates PDF file
        """
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            logger.warning(
                f"File too large: {len(file_content)} bytes",
                extra={"filename": filename, "size": len(file_content)}
            )
            raise DocumentValidationError(
                f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        if len(file_content) == 0:
            logger.warning(f"Empty file: {filename}")
            raise DocumentValidationError("File is empty")
        
        # Check file extension
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            logger.warning(
                f"Unsupported file type: {ext}",
                extra={"filename": filename, "extension": ext}
            )
            raise DocumentValidationError(
                f"Unsupported file type: {ext}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

    def upload_document(
        self,
        db: Session,
        user_id: str,
        file_content: bytes,
        filename: str,
        document_type: DocumentType,
        display_name: Optional[str] = None,
        metadata: Dict[str, Any] | None = None,
    ) -> models.Resume:
        """
        Upload and store a new document.
        
        Performs comprehensive upload workflow:
        1. Validates user_id format and file content
        2. Saves file to storage
        3. Extracts text content
        4. Creates database record
        5. Writes sidecar metadata
        
        If database creation fails, cleans up stored file.
        If sidecar write fails, continues without failing upload.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            file_content: File bytes
            filename: Original filename
            document_type: Document type (resume, cover_letter, etc.)
            display_name: Optional display name (defaults to filename stem)
            metadata: Optional metadata dictionary
        
        Returns:
            Created Resume model instance with id, user_id, label, file_path, text
        
        Raises:
            DocumentValidationError: If user_id/filename invalid or file validation fails
            DocumentStorageError: If file storage fails
            DocumentCRUDError: If database operation fails
        
        Example:
            doc = uploader.upload_document(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                file_content=b"...",
                filename="resume.pdf",
                document_type=DocumentType.RESUME,
                display_name="My Resume",
                metadata={"source": "website"}
            )
            # Returns: Resume(id=UUID(...), label="My Resume", ...)
        """
        try:
            logger.debug(
                f"Uploading document: {filename}",
                extra={
                    "user_id": user_id,
                    "filename": filename,
                    "type": document_type.value,
                    "size": len(file_content)
                }
            )
            
            # Validate inputs
            if not user_id:
                raise DocumentValidationError("user_id is required")
            
            if not filename or not isinstance(filename, str):
                raise DocumentValidationError("filename must be a non-empty string")
            
            # Validate user_id format
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid user_id format: {user_id}")
                raise DocumentValidationError(f"Invalid user_id format: {e}")
            
            # Validate file
            self.validate_file(file_content, filename)
            
            ext = Path(filename).suffix.lower() or ".bin"
            file_id = uuid.uuid4()
            
            # Save content to storage
            try:
                file_path = self.store.save_bytes(file_content, filename)
                logger.debug(
                    f"File saved to storage: {file_path}",
                    extra={"document_id": str(file_id), "path": str(file_path)}
                )
            except Exception as e:
                logger.error(
                    f"Failed to save file to storage: {e}",
                    extra={"filename": filename, "user_id": user_id},
                    exc_info=True
                )
                raise DocumentStorageError(f"Failed to save file: {e}")
            
            # Extract text
            try:
                text_content = self.extractor.extract_text(file_path)
                logger.debug(
                    f"Text extracted: {len(text_content)} characters",
                    extra={"document_id": str(file_id), "text_length": len(text_content)}
                )
            except Exception as e:
                logger.error(
                    f"Text extraction failed: {e}",
                    extra={"filename": filename, "path": str(file_path)},
                    exc_info=True
                )
                # Don't fail upload if text extraction fails
                text_content = ""
                logger.warning(f"Continuing upload with empty text content")
            
            safe_label = sanitize_display_name(display_name or Path(filename).stem)
            
            # Create database record
            try:
                row = models.Resume(
                    id=file_id,
                    user_id=uuid.UUID(user_id),
                    label=safe_label,
                    file_path=str(file_path),
                    text=text_content,
                )
                db.add(row)
                db.commit()
                db.refresh(row)
                
                logger.debug(
                    f"Database record created",
                    extra={"document_id": str(file_id), "label": safe_label}
                )
            except SQLAlchemyError as e:
                logger.error(
                    f"Database operation failed: {e}",
                    extra={"document_id": str(file_id), "user_id": user_id},
                    exc_info=True
                )
                db.rollback()
                
                # Clean up stored file
                try:
                    file_path.unlink(missing_ok=True)
                    logger.debug(f"Cleaned up stored file after DB error")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up file: {cleanup_error}")
                
                raise DocumentCRUDError(f"Failed to create database record: {e}")
            
            # Write sidecar metadata
            try:
                side = {
                    "document_id": str(row.id),
                    "type": document_type.value,
                    "name": safe_label,
                    "original_filename": filename,
                    "original_extension": ext,
                    "status": DocumentStatus.ACTIVE.value,
                    "metadata": metadata or {},
                    "created_at": row.created_at.isoformat(),
                }
                self.utils.write_sidecar(file_path, side)
                logger.debug(f"Sidecar metadata written")
            except Exception as e:
                logger.error(
                    f"Failed to write sidecar metadata: {e}",
                    extra={"document_id": str(file_id)},
                    exc_info=True
                )
                # Don't fail upload if sidecar write fails
                logger.warning(f"Continuing without sidecar metadata")
            
            logger.info(
                f"Document uploaded successfully",
                extra={
                    "document_id": str(file_id),
                    "user_id": user_id,
                    "type": document_type.value,
                    "file_name": filename,
                    "size": len(file_content)
                }
            )
            
            return row
            
        except (DocumentValidationError, DocumentStorageError, DocumentCRUDError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error uploading document: {e}",
                extra={"file_name": filename, "user_id": user_id},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to upload document: {e}")
