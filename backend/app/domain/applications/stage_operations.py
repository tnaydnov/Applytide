"""
Stage Operations Service - Application Stage Management

Handles all stage-related operations for job applications including
creating, updating, listing, and deleting stages.

Stages track the progress of an application through the hiring process
(e.g., "Applied", "Phone Screen", "Interview", "Offer").
"""
from __future__ import annotations
from typing import List
from uuid import UUID
from .repository import IApplicationRepo, IStageRepo
from .dto import StageDTO
from .errors import ApplicationNotFound, StageNotFound, BadRequest
from app.infra.logging import get_logger

logger = get_logger(__name__)


class StageOperationsService:
    """
    Service for managing application stages.
    
    Handles CRUD operations for stages with proper authorization
    and validation. Verifies application ownership before operations.
    """
    
    def __init__(self, stages_repo: IStageRepo, apps_repo: IApplicationRepo):
        """
        Initialize with stage and application repositories.
        
        Args:
            stages_repo: Repository for stage persistence
            apps_repo: Repository for application ownership verification
        """
        if not stages_repo or not apps_repo:
            logger.error("StageOperationsService initialized with None repositories")
            raise ValueError("Both stages_repo and apps_repo must be provided")
        
        self.stages = stages_repo
        self.apps = apps_repo
        logger.debug("StageOperationsService initialized successfully")

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

    def add_stage(
        self, *,
        user_id: UUID,
        app_id: UUID,
        name: str,
        scheduled_at=None,
        outcome=None,
        notes=None
    ) -> StageDTO:
        """
        Add a new stage to an application.
        
        Stages track the progress of an application through the hiring process
        (e.g., "Applied", "Phone Screen", "Interview", "Offer").
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            name: Stage name (required)
            scheduled_at: Optional scheduled date/time for this stage
            outcome: Optional outcome of the stage
            notes: Optional notes about the stage
        
        Returns:
            Created StageDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            BadRequest: If stage creation fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not name or not isinstance(name, str):
                logger.warning(f"Invalid stage name: {name}")
                raise ValueError("name must be a non-empty string")
            
            if len(name) > 200:
                logger.warning(f"Stage name too long: {len(name)} characters")
                raise ValueError("name must be 200 characters or less")
            
            logger.debug(
                f"Adding stage to application {app_id}: {name}",
                extra={"app_id": str(app_id), "stage_name": name}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            try:
                stage = self.stages.add(app_id, name, scheduled_at, outcome, notes)
                logger.info(
                    f"Added stage to application {app_id}",
                    extra={"app_id": str(app_id), "stage_id": str(stage.id), "stage_name": name}
                )
                return stage
            except Exception as e:
                logger.error(f"Failed to add stage to application {app_id}: {e}", exc_info=True)
                raise BadRequest("Failed to add stage")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in add_stage: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while adding stage")

    def list_stages(self, *, user_id: UUID, app_id: UUID) -> List[StageDTO]:
        """
        Get all stages for an application.
        
        Returns stages in chronological order (oldest to newest).
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
        
        Returns:
            List of StageDTO objects
        
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
            
            logger.debug(f"Listing stages for application {app_id}")
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            try:
                stages = self.stages.list_for_app(app_id)
                logger.debug(
                    f"Retrieved {len(stages)} stages for application {app_id}",
                    extra={"app_id": str(app_id), "count": len(stages)}
                )
                return stages
            except Exception as e:
                logger.error(f"Failed to list stages for application {app_id}: {e}", exc_info=True)
                raise BadRequest("Failed to list stages")
                
        except (ValueError, ApplicationNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in list_stages: {e}",
                extra={"app_id": str(app_id), "user_id": str(user_id)},
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while listing stages")

    def update_stage_partial(
        self, *,
        user_id: UUID,
        app_id: UUID,
        stage_id: UUID,
        name=None,
        scheduled_at=None,
        outcome=None,
        notes=None
    ) -> StageDTO:
        """
        Partially update a stage (only updates provided fields).
        
        Allows updating individual fields without affecting others.
        Verifies the stage belongs to the specified application.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            stage_id: UUID of the stage to update
            name: Optional new name
            scheduled_at: Optional new scheduled date/time
            outcome: Optional new outcome
            notes: Optional new notes
        
        Returns:
            Updated StageDTO
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            StageNotFound: If stage doesn't exist or doesn't belong to application
            BadRequest: If update fails
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(stage_id, UUID):
                logger.warning(f"Invalid stage_id type: {type(stage_id)}")
                raise ValueError("stage_id must be a UUID")
            
            if name is not None and (not isinstance(name, str) or not name):
                logger.warning(f"Invalid name: {name}")
                raise ValueError("name must be a non-empty string if provided")
            
            if name and len(name) > 200:
                logger.warning(f"Stage name too long: {len(name)} characters")
                raise ValueError("name must be 200 characters or less")
            
            logger.debug(
                f"Updating stage {stage_id} for application {app_id}",
                extra={"stage_id": str(stage_id), "app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Verify stage belongs to application
            try:
                self.stages.get(app_id, stage_id)
            except LookupError:
                logger.warning(
                    f"Stage {stage_id} not found or doesn't belong to application {app_id}"
                )
                raise StageNotFound(f"Stage {stage_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to verify stage {stage_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to verify stage")
            
            # Build update dictionary
            data = {}
            if name is not None:
                data["name"] = name
            if scheduled_at is not None:
                data["scheduled_at"] = scheduled_at
            if outcome is not None:
                data["outcome"] = outcome
            if notes is not None:
                data["notes"] = notes
            
            if not data:
                logger.debug("No fields to update, returning current stage")
                return self.stages.get(app_id, stage_id)
            
            logger.debug(f"Updating stage {stage_id} with fields: {list(data.keys())}")
            
            # Update stage
            try:
                updated = self.stages.update_partial(stage_id, data)
                logger.info(
                    f"Updated stage {stage_id} for application {app_id}",
                    extra={
                        "stage_id": str(stage_id),
                        "app_id": str(app_id),
                        "updated_fields": list(data.keys())
                    }
                )
                return updated
            except LookupError:
                logger.warning(f"Stage {stage_id} not found during update")
                raise StageNotFound(f"Stage {stage_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to update stage {stage_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to update stage")
                
        except (ValueError, ApplicationNotFound, StageNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in update_stage_partial: {e}",
                extra={
                    "stage_id": str(stage_id),
                    "app_id": str(app_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while updating stage")

    def delete_stage(self, *, user_id: UUID, app_id: UUID, stage_id: UUID) -> None:
        """
        Delete a stage from an application.
        
        Permanently removes the stage. Verifies the stage belongs to
        the specified application before deletion.
        
        Args:
            user_id: UUID of the user (must own application)
            app_id: UUID of the application
            stage_id: UUID of the stage to delete
        
        Raises:
            ValueError: If parameters are invalid
            ApplicationNotFound: If application doesn't exist or user doesn't own it
            StageNotFound: If stage doesn't exist or doesn't belong to application
            BadRequest: If deletion fails
        
        Warning:
            This operation cannot be undone.
        """
        try:
            if not isinstance(user_id, UUID):
                logger.warning(f"Invalid user_id type: {type(user_id)}")
                raise ValueError("user_id must be a UUID")
            
            if not isinstance(app_id, UUID):
                logger.warning(f"Invalid app_id type: {type(app_id)}")
                raise ValueError("app_id must be a UUID")
            
            if not isinstance(stage_id, UUID):
                logger.warning(f"Invalid stage_id type: {type(stage_id)}")
                raise ValueError("stage_id must be a UUID")
            
            logger.debug(
                f"Deleting stage {stage_id} from application {app_id}",
                extra={"stage_id": str(stage_id), "app_id": str(app_id)}
            )
            
            # Verify ownership
            self._verify_ownership(app_id, user_id)
            
            # Verify stage belongs to application
            try:
                self.stages.get(app_id, stage_id)
            except LookupError:
                logger.warning(
                    f"Stage {stage_id} not found or doesn't belong to application {app_id}"
                )
                raise StageNotFound(f"Stage {stage_id} not found")
            except Exception as e:
                logger.error(
                    f"Failed to verify stage {stage_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to verify stage")
            
            # Delete stage
            try:
                self.stages.delete(stage_id)
                logger.info(
                    f"Deleted stage {stage_id} from application {app_id}",
                    extra={"stage_id": str(stage_id), "app_id": str(app_id)}
                )
            except Exception as e:
                logger.error(
                    f"Failed to delete stage {stage_id}: {e}",
                    exc_info=True
                )
                raise BadRequest("Failed to delete stage")
                
        except (ValueError, ApplicationNotFound, StageNotFound, BadRequest):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in delete_stage: {e}",
                extra={
                    "stage_id": str(stage_id),
                    "app_id": str(app_id),
                    "user_id": str(user_id)
                },
                exc_info=True
            )
            raise BadRequest("An unexpected error occurred while deleting stage")

    def create_stage_for_status_change(
        self, *,
        app_id: UUID,
        status: str
    ) -> StageDTO:
        """
        Create a stage entry for a status change (internal use).
        
        Called automatically when application status changes to track
        the history of status transitions.
        
        Args:
            app_id: UUID of the application
            status: New status value
        
        Returns:
            Created StageDTO or None if creation fails
        
        Note:
            This is a best-effort operation. Failures are logged but not raised
            to avoid blocking status updates.
        """
        try:
            logger.debug(f"Creating stage for status change: {status}")
            stage = self.stages.add(app_id, status, None, None, None)
            logger.debug(f"Created stage {stage.id} for status: {status}")
            return stage
        except Exception as e:
            logger.warning(
                f"Failed to create stage for status change (continuing): {e}",
                extra={"app_id": str(app_id), "status": status}
            )
            return None
