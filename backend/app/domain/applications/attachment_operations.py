"""
Attachment Operations Service - Application File Management

Handles all attachment-related operations for job applications including
uploading, listing, retrieving, and deleting file attachments.

Attachments are files associated with applications (e.g., cover letters,
additional documents, interview prep materials).
"""
from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from .repository import IApplicationRepo, IAttachmentRepo
from .dto import AttachmentDTO
from .errors import ApplicationNotFound, AttachmentNotFound, BadRequest
from app.domain.documents.service.preview import PreviewNotFoundError
from app.infra.logging import get_logger

logger = get_logger(__name__)


class AttachmentPort:
    """Abstract view the domain needs from an attachment store."""
    async def save_upload(self, file) -> tuple: ...
    def copy_from_path(self, src_path, suggested_name, media_type) -> tuple: ...


class DocumentServicePort:
    """Abstract interface for document service integration."""
    def resolve_download(self, *, db, user_id: str, document_id: str):
        ...


class AttachmentOperationsService:
    """
    Service for managing application file attachments.
    
    Handles file uploads, downloads, and attachment metadata management
    with proper authorization and validation. Integrates with file storage
    and document services.
    """
    
    def __init__(
        self,
        attachments_repo: IAttachmentRepo,
        apps_repo: IApplicationRepo,
        attach_store: AttachmentPort,
        doc_service: DocumentServicePort,
        db_session
    ):
        """
        Initialize with required dependencies.
        
        Args:
            attachments_repo: Repository for attachment persistence
            apps_repo: Repository for application ownership verification
            attach_store: File storage adapter
            doc_service: Document service for resume integration
            db_session: Database session for document service
        """
        if not all([attachments_repo, apps_repo, attach_store, doc_service, db_session]):
            logger.error("AttachmentOperationsService initialized with None dependencies")
            raise ValueError("All dependencies must be provided")
        
        self.attachments = attachments_repo
        self.apps = apps_repo
        self.store = attach_store
        self.doc_service = doc_service
        self.db = db_session
        logger.debug("AttachmentOperationsService initialized successfully")

    def _verify_ownership(self, app_id: UUID, user_id: UUID) -> None:
        """
        Verify user owns the application.
        
        Args:
            app_id: UUID of the application
            user_id: UUID of the user
        
        Raises:
            ApplicationNotFound: If application doesn't exist or user doesn't own it
        """
        try:
            self.apps.get_owned_app(app_id, user_id)
        except LookupError:
            logger.warning(
                f"Application {app_id} not found or not owned by user {user_id}"
            )
            raise ApplicationNotFound(f"Application {app_id} not found")

    def list_attachments(self, *, user_id: UUID, app_id: UUID) -> List[AttachmentDTO]:
        """
        List all attachments for an application.
        
        Returns metadata for all files attached to the application
        (e.g., cover letters, additional documents).
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
        
        Returns:
            List of AttachmentDTOs
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If listing fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            logger.debug(
                f"Listing attachments for application {app_id}",
                extra={"app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # List attachments
            try:
                attachments = self.attachments.list_for_app(app_id)
                logger.debug(
                    f"Retrieved {len(attachments)} attachments for application {app_id}",
                    extra={"app_id": str(app_id), "count": len(attachments)}
                )
                return attachments
            except Exception as e:
                logger.error(
                    f"Failed to list attachments for application {app_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to list attachments")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in list_attachments: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while listing attachments")

    def get_attachment(self, *, user_id: UUID, app_id: UUID, attachment_id: UUID) -> AttachmentDTO:
        """
        Get a specific attachment with ownership verification.
        
        Ensures the attachment belongs to the specified application
        and the user owns the application.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            attachment_id: UUID of the attachment
        
        Returns:
            AttachmentDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            AttachmentNotFound: If attachment doesn't exist or doesn't belong to application
            BadRequest: If retrieval fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(attachment_id, UUID):
                logger.warning(f"Invalid attachment_id type: {type(attachment_id)}")
                raise ValueError("attachment_id must be a UUID")
            
            logger.debug(
                f"Getting attachment {attachment_id} for application {app_id}",
                extra={"attachment_id": str(attachment_id), "app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Get attachment
            try:
                a = self.attachments.get(attachment_id)
            except LookupError:
                logger.warning(f"Attachment {attachment_id} not found")
                raise AttachmentNotFound(f"Attachment {attachment_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to get attachment {attachment_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to retrieve attachment")
            
            # Verify attachment belongs to application
            if a.application_id != app_id:
                logger.warning(
                    f"Attachment {attachment_id} doesn't belong to application {app_id}"
                )
                raise AttachmentNotFound(f"Attachment {attachment_id} not found")
            
            logger.debug(
                f"Retrieved attachment {attachment_id}",
                extra={"attachment_id": str(attachment_id), "file_name": a.filename}
            )
            return a
            
        except (ValueError, ApplicationNotFound, AttachmentNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in get_attachment: {e}",
                extra={
                    "attachment_id": str(attachment_id),
                    "app_id": str(app_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while retrieving attachment")

    async def upload_attachment(
        self, *,
        user_id: UUID,
        app_id: UUID,
        file,
        document_type: Optional[str]
    ) -> AttachmentDTO:
        """
        Upload a file attachment for an application.
        
        Handles file upload, storage, and attachment metadata creation.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            file: File upload object
            document_type: Type of document (e.g., "cover_letter", "other")
        
        Returns:
            Created AttachmentDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If upload fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if file is None:
                logger.warning("No file provided for upload")
                raise ValueError("file is required")
            
            logger.debug(
                f"Uploading attachment to application {app_id}",
                extra={"app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Save uploaded file
            try:
                dst, size, filename, content_type = await self.store.save_upload(file)
                logger.debug(
                    f"File saved: {filename} ({size} bytes)",
                    extra={"file_name": filename, "size": size, "content_type": content_type}
                )
            except Exception as e:
                logger.error(
                    f"Failed to save uploaded file: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to save uploaded file")
            
            # Create attachment record
            try:
                attachment = self.attachments.create(
                    app_id=app_id,
                    filename=filename,
                    file_size=size,
                    content_type=content_type,
                    file_path=str(dst),
                    document_type=document_type or "other"
                )
                logger.info(
                    f"Created attachment for application {app_id}",
                    extra={
                        "app_id": str(app_id),
                        "attachment_id": str(attachment.id),
                        "file_name": filename,
                        "size": size
                    }
                )
                return attachment
            except Exception as e:
                logger.error(
                    f"Failed to create attachment record: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to create attachment record")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in upload_attachment: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while uploading attachment")

    def attach_from_document(
        self, *,
        user_id: UUID,
        app_id: UUID,
        document_id: str,
        document_type: Optional[str]
    ):
        """
        Attach an existing document to an application.
        
        Copies a document from the document service to application
        attachments. Useful for attaching resumes or other stored documents.
        
        Args:
            user_id: UUID of the user (must own application and document)
            app_id: UUID of the application
            document_id: ID of the document to attach
            document_type: Type of document (e.g., "resume", "cover_letter", "other")
        
        Returns:
            Created AttachmentDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If document resolution or attachment fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(document_id, str) or not document_id:
                logger.warning(f"Invalid document_id: {document_id}")
                raise ValueError("document_id must be a non-empty string")
            
            logger.debug(
                f"Attaching document {document_id} to application {app_id}",
                extra={"app_id": str(app_id), "document_id": document_id}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Resolve document
            try:
                src_path, filename, media_type = self.doc_service.resolve_download(
                    db=self.db,
                    user_id=str(user_id),
                    document_id=document_id
                )
                logger.debug(
                    f"Resolved document: {filename}",
                    extra={"file_name": filename, "media_type": media_type}
                )
            except PreviewNotFoundError as e:
                # Propagate not-found so API can return a 404 with a helpful message
                logger.warning(
                    f"Document file missing for {document_id}: {e}",
                    extra={"document_id": document_id}
                )
                raise
            except Exception as e:
                logger.error(
                    f"Failed to resolve document {document_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to resolve document")
            
            # Copy file
            try:
                dst, size, out_name, out_type = self.store.copy_from_path(
                    src_path, filename, media_type
                )
                logger.debug(
                    f"Copied file: {out_name} ({size} bytes)",
                    extra={"file_name": out_name, "size": size}
                )
            except Exception as e:
                logger.error(
                    f"Failed to copy file from document: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to copy file")
            
            # Create attachment record
            try:
                attachment = self.attachments.create(
                    app_id=app_id,
                    filename=out_name,
                    file_size=size,
                    content_type=out_type,
                    file_path=str(dst),
                    document_type=document_type or "other"
                )
                logger.info(
                    f"Attached document {document_id} to application {app_id}",
                    extra={
                        "app_id": str(app_id),
                        "attachment_id": str(attachment.id),
                        "document_id": document_id,
                        "file_name": out_name
                    }
                )
                return attachment
            except Exception as e:
                logger.error(
                    f"Failed to create attachment record: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to create attachment record")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in attach_from_document: {e}",
                extra={
                    "app_id": str(app_id),
                    "user_id": str(user_id),
                    "document_id": document_id
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while attaching document")

    def delete_attachment(
        self, *,
        user_id: UUID,
        app_id: UUID,
        attachment_id: UUID
    ) -> None:
        """
        Delete an attachment from an application.
        
        Removes the attachment record and attempts to delete the file.
        File deletion is best-effort and won't fail the operation.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            attachment_id: UUID of the attachment to delete
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            AttachmentNotFound: If attachment doesn't exist or doesn't belong to application
            BadRequest: If deletion fails
        
        Warning:
            This operation cannot be undone. The file will be permanently deleted.
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(attachment_id, UUID):
                logger.warning(f"Invalid attachment_id type: {type(attachment_id)}")
                raise ValueError("attachment_id must be a UUID")
            
            logger.debug(
                f"Deleting attachment {attachment_id} from application {app_id}",
                extra={"attachment_id": str(attachment_id), "app_id": str(app_id)}
            )
            
            # Get attachment (verifies ownership)
            a = self.get_attachment(
                user_id=user_id,
                app_id=app_id,
                attachment_id=attachment_id
            )
            
            # Remove file (best-effort)
            import os
            try:
                os.unlink(a.file_path)
                logger.debug(f"Deleted file: {a.file_path}")
            except FileNotFoundError:
                logger.warning(f"File not found, continuing: {a.file_path}")
            except Exception as e:
                logger.warning(
                    f"Failed to delete file (continuing): {e}",
                    extra={"file_path": a.file_path}
                )
            
            # Delete attachment record
            try:
                self.attachments.delete(attachment_id)
                logger.info(
                    f"Deleted attachment {attachment_id} from application {app_id}",
                    extra={
                        "attachment_id": str(attachment_id),
                        "app_id": str(app_id),
                        "file_name": a.filename
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to delete attachment record {attachment_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to delete attachment")
                
        except (ValueError, ApplicationNotFound, AttachmentNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in delete_attachment: {e}",
                extra={
                    "attachment_id": str(attachment_id),
                    "app_id": str(app_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while deleting attachment")
