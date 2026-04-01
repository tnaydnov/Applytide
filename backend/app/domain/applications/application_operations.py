"""
Application Operations Service - Core CRUD for Job Applications

Handles all application-level operations including creation, updates,
queries, and archiving. Focuses on the application entity itself without
managing stages, notes, or attachments.

This is a focused service extracted from the large ApplicationService
to improve maintainability and testability.
"""
from __future__ import annotations
from typing import Optional, List, Tuple
from uuid import UUID
from .repository import IApplicationRepo
from .dto import ApplicationDTO, CardRowDTO
from .errors import ApplicationNotFound, BadRequest
from app.domain.logging import get_logger

logger = get_logger(__name__)


class ApplicationOperationsService:
    """
    Service for core application CRUD operations.
    
    Handles creating, reading, updating, deleting, and querying applications.
    Does not manage child entities (stages, notes, attachments).
    """
    
    def __init__(self, apps_repo: IApplicationRepo):
        """
        Initialize with application repository.
        
        Args:
            apps_repo: Repository for application persistence
        """
        if not apps_repo:
            logger.error("ApplicationOperationsService initialized with None repository")
            raise ValueError("apps_repo must be provided")
        
        self.apps = apps_repo
        logger.debug("ApplicationOperationsService initialized successfully")

    def create_or_update(
        self, *, 
        user_id: UUID, 
        job_id: UUID, 
        resume_id: Optional[UUID], 
        status: Optional[str], 
        source: Optional[str]
    ) -> ApplicationDTO:
        """
        Create new application or update existing one for the same job.
        
        Performs duplicate detection - if user already has an application for this job,
        updates it instead of creating a duplicate. Validates job and resume existence.
        
        Args:
            user_id: UUID of the user creating/updating the application
            job_id: UUID of the job being applied to
            resume_id: Optional UUID of resume to attach
            status: Optional status (defaults to "Applied")
            source: Optional source of application (e.g., "LinkedIn", "Indeed")
        
        Returns:
            ApplicationDTO: Created or updated application
        
        Raises:
            BadRequest: If job_id or resume_id don't exist
            ValueError: If user_id or job_id are invalid UUIDs
        
        Example:
            app = service.create_or_update(
                user_id=user_id,
                job_id=job_id,
                resume_id=resume_id,
                status="Applied",
                source="LinkedIn"
            )
        """
        try:
            # Input validation
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(job_id, UUID):
                logger.warning(f"Invalid job_id type: {type(job_id)}")
                raise ValueError("job_id must be a UUID")
            
            if resume_id and not isinstance(resume_id, UUID):
                logger.warning(f"Invalid resume_id type: {type(resume_id)}")
                raise ValueError("resume_id must be a UUID")
            
            logger.debug(
                f"Creating/updating application: user_id={user_id}, job_id={job_id}, "
                f"resume_id={resume_id}, status={status}, source={source}"
            )
            
            # Validate foreign key references
            try:
                if not self.apps.ensure_job_exists(job_id):
                    logger.warning(f"Job {job_id} does not exist")
                    raise BadRequest(f"Job {job_id} does not exist")
            except Exception as e:
                if isinstance(e, BadRequest):
                    raise
                logger.error(f"Failed to check job existence: {e}", exc_info=True)
                raise BadRequest("Failed to validate job_id")
            
            if resume_id:
                try:
                    if not self.apps.ensure_resume_exists(resume_id):
                        logger.warning(f"Resume {resume_id} does not exist")
                        raise BadRequest(f"Resume {resume_id} does not exist")
                except Exception as e:
                    if isinstance(e, BadRequest):
                        raise
                    logger.error(f"Failed to check resume existence: {e}", exc_info=True)
                    raise BadRequest("Failed to validate resume_id")
            
            # Check for existing application (duplicate detection)
            try:
                existing = self.apps.find_by_user_and_job(user_id, job_id)
            except Exception as e:
                logger.error(f"Failed to check for existing application: {e}", exc_info=True)
                raise BadRequest("Failed to check for duplicate application")
            
            if existing:
                # Update existing application
                logger.debug(f"Updating existing application: {existing.id}")
                new_status = status or "Applied"
                
                # Normalize "Saved" to "Applied" (business rule)
                if new_status == "Saved":
                    logger.debug("Normalizing status from 'Saved' to 'Applied'")
                    new_status = "Applied"
                
                try:
                    updates = {"status": new_status}
                    if resume_id:
                        updates["resume_id"] = resume_id
                    if source:
                        updates["source"] = source
                    
                    updated = self.apps.update(existing.id, updates)
                    logger.info(
                        f"Updated existing application {existing.id}",
                        extra={"application_id": str(existing.id), "user_id": str(user_id)}
                    )
                    return updated
                except Exception as e:
                    logger.error(f"Failed to update application {existing.id}: {e}", exc_info=True)
                    raise BadRequest("Failed to update application")
            
            # Create new application
            logger.debug(f"Creating new application for user {user_id}, job {job_id}")
            try:
                created = self.apps.create(
                    user_id=user_id,
                    job_id=job_id,
                    resume_id=resume_id,
                    status=status or "Applied",
                    source=source
                )
                logger.info(
                    f"Created application {created.id} for user {user_id}, job {job_id}",
                    extra={"application_id": str(created.id), "user_id": str(user_id)}
                )
                return created
            except Exception as e:
                logger.error(
                    f"Failed to create application for user {user_id}, job {job_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to create application")
                
        except (BadRequest, ValueError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in create_or_update: {e}",
                extra={"user_id": str(user_id), "job_id": str(job_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while creating/updating application")

    def list_paginated(
        self, *,
        user_id: UUID,
        status: Optional[str],
        q: str,
        sort: str,
        order: str,
        page: int,
        page_size: int,
        show_archived: bool = False
    ) -> Tuple[List[ApplicationDTO], int]:
        """
        Get paginated list of user's applications with filtering and sorting.
        
        Args:
            user_id: UUID of the user
            status: Optional status filter
            q: Search query string
            sort: Sort field name
            order: Sort order ("asc" or "desc")
            page: Page number (1-indexed)
            page_size: Items per page
            show_archived: Whether to include archived applications
        
        Returns:
            Tuple of (list of applications, total count)
        
        Raises:
            ValueError: If pagination parameters are invalid
            BadRequest: If database query fails
        """
        try:
            # Input validation
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(page, int) or page < 1:
                logger.warning(f"Invalid page parameter: {page}")
                raise ValueError("page must be a positive integer")
            
            if not isinstance(page_size, int) or page_size < 1:
                logger.warning(f"Invalid page_size parameter: {page_size}")
                raise ValueError("page_size must be a positive integer")
            
            if page_size > 100:
                logger.warning(f"page_size {page_size} exceeds maximum, capping at 100")
                page_size = 100
            
            logger.debug(
                f"Listing applications: user_id={user_id}, status={status}, "
                f"q={q}, page={page}, page_size={page_size}, show_archived={show_archived}"
            )
            
            try:
                apps, total = self.apps.list_paginated(
                    user_id=user_id,
                    status=status,
                    q=q,
                    sort=sort,
                    order=order,
                    page=page,
                    page_size=page_size,
                    show_archived=show_archived
                )
                logger.info(
                    f"Listed {len(apps)} applications for user {user_id} (total: {total})",
                    extra={"user_id": str(user_id), "count": len(apps), "total": total}
                )
                return apps, total
            except Exception as e:
                logger.error(
                    f"Failed to list applications for user {user_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to retrieve applications")
                
        except (ValueError, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in list_paginated: {e}",
                extra={"user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while listing applications")

    def get_used_statuses(self, *, user_id: UUID) -> List[str]:
        """
        Get list of all statuses currently used by user's applications.
        
        Useful for filtering UI - only shows statuses that have applications.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            List of status strings
        
        Raises:
            ValueError: If user_id is invalid
            BadRequest: If database query fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            logger.debug(f"Getting used statuses for user {user_id}")
            
            try:
                statuses = self.apps.get_used_statuses(user_id)
                logger.debug(f"Found {len(statuses)} statuses for user {user_id}: {statuses}")
                return statuses
            except Exception as e:
                logger.error(f"Failed to get used statuses for user {user_id}: {e}", exc_info=True)
                raise BadRequest("Failed to retrieve status list")
                
        except (ValueError, BadRequest):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in get_used_statuses: {e}", exc_info=True)
            raise BadRequest("An unexpected error occurred")

    def list_cards(
        self, *, 
        user_id: UUID, 
        status: Optional[str], 
        show_archived: bool = False
    ) -> List[CardRowDTO]:
        """
        Get applications in card format for kanban/board views.
        
        Returns lightweight DTOs optimized for card displays with
        minimal data (id, status, job title, company).
        
        Args:
            user_id: UUID of the user
            status: Optional status filter
            show_archived: Whether to include archived applications
        
        Returns:
            List of CardRowDTO objects
        
        Raises:
            ValueError: If user_id is invalid
            BadRequest: If database query fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            logger.debug(
                f"Listing cards for user {user_id}, status={status}, "
                f"show_archived={show_archived}"
            )
            
            try:
                cards = self.apps.list_cards(user_id, status, show_archived)
                logger.info(
                    f"Retrieved {len(cards)} application cards for user {user_id}",
                    extra={"user_id": str(user_id), "count": len(cards)}
                )
                return cards
            except Exception as e:
                logger.error(f"Failed to list cards for user {user_id}: {e}", exc_info=True)
                raise BadRequest("Failed to retrieve application cards")
                
        except (ValueError, BadRequest):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in list_cards: {e}", exc_info=True)
            raise BadRequest("An unexpected error occurred")

    def get_owned_app(self, *, app_id: UUID, user_id: UUID) -> ApplicationDTO:
        """
        Get application by ID with ownership verification.
        
        Ensures the application belongs to the specified user. Used as a security
        guard in other methods to prevent unauthorized access.
        
        Args:
            app_id: UUID of the application
            user_id: UUID of the user (must be owner)
        
        Returns:
            ApplicationDTO if found and owned by user
        
        Raises:
            ValueError: If app_id or user_id are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
        """
        try:
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            logger.debug(f"Getting application {app_id} for user {user_id}")
            
            try:
                app = self.apps.get_owned_app(app_id, user_id)
                logger.debug(f"Successfully retrieved application {app_id}")
                return app
            except LookupError as e:
                logger.warning(
                    f"Application {app_id} not found or not owned by user {user_id}"
                )
                raise ApplicationNotFound(f"Application {app_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to get application {app_id} for user {user_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to retrieve application")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in get_owned_app: {e}", exc_info=True)
            raise ApplicationNotFound("Application not found")

    def update_status(self, *, user_id: UUID, app_id: UUID, new_status: str) -> ApplicationDTO:
        """
        Update application status.
        
        Normalizes "Saved" status to "Applied" (business rule).
        
        Args:
            user_id: UUID of the user (must be owner)
            app_id: UUID of the application to update
            new_status: New status value
        
        Returns:
            Updated ApplicationDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If update fails
        
        Example:
            app = service.update_status(
                user_id=user_id,
                app_id=app_id,
                new_status="Interview Scheduled"
            )
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not new_status or not isinstance(new_status, str):
                logger.warning(f"Invalid new_status: {new_status}")
                raise ValueError("new_status must be a non-empty string")
            
            if len(new_status) > 100:
                logger.warning(f"new_status too long: {len(new_status)} characters")
                raise ValueError("new_status must be 100 characters or less")
            
            logger.debug(
                f"Updating status for application {app_id}: {new_status}",
                extra={"app_id": str(app_id), "new_status": new_status}
            )
            
            # Verify ownership
            app = self.get_owned_app(app_id=app_id, user_id=user_id)
            old_status = app.status
            
            # Normalize status
            status = new_status or app.status
            if status == "Saved":
                logger.debug("Normalizing status from 'Saved' to 'Applied'")
                status = "Applied"
            
            # Update application
            try:
                updated = self.apps.update(app_id, {"status": status})
                logger.info(
                    f"Updated application {app_id} status: {old_status} → {status}",
                    extra={
                        "app_id": str(app_id),
                        "user_id": str(user_id),
                        "old_status": old_status,
                        "new_status": status
                    }
                )
                return updated
            except Exception as e:
                logger.error(
                    f"Failed to update application {app_id} status: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to update application status")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in update_status: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while updating status")

    def delete(self, *, user_id: UUID, app_id: UUID) -> None:
        """
        Delete application and all related data (cascade delete).
        
        Deletes the application and all associated stages, notes, and attachments.
        Verifies user ownership before deletion.
        
        Args:
            user_id: UUID of the user (must be owner)
            app_id: UUID of the application to delete
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If deletion fails
        
        Warning:
            This operation cannot be undone. All associated data will be permanently deleted.
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            logger.debug(
                f"Deleting application {app_id} for user {user_id}",
                extra={"app_id": str(app_id), "user_id": str(user_id)}
            )
            
            try:
                self.apps.delete_cascade(app_id, user_id)
                logger.info(
                    f"Deleted application {app_id}",
                    extra={"app_id": str(app_id), "user_id": str(user_id)}
                )
            except LookupError as e:
                logger.warning(f"Application {app_id} not found or not owned by user {user_id}")
                raise ApplicationNotFound(f"Application {app_id} not found")
            except Exception as e:
                logger.error(f"Failed to delete application {app_id}: {e}", exc_info=True)
                raise BadRequest("Failed to delete application")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in delete: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while deleting application")

    def list_with_stages(self, *, user_id: UUID) -> list[dict]:
        """
        List all applications with embedded stages for a user.
        
        Returns a complex view with each application containing
        its stages array. Useful for dashboard/pipeline views.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            List of dictionaries with application data and embedded stages
        
        Raises:
            ValueError: If user_id is invalid
            BadRequest: If query fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            logger.debug(f"Listing applications with stages for user {user_id}")
            
            try:
                apps = self.apps.list_with_stages_dict(user_id)
                logger.debug(
                    f"Retrieved {len(apps)} applications with stages for user {user_id}",
                    extra={"user_id": str(user_id), "count": len(apps)}
                )
                return apps
            except Exception as e:
                logger.error(
                    f"Failed to list applications with stages for user {user_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to list applications with stages")
                
        except (ValueError, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in list_with_stages: {e}",
                extra={"user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while listing applications")

    def get_detail(self, *, user_id: UUID, app_id: UUID):
        """
        Get comprehensive application detail view.
        
        Returns application with related job, resume, stages, notes,
        and attachments. Most comprehensive data structure for
        viewing a single application.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
        
        Returns:
            Dictionary with full application details
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If query fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            logger.debug(
                f"Retrieving detail for application {app_id}",
                extra={"app_id": str(app_id), "user_id": str(user_id)}
            )
            
            try:
                detail = self.apps.get_detail(user_id, app_id)
                logger.info(
                    f"Retrieved detail for application {app_id}",
                    extra={"app_id": str(app_id), "user_id": str(user_id)}
                )
                return detail
            except LookupError:
                logger.warning(
                    f"Application {app_id} not found or user {user_id} doesn't own it"
                )
                raise ApplicationNotFound(f"Application {app_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to get detail for application {app_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to retrieve application details")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in get_detail: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while retrieving application details")

    def toggle_archive(self, *, user_id: UUID, app_id: UUID) -> ApplicationDTO:
        """
        Toggle archive status of an application while preserving its status.
        
        Archived applications are hidden from active views but can be
        restored. The application's status remains unchanged.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
        
        Returns:
            Updated ApplicationDTO with new archive status
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If update fails
        
        Example:
            # Archive an application
            app = service.toggle_archive(user_id=user_id, app_id=app_id)
            assert app.is_archived == True
            
            # Restore it
            app = service.toggle_archive(user_id=user_id, app_id=app_id)
            assert app.is_archived == False
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            logger.debug(
                f"Toggling archive status for application {app_id}",
                extra={"app_id": str(app_id)}
            )
            
            # Get current application (verifies ownership)
            app = self.get_owned_app(app_id=app_id, user_id=user_id)
            
            # Prepare updates
            from datetime import datetime, timezone
            new_archived = not app.is_archived
            updates = {
                "is_archived": new_archived,
                "archived_at": datetime.now(timezone.utc) if new_archived else None
            }
            
            logger.debug(
                f"Setting is_archived to {new_archived}",
                extra={
                    "app_id": str(app_id),
                    "old_archived": app.is_archived,
                    "new_archived": new_archived
                }
            )
            
            # Update application
            try:
                updated = self.apps.update(app_id, updates)
                logger.info(
                    f"Toggled archive status for application {app_id}: "
                    f"{app.is_archived} → {new_archived}",
                    extra={
                        "app_id": str(app_id),
                        "old_archived": app.is_archived,
                        "new_archived": new_archived
                    }
                )
                return updated
            except Exception as e:
                logger.error(
                    f"Failed to toggle archive status for application {app_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to toggle archive status")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in toggle_archive: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while toggling archive status")
