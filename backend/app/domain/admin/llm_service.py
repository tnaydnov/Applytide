"""
LLM Service - Admin LLM Usage Tracking and Analytics

Provides LLM usage monitoring, cost analysis, and performance metrics
for the admin panel. Tracks all LLM API calls across the application.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db import models
from app.domain.admin import dto
from app.domain.logging import get_logger

logger = get_logger(__name__)


class LLMService:
    """Service for admin LLM usage tracking operations."""
    
    def __init__(self, db: Session):
        """Initialize LLM service with database session."""
        if db is None:
            logger.error("LLMService initialized with None database session")
            raise ValueError("Database session cannot be None")
        
        self.db = db
        logger.debug("LLMService initialized successfully")
    
    def get_llm_usage_stats(self, hours: Optional[int] = 24) -> dto.LLMUsageStatsDTO:
        """
        Get LLM usage statistics for the specified time window.
        
        Args:
            hours: Number of hours to look back (default: 24)
            
        Returns:
            LLMUsageStatsDTO with aggregated statistics
            
        Raises:
            None - Returns zero/empty statistics on any error
        """
        # Input validation
        if not isinstance(hours, (int, type(None))):
            logger.warning(f"Invalid hours type: {type(hours)}, defaulting to 24")
            hours = 24
        
        if hours is not None:
            if hours < 1:
                logger.warning(f"Invalid hours value: {hours}, setting to 1")
                hours = 1
            elif hours > 8760:  # 365 days
                logger.warning(f"Hours too large: {hours}, capping at 8760 (365 days)")
                hours = 8760
        
        cutoff = None
        if hours:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
            logger.debug(f"Fetching LLM usage stats since {cutoff}")
        
        # Build base filter
        filters = []
        if cutoff:
            filters.append(models.LLMUsage.timestamp >= cutoff)
        
        # Total calls query
        total_calls = 0
        try:
            stmt = select(func.count(models.LLMUsage.id))
            if filters:
                stmt = stmt.where(*filters)
            total_calls = self.db.scalar(stmt) or 0
            logger.debug(f"Total LLM calls: {total_calls}")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch total LLM calls: {e}", exc_info=True)
        
        # Successful calls query
        successful_calls = 0
        try:
            stmt = select(func.count(models.LLMUsage.id)).where(models.LLMUsage.success == True)
            if filters:
                stmt = stmt.where(*filters)
            successful_calls = self.db.scalar(stmt) or 0
            logger.debug(f"Successful LLM calls: {successful_calls}")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch successful LLM calls: {e}", exc_info=True)
        
        # Total cost query
        total_cost = 0.0
        try:
            stmt = select(func.sum(models.LLMUsage.estimated_cost))
            if filters:
                stmt = stmt.where(*filters)
            total_cost = self.db.scalar(stmt) or 0.0
            logger.debug(f"Total LLM cost: ${total_cost:.4f}")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch total LLM cost: {e}", exc_info=True)
        
        # Total tokens query
        total_tokens = 0
        try:
            stmt = select(func.sum(models.LLMUsage.total_tokens))
            if filters:
                stmt = stmt.where(*filters)
            total_tokens = self.db.scalar(stmt) or 0
            logger.debug(f"Total tokens: {total_tokens}")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch total tokens: {e}", exc_info=True)
        
        # Average response time query
        avg_response_time = 0
        try:
            stmt = select(func.avg(models.LLMUsage.response_time_ms))
            if filters:
                stmt = stmt.where(*filters)
            avg_response_time = self.db.scalar(stmt) or 0
            logger.debug(f"Average response time: {avg_response_time}ms")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch average response time: {e}", exc_info=True)
        
        # Usage by endpoint query
        by_endpoint = []
        try:
            stmt = select(
                models.LLMUsage.endpoint,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost'),
                func.sum(models.LLMUsage.total_tokens).label('tokens')
            ).group_by(models.LLMUsage.endpoint)
            if filters:
                stmt = stmt.where(*filters)
            endpoint_stats = self.db.execute(stmt).all()
            
            for row in endpoint_stats:
                if not row:
                    continue
                try:
                    by_endpoint.append({
                        "endpoint": row[0] if row[0] else "unknown",
                        "calls": row[1] if row[1] is not None else 0,
                        "cost": float(row[2] or 0),
                        "tokens": row[3] if row[3] is not None else 0
                    })
                except (IndexError, ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse endpoint stats row: {e}")
                    continue
            
            logger.debug(f"Endpoint stats: {len(by_endpoint)} endpoints")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch endpoint stats: {e}", exc_info=True)
        
        # Usage by model query
        by_model = []
        try:
            stmt = select(
                models.LLMUsage.model,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost')
            ).group_by(models.LLMUsage.model)
            if filters:
                stmt = stmt.where(*filters)
            model_stats = self.db.execute(stmt).all()
            
            for row in model_stats:
                if not row:
                    continue
                try:
                    by_model.append({
                        "model": row[0] if row[0] else "unknown",
                        "calls": row[1] if row[1] is not None else 0,
                        "cost": float(row[2] or 0)
                    })
                except (IndexError, ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse model stats row: {e}")
                    continue
            
            logger.debug(f"Model stats: {len(by_model)} models")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch model stats: {e}", exc_info=True)
        
        # Usage by usage_type query
        by_usage_type = []
        try:
            stmt = select(
                models.LLMUsage.usage_type,
                func.count(models.LLMUsage.id).label('calls'),
                func.sum(models.LLMUsage.estimated_cost).label('cost'),
                func.sum(models.LLMUsage.total_tokens).label('tokens')
            ).group_by(models.LLMUsage.usage_type)
            if filters:
                stmt = stmt.where(*filters)
            usage_type_stats = self.db.execute(stmt).all()
            
            for row in usage_type_stats:
                if not row:
                    continue
                try:
                    by_usage_type.append({
                        "usage_type": row[0] if row[0] else "unknown",
                        "calls": row[1] if row[1] is not None else 0,
                        "cost": float(row[2] or 0),
                        "tokens": row[3] if row[3] is not None else 0
                    })
                except (IndexError, ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse usage_type stats row: {e}")
                    continue
            
            logger.debug(f"Usage type stats: {len(by_usage_type)} types")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch usage_type stats: {e}", exc_info=True)
        
        logger.info(
            f"LLM usage stats retrieved: {total_calls} calls "
            f"({successful_calls} successful), "
            f"${total_cost:.4f} cost, {total_tokens} tokens"
        )
        
        return dto.LLMUsageStatsDTO(
            total_calls=total_calls,
            successful_calls=successful_calls,
            failed_calls=total_calls - successful_calls,
            total_cost=float(total_cost),
            total_tokens=total_tokens,
            avg_response_time_ms=int(avg_response_time),
            by_endpoint=by_endpoint,
            by_model=by_model,
            by_usage_type=by_usage_type
        )
    
    def get_llm_usage_list(
        self,
        page: int = 1,
        page_size: int = 50,
        endpoint: Optional[str] = None,
        usage_type: Optional[str] = None,
        user_id: Optional[int] = None,
        success_only: Optional[bool] = None,
        hours: Optional[int] = None
    ) -> dto.PaginatedLLMUsageDTO:
        """
        Get paginated list of LLM usage records.
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page (max 100)
            endpoint: Filter by endpoint
            usage_type: Filter by usage type
            user_id: Filter by user ID
            success_only: Filter by success status
            hours: Time window in hours
            
        Returns:
            PaginatedLLMUsageDTO with usage records
            
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
                logger.warning(f"Invalid hours: {hours}, ignoring filter")
                hours = None
            elif hours > 8760:  # 365 days
                logger.warning(f"hours too large: {hours}, capping at 8760")
                hours = 8760
        
        if user_id is not None and (not isinstance(user_id, int) or user_id < 1):
            logger.warning(f"Invalid user_id: {user_id}, ignoring filter")
            user_id = None
        
        logger.debug(
            f"Fetching LLM usage list: page={page}, page_size={page_size}, "
            f"endpoint={endpoint}, usage_type={usage_type}, user_id={user_id}, "
            f"success_only={success_only}, hours={hours}"
        )
        
        stmt = select(models.LLMUsage)
        
        # Apply filters with error handling
        try:
            if endpoint:
                stmt = stmt.where(models.LLMUsage.endpoint == endpoint)
            
            if usage_type:
                stmt = stmt.where(models.LLMUsage.usage_type == usage_type)
            
            if user_id:
                stmt = stmt.where(models.LLMUsage.user_id == user_id)
            
            if success_only is not None:
                stmt = stmt.where(models.LLMUsage.success == success_only)
            
            if hours:
                cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
                stmt = stmt.where(models.LLMUsage.timestamp >= cutoff)
        except Exception as e:
            logger.error(f"Failed to apply filters: {e}", exc_info=True)
            return dto.PaginatedLLMUsageDTO(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                pages=0
            )
        
        # Get total count
        total = 0
        try:
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = self.db.scalar(count_stmt) or 0
            logger.debug(f"Total LLM usage records: {total}")
        except SQLAlchemyError as e:
            logger.error(f"Failed to count LLM usage records: {e}", exc_info=True)
            return dto.PaginatedLLMUsageDTO(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                pages=0
            )
        
        # Apply pagination
        stmt = stmt.order_by(desc(models.LLMUsage.timestamp))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        # Execute query
        records = []
        try:
            records = self.db.scalars(stmt).all()
            logger.debug(f"Retrieved {len(records)} LLM usage records")
        except SQLAlchemyError as e:
            logger.error(f"Failed to fetch LLM usage records: {e}", exc_info=True)
            return dto.PaginatedLLMUsageDTO(
                items=[],
                total=total,
                page=page,
                page_size=page_size,
                pages=(total + page_size - 1) // page_size
            )
        
        # Build DTOs with safe attribute access
        items = []
        for record in records:
            if not record:
                continue
            
            try:
                # Get user email if user_id exists
                user_email = None
                if hasattr(record, 'user_id') and record.user_id:
                    try:
                        user = self.db.get(models.User, record.user_id)
                        if user and hasattr(user, 'email'):
                            user_email = user.email
                    except SQLAlchemyError as e:
                        logger.warning(f"Failed to fetch user email for user_id {record.user_id}: {e}")
                
                items.append(dto.LLMUsageDTO(
                    id=record.id if hasattr(record, 'id') else None,
                    timestamp=record.timestamp if hasattr(record, 'timestamp') else datetime.now(timezone.utc),
                    user_id=record.user_id if hasattr(record, 'user_id') else None,
                    user_email=user_email,
                    provider=record.provider if hasattr(record, 'provider') else None,
                    model=record.model if hasattr(record, 'model') else None,
                    endpoint=record.endpoint if hasattr(record, 'endpoint') else None,
                    usage_type=record.usage_type if hasattr(record, 'usage_type') else None,
                    prompt_tokens=record.prompt_tokens if hasattr(record, 'prompt_tokens') else 0,
                    completion_tokens=record.completion_tokens if hasattr(record, 'completion_tokens') else 0,
                    total_tokens=record.total_tokens if hasattr(record, 'total_tokens') else 0,
                    estimated_cost=record.estimated_cost if hasattr(record, 'estimated_cost') else 0.0,
                    response_time_ms=record.response_time_ms if hasattr(record, 'response_time_ms') else 0,
                    success=record.success if hasattr(record, 'success') else False,
                    error_message=record.error_message if hasattr(record, 'error_message') else None
                ))
            except Exception as e:
                logger.warning(f"Failed to build LLMUsageDTO for record {getattr(record, 'id', 'unknown')}: {e}")
                continue
        
        pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        
        logger.info(
            f"LLM usage list retrieved: {len(items)} records (page {page}/{pages})"
        )
        
        return dto.PaginatedLLMUsageDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages
        )
