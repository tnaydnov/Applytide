"""
Job domain exceptions.

This module defines domain-specific exceptions for job operations.

Exception Hierarchy:
- JobDomainError: Base exception for all job domain errors
  - JobNotFound: Raised when a job is not found or access is denied
  - JobValidationError: Raised when job data validation fails
  - JobOperationError: Raised when a job operation fails
"""


class JobDomainError(Exception):
    """Base exception for all job domain errors."""
    pass


class JobNotFound(JobDomainError):
    """
    Raised when a job is not found or access is denied.
    
    This exception is raised in the following scenarios:
    - Job ID does not exist in the database
    - Job exists but does not belong to the requesting user
    - Job was deleted
    """
    pass


class JobValidationError(JobDomainError):
    """
    Raised when job data validation fails.
    
    This exception is raised when:
    - Job data does not meet validation requirements
    - Required fields are missing
    - Field values are invalid
    """
    pass


class JobOperationError(JobDomainError):
    """
    Raised when a job operation fails.
    
    This exception is raised when:
    - Database operation fails
    - Search operation fails
    - External service operation fails
    """
    pass


# Export all exceptions
__all__ = [
    'JobDomainError',
    'JobNotFound',
    'JobValidationError',
    'JobOperationError',
]
