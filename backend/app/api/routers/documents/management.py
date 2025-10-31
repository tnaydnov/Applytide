"""
Document Management Module

Handles document CRUD operations: listing, retrieving, deleting, and status updates.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from ....db.session import get_db
from ...deps import get_current_user
from ....db.models import User
from .schemas import DocumentType, DocumentStatus, DocumentResponse, DocumentListResponse
from ...deps import get_document_service
from ....domain.documents.service import DocumentService
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=DocumentListResponse)
def list_documents(
    document_type: Optional[DocumentType] = Query(None),
    status: Optional[DocumentStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    List all documents for the authenticated user with filtering and pagination.
    
    Retrieves paginated list of documents owned by the current user. Supports filtering
    by document type, processing status, and full-text search across document names.
    
    Query Parameters:
        - document_type: Filter by type (resume/cover_letter/portfolio/other)
        - status: Filter by processing status (pending/completed/failed/archived)
        - page: Page number (default: 1, minimum: 1)
        - page_size: Items per page (default: 20, range: 1-500)
        - query: Search term for document names (optional)
    
    Args:
        document_type: Optional document type filter
        status: Optional processing status filter
        page: Current page number
        page_size: Number of items per page
        query: Optional search query string
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        DocumentListResponse: Paginated document list containing:
            - documents: List of DocumentResponse objects
            - total: Total number of matching documents
            - page: Current page number
            - page_size: Items per page
            - pages: Total number of pages
            - has_next: Boolean indicating if next page exists
            - has_prev: Boolean indicating if previous page exists
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only list their own documents
        - Query scoped to user_id automatically
    
    Notes:
        - Maximum page_size capped at 500 to prevent performance issues
        - Empty query returns all documents (respecting filters)
        - Sorting handled by service layer (typically by created_at desc)
        - Filters combined with AND logic when multiple specified
        - Search query performs case-insensitive partial match on display_name
    
    Example:
        GET /api/documents/?document_type=resume&page=1&page_size=10&query=engineer
        Response:
        {
            "documents": [{...}, {...}],
            "total": 25,
            "page": 1,
            "page_size": 10,
            "pages": 3,
            "has_next": true,
            "has_prev": false
        }
    """
    return svc.list_documents(
        db=db,
        user_id=str(current_user.id),
        page=page,
        page_size=page_size,
        filter_type=document_type,
        filter_status=status,
        query=query,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Get a specific document by ID.
    
    Retrieves complete details of a single document owned by the authenticated user.
    Includes all metadata, processing status, and file information.
    
    Path Parameters:
        - document_id: UUID of the document to retrieve
    
    Args:
        document_id: Document UUID string
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        DocumentResponse: Complete document details including:
            - id: Document UUID
            - user_id: Owner user ID
            - filename: Original filename
            - display_name: Custom display name
            - document_type: Document classification
            - status: Processing status (pending/completed/failed/archived)
            - file_path: Storage path
            - file_size: Size in bytes
            - parsed_text: Extracted text content (if available)
            - created_at: Upload timestamp
            - updated_at: Last modification timestamp
            - metadata: Additional metadata
    
    Raises:
        HTTPException: 404 if document not found or not owned by user
        HTTPException: 500 if retrieval fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only access their own documents
        - Document ID validation handled by service layer
    
    Notes:
        - Returns 404 for both non-existent and unauthorized access (no information leakage)
        - Includes parsed_text if document has been processed
        - Logs access for security audit trail
        - Service handles UUID validation and ownership verification
    
    Example:
        GET /api/documents/550e8400-e29b-41d4-a716-446655440000
        Response:
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "user-uuid",
            "filename": "resume.pdf",
            "display_name": "My Resume",
            "document_type": "resume",
            "status": "completed",
            "file_size": 245678,
            "created_at": "2025-10-29T12:00:00Z"
        }
    """
    try:
        logger.debug(
            "Getting document",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id
            }
        )
        
        return svc.get_document(db=db, user_id=str(current_user.id), document_id=document_id)
    
    except ValueError:
        logger.warning(
            "Document not found",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id
            }
        )
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        logger.error(
            "Error getting document",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Delete a document permanently.
    
    Permanently removes a document from the system including both database record
    and physical file from storage. This operation is irreversible.
    
    Path Parameters:
        - document_id: UUID of the document to delete
    
    Args:
        document_id: Document UUID string
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        dict: Success message confirming deletion
    
    Raises:
        HTTPException: 404 if document not found or not owned by user
        HTTPException: 500 if deletion fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only delete their own documents
        - Ownership verification before deletion
        - Physical file removed along with database record
    
    Notes:
        - Operation is irreversible - no recovery possible
        - Deletes both database record and physical file
        - Returns 404 for unauthorized access (no information leakage)
        - Logs deletion with info level for audit trail
        - File cleanup handled by service layer
        - Recommended to show confirmation dialog in UI before calling
    
    Example:
        DELETE /api/documents/550e8400-e29b-41d4-a716-446655440000
        Response:
        {
            "message": "Document deleted successfully"
        }
    """
    try:
        logger.info(
            "Deleting document",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id
            }
        )
        
        svc.delete_document(db=db, user_id=str(current_user.id), document_id=document_id)
        
        logger.info(
            "Document deleted successfully",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id
            }
        )
        
        return {"message": "Document deleted successfully"}
    
    except ValueError:
        logger.warning(
            "Document not found for deletion",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id
            }
        )
        raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        logger.error(
            "Error deleting document",
            extra={
                "user_id": str(current_user.id),
                "document_id": document_id,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.put("/{document_id}/status", response_model=DocumentResponse)
def set_document_status(
    document_id: str,
    new_status: DocumentStatus = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Update document processing status.
    
    Changes the processing status of a document. Used to track document lifecycle
    states such as pending, completed, failed, or archived.
    
    Path Parameters:
        - document_id: UUID of the document to update
    
    Request Body:
        - new_status: New status value (pending/completed/failed/archived)
    
    Args:
        document_id: Document UUID string
        new_status: New DocumentStatus enum value
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        DocumentResponse: Updated document with new status
    
    Raises:
        HTTPException: 404 if document not found or not owned by user
        HTTPException: 400 if status value is invalid
        HTTPException: 500 if update fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only update their own documents
        - Status enum validation via Pydantic
    
    Notes:
        - Status values: pending (uploading), completed (ready), failed (error), archived (hidden)
        - Archived documents remain in system but hidden from normal queries
        - Failed status should include error details in metadata (handled by service)
        - Status updates logged for audit trail
        - Frontend can use this for manual status corrections
    
    Example:
        PUT /api/documents/550e8400-e29b-41d4-a716-446655440000/status
        Request:
        {
            "new_status": "archived"
        }
        Response: Updated DocumentResponse object
    """
    return svc.update_status(db=db, user_id=str(current_user.id), document_id=document_id, status=new_status)


@router.get("/health/missing-files")
def check_missing_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Check for documents with missing physical files.
    
    Scans user's documents and identifies which ones have missing files on disk.
    Useful for detecting storage issues, showing warnings, or triggering re-uploads.
    
    Args:
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        dict: Summary of missing files containing:
            - missing_count: Number of documents with missing files
            - missing_ids: List of document UUIDs with missing files
            - total_documents: Total documents checked
    
    Security:
        - Requires authentication
        - Only checks current user's documents
    
    Example:
        GET /api/documents/health/missing-files
        Response:
        {
            "missing_count": 2,
            "missing_ids": ["uuid1", "uuid2"],
            "total_documents": 10
        }
    """
    try:
        from pathlib import Path
        
        # Get all user documents
        result = svc.list_documents(
            db=db,
            user_id=str(current_user.id),
            page=1,
            page_size=1000,  # Check all documents
            filter_type=None,
            filter_status=None,
            query=None,
        )
        
        # Extract documents array from response
        docs = result.get("documents", []) if isinstance(result, dict) else []
        missing_ids = []
        
        for doc in docs:
            # Handle both dict and object access patterns
            file_path = doc.get("file_path") if isinstance(doc, dict) else getattr(doc, "file_path", None)
            doc_id = doc.get("id") if isinstance(doc, dict) else getattr(doc, "id", None)
            
            if file_path and doc_id:
                if not Path(file_path).exists():
                    missing_ids.append(str(doc_id))
        
        logger.info(
            f"Missing files check completed",
            extra={
                "user_id": str(current_user.id),
                "missing_count": len(missing_ids),
                "total_documents": len(docs)
            }
        )
        
        return {
            "missing_count": len(missing_ids),
            "missing_ids": missing_ids,
            "total_documents": len(docs)
        }
        
    except Exception as e:
        logger.error(
            f"Failed to check missing files: {e}",
            extra={"user_id": str(current_user.id)},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to check missing files")
