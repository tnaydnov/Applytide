"""
Application domain exceptions.

This module defines domain-specific exceptions for application operations.

Exception Hierarchy:
- ApplicationDomainError: Base exception for all application domain errors
  - ApplicationNotFound: Raised when an application is not found or access is denied
  - ApplicationValidationError: Raised when application data validation fails
  - ApplicationOperationError: Raised when an application operation fails
  - StageNotFound: Raised when a stage is not found
  - AttachmentNotFound: Raised when an attachment is not found
  - BadRequest: Raised when request data is invalid
"""


class ApplicationDomainError(Exception):
    """Base exception for all application domain errors."""
    pass


class ApplicationNotFound(ApplicationDomainError):
    """
    Raised when an application is not found or access is denied.
    
    This exception is raised in the following scenarios:
    - Application ID does not exist in the database
    - Application exists but does not belong to the requesting user
    - Application was deleted
    """
    pass


class ApplicationValidationError(ApplicationDomainError):
    """
    Raised when application data validation fails.
    
    This exception is raised when:
    - Application data does not meet validation requirements
    - Required fields are missing
    - Field values are invalid
    """
    pass


class ApplicationOperationError(ApplicationDomainError):
    """
    Raised when an application operation fails.
    
    This exception is raised when:
    - Database operation fails
    - External service operation fails
    - State transition is invalid
    """
    pass


class StageNotFound(ApplicationDomainError):
    """
    Raised when a stage is not found.
    
    This exception is raised when:
    - Stage ID does not exist
    - Stage does not belong to the application
    - Stage was deleted
    """
    pass


class AttachmentNotFound(ApplicationDomainError):
    """
    Raised when an attachment is not found.
    
    This exception is raised when:
    - Attachment ID does not exist
    - Attachment does not belong to the application
    - Attachment file was deleted
    """
    pass


class NoteNotFound(ApplicationDomainError):
    """
    Raised when a note is not found.
    
    This exception is raised when:
    - Note ID does not exist
    - Note does not belong to the application
    - Note was deleted
    """
    pass


class BadRequest(ApplicationDomainError):
    """
    Raised when request data is invalid.
    
    This exception is raised when:
    - Request parameters are malformed
    - Required fields are missing from request
    - Request data fails validation
    
    Attributes:
        detail: Human-readable error message explaining what went wrong
    """
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


# Export all exceptions
__all__ = [
    'ApplicationDomainError',
    'ApplicationNotFound',
    'ApplicationValidationError',
    'ApplicationOperationError',
    'StageNotFound',
    'AttachmentNotFound',
    'NoteNotFound',
    'BadRequest',
]
