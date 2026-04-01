"""
Security Service - Admin Security Monitoring and Event Tracking

Provides security monitoring, event tracking, and threat analysis
for the admin panel. Tracks authentication failures, rate limiting,
and unauthorized access attempts.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db import models
from app.domain.admin import dto
from app.domain.logging import get_logger

logger = get_logger(__name__)


class SecurityService:
    """Service for admin security monitoring operations."""
    
    def __init__(self, db: Session):
        """Initialize security service with database session."""
        if db is None:
            logger.error("SecurityService initialized with None database session")
            raise ValueError("Database session cannot be None")
        
        self.db = db
        logger.debug("SecurityService initialized successfully")
    
    def get_security_stats(self, hours: int = 24) -> dto.SecurityStatsDTO:
        """
        Get security statistics for the specified time window.
        
        Args:
            hours: Number of hours to look back (default 24)
            
        Returns:
            SecurityStatsDTO with counts of security events
            
        Raises:
            None - Returns zero statistics on any error
        """
        # Input validation
        if not isinstance(hours, int) or hours < 1:
            logger.warning(f"Invalid hours: {hours}, defaulting to 24")
            hours = 24
        
        if hours > 8760:  # 365 days
            logger.warning(f"hours too large: {hours}, capping at 8760")
            hours = 8760
        
        # Calculate cutoff time
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        logger.debug(f"Fetching security stats since {cutoff}")
        
        # Query security-related logs
        security_logs = []
        try:
            security_logs = self.db.query(models.ApplicationLog).filter(
                models.ApplicationLog.timestamp >= cutoff,
                or_(
                    # Authentication failures
                    and_(
                        models.ApplicationLog.level == 'WARNING',
                        models.ApplicationLog.message.ilike('%login%failed%')
                    ),
                    and_(
                        models.ApplicationLog.level == 'ERROR',
                        models.ApplicationLog.message.ilike('%authentication%')
                    ),
                    # Rate limiting
                    models.ApplicationLog.message.ilike('%rate%limit%'),
                    # Token issues
                    models.ApplicationLog.message.ilike('%token%revok%'),
                    models.ApplicationLog.message.ilike('%token%invalid%'),
                    # Unauthorized access
                    and_(
                        models.ApplicationLog.status_code.in_([401, 403]),
                        models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                    )
                )
            ).all()
            logger.debug(f"Retrieved {len(security_logs)} security log entries")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch security logs: {e}", exc_info=True)
            return dto.SecurityStatsDTO(
                failed_logins=0,
                unique_failed_ips=0,
                rate_limit_violations=0,
                unique_rate_limit_ips=0,
                token_revocations=0
            )
        
        # Count by event type (inferred from message/status)
        failed_logins = 0
        rate_limit_violations = 0
        token_revocations = 0
        
        for e in security_logs:
            if not e:
                continue
            try:
                msg = e.message if hasattr(e, 'message') and e.message else ""
                msg_lower = msg.lower()
                status_code = e.status_code if hasattr(e, 'status_code') else None
                
                # Count failed logins
                if (('login' in msg_lower and 'fail' in msg_lower) or
                    (status_code == 401 and 'auth' in msg_lower)):
                    failed_logins += 1
                
                # Count rate limit violations
                if 'rate' in msg_lower and 'limit' in msg_lower:
                    rate_limit_violations += 1
                
                # Count token revocations
                if 'token' in msg_lower and ('revok' in msg_lower or 'invalid' in msg_lower):
                    token_revocations += 1
            except Exception as ex:
                logger.warning(f"Failed to parse security log entry: {ex}")
                continue
        
        logger.debug(
            f"Security events: {failed_logins} failed logins, "
            f"{rate_limit_violations} rate limits, "
            f"{token_revocations} token revocations"
        )
        
        # Count unique IPs for each category
        failed_login_ips = set()
        rate_limit_ips = set()
        
        for event in security_logs:
            if not event:
                continue
            
            try:
                # Extract IP address
                ip = None
                if hasattr(event, 'ip_address') and event.ip_address:
                    ip = event.ip_address
                elif hasattr(event, 'extra') and event.extra and isinstance(event.extra, dict):
                    ip = event.extra.get('ip_address') or event.extra.get('ip')
                
                if not ip:
                    continue
                
                # Get message
                msg = event.message if hasattr(event, 'message') and event.message else ""
                msg_lower = msg.lower()
                
                # Categorize by event type
                if 'login' in msg_lower and 'fail' in msg_lower:
                    failed_login_ips.add(ip)
                elif 'rate' in msg_lower and 'limit' in msg_lower:
                    rate_limit_ips.add(ip)
            except Exception as e:
                logger.warning(f"Failed to extract IP from security log: {e}")
                continue
        
        logger.info(
            f"Security stats retrieved: {failed_logins} failed logins from "
            f"{len(failed_login_ips)} IPs, {rate_limit_violations} rate limits from "
            f"{len(rate_limit_ips)} IPs, {token_revocations} token revocations"
        )
        
        return dto.SecurityStatsDTO(
            failed_logins=failed_logins,
            unique_failed_ips=len(failed_login_ips),
            rate_limit_violations=rate_limit_violations,
            unique_rate_limit_ips=len(rate_limit_ips),
            token_revocations=token_revocations
        )

    def get_security_events(
        self,
        hours: Optional[int] = 24,
        event_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> List[dict]:
        """
        Get paginated list of security events.
        
        Args:
            hours: Number of hours to look back
            event_type: Filter by event type (failed_login, rate_limit, token_revoked, unauthorized)
            page: Page number (1-indexed)
            page_size: Items per page (max 100)
            
        Returns:
            List of security event dictionaries
            
        Raises:
            None - Returns empty list on any error
        """
        # Input validation
        if not isinstance(page, int) or page < 1:
            logger.warning(f"Invalid page: {page}, defaulting to 1")
            page = 1
        
        if not isinstance(page_size, int) or page_size < 1:
            logger.warning(f"Invalid page_size: {page_size}, defaulting to 50")
            page_size = 50
        
        if page_size > 100:
            logger.warning(f"page_size too large: {page_size}, capping at 100")
            page_size = 100
        
        if hours is not None:
            if not isinstance(hours, int) or hours < 1:
                logger.warning(f"Invalid hours: {hours}, defaulting to 24")
                hours = 24
            elif hours > 8760:  # 365 days
                logger.warning(f"hours too large: {hours}, capping at 8760")
                hours = 8760
        else:
            hours = 24
        
        # Validate event_type
        valid_event_types = {'failed_login', 'rate_limit', 'token_revoked', 'unauthorized'}
        if event_type and event_type not in valid_event_types:
            logger.warning(f"Invalid event_type: {event_type}, ignoring filter")
            event_type = None
        
        logger.debug(
            f"Fetching security events: hours={hours}, event_type={event_type}, "
            f"page={page}, page_size={page_size}"
        )
        
        # Build query
        query = self.db.query(models.ApplicationLog)
        
        # Filter by security events using message patterns and status codes
        try:
            if event_type == 'failed_login':
                query = query.filter(
                    or_(
                        and_(
                            models.ApplicationLog.level.in_(['WARNING', 'ERROR']),
                            models.ApplicationLog.message.ilike('%login%fail%')
                        ),
                        and_(
                            models.ApplicationLog.status_code == 401,
                            models.ApplicationLog.message.ilike('%auth%')
                        )
                    )
                )
            elif event_type == 'rate_limit':
                query = query.filter(
                    models.ApplicationLog.message.ilike('%rate%limit%')
                )
            elif event_type == 'token_revoked':
                query = query.filter(
                    and_(
                        models.ApplicationLog.message.ilike('%token%'),
                        or_(
                            models.ApplicationLog.message.ilike('%revok%'),
                            models.ApplicationLog.message.ilike('%invalid%')
                        )
                    )
                )
            elif event_type == 'unauthorized':
                query = query.filter(
                    and_(
                        models.ApplicationLog.status_code.in_([401, 403]),
                        models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                    )
                )
            else:
                # Show all security events
                query = query.filter(
                    or_(
                        # Authentication failures
                        and_(
                            models.ApplicationLog.level == 'WARNING',
                            models.ApplicationLog.message.ilike('%login%fail%')
                        ),
                        and_(
                            models.ApplicationLog.level == 'ERROR',
                            models.ApplicationLog.message.ilike('%authentication%')
                        ),
                        # Rate limiting
                        models.ApplicationLog.message.ilike('%rate%limit%'),
                        # Token issues
                        and_(
                            models.ApplicationLog.message.ilike('%token%'),
                            or_(
                                models.ApplicationLog.message.ilike('%revok%'),
                                models.ApplicationLog.message.ilike('%invalid%')
                            )
                        ),
                        # Unauthorized access
                        and_(
                            models.ApplicationLog.status_code.in_([401, 403]),
                            models.ApplicationLog.level.in_(['WARNING', 'ERROR'])
                        )
                    )
                )
            
            # Time window filter
            if hours:
                cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
                query = query.filter(models.ApplicationLog.timestamp >= cutoff)
        except Exception as e:
            logger.error(f"Failed to build security events query: {e}", exc_info=True)
            return []
        
        # Order by timestamp descending
        query = query.order_by(models.ApplicationLog.timestamp.desc())
        
        # Pagination
        offset = (page - 1) * page_size
        
        records = []
        try:
            records = query.offset(offset).limit(page_size).all()
            logger.debug(f"Retrieved {len(records)} security event records")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch security events: {e}", exc_info=True)
            return []
        
        # Build response with safe attribute access
        events = []
        for record in records:
            if not record:
                continue
            
            try:
                # Extract IP from record or extra data
                ip_address = None
                if hasattr(record, 'ip_address') and record.ip_address:
                    ip_address = record.ip_address
                elif hasattr(record, 'extra') and record.extra and isinstance(record.extra, dict):
                    ip_address = record.extra.get('ip_address') or record.extra.get('ip')
                
                # Get user email if user_id exists
                user_email = None
                if hasattr(record, 'user_id') and record.user_id:
                    try:
                        user = self.db.get(models.User, record.user_id)
                        if user and hasattr(user, 'email'):
                            user_email = user.email
                    except SQLAlchemyError as e:
                        logger.warning(f"Failed to fetch user email for user_id {record.user_id}: {e}")
                
                # Infer event type from message
                msg = record.message if hasattr(record, 'message') and record.message else ""
                msg_lower = msg.lower()
                status_code = record.status_code if hasattr(record, 'status_code') else None
                
                inferred_event_type = 'other'
                severity = 'medium'
                
                if 'login' in msg_lower and 'fail' in msg_lower:
                    inferred_event_type = 'failed_login'
                    severity = 'medium'
                elif 'rate' in msg_lower and 'limit' in msg_lower:
                    inferred_event_type = 'rate_limit'
                    severity = 'low'
                elif 'token' in msg_lower and ('revok' in msg_lower or 'invalid' in msg_lower):
                    inferred_event_type = 'token_revoked'
                    severity = 'info'
                elif status_code in [401, 403]:
                    inferred_event_type = 'unauthorized'
                    severity = 'high' if status_code == 403 else 'medium'
                
                # Override with severity from extra if present
                if hasattr(record, 'extra') and record.extra and isinstance(record.extra, dict):
                    if 'severity' in record.extra:
                        severity = record.extra.get('severity', severity)
                
                events.append({
                    'id': str(record.id) if hasattr(record, 'id') else None,
                    'timestamp': record.timestamp.isoformat() if hasattr(record, 'timestamp') and record.timestamp else None,
                    'event_type': inferred_event_type,
                    'severity': severity,
                    'user_email': user_email,
                    'ip_address': ip_address,
                    'message': msg,
                    'status_code': status_code,
                    'endpoint': record.endpoint if hasattr(record, 'endpoint') else None,
                    'method': record.method if hasattr(record, 'method') else None
                })
            except Exception as e:
                logger.warning(f"Failed to build security event for record {getattr(record, 'id', 'unknown')}: {e}")
                continue
        
        logger.info(
            f"Security events retrieved: {len(events)} events "
            f"(page {page}, event_type={event_type or 'all'})"
        )
        
        return events
