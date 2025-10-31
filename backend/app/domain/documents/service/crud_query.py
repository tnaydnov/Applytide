"""
Document Query Operations

Handles document retrieval and listing including:
- Single document fetching by ID
- Document list with filtering and pagination
- Document response resolution with sidecar metadata
- Search functionality across document content

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from pathlib import Path
import uuid
import json

from ....db import models
from ....api.schemas.documents import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentResponse, DocumentListResponse
)
from ....infra.logging import get_logger

logger = get_logger(__name__)


class DocumentValidationError(Exception):
    """Raised when document validation fails."""
    pass


class DocumentNotFoundError(Exception):
    """Raised when document is not found."""
    pass


class DocumentCRUDError(Exception):
    """Base exception for document CRUD operations."""
    pass


class DocumentQuerier:
    """
    Handles document query and retrieval operations.
    
    Manages document listing, filtering, pagination, and single document fetching
    with comprehensive error handling and sidecar metadata resolution.
    """
    
    def __init__(self, utils):
        """
        Initialize document querier.
        
        Args:
            utils: Document utilities (for sidecar operations)
        
        Raises:
            ValueError: If utils is None
        """
        if not utils:
            logger.error("DocumentQuerier initialized with None utils")
            raise ValueError("utils must be provided")
        
        self.utils = utils
        
        logger.debug("DocumentQuerier initialized successfully")
    
    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        """
        Build DocumentResponse from database row and sidecar metadata.
        
        Combines database record with sidecar file metadata to create a complete
        document response object. Falls back to database values if sidecar missing
        or invalid.
        
        Workflow:
        1. Validates row and file_path
        2. Loads sidecar metadata (with fallback to defaults)
        3. Extracts and validates type, status, name
        4. Determines file format from extension
        5. Gets file size (with fallback to text length)
        6. Builds DocumentResponse
        
        Args:
            row: Resume database model instance
        
        Returns:
            DocumentResponse with merged database and sidecar data including:
            - id, type, name, status, format
            - file_size, created_at, updated_at
            - metadata, tags, ats_score
        
        Raises:
            DocumentCRUDError: If document data is invalid or missing
        
        Example:
            doc_response = querier.resolve_document_response(resume_row)
            # Returns: DocumentResponse(id="...", name="My Resume", ...)
        """
        try:
            if not row:
                raise DocumentCRUDError("Document row is None")
            
            if not row.file_path:
                logger.error(
                    f"Document missing file_path",
                    extra={"document_id": str(row.id)}
                )
                raise DocumentCRUDError(f"Document {row.id} has no file_path")
            
            p = Path(row.file_path)
            
            # Check if file exists
            if not p.exists():
                logger.warning(
                    f"Document file not found: {p}",
                    extra={"document_id": str(row.id), "path": str(p)}
                )
            
            # Read sidecar with error handling
            try:
                side = self.utils.sidecar(p)
                logger.debug(
                    f"Sidecar loaded for document",
                    extra={"document_id": str(row.id), "sidecar_keys": list(side.keys())}
                )
            except Exception as e:
                logger.warning(
                    f"Failed to load sidecar, using defaults: {e}",
                    extra={"document_id": str(row.id), "path": str(p)}
                )
                side = {}
            
            # Extract fields with fallbacks
            try:
                resolved_type = DocumentType(side.get("type", "resume"))
            except ValueError as e:
                logger.warning(
                    f"Invalid document type in sidecar, using 'resume': {e}",
                    extra={"document_id": str(row.id), "type": side.get("type")}
                )
                resolved_type = DocumentType.RESUME
            
            resolved_name = side.get("name", row.label or "Untitled")
            resolved_meta = side.get("metadata", {})
            
            try:
                resolved_status = DocumentStatus(side.get("status", DocumentStatus.ACTIVE.value))
            except ValueError as e:
                logger.warning(
                    f"Invalid status in sidecar, using 'active': {e}",
                    extra={"document_id": str(row.id), "status": side.get("status")}
                )
                resolved_status = DocumentStatus.ACTIVE
            
            # Determine format
            raw_ext = (p.suffix[1:] if p.suffix else "txt").lower()
            ext = {"doc": "docx"}.get(raw_ext, raw_ext)
            audio_exts = {"mp3", "m4a", "aac", "wav", "flac", "ogg", "opus"}
            
            if ext in {"pdf", "docx", "txt", "html"}:
                fmt = DocumentFormat(ext)
            elif ext in audio_exts:
                fmt = DocumentFormat.AUDIO
            else:
                fmt = DocumentFormat.TXT
            
            # Get file size with error handling
            size = 0
            try:
                size = p.stat().st_size
                logger.debug(f"File size: {size} bytes", extra={"document_id": str(row.id)})
            except Exception as e:
                logger.debug(
                    f"Could not get file size, using text length: {e}",
                    extra={"document_id": str(row.id)}
                )
                if row.text:
                    size = len(row.text.encode("utf-8"))
            
            # Build response
            try:
                response = DocumentResponse(
                    id=str(row.id),
                    type=resolved_type,
                    name=resolved_name,
                    status=resolved_status,
                    format=fmt,
                    file_size=size,
                    created_at=row.created_at,
                    updated_at=row.created_at,
                    tags=[],
                    metadata=resolved_meta,
                    ats_score=None,
                )
                
                logger.debug(
                    f"Document response resolved",
                    extra={
                        "document_id": str(row.id),
                        "type": resolved_type.value,
                        "status": resolved_status.value
                    }
                )
                
                return response
                
            except Exception as e:
                logger.error(
                    f"Failed to build DocumentResponse: {e}",
                    extra={"document_id": str(row.id)},
                    exc_info=True
                )
                raise DocumentCRUDError(f"Failed to build document response: {e}")
            
        except DocumentCRUDError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error resolving document: {e}",
                extra={"row_id": str(row.id) if row and hasattr(row, 'id') else None},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to resolve document: {e}")
    
    def list_documents(
        self,
        db: Session,
        user_id: str,
        page: int,
        page_size: int,
        filter_type: Optional[DocumentType],
        filter_status: Optional[DocumentStatus],
        query: Optional[str] = None,
    ) -> DocumentListResponse:
        """
        List documents with filtering, search, and pagination.
        
        Fetches documents for a user with comprehensive filtering:
        - Optional document type filter (resume, cover_letter, etc.)
        - Optional status filter (active, archived, deleted)
        - Optional text search across name, label, text, and metadata
        - Pagination with page/page_size
        
        Search matches against:
        - Document name (from sidecar)
        - Label (from database)
        - Text content (from database)
        - Metadata JSON (from sidecar)
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            page: Page number (1-indexed, minimum 1)
            page_size: Number of items per page (1-1000)
            filter_type: Optional document type filter
            filter_status: Optional status filter
            query: Optional case-insensitive search query
        
        Returns:
            DocumentListResponse with:
            - documents: List of DocumentResponse for current page
            - total: Total matching documents (across all pages)
            - page: Current page number
            - page_size: Items per page
            - has_next: True if more pages exist
            - has_prev: True if previous pages exist
        
        Raises:
            DocumentValidationError: If user_id invalid or pagination out of range
            DocumentCRUDError: If database query fails
        
        Example:
            response = querier.list_documents(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                page=1,
                page_size=20,
                filter_type=DocumentType.RESUME,
                filter_status=DocumentStatus.ACTIVE,
                query="engineer"
            )
            # Returns: DocumentListResponse(documents=[...], total=42, ...)
        """
        try:
            # Validate inputs
            if not user_id:
                raise DocumentValidationError("user_id is required")
            
            try:
                uuid.UUID(user_id)
            except (ValueError, AttributeError) as e:
                raise DocumentValidationError(f"Invalid user_id format: {e}")
            
            if page < 1:
                raise DocumentValidationError(f"page must be >= 1, got {page}")
            
            if page_size < 1:
                raise DocumentValidationError(f"page_size must be >= 1, got {page_size}")
            
            if page_size > 1000:
                logger.warning(
                    f"Large page_size requested: {page_size}",
                    extra={"user_id": user_id, "page_size": page_size}
                )
                raise DocumentValidationError(f"page_size cannot exceed 1000, got {page_size}")
            
            logger.debug(
                f"Listing documents",
                extra={
                    "user_id": user_id,
                    "page": page,
                    "page_size": page_size,
                    "filter_type": filter_type.value if filter_type else None,
                    "filter_status": filter_status.value if filter_status else None,
                    "has_query": bool(query)
                }
            )
            
            # Query database
            try:
                rows = (
                    db.query(models.Resume)
                    .filter(models.Resume.user_id == uuid.UUID(user_id))
                    .order_by(models.Resume.created_at.desc())
                    .all()
                )
                
                logger.debug(
                    f"Retrieved {len(rows)} documents from database",
                    extra={"user_id": user_id, "count": len(rows)}
                )
                
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"user_id": user_id},
                    exc_info=True
                )
                raise DocumentCRUDError(f"Failed to query documents: {e}")
            
            # Process and filter
            q_lower = (query or "").strip().lower()
            items: List[DocumentResponse] = []
            
            for r in rows:
                try:
                    resp = self.resolve_document_response(r)
                except Exception as e:
                    logger.warning(
                        f"Failed to resolve document, skipping: {e}",
                        extra={"document_id": str(r.id) if hasattr(r, 'id') else None}
                    )
                    continue
                
                # Skip documents with missing physical files
                from pathlib import Path
                file_path = Path(r.file_path)
                if not file_path.exists():
                    logger.warning(
                        f"Document file missing, hiding from list: {r.file_path}",
                        extra={
                            "document_id": str(r.id),
                            "file_path": r.file_path,
                            "user_id": user_id
                        }
                    )
                    continue
                
                # Apply type filter
                if filter_type and resp.type != filter_type:
                    continue
                
                # Apply status filter
                if filter_status and resp.status != filter_status:
                    continue
                
                # Apply search query
                if q_lower:
                    try:
                        side = self.utils.sidecar(Path(r.file_path))
                    except Exception as e:
                        logger.debug(f"Could not load sidecar for search: {e}")
                        side = {}
                    
                    haystack = " ".join([
                        resp.name or "",
                        r.label or "",
                        r.text or "",
                        json.dumps(side.get("metadata", {}), ensure_ascii=False),
                    ]).lower()
                    
                    if q_lower not in haystack:
                        continue
                
                items.append(resp)
            
            # Pagination
            total = len(items)
            start = max(0, (page - 1) * page_size)
            end = start + page_size
            pages = max(1, (total + page_size - 1) // page_size)
            
            logger.info(
                f"Documents listed successfully",
                extra={
                    "user_id": user_id,
                    "total": total,
                    "page": page,
                    "returned": len(items[start:end])
                }
            )
            
            return DocumentListResponse(
                documents=items[start:end],
                total=total,
                page=page,
                page_size=page_size,
                has_next=page < pages,
                has_prev=page > 1,
            )
            
        except (DocumentValidationError, DocumentCRUDError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error listing documents: {e}",
                extra={"user_id": user_id},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to list documents: {e}")
    
    def get_document(self, db: Session, user_id: str, document_id: str) -> DocumentResponse:
        """
        Get a single document by ID.
        
        Fetches document with authorization check - ensures document belongs to user.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            document_id: Document ID (UUID string)
        
        Returns:
            DocumentResponse for the requested document
        
        Raises:
            DocumentValidationError: If user_id or document_id invalid format
            DocumentNotFoundError: If document doesn't exist or access denied
            DocumentCRUDError: If database operation fails
        
        Example:
            doc = querier.get_document(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                document_id="987fcdeb-51a2-43f1-b2e3-123456789abc"
            )
            # Returns: DocumentResponse(id="987fcdeb...", name="My Resume", ...)
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
                f"Fetching document",
                extra={"document_id": document_id, "user_id": user_id}
            )
            
            # Query database
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
                    f"Document not found",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise DocumentNotFoundError(
                    f"Document {document_id} not found or access denied"
                )
            
            logger.info(
                f"Document retrieved successfully",
                extra={"document_id": document_id, "user_id": user_id}
            )
            
            return self.resolve_document_response(doc)
            
        except (DocumentValidationError, DocumentNotFoundError, DocumentCRUDError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error getting document: {e}",
                extra={"document_id": document_id, "user_id": user_id},
                exc_info=True
            )
            raise DocumentCRUDError(f"Failed to get document: {e}")
