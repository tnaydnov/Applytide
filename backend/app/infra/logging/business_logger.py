"""
Business Event Logger

Provides high-level logging functions for common business events.
Makes it easy for developers to log important events consistently.

Usage:
    from app.infra.logging.business_logger import BusinessEventLogger
    
    event_logger = BusinessEventLogger()
    
    # Authentication events
    event_logger.log_login(user_id="123", success=True, method="google")
    event_logger.log_registration(user_id="123", email="user@example.com")
    
    # Business operations
    event_logger.log_job_created(user_id="123", job_id="456", job_title="Engineer")
    event_logger.log_application_submitted(user_id="123", app_id="789", job_id="456")
"""

from typing import Optional, Dict, Any
from uuid import UUID
from app.infra.logging import get_logger


logger = get_logger(__name__)


class BusinessEventLogger:
    """
    High-level interface for logging business events
    
    Provides semantic logging methods that automatically include
    appropriate context and structure.
    """
    
    # ==================== Authentication Events ====================
    
    @staticmethod
    def log_login(
        user_id: str | UUID,
        success: bool,
        method: str = "email",  # "email", "google", "token_refresh"
        ip_address: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        """Log user login attempt"""
        extra = {
            "event_type": "user_login",
            "user_id": str(user_id),
            "auth_method": method,
            "success": success,
        }
        
        if ip_address:
            extra["ip_address"] = ip_address
        
        if success:
            logger.info(
                f"User logged in successfully via {method}",
                extra=extra
            )
        else:
            extra["failure_reason"] = failure_reason or "unknown"
            logger.warning(
                f"Login failed for user via {method}: {failure_reason}",
                extra=extra
            )
    
    @staticmethod
    def log_logout(user_id: str | UUID):
        """Log user logout"""
        logger.info(
            "User logged out",
            extra={
                "event_type": "user_logout",
                "user_id": str(user_id)
            }
        )
    
    @staticmethod
    def log_registration(
        user_id: str | UUID,
        email: str,
        registration_method: str = "email",  # "email", "google"
        ip_address: Optional[str] = None
    ):
        """Log new user registration"""
        extra = {
            "event_type": "user_registration",
            "user_id": str(user_id),
            "email": email,
            "registration_method": registration_method
        }
        
        if ip_address:
            extra["ip_address"] = ip_address
        
        logger.info(
            f"New user registered via {registration_method}",
            extra=extra
        )
    
    @staticmethod
    def log_password_reset(user_id: str | UUID, email: str):
        """Log password reset request"""
        logger.info(
            "Password reset requested",
            extra={
                "event_type": "password_reset",
                "user_id": str(user_id),
                "email": email
            }
        )
    
    @staticmethod
    def log_token_refresh(user_id: str | UUID, success: bool):
        """Log token refresh attempt"""
        if success:
            logger.info(
                "Token refreshed successfully",
                extra={
                    "event_type": "token_refresh",
                    "user_id": str(user_id)
                }
            )
        else:
            logger.warning(
                "Token refresh failed",
                extra={
                    "event_type": "token_refresh_failed",
                    "user_id": str(user_id)
                }
            )
    
    # ==================== Job Events ====================
    
    @staticmethod
    def log_job_created(
        user_id: str | UUID,
        job_id: str | UUID,
        job_title: str,
        company: str,
        source: str = "manual"
    ):
        """Log job creation"""
        logger.info(
            f"Job created: {job_title} at {company}",
            extra={
                "event_type": "job_created",
                "user_id": str(user_id),
                "job_id": str(job_id),
                "job_title": job_title,
                "company": company,
                "source": source
            }
        )
    
    @staticmethod
    def log_job_updated(
        user_id: str | UUID,
        job_id: str | UUID,
        fields_updated: list[str]
    ):
        """Log job update"""
        logger.info(
            f"Job updated: {', '.join(fields_updated)}",
            extra={
                "event_type": "job_updated",
                "user_id": str(user_id),
                "job_id": str(job_id),
                "fields_updated": fields_updated
            }
        )
    
    @staticmethod
    def log_job_deleted(user_id: str | UUID, job_id: str | UUID):
        """Log job deletion"""
        logger.info(
            "Job deleted",
            extra={
                "event_type": "job_deleted",
                "user_id": str(user_id),
                "job_id": str(job_id)
            }
        )
    
    # ==================== Application Events ====================
    
    @staticmethod
    def log_application_submitted(
        user_id: str | UUID,
        application_id: str | UUID,
        job_id: str | UUID,
        source: str = "manual"
    ):
        """Log job application submission"""
        logger.info(
            "Job application submitted",
            extra={
                "event_type": "application_submitted",
                "user_id": str(user_id),
                "application_id": str(application_id),
                "job_id": str(job_id),
                "source": source
            }
        )
    
    @staticmethod
    def log_application_status_changed(
        user_id: str | UUID,
        application_id: str | UUID,
        old_status: str,
        new_status: str
    ):
        """Log application status change"""
        logger.info(
            f"Application status changed: {old_status} → {new_status}",
            extra={
                "event_type": "application_status_changed",
                "user_id": str(user_id),
                "application_id": str(application_id),
                "old_status": old_status,
                "new_status": new_status
            }
        )
    
    # ==================== Document Events ====================
    
    @staticmethod
    def log_document_uploaded(
        user_id: str | UUID,
        document_id: str | UUID,
        document_type: str,  # "resume", "cover_letter", etc.
        file_size: int,
        file_name: str
    ):
        """Log document upload"""
        logger.info(
            f"Document uploaded: {document_type}",
            extra={
                "event_type": "document_uploaded",
                "user_id": str(user_id),
                "document_id": str(document_id),
                "document_type": document_type,
                "file_size_bytes": file_size,
                "file_name": file_name
            }
        )
    
    @staticmethod
    def log_document_deleted(
        user_id: str | UUID,
        document_id: str | UUID,
        document_type: str
    ):
        """Log document deletion"""
        logger.info(
            f"Document deleted: {document_type}",
            extra={
                "event_type": "document_deleted",
                "user_id": str(user_id),
                "document_id": str(document_id),
                "document_type": document_type
            }
        )
    
    # ==================== Profile Events ====================
    
    @staticmethod
    def log_profile_updated(
        user_id: str | UUID,
        fields_updated: list[str]
    ):
        """Log profile update"""
        logger.info(
            f"Profile updated: {', '.join(fields_updated)}",
            extra={
                "event_type": "profile_updated",
                "user_id": str(user_id),
                "fields_updated": fields_updated
            }
        )
    
    # ==================== Payment Events ====================
    
    @staticmethod
    def log_payment_initiated(
        user_id: str | UUID,
        payment_id: str,
        amount: float,
        currency: str = "USD"
    ):
        """Log payment initiation"""
        logger.info(
            f"Payment initiated: {amount} {currency}",
            extra={
                "event_type": "payment_initiated",
                "user_id": str(user_id),
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency
            }
        )
    
    @staticmethod
    def log_payment_completed(
        user_id: str | UUID,
        payment_id: str,
        amount: float,
        currency: str = "USD"
    ):
        """Log successful payment"""
        logger.info(
            f"Payment completed: {amount} {currency}",
            extra={
                "event_type": "payment_completed",
                "user_id": str(user_id),
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency
            }
        )
    
    @staticmethod
    def log_payment_failed(
        user_id: str | UUID,
        payment_id: str,
        amount: float,
        failure_reason: str,
        currency: str = "USD"
    ):
        """Log failed payment"""
        logger.warning(
            f"Payment failed: {failure_reason}",
            extra={
                "event_type": "payment_failed",
                "user_id": str(user_id),
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency,
                "failure_reason": failure_reason
            }
        )
    
    # ==================== Security Events ====================
    
    @staticmethod
    def log_rate_limit_exceeded(
        user_id: Optional[str | UUID],
        ip_address: str,
        endpoint: str,
        limit: str
    ):
        """Log rate limit violation"""
        logger.warning(
            f"Rate limit exceeded: {endpoint}",
            extra={
                "event_type": "rate_limit_exceeded",
                "user_id": str(user_id) if user_id else None,
                "ip_address": ip_address,
                "endpoint": endpoint,
                "limit": limit
            }
        )
    
    @staticmethod
    def log_suspicious_activity(
        user_id: Optional[str | UUID],
        ip_address: str,
        activity_type: str,
        details: Dict[str, Any]
    ):
        """Log suspicious activity"""
        logger.warning(
            f"Suspicious activity detected: {activity_type}",
            extra={
                "event_type": "suspicious_activity",
                "user_id": str(user_id) if user_id else None,
                "ip_address": ip_address,
                "activity_type": activity_type,
                **details
            }
        )
    
    @staticmethod
    def log_permission_denied(
        user_id: str | UUID,
        resource: str,
        action: str
    ):
        """Log permission denied attempt"""
        logger.warning(
            f"Permission denied: {action} on {resource}",
            extra={
                "event_type": "permission_denied",
                "user_id": str(user_id),
                "resource": resource,
                "action": action
            }
        )
    
    # ==================== System Events ====================
    
    @staticmethod
    def log_external_api_call(
        api_name: str,
        endpoint: str,
        success: bool,
        duration_ms: float,
        status_code: Optional[int] = None,
        error: Optional[str] = None
    ):
        """Log external API call"""
        extra = {
            "event_type": "external_api_call",
            "api_name": api_name,
            "endpoint": endpoint,
            "success": success,
            "duration_ms": duration_ms
        }
        
        if status_code:
            extra["status_code"] = status_code
        
        if success:
            logger.info(
                f"External API call succeeded: {api_name}",
                extra=extra
            )
        else:
            extra["error"] = error
            logger.error(
                f"External API call failed: {api_name} - {error}",
                extra=extra
            )
    
    @staticmethod
    def log_background_job_started(
        job_name: str,
        job_id: str
    ):
        """Log background job start"""
        logger.info(
            f"Background job started: {job_name}",
            extra={
                "event_type": "background_job_started",
                "job_name": job_name,
                "job_id": job_id
            }
        )
    
    @staticmethod
    def log_background_job_completed(
        job_name: str,
        job_id: str,
        duration_seconds: float,
        items_processed: Optional[int] = None
    ):
        """Log background job completion"""
        extra = {
            "event_type": "background_job_completed",
            "job_name": job_name,
            "job_id": job_id,
            "duration_seconds": duration_seconds
        }
        
        if items_processed is not None:
            extra["items_processed"] = items_processed
        
        logger.info(
            f"Background job completed: {job_name}",
            extra=extra
        )
    
    @staticmethod
    def log_background_job_failed(
        job_name: str,
        job_id: str,
        error: str
    ):
        """Log background job failure"""
        logger.error(
            f"Background job failed: {job_name} - {error}",
            extra={
                "event_type": "background_job_failed",
                "job_name": job_name,
                "job_id": job_id,
                "error": error
            }
        )
