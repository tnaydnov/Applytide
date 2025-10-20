# backend/app/api/routers/admin/users.py
"""User management endpoints"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from passlib.context import CryptContext

from ._deps import limiter, get_admin_service, get_client_info
from ._schemas import (
    UserListResponse,
    UserSummaryResponse,
    UserDetailResponse,
    UpdateAdminStatusRequest,
    UpdatePremiumStatusRequest,
    BanUserRequest,
    UnbanUserRequest,
    DeleteUserRequest,
    ResetUserPasswordRequest,
    TerminateSessionRequest,
    ActiveSessionResponse,
    UserSessionsResponse,
)
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db import models
from ....domain.admin.service import AdminService
from ....infra.logging import get_logger
from ....infra.logging.security_logging import log_security_event


router = APIRouter(tags=["admin-users"])
logger = get_logger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/users", response_model=UserListResponse)
@limiter.limit("100/minute")
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_premium: Optional[bool] = Query(None),
    is_admin: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """List users with pagination and filters"""
    try:
        logger.info(
            "Admin listing users",
            extra={
                "admin_id": str(current_admin.id),
                "page": page,
                "page_size": page_size,
                "search": search,
                "filters": {"is_premium": is_premium, "is_admin": is_admin}
            }
        )
        
        ip_address, user_agent = get_client_info(request)
        service.log_action(
            admin_id=current_admin.id,
            action="list_users",
            details={
                "page": page,
                "search": search,
                "filters": {"is_premium": is_premium, "is_admin": is_admin}
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        users, total = service.list_users(
            page=page,
            page_size=page_size,
            search=search,
            is_premium=is_premium,
            is_admin=is_admin,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        logger.info(
            "Users listed successfully",
            extra={
                "admin_id": str(current_admin.id),
                "total": total,
                "page": page,
                "returned_count": len(users)
            }
        )
        
        return UserListResponse(
            users=[
                UserSummaryResponse(
                    id=str(u.id),
                    email=u.email,
                    full_name=u.full_name,
                    is_premium=u.is_premium,
                    is_admin=u.is_admin,
                    is_oauth_user=u.is_oauth_user,
                    last_login_at=u.last_login_at,
                    created_at=u.created_at,
                    total_applications=u.total_applications,
                    total_documents=u.total_documents,
                    total_jobs=u.total_jobs
                )
                for u in users
            ],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error(
            "Error listing users",
            extra={
                "admin_id": str(current_admin.id),
                "page": page,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user list"
        )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
@limiter.limit("100/minute")
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get detailed user information"""
    try:
        logger.info(
            "Admin requesting user details",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id)
            }
        )
        
        ip_address, user_agent = get_client_info(request)
        service.log_action(
            admin_id=current_admin.id,
            action="view_user_detail",
            target_type="user",
            target_id=str(user_id),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        user = service.get_user_detail(user_id)
        if not user:
            logger.warning(
                "User not found",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_user_id": str(user_id)
                }
            )
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(
            "User details retrieved",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "target_email": user.email
            }
        )
        
        return UserDetailResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_premium=user.is_premium,
            is_admin=user.is_admin,
            is_oauth_user=user.is_oauth_user,
            google_id=user.google_id,
            avatar_url=user.avatar_url,
            bio=user.bio,
            phone=user.phone,
            location=user.location,
            timezone=user.timezone,
            website=user.website,
            linkedin_url=user.linkedin_url,
            github_url=user.github_url,
            email_verified_at=user.email_verified_at,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            total_applications=user.total_applications,
            total_documents=user.total_documents,
            total_jobs=user.total_jobs,
            total_reminders=user.total_reminders,
            recent_activity=user.recent_activity or []
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error retrieving user details",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user details"
        )


@router.patch("/users/{user_id}/admin-status")
@limiter.limit("20/minute")  # Stricter rate limit for sensitive action
async def update_user_admin_status(
    user_id: UUID,
    payload: UpdateAdminStatusRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """
    Update user's admin status (requires justification + step-up auth).
    
    SECURITY: This endpoint requires step-up authentication.
    Admins must call POST /admin/verify-password within the last 5 minutes
    before this endpoint will accept requests.
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        # Log this CRITICAL security operation
        logger.warning(
            "Admin changing user admin status",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": str(user_id),
                "new_admin_status": payload.is_admin,
                "reason": payload.reason,
                "admin_ip": ip_address
            }
        )
        
        # Log security event for monitoring
        log_security_event(
            event_type="admin_status_changed",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "new_admin_status": payload.is_admin,
                "reason": payload.reason
            },
            request=request
        )
        
        success = service.update_user_admin_status(
            admin_id=current_admin.id,
            user_id=user_id,
            is_admin=payload.is_admin,
            reason=payload.reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            logger.error(
                "Failed to update admin status - user not found",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_user_id": str(user_id)
                }
            )
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(
            "Admin status updated successfully",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "new_admin_status": payload.is_admin
            }
        )
        
        return {"success": True, "message": "Admin status updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error updating admin status",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update admin status"
        )


@router.patch("/users/{user_id}/premium-status")
@limiter.limit("50/minute")  # Moderate rate limit
async def update_user_premium_status(
    user_id: UUID,
    payload: UpdatePremiumStatusRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Update user's premium status (requires justification)"""
    try:
        logger.info(
            "Admin updating user premium status",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "new_premium_status": payload.is_premium,
                "expires_at": payload.expires_at.isoformat() if payload.expires_at else None
            }
        )
        
        ip_address, user_agent = get_client_info(request)
        
        success = service.update_user_premium_status(
            admin_id=current_admin.id,
            user_id=user_id,
            is_premium=payload.is_premium,
            expires_at=payload.expires_at,
            reason=payload.reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            logger.warning(
                "Failed to update premium status - user not found",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_user_id": str(user_id)
                }
            )
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(
            "Premium status updated successfully",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "new_premium_status": payload.is_premium
            }
        )
        
        return {"success": True, "message": "Premium status updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error updating premium status",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update premium status"
        )


@router.post("/users/{user_id}/ban")
@limiter.limit("10/minute")  # Strict rate limit for destructive action
async def ban_user(
    user_id: UUID,
    payload: BanUserRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """
    Ban a user and optionally revoke all their sessions (requires step-up auth).
    
    SECURITY: This endpoint requires step-up authentication.
    Banned users cannot log in until unbanned.
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.critical(
            "Admin banning user",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": str(user_id),
                "reason": payload.reason,
                "revoke_sessions": payload.revoke_sessions,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="user_banned",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "reason": payload.reason
            },
            request=request
        )
        
        success = service.ban_user(
            admin_id=current_admin.id,
            user_id=user_id,
            reason=payload.reason,
            revoke_sessions=payload.revoke_sessions,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(
            "User banned successfully",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id)
            }
        )
        
        return {"success": True, "message": "User banned successfully"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error banning user",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to ban user")


@router.post("/users/{user_id}/unban")
@limiter.limit("10/minute")
async def unban_user(
    user_id: UUID,
    payload: UnbanUserRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """Unban a user (requires step-up auth)"""
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.warning(
            "Admin unbanning user",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "reason": payload.reason
            }
        )
        
        success = service.unban_user(
            admin_id=current_admin.id,
            user_id=user_id,
            reason=payload.reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"success": True, "message": "User unbanned successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error unbanning user",
            extra={"admin_id": str(current_admin.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to unban user")


@router.delete("/users/{user_id}")
@limiter.limit("5/minute")  # Very strict rate limit
async def delete_user(
    user_id: UUID,
    payload: DeleteUserRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """
    Delete a user (soft or hard delete) - requires step-up auth and email confirmation.
    
    SECURITY: This endpoint requires step-up authentication.
    - Soft delete: Anonymizes PII, bans account, keeps data for referential integrity
    - Hard delete: PERMANENTLY removes all user data (cannot be undone)
    """
    try:
        # Get user to verify email
        user_detail = service.get_user_detail(user_id)
        if not user_detail:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify email confirmation
        if user_detail.email != payload.confirm_email:
            logger.warning(
                "User deletion failed - email mismatch",
                extra={
                    "admin_id": str(current_admin.id),
                    "target_user_id": str(user_id),
                    "provided_email": payload.confirm_email
                }
            )
            raise HTTPException(
                status_code=400, 
                detail="Email confirmation does not match user's email"
            )
        
        ip_address, user_agent = get_client_info(request)
        
        logger.critical(
            f"Admin {'HARD' if payload.hard_delete else 'SOFT'} deleting user",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": str(user_id),
                "target_email": user_detail.email,
                "hard_delete": payload.hard_delete,
                "reason": payload.reason,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="user_deleted",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "hard_delete": payload.hard_delete,
                "reason": payload.reason
            },
            request=request
        )
        
        success = service.delete_user(
            admin_id=current_admin.id,
            user_id=user_id,
            reason=payload.reason,
            hard_delete=payload.hard_delete,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True, 
            "message": f"User {'permanently deleted' if payload.hard_delete else 'soft deleted'}"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error deleting user",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to delete user")


@router.post("/users/{user_id}/reset-password")
@limiter.limit("10/minute")
async def reset_user_password(
    user_id: UUID,
    payload: ResetUserPasswordRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """
    Admin-initiated password reset for a user (requires step-up auth).
    
    SECURITY: This endpoint requires step-up authentication.
    Optionally terminates all user sessions after password reset.
    """
    try:
        ip_address, user_agent = get_client_info(request)
        
        # Hash the new password
        new_password_hash = pwd_context.hash(payload.new_password)
        
        logger.critical(
            "Admin resetting user password",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": str(user_id),
                "reason": payload.reason,
                "revoke_sessions": payload.revoke_sessions,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="password_reset_by_admin",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "reason": payload.reason
            },
            request=request
        )
        
        success = service.reset_user_password(
            admin_id=current_admin.id,
            user_id=user_id,
            new_password_hash=new_password_hash,
            reason=payload.reason,
            revoke_sessions=payload.revoke_sessions,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"success": True, "message": "Password reset successfully"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error resetting password",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to reset password")


@router.get("/users/{user_id}/sessions", response_model=UserSessionsResponse)
@limiter.limit("100/minute")
async def get_user_sessions(
    user_id: UUID,
    request: Request,
    current_admin: models.User = Depends(get_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get all active sessions for a user"""
    try:
        logger.info(
            "Admin viewing user sessions",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id)
            }
        )
        
        sessions = service.get_user_sessions(user_id)
        
        return UserSessionsResponse(
            sessions=[
                ActiveSessionResponse(
                    id=str(s.id),
                    user_id=str(s.user_id),
                    ip_address=s.ip_address,
                    user_agent=s.user_agent,
                    device_info=s.device_info,
                    location=s.location,
                    last_activity_at=s.last_activity_at,
                    created_at=s.created_at,
                    expires_at=s.expires_at
                )
                for s in sessions
            ],
            total=len(sessions)
        )
    
    except Exception as e:
        logger.error(
            "Error retrieving user sessions",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")


@router.delete("/sessions/{session_id}")
@limiter.limit("20/minute")
async def terminate_session(
    session_id: UUID,
    payload: TerminateSessionRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """Terminate a specific user session (requires step-up auth)"""
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.warning(
            "Admin terminating session",
            extra={
                "admin_id": str(current_admin.id),
                "session_id": str(session_id),
                "reason": payload.reason
            }
        )
        
        success = service.terminate_session(
            admin_id=current_admin.id,
            session_id=session_id,
            reason=payload.reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session terminated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error terminating session",
            extra={
                "admin_id": str(current_admin.id),
                "session_id": str(session_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to terminate session")


@router.delete("/users/{user_id}/sessions")
@limiter.limit("10/minute")
async def terminate_all_user_sessions(
    user_id: UUID,
    payload: TerminateSessionRequest,
    request: Request,
    current_admin: models.User = Depends(get_admin_user_with_step_up),  # STEP-UP REQUIRED
    service: AdminService = Depends(get_admin_service),
):
    """Terminate all sessions for a user - kicks them out (requires step-up auth)"""
    try:
        ip_address, user_agent = get_client_info(request)
        
        logger.critical(
            "Admin terminating all user sessions",
            extra={
                "admin_id": str(current_admin.id),
                "admin_email": current_admin.email,
                "target_user_id": str(user_id),
                "reason": payload.reason,
                "admin_ip": ip_address
            }
        )
        
        log_security_event(
            event_type="all_sessions_terminated",
            details={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "reason": payload.reason
            },
            request=request
        )
        
        count = service.terminate_all_user_sessions(
            admin_id=current_admin.id,
            user_id=user_id,
            reason=payload.reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {
            "success": True, 
            "message": f"Terminated {count} session(s)",
            "sessions_terminated": count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error terminating all sessions",
            extra={
                "admin_id": str(current_admin.id),
                "target_user_id": str(user_id),
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to terminate sessions")

