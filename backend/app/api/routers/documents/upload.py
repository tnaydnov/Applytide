"""
Document Upload Module

Handles document upload with security validation including file extension
whitelisting, MIME type verification, and content validation.
"""
from __future__ import annotations
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ....db.session import get_db
from ...deps import get_current_user
from ....db.models import User
from .schemas import DocumentType, DocumentResponse
from ...deps import get_document_service
from ....domain.documents.service import DocumentService
from ....infra.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    name: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    """
    Upload a new document (resume, cover letter, or portfolio).
    
    Accepts document uploads with comprehensive security validation including file extension
    whitelisting, MIME type verification, and content validation using python-magic library.
    Supports documents (PDF, DOCX, DOC, TXT) and audio files for voice resumes.
    
    Form Data:
        - file: The uploaded file (required)
        - document_type: Type of document (resume/cover_letter/portfolio/other)
        - name: Optional display name for the document
        - metadata: Optional JSON string with additional metadata
    
    Args:
        file: Uploaded file from multipart form
        document_type: Document classification type
        name: Optional custom display name
        metadata: Optional JSON metadata string
        db: Database session from dependency injection
        current_user: Authenticated user from dependency injection
        svc: Document service from dependency injection
    
    Returns:
        DocumentResponse: Created document details including:
            - id: Document UUID
            - user_id: Owner user ID
            - filename: Original filename
            - display_name: Custom display name or filename
            - document_type: Document classification
            - status: Processing status
            - file_path: Storage path
            - file_size: Size in bytes
            - created_at: Upload timestamp
            - metadata: Additional metadata
    
    Raises:
        HTTPException: 400 if filename missing
        HTTPException: 400 if file extension not allowed
        HTTPException: 400 if file is empty
        HTTPException: 400 if MIME type validation fails (when python-magic available)
        HTTPException: 400 if extension doesn't match content
        HTTPException: 500 if upload processing fails
    
    Security:
        - Requires authentication via get_current_user dependency
        - File extension whitelist: .pdf, .docx, .doc, .txt, .mp3, .m4a, .aac, .wav, .flac, .ogg, .opus
        - MIME type validation using python-magic (when available)
        - Content verification to prevent file type spoofing
        - Metadata sanitization via JSON parsing
        - User-scoped document storage (isolation)
    
    Notes:
        - Supports both document and audio files for flexible resume formats
        - MIME type validation gracefully degraded if python-magic not installed
        - Metadata field accepts JSON string that's parsed and validated
        - Comprehensive logging at each validation step for security audit
        - File content read into memory for validation (consider size limits for production)
        - Storage handled by DocumentService with proper file organization
        - Upload failures don't leak internal file paths or storage details
    
    Example:
        POST /api/documents/upload
        Content-Type: multipart/form-data
        
        file: resume.pdf
        document_type: resume
        name: "Senior Engineer Resume 2025"
        metadata: {"version": "2.0", "optimized_for": "tech"}
        
        Response:
        {
            "id": "uuid-here",
            "user_id": "user-uuid",
            "filename": "resume.pdf",
            "display_name": "Senior Engineer Resume 2025",
            "document_type": "resume",
            "status": "pending",
            "file_size": 245678,
            "created_at": "2025-10-29T12:00:00Z",
            "metadata": {"version": "2.0"}
        }
    """
    try:
        # Extension whitelist
        allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus"}
        
        # MIME type whitelist (maps MIME -> allowed extensions)
        allowed_mimes = {
            # Documents
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/msword": [".doc"],
            "text/plain": [".txt"],
            # Audio
            "audio/mpeg": [".mp3"],
            "audio/mp4": [".m4a"],
            "audio/aac": [".aac"],
            "audio/x-m4a": [".m4a"],
            "audio/wav": [".wav"],
            "audio/x-wav": [".wav"],
            "audio/flac": [".flac"],
            "audio/ogg": [".ogg"],
            "audio/opus": [".opus"],
            "application/ogg": [".ogg"],
        }
        
        if not file.filename:
            logger.warning(
                "Upload attempt with missing filename",
                extra={"user_id": str(current_user.id)}
            )
            raise HTTPException(status_code=400, detail="Missing filename")
        
        ext = "." + file.filename.split(".")[-1].lower()
        if ext not in allowed_extensions:
            logger.warning(
                "Upload attempt with unsupported file format",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename,
                    "extension": ext
                }
            )
            raise HTTPException(status_code=400, detail="Unsupported file format")

        logger.info(
            "Starting document upload",
            extra={
                "user_id": str(current_user.id),
                "file_name": file.filename,
                "document_type": document_type,
                "extension": ext
            }
        )

        content = await file.read()
        if not content:
            logger.warning(
                "Upload attempt with empty file",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename
                }
            )
            raise HTTPException(status_code=400, detail="Empty file")

        # Enforce size limit at router layer to prevent memory exhaustion
        MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
        if len(content) > MAX_UPLOAD_SIZE:
            logger.warning(
                "Upload exceeds size limit",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename,
                    "size_mb": round(len(content) / (1024 * 1024), 2)
                }
            )
            raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_SIZE // (1024 * 1024)}MB limit")
        
        # SECURITY: Verify actual file content matches claimed extension
        try:
            import magic
            mime_type = magic.from_buffer(content, mime=True)
            
            # Check if MIME type is allowed
            if mime_type not in allowed_mimes:
                logger.warning(
                    "Upload attempt with disallowed MIME type",
                    extra={
                        "user_id": str(current_user.id),
                        "file_name": file.filename,
                        "claimed_extension": ext,
                        "detected_mime": mime_type
                    }
                )
                raise HTTPException(
                    status_code=400, 
                    detail=f"File content validation failed. Detected type '{mime_type}' is not allowed."
                )
            
            # Check if extension matches MIME type
            if ext not in allowed_mimes[mime_type]:
                logger.warning(
                    "Upload attempt with mismatched file type",
                    extra={
                        "user_id": str(current_user.id),
                        "file_name": file.filename,
                        "claimed_extension": ext,
                        "detected_mime": mime_type,
                        "expected_extensions": allowed_mimes[mime_type]
                    }
                )
                raise HTTPException(
                    status_code=400,
                    detail="File extension does not match the detected content type"
                )
            
            logger.info(
                "File content validation passed",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename,
                    "mime_type": mime_type,
                    "extension": ext
                }
            )
            
        except ImportError:
            # python-magic not installed - log warning but continue
            logger.warning(
                "python-magic not available - skipping MIME type validation",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename
                }
            )
        except HTTPException:
            raise
        except Exception as mime_error:
            logger.error(
                "Error during MIME type validation",
                extra={
                    "user_id": str(current_user.id),
                    "file_name": file.filename,
                    "error": str(mime_error)
                },
                exc_info=True
            )
            # MIME validation error is a security concern - reject rather than silently pass
            raise HTTPException(
                status_code=400,
                detail="File content validation failed"
            )

        meta_dict: Dict[str, Any] = {}
        if metadata:
            try:
                import json
                meta_dict = json.loads(metadata)
            except Exception as json_error:
                logger.warning(
                    "Failed to parse metadata JSON",
                    extra={
                        "user_id": str(current_user.id),
                        "error": str(json_error)
                    }
                )
                meta_dict = {}

        row = svc.upload_document(
            db=db,
            user_id=str(current_user.id),
            file_content=content,
            filename=file.filename,
            document_type=document_type,
            display_name=name,
            metadata=meta_dict,
        )
        
        logger.info(
            "Document uploaded successfully",
            extra={
                "user_id": str(current_user.id),
                "document_id": str(row.id),
                "file_name": file.filename,
                "size_bytes": len(content)
            }
        )
        
        return svc.resolve_document_response(row)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error uploading document",
            extra={
                "user_id": str(current_user.id),
                "file_name": file.filename if file.filename else "unknown",
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to upload document"
        )
