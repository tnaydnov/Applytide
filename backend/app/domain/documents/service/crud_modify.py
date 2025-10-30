"""
Document Modification Operations

Handles document update and deletion including:
- Document deletion with file cleanup
- Status updates via sidecar metadata
- Authorization checks

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pathlib import Path
import uuid

from ....db import models
from ....api.schemas.documents import DocumentStatus, DocumentResponse
from ....infra.logging import get_logger

logger = get_logger(__name__)


class DocumentValidationError(Exception):
    """Raised when document validation fails."""
    pass


class DocumentNotFoundError(Exception):
    """Raised when document is not found."""
    pass


class DocumentStorageError(Exception):
    """Raised when document storage operations fail."""
    pass


class DocumentCRUDError(Exception):
    """Base exception for document CRUD operations."""
    pass


class DocumentModifier:
    """
    Handles document modification and deletion operations.
    
    Manages document updates, deletions, and status changes with
    comprehensive error handling and authorization checks.
    """
    
    def __init__(self, utils, resolve_fn):
        """
        Initialize document modifier.
        
        Args:
            utils: Document utilities (for sidecar operations)
            resolve_fn: Function to resolve DocumentResponse from row
        
        Raises:
            ValueError: If any dependency is None
        """
        if not all([utils, resolve_fn]):
            logger.error("DocumentModifier initialized with None dependencies")
            raise ValueError("All dependencies must be provided")
        
        self.utils = utils
        self.resolve_fn = resolve_fn
        
        logger.debug("DocumentModifier initialized successfully")
    
    def delete_document(self, db: Session, user_id: str, document_id: str) -> None:
        """
        Delete a document and its associated files.
        
        Performs atomic deletion:
        1. Validates user_id and document_id
        2. Queries document with authorization check
        3. Deletes physical files (document + sidecar)
        4. Deletes database record (with rollback on failure)
        
        File deletion failures are logged but don't block database deletion.
        Database deletion failure triggers rollback.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            document_id: Document ID (UUID string)
        
        Raises:
            DocumentValidationError: If user_id or document_id invalid
            DocumentNotFoundError: If document doesn't exist or access denied
            DocumentCRUDError: If database deletion fails
        
        Example:
            modifier.delete_document(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                document_id="987fcdeb-51a2-43f1-b2e3-123456789abc"
            )
        """
        try:
            # Validate inputs
            if not user_id:
                raise DocumentValidationError("user_id is required")
            
            if not document_id:
                raise DocumentValidationError("document_id is required")
            
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                raise DocumentValidationError(f"Invalid user_id format: {e}")
            
            try:
                uuid.UUID(document_id)
            except (ValueError, AttributeError) as e:
                raise DocumentValidationError(f"Invalid document_id format: {e}")
            
            logger.debug(
                f"Deleting document",
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
                raise DocumentCRUDError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found for deletion",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise DocumentNotFoundError(
                    f"Document {document_id} not found or access denied"
                )
            
            file_path = Path(doc.file_path)
            sidecar_path = file_path.with_suffix(file_path.suffix + ".meta.json")
            
            # Delete files (non-critical, warn on failure)
            files_deleted = {"document": False, "sidecar": False}
            
            try:
                if file_path.exists():
                    file_path.unlink()
                    files_deleted["document"] = True
                    logger.debug(f"Document file deleted: {file_path}")
            except Exception as e:
                logger.warning(
                    f"Failed to delete document file: {e}",
                    extra={"document_id": document_id, "path": str(file_path)}
                )
            
            try:
                if sidecar_path.exists():
                    sidecar_path.unlink()
                    files_deleted["sidecar"] = True
                    logger.debug(f"Sidecar file deleted: {sidecar_path}")
            except Exception as e:
                logger.warning(
                    f"Failed to delete sidecar file: {e}",
                    extra={"document_id": document_id, "path": str(sidecar_path)}
                )
            
            # Delete database record
            try:
                db.delete(doc)
                db.commit()
                logger.debug(f"Database record deleted")
            except SQLAlchemyError as e:
                logger.error(
                    f"Failed to delete database record: {e}",
                    extra={"document_id": document_id, "user_id": user_id},
                    exc_info=True
                )
                db.rollback()
                raise DocumentCRUDError(f"Failed to delete document from database: {e}")
            
            logger.info(
                f"Document deleted successfully",
                extra={
                    "document_id": document_id,
                    "user_id": user_id,
                    "files_deleted": files_deleted
                }
            )
            
        except (DocumentValidationError, DocumentNotFoundError, DocumentCRUDError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error deleting document: {e}",
                extra={"document_id": document_id, "user_id": user_id},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to delete document: {e}")
    
    def update_status(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str, 
        status: DocumentStatus
    ) -> DocumentResponse:
        """
        Update document status in sidecar metadata.
        
        Workflow:
        1. Validates inputs (user_id, document_id, status)
        2. Queries document with authorization check
        3. Loads sidecar metadata
        4. Updates status field in sidecar
        5. Writes updated sidecar to disk
        6. Returns updated DocumentResponse
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            document_id: Document ID (UUID string)
            status: New document status (active, archived, deleted)
        
        Returns:
            Updated DocumentResponse with new status
        
        Raises:
            DocumentValidationError: If IDs invalid or status not DocumentStatus
            DocumentNotFoundError: If document doesn't exist or access denied
            DocumentStorageError: If sidecar update fails
            DocumentCRUDError: If database query fails
        
        Example:
            updated_doc = modifier.update_status(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                document_id="987fcdeb-51a2-43f1-b2e3-123456789abc",
                status=DocumentStatus.ARCHIVED
            )
            # Returns: DocumentResponse(..., status=<DocumentStatus.ARCHIVED>, ...)
        """
        try:
            # Validate inputs
            if not user_id:
                raise DocumentValidationError("user_id is required")
            
            if not document_id:
                raise DocumentValidationError("document_id is required")
            
            if not status or not isinstance(status, DocumentStatus):
                raise DocumentValidationError(
                    f"status must be a valid DocumentStatus, got {type(status)}"
                )
            
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                raise DocumentValidationError(f"Invalid user_id format: {e}")
            
            try:
                uuid.UUID(document_id)
            except (ValueError, AttributeError) as e:
                raise DocumentValidationError(f"Invalid document_id format: {e}")
            
            logger.debug(
                f"Updating document status",
                extra={
                    "document_id": document_id,
                    "user_id": user_id,
                    "new_status": status.value
                }
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
                raise DocumentCRUDError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found for status update",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise DocumentNotFoundError(
                    f"Document {document_id} not found or access denied"
                )
            
            # Update sidecar
            p = Path(doc.file_path)
            
            try:
                side = self.utils.sidecar(p)
                old_status = side.get("status", "unknown")
                side["status"] = status.value
                self.utils.write_sidecar(p, side)
                
                logger.debug(
                    f"Sidecar updated",
                    extra={
                        "document_id": document_id,
                        "old_status": old_status,
                        "new_status": status.value
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to update sidecar: {e}",
                    extra={"document_id": document_id, "path": str(p)},
                    exc_info=True
                )
                raise DocumentStorageError(f"Failed to update document status: {e}")
            
            logger.info(
                f"Document status updated successfully",
                extra={
                    "document_id": document_id,
                    "user_id": user_id,
                    "new_status": status.value
                }
            )
            
            return self.resolve_fn(doc)
            
        except (DocumentValidationError, DocumentNotFoundError, DocumentStorageError, DocumentCRUDError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error updating status: {e}",
                extra={"document_id": document_id, "user_id": user_id},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to update document status: {e}")
