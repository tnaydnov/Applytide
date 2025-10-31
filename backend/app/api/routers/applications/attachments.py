"""
Application Attachment Management Endpoints

Handles file attachments for applications:
- Attach existing documents from document library
- Upload new files directly to applications
- List all attachments for an application
- Download attachment files
- Delete attachments

All endpoints require user authentication and ownership verification.
Attachments support resumes, cover letters, portfolios, and other documents.
"""
from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from ...deps import get_current_user
from app.domain.documents.service.preview import PreviewNotFoundError
from ....db import models
from ...schemas.applications import AttachmentOut
from ....domain.applications.service import ApplicationService
from ...deps import get_application_service
from .utils import broadcast_event, logger

router = APIRouter()


@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: dict,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Attach an existing document from user's document library.
    
    Links a previously uploaded document (resume, cover letter, etc.)
    to the application without creating a duplicate file. Reuses
    existing documents for efficiency.
    
    Path Parameters:
        app_id (UUID): ID of the application to attach document to
        
    Request Body:
        document_id (UUID): ID of existing document in user's library
        document_type (str): Type of document (resume, cover_letter, portfolio, other)
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        AttachmentOut: Created attachment reference with:
            - id: Attachment UUID
            - application_id: Parent application UUID
            - document_id: Referenced document UUID
            - document_type: Document type
            - filename: Original filename
            - content_type: MIME type
            - file_size: Size in bytes
            - created_at: Attachment timestamp
            
    Raises:
        HTTPException: 404 if application or document not found
        HTTPException: 500 if attachment fails
        
    Security:
        Requires user authentication
        Only allows attaching to user's own applications
        Only allows attaching user's own documents
        
    Notes:
        - Does not duplicate file storage
        - Document must exist in user's library
        - Broadcasts 'attachment_added' WebSocket event
        - Use for: attaching stored resumes, cover letters
        
    Example:
        POST /api/applications/{app_id}/attachments/from-document
        Body: {"document_id": "...", "document_type": "resume"}
    """
    try:
        logger.debug(
            "Attaching document to application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "document_id": payload.get("document_id"),
                "document_type": payload.get("document_type")
            }
        )
        
        a = svc.attach_from_document(
            user_id=current_user.id,
            app_id=app_id,
            document_id=str(payload.get("document_id")),
            document_type=(payload.get("document_type") or "other"),
        )
        
        logger.info(
            "Document attached successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(a.id),
                "document_type": a.document_type
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("attachment_added", str(app_id))
        
        return AttachmentOut(**a.__dict__)
        
    except Exception as e:
        logger.error(
            "Failed to attach document",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        # If the underlying document preview reported the stored file is missing,
        # return a 404 with a clear message so the frontend can prompt the user
        # to re-upload the original document.
        if isinstance(e, PreviewNotFoundError) or (
            getattr(e, "__cause__", None) and isinstance(e.__cause__, PreviewNotFoundError)
        ):
            raise HTTPException(
                status_code=404,
                detail="Document file missing from storage. Please re-upload the document and try again."
            )

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application or document not found"
            )

        raise HTTPException(
            status_code=500,
            detail="Failed to attach document"
        )


@router.post("/{app_id}/attachments", response_model=AttachmentOut)
async def upload_attachment(
    app_id: uuid.UUID,
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a new file attachment directly to application.
    
    Uploads a file and immediately attaches it to the specified
    application. Use for quick uploads without storing in document
    library first.
    
    Path Parameters:
        app_id (UUID): ID of the application to upload to
        
    Form Data:
        file (UploadFile): File to upload (multipart/form-data)
        document_type (str): Type of document (resume, cover_letter, portfolio, other)
                             Default: "other"
                             
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        AttachmentOut: Created attachment with:
            - id: Attachment UUID
            - application_id: Parent application UUID
            - filename: Original filename
            - content_type: MIME type
            - file_size: Size in bytes
            - document_type: Document classification
            - created_at: Upload timestamp
            
    Raises:
        HTTPException: 400 if file is empty or invalid
        HTTPException: 404 if application not found
        HTTPException: 413 if file exceeds size limit
        HTTPException: 500 if upload fails
        
    Security:
        Requires user authentication
        Only allows uploading to user's own applications
        File size and type restrictions apply
        
    Notes:
        - File stored independently (not in document library)
        - Supports: PDF, DOC, DOCX, TXT, images
        - Max file size: check system configuration
        - Broadcasts 'attachment_added' WebSocket event
        - Use for: quick uploads, application-specific documents
        
    Example:
        POST /api/applications/{app_id}/attachments
        Content-Type: multipart/form-data
        Body: file=<binary>, document_type="resume"
    """
    try:
        logger.debug(
            "Uploading attachment to application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "file_name": file.filename,
                "content_type": file.content_type,
                "document_type": document_type
            }
        )
        
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="File must have a filename"
            )
        
        a = await svc.upload_attachment(
            user_id=current_user.id,
            app_id=app_id,
            file=file,
            document_type=document_type,
        )
        
        logger.info(
            "Attachment uploaded successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(a.id),
                "file_name": a.filename,
                "file_size": a.file_size
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("attachment_added", str(app_id))
        
        return AttachmentOut(**a.__dict__)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to upload attachment",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "file_name": file.filename if file else None,
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        if "size" in str(e).lower() or "too large" in str(e).lower():
            raise HTTPException(
                status_code=413,
                detail="File size exceeds limit"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to upload attachment"
        )


@router.get("/{app_id}/attachments", response_model=List[AttachmentOut])
def list_attachments(
    app_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all attachments for an application.
    
    Retrieves all file attachments associated with the specified
    application, including both directly uploaded files and linked
    documents from the user's library.
    
    Path Parameters:
        app_id (UUID): ID of the application to list attachments for
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        List[AttachmentOut]: List of attachments with:
            - id: Attachment UUID
            - application_id: Parent application UUID
            - document_id: Referenced document UUID (if linked)
            - filename: Original filename
            - content_type: MIME type
            - file_size: Size in bytes
            - document_type: Document classification
            - created_at: Attachment timestamp
            Ordered by creation date (newest first)
            
    Raises:
        HTTPException: 404 if application not found
        HTTPException: 500 if listing fails
        
    Security:
        Requires user authentication
        Only returns attachments for user's own applications
        
    Notes:
        - Returns empty list if no attachments exist
        - Includes both uploaded and linked documents
        - Use for: displaying attachment lists, file management UI
        
    Example:
        GET /api/applications/{app_id}/attachments
        Returns: [{"id": "...", "filename": "resume.pdf", ...}, ...]
    """
    try:
        logger.debug(
            "Listing attachments for application",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id)
            }
        )
        
        items = svc.list_attachments(user_id=current_user.id, app_id=app_id)
        
        logger.info(
            "Attachments listed successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_count": len(items)
            }
        )
        
        return [AttachmentOut(**i.__dict__) for i in items]
        
    except Exception as e:
        logger.error(
            "Failed to list attachments",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to list attachments"
        )


@router.get("/{app_id}/attachments/{attachment_id}/download")
def download_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Download an attachment file.
    
    Retrieves the file content for the specified attachment and
    returns it as a downloadable response with proper headers.
    Supports resumption and streaming for large files.
    
    Path Parameters:
        app_id (UUID): ID of the application containing attachment
        attachment_id (UUID): ID of the attachment to download
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        FileResponse: File download with:
            - File content (binary stream)
            - Content-Disposition: attachment; filename="..."
            - Content-Type: original MIME type
            - Content-Length: file size
            
    Raises:
        HTTPException: 404 if application or attachment not found
        HTTPException: 500 if download fails
        
    Security:
        Requires user authentication
        Only allows downloading user's own attachments
        
    Notes:
        - Streams file content (memory efficient)
        - Preserves original filename
        - Sets correct MIME type for browser handling
        - Use for: file downloads, viewing documents
        
    Example:
        GET /api/applications/{app_id}/attachments/{attachment_id}/download
        Returns: Binary file with download headers
    """
    try:
        logger.debug(
            "Downloading attachment",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id)
            }
        )
        
        a = svc.get_attachment(
            user_id=current_user.id,
            app_id=app_id,
            attachment_id=attachment_id
        )
        
        logger.info(
            "Attachment download initiated",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id),
                "file_name": a.filename,
                "file_size": a.file_size
            }
        )
        
        return FileResponse(
            path=a.file_path,
            filename=a.filename,
            media_type=a.content_type
        )
        
    except Exception as e:
        logger.error(
            "Failed to download attachment",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Attachment not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to download attachment"
        )


@router.delete("/{app_id}/attachments/{attachment_id}")
def delete_attachment(
    app_id: uuid.UUID,
    attachment_id: uuid.UUID,
    svc: ApplicationService = Depends(get_application_service),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete an attachment from an application.
    
    Permanently removes the attachment reference and optionally
    deletes the underlying file (if not linked to documents).
    This action cannot be undone.
    
    Path Parameters:
        app_id (UUID): ID of the application containing attachment
        attachment_id (UUID): ID of the attachment to delete
        
    Args:
        svc: Application service instance (from dependency)
        current_user: Authenticated user (from dependency)
        
    Returns:
        dict: Success message with:
            - message: "Attachment deleted successfully"
            
    Raises:
        HTTPException: 404 if application or attachment not found
        HTTPException: 500 if deletion fails
        
    Security:
        Requires user authentication
        Only allows deleting user's own attachments
        
    Notes:
        - **PERMANENT ACTION** - Cannot be undone
        - Deletes file if not referenced elsewhere
        - Linked documents remain in library
        - Broadcasts 'attachment_deleted' WebSocket event
        - Use for: cleanup, replacing attachments
        
    Example:
        DELETE /api/applications/{app_id}/attachments/{attachment_id}
        Returns: {"message": "Attachment deleted successfully"}
    """
    try:
        logger.debug(
            "Deleting attachment",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id)
            }
        )
        
        svc.delete_attachment(
            user_id=current_user.id,
            app_id=app_id,
            attachment_id=attachment_id
        )
        
        logger.info(
            "Attachment deleted successfully",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id)
            }
        )
        
        # Best-effort WebSocket broadcast
        broadcast_event("attachment_deleted", str(app_id))
        
        return {"message": "Attachment deleted successfully"}
        
    except Exception as e:
        logger.error(
            "Failed to delete attachment",
            extra={
                "user_id": str(current_user.id),
                "application_id": str(app_id),
                "attachment_id": str(attachment_id),
                "error": str(e)
            },
            exc_info=True
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Attachment not found"
            )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete attachment"
        )
