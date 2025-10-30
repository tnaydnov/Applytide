"""
CRUD Operations for Documents - Main Orchestrator

Unified facade for document CRUD operations, delegating to specialized modules:
- crud_upload: Document upload and validation
- crud_query: Document listing, filtering, and retrieval
- crud_modify: Document updates and deletion

All operations include comprehensive error handling, validation, and logging.
This module maintains backward compatibility by exposing the same API.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from ....db import models
from ....infra.files.document_store import DocumentStore
from ....infra.extractors.text_extractor import TextExtractor
from ....api.schemas.documents import (
    DocumentType, DocumentStatus,
    DocumentResponse, DocumentListResponse
)
from ....infra.logging import get_logger

# Import specialized modules
from .crud_upload import DocumentUploader
from .crud_query import DocumentQuerier
from .crud_modify import DocumentModifier

# Re-export exceptions for backward compatibility
from .crud_upload import (
    DocumentCRUDError,
    DocumentValidationError,
    DocumentStorageError,
)
from .crud_query import DocumentNotFoundError

logger = get_logger(__name__)


class DocumentCRUD:
    """
    Main CRUD orchestrator for documents.
    
    Delegates operations to specialized modules:
    - upload: DocumentUploader (file validation, storage, text extraction)
    - query: DocumentQuerier (listing, filtering, retrieval)
    - modify: DocumentModifier (updates, deletion)
    
    Maintains backward compatibility by exposing the same API as before.
    """
    
    def __init__(self, store: DocumentStore, extractor: TextExtractor, utils):
        """
        Initialize document CRUD orchestrator.
        
        Args:
            store: Document storage adapter
            extractor: Text extraction service
            utils: Document utilities (for sidecar operations)
        
        Raises:
            ValueError: If any dependency is None
        """
        if not all([store, extractor, utils]):
            logger.error("DocumentCRUD initialized with None dependencies")
            raise ValueError("All dependencies must be provided")
        
        # Initialize specialized modules
        self.uploader = DocumentUploader(store=store, extractor=extractor, utils=utils)
        self.querier = DocumentQuerier(utils=utils)
        self.modifier = DocumentModifier(
            utils=utils,
            resolve_fn=self.querier.resolve_document_response
        )
        
        logger.debug("DocumentCRUD initialized successfully with specialized modules")
    
    # Upload operations - delegate to DocumentUploader
    
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
        """Upload and store a new document. Delegates to DocumentUploader."""
        return self.uploader.upload_document(
            db=db,
            user_id=user_id,
            file_content=file_content,
            filename=filename,
            document_type=document_type,
            display_name=display_name,
            metadata=metadata
        )
    
    # Query operations - delegate to DocumentQuerier
    
    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        """Build DocumentResponse from database row. Delegates to DocumentQuerier."""
        return self.querier.resolve_document_response(row)
    
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
        """List documents with filtering and pagination. Delegates to DocumentQuerier."""
        return self.querier.list_documents(
            db=db,
            user_id=user_id,
            page=page,
            page_size=page_size,
            filter_type=filter_type,
            filter_status=filter_status,
            query=query
        )
    
    def get_document(self, db: Session, user_id: str, document_id: str) -> DocumentResponse:
        """Get a single document by ID. Delegates to DocumentQuerier."""
        return self.querier.get_document(db=db, user_id=user_id, document_id=document_id)
    
    # Modify operations - delegate to DocumentModifier
    
    def delete_document(self, db: Session, user_id: str, document_id: str) -> None:
        """Delete a document and its files. Delegates to DocumentModifier."""
        return self.modifier.delete_document(db=db, user_id=user_id, document_id=document_id)
    
    def update_status(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str, 
        status: DocumentStatus
    ) -> DocumentResponse:
        """Update document status. Delegates to DocumentModifier."""
        return self.modifier.update_status(db=db, user_id=user_id, document_id=document_id, status=status)
