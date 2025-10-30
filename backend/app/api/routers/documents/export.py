"""
Document Export Module

Handles document download and preview operations.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from sqlalchemy.orm import Session

from ....db.session import get_db
from ...deps import get_current_user
from ....db.models import User
from ...deps import get_document_service
from ....domain.documents.service import DocumentService

router = APIRouter()


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Download document file.
    
    Retrieves and serves the physical document file for download. Sets appropriate
    content-type and content-disposition headers for browser download.
    
    Path Parameters:
        - document_id: UUID of the document to download
    
    Args:
        document_id: Document UUID string
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        FileResponse: File download response with:
            - File content stream
            - Content-Type header (MIME type)
            - Content-Disposition header (filename)
            - Original filename preserved
    
    Raises:
        HTTPException: 404 if document not found or not owned by user
        HTTPException: 404 if physical file missing from storage
        HTTPException: 500 if file serving fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only download their own documents
        - No directory traversal possible (UUID-based lookup)
        - File paths never exposed to client
        - Content-Type validated against whitelist
    
    Notes:
        - Sets Content-Disposition: attachment for browser download
        - Original filename preserved in response headers
        - MIME type determined from file extension
        - Streaming response for efficient memory usage with large files
        - File paths resolved securely by service layer
        - Returns 404 if file deleted from storage but record remains
    
    Example:
        GET /api/documents/550e8400-e29b-41d4-a716-446655440000/download
        Response: File download with headers:
        Content-Type: application/pdf
        Content-Disposition: attachment; filename="resume.pdf"
    """
    file_path, filename, media_type = svc.resolve_download(db=db, user_id=str(current_user.id), document_id=document_id)
    return FileResponse(path=str(file_path), media_type=media_type, filename=filename)


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Preview document content in browser.
    
    Returns document content in a browser-viewable format (HTML, plain text, or inline file).
    Preferred over download for quick document viewing without leaving the application.
    
    Path Parameters:
        - document_id: UUID of the document to preview
    
    Args:
        document_id: Document UUID string
        user: Authenticated user from dependency injection
        db: Database session from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        Union[FileResponse, HTMLResponse, PlainTextResponse]:
            - FileResponse: For PDF (inline display)
            - HTMLResponse: For converted HTML content
            - PlainTextResponse: For plain text files
    
    Raises:
        HTTPException: 404 if document not found or not owned by user
        HTTPException: 500 if preview generation fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - User can only preview their own documents
        - HTML content sanitized to prevent XSS
        - Content-Type validated for safe display
    
    Notes:
        - PDF files served with Content-Disposition: inline for browser viewing
        - DOCX/DOC converted to HTML for preview
        - TXT files served as plain text
        - Audio files may not preview (use download instead)
        - Preview mode determined by service based on file type
        - HTML conversion may not preserve complex formatting perfectly
        - Converted content cached for performance
        - Preview suitable for quick review, not for detailed editing
    
    Example:
        GET /api/documents/550e8400-e29b-41d4-a716-446655440000/preview
        Response: HTML/text content or inline PDF view
    """
    mode, payload = svc.get_preview_payload(db, str(user.id), document_id)
    if mode == "inline_file":
        return FileResponse(path=payload["path"], media_type=payload["media"])
    if mode == "html":
        return HTMLResponse(content=payload["content"])
    return PlainTextResponse(payload["text"])
