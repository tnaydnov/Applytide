"""
User Avatar Upload Endpoint

Handles user profile picture uploads with:
- File type validation (images only)
- File size limits (5MB max)
- Avatar URL storage in database
- Comprehensive error handling and logging

Avatar files are validated but not stored by this endpoint - actual file
storage should be handled by a separate file storage service.
"""
from __future__ import annotations
import os
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....db import models
from ....api.deps import get_current_user
from ....api.schemas import auth as schemas
from ....infra.logging import get_logger

router = APIRouter()

# Initialize logging
logger = get_logger(__name__)


@router.post("/upload-avatar", response_model=schemas.AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload user avatar image.
    
    Accepts image file upload and stores avatar URL reference in user
    profile. Validates file type (images only) and size (max 5MB).
    
    Form Data:
        file (UploadFile): Image file (multipart/form-data)
                          Accepted: image/* MIME types
                          Max size: 5MB
                          
    Args:
        file: Uploaded image file (from form data)
        current_user: Authenticated user (from dependency)
        db: Database session (from dependency)
        
    Returns:
        dict: Upload result with:
            - message: "Avatar uploaded successfully"
            - avatar_url: URL path to avatar image
            
    Raises:
        HTTPException: 400 if file type invalid or size exceeds limit
        HTTPException: 500 if upload or database update fails
        
    Security:
        Requires user authentication
        Only image MIME types accepted
        File size limited to 5MB
        Updates only authenticated user's avatar
        
    Notes:
        - Validates MIME type starts with 'image/'
        - File size checked after reading (prevents abuse)
        - Avatar URL format: /avatars/{user_id}/{filename}
        - Updates user.avatar_url and user.updated_at
        - TODO: Implement actual file storage service
        - Currently only stores URL reference
        
    Example:
        POST /api/auth/upload-avatar
        Content-Type: multipart/form-data
        Body: file=<image_binary>
        Returns: {
            "message": "Avatar uploaded successfully",
            "avatar_url": "/avatars/user123/profile.jpg"
        }
    """
    # Allowed image extensions
    _ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}

    logger.info(
        "Avatar upload requested",
        extra={
            "user_id": str(current_user.id),
            "file_name": file.filename,
            "content_type": file.content_type
        }
    )
    
    # Validate file extension
    filename = file.filename or ""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in _ALLOWED_IMAGE_EXTS:
        logger.warning(
            "Invalid avatar file extension",
            extra={
                "user_id": str(current_user.id),
                "extension": ext
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only image files are allowed ({', '.join(sorted(_ALLOWED_IMAGE_EXTS))})"
        )

    # Validate file size
    MAX = 5 * 1024 * 1024  # 5MB
    try:
        data = await file.read()
        file_size = len(data)
        
        if file_size > MAX:
            logger.warning(
                "Avatar file too large",
                extra={
                    "user_id": str(current_user.id),
                    "file_size_mb": round(file_size / (1024 * 1024), 2)
                }
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file"
            )
        
        # SECURITY: Verify actual content is an image via magic bytes
        try:
            import magic
            mime_type = magic.from_buffer(data, mime=True)
            if not mime_type or not mime_type.startswith("image/"):
                logger.warning(
                    "Avatar content is not an image",
                    extra={
                        "user_id": str(current_user.id),
                        "detected_mime": mime_type,
                        "claimed_extension": ext
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File content is not a valid image"
                )
        except ImportError:
            logger.warning(
                "python-magic not available - skipping content validation",
                extra={"user_id": str(current_user.id)}
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error reading avatar file",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process avatar file"
        )
    finally:
        await file.seek(0)

    # Save avatar reference
    try:
        # Sanitize filename: strip path components, keep only safe characters
        safe_name = os.path.basename(file.filename or "avatar")
        safe_name = re.sub(r'[^\w.\-]', '_', safe_name)  # allow alphanumeric, dots, hyphens
        if not safe_name or safe_name.startswith('.'):
            safe_name = f"avatar_{uuid.uuid4().hex[:8]}.jpg"
        avatar_url = f"/avatars/{current_user.id}/{safe_name}"
        current_user.avatar_url = avatar_url
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(
            "Avatar uploaded successfully",
            extra={
                "user_id": str(current_user.id),
                "avatar_url": avatar_url,
                "file_size_kb": round(file_size / 1024, 2)
            }
        )
        
        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to save avatar",
            extra={"user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.delete("/delete-avatar", response_model=schemas.MessageResponse)
def delete_avatar(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete the user's avatar image.

    Clears avatar_url on the User model. Actual file cleanup
    should be handled by a background job.

    Returns:
        dict with success message
    """
    current_user.avatar_url = None
    current_user.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete avatar")

    logger.info("Avatar deleted", extra={"user_id": str(current_user.id)})
    return {"message": "Avatar deleted successfully"}
