"""
LLM Usage Service - Query and analyze LLM usage data
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from uuid import UUID

from ...db.models import LLMUsage, User
from ...infra.logging import get_logger

logger = get_logger(__name__)


class LLMUsageService:
    """Service for querying and analyzing LLM usage data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_llm_stats(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get overall LLM usage statistics for a time period
        
        Args:
            hours: Time period in hours to analyze (default: 24)
            
        Returns:
            Dictionary containing:
            - total_calls: Total number of LLM API calls
            - total_tokens: Total tokens used (prompt + completion)
            - total_cost: Total cost in cents
            - avg_latency_ms: Average latency in milliseconds
            - calls_by_provider: Breakdown by provider
            - calls_by_model: Breakdown by model
            - calls_by_purpose: Breakdown by purpose
            - error_rate: Percentage of calls that resulted in errors
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        # Total calls
        total_calls = self.db.query(func.count(LLMUsage.id)).filter(
            LLMUsage.created_at >= cutoff
        ).scalar() or 0
        
        # Total tokens
        total_tokens = self.db.query(func.sum(LLMUsage.total_tokens)).filter(
            LLMUsage.created_at >= cutoff
        ).scalar() or 0
        
        # Total cost (in cents)
        total_cost = self.db.query(func.sum(LLMUsage.cost)).filter(
            LLMUsage.created_at >= cutoff
        ).scalar() or 0
        
        # Average latency
        avg_latency = self.db.query(func.avg(LLMUsage.latency_ms)).filter(
            LLMUsage.created_at >= cutoff,
            LLMUsage.latency_ms.isnot(None)
        ).scalar() or 0
        
        # Calls by provider
        calls_by_provider = self.db.query(
            LLMUsage.provider,
            func.count(LLMUsage.id).label('count'),
            func.sum(LLMUsage.cost).label('total_cost')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(LLMUsage.provider).all()
        
        # Calls by model
        calls_by_model = self.db.query(
            LLMUsage.model,
            func.count(LLMUsage.id).label('count'),
            func.sum(LLMUsage.cost).label('total_cost'),
            func.sum(LLMUsage.total_tokens).label('total_tokens')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(LLMUsage.model).all()
        
        # Calls by purpose
        calls_by_purpose = self.db.query(
            LLMUsage.purpose,
            func.count(LLMUsage.id).label('count'),
            func.sum(LLMUsage.cost).label('total_cost')
        ).filter(
            LLMUsage.created_at >= cutoff,
            LLMUsage.purpose.isnot(None)
        ).group_by(LLMUsage.purpose).all()
        
        # Error rate
        error_count = self.db.query(func.count(LLMUsage.id)).filter(
            LLMUsage.created_at >= cutoff,
            LLMUsage.error.isnot(None)
        ).scalar() or 0
        error_rate = (error_count / total_calls * 100) if total_calls > 0 else 0
        
        return {
            'time_period_hours': hours,
            'total_calls': total_calls,
            'total_tokens': total_tokens,
            'total_cost_cents': total_cost,
            'total_cost_dollars': total_cost / 100.0,
            'avg_latency_ms': float(avg_latency) if avg_latency else 0,
            'calls_by_provider': [
                {
                    'provider': p,
                    'count': c,
                    'total_cost_cents': tc or 0,
                    'total_cost_dollars': (tc or 0) / 100.0
                }
                for p, c, tc in calls_by_provider
            ],
            'calls_by_model': [
                {
                    'model': m,
                    'count': c,
                    'total_cost_cents': tc or 0,
                    'total_cost_dollars': (tc or 0) / 100.0,
                    'total_tokens': tt or 0
                }
                for m, c, tc, tt in calls_by_model
            ],
            'calls_by_purpose': [
                {
                    'purpose': p or 'unknown',
                    'count': c,
                    'total_cost_cents': tc or 0,
                    'total_cost_dollars': (tc or 0) / 100.0
                }
                for p, c, tc in calls_by_purpose
            ],
            'error_count': error_count,
            'error_rate_percent': round(error_rate, 2)
        }
    
    def get_usage_by_user(self, limit: int = 50, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get LLM usage breakdown by user (top users)
        
        Args:
            limit: Maximum number of users to return
            hours: Optional time period filter
            
        Returns:
            List of users with their usage statistics
        """
        query = self.db.query(
            LLMUsage.user_id,
            User.email,
            User.full_name,
            func.count(LLMUsage.id).label('total_calls'),
            func.sum(LLMUsage.total_tokens).label('total_tokens'),
            func.sum(LLMUsage.cost).label('total_cost')
        ).outerjoin(User, LLMUsage.user_id == User.id)
        
        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            query = query.filter(LLMUsage.created_at >= cutoff)
        
        results = query.group_by(
            LLMUsage.user_id,
            User.email,
            User.full_name
        ).order_by(
            desc('total_cost')
        ).limit(limit).all()
        
        return [
            {
                'user_id': str(user_id) if user_id else None,
                'email': email or 'unknown',
                'full_name': full_name or 'Unknown User',
                'total_calls': total_calls,
                'total_tokens': total_tokens or 0,
                'total_cost_cents': total_cost or 0,
                'total_cost_dollars': (total_cost or 0) / 100.0
            }
            for user_id, email, full_name, total_calls, total_tokens, total_cost in results
        ]
    
    def get_usage_by_model(self, hours: int = 168) -> List[Dict[str, Any]]:
        """
        Get LLM usage breakdown by model (last 7 days by default)
        
        Args:
            hours: Time period in hours
            
        Returns:
            List of models with usage statistics
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        results = self.db.query(
            LLMUsage.provider,
            LLMUsage.model,
            func.count(LLMUsage.id).label('total_calls'),
            func.sum(LLMUsage.prompt_tokens).label('total_prompt_tokens'),
            func.sum(LLMUsage.completion_tokens).label('total_completion_tokens'),
            func.sum(LLMUsage.total_tokens).label('total_tokens'),
            func.sum(LLMUsage.cost).label('total_cost'),
            func.avg(LLMUsage.latency_ms).label('avg_latency')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(
            LLMUsage.provider,
            LLMUsage.model
        ).order_by(
            desc('total_cost')
        ).all()
        
        return [
            {
                'provider': provider,
                'model': model,
                'total_calls': total_calls,
                'total_prompt_tokens': total_prompt_tokens or 0,
                'total_completion_tokens': total_completion_tokens or 0,
                'total_tokens': total_tokens or 0,
                'total_cost_cents': total_cost or 0,
                'total_cost_dollars': (total_cost or 0) / 100.0,
                'avg_latency_ms': float(avg_latency) if avg_latency else 0
            }
            for provider, model, total_calls, total_prompt_tokens, total_completion_tokens, 
                total_tokens, total_cost, avg_latency in results
        ]
    
    def get_recent_calls(self, limit: int = 100, include_errors: bool = True) -> List[Dict[str, Any]]:
        """
        Get recent LLM API calls
        
        Args:
            limit: Maximum number of calls to return
            include_errors: Whether to include failed calls
            
        Returns:
            List of recent LLM calls with details
        """
        query = self.db.query(LLMUsage).outerjoin(User, LLMUsage.user_id == User.id)
        
        if not include_errors:
            query = query.filter(LLMUsage.error.is_(None))
        
        results = query.order_by(desc(LLMUsage.created_at)).limit(limit).all()
        
        return [
            {
                'id': str(call.id),
                'created_at': call.created_at.isoformat(),
                'user_id': str(call.user_id) if call.user_id else None,
                'user_email': call.user.email if call.user else None,
                'provider': call.provider,
                'model': call.model,
                'purpose': call.purpose,
                'endpoint': call.endpoint,
                'prompt_tokens': call.prompt_tokens,
                'completion_tokens': call.completion_tokens,
                'total_tokens': call.total_tokens,
                'cost_cents': call.cost,
                'cost_dollars': call.cost / 100.0,
                'latency_ms': call.latency_ms,
                'has_error': call.error is not None,
                'error': call.error
            }
            for call in results
        ]
    
    def get_cost_breakdown(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get detailed cost breakdown
        
        Args:
            hours: Time period in hours
            
        Returns:
            Dictionary with cost breakdown by multiple dimensions
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        # Total cost
        total_cost = self.db.query(func.sum(LLMUsage.cost)).filter(
            LLMUsage.created_at >= cutoff
        ).scalar() or 0
        
        # Cost by provider
        cost_by_provider = self.db.query(
            LLMUsage.provider,
            func.sum(LLMUsage.cost).label('total_cost')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(LLMUsage.provider).all()
        
        # Cost by model
        cost_by_model = self.db.query(
            LLMUsage.model,
            func.sum(LLMUsage.cost).label('total_cost'),
            func.count(LLMUsage.id).label('call_count')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(LLMUsage.model).order_by(desc('total_cost')).all()
        
        # Cost by purpose
        cost_by_purpose = self.db.query(
            LLMUsage.purpose,
            func.sum(LLMUsage.cost).label('total_cost'),
            func.count(LLMUsage.id).label('call_count')
        ).filter(
            LLMUsage.created_at >= cutoff,
            LLMUsage.purpose.isnot(None)
        ).group_by(LLMUsage.purpose).order_by(desc('total_cost')).all()
        
        return {
            'time_period_hours': hours,
            'total_cost_cents': total_cost,
            'total_cost_dollars': total_cost / 100.0,
            'by_provider': [
                {
                    'provider': p,
                    'cost_cents': c or 0,
                    'cost_dollars': (c or 0) / 100.0,
                    'percentage': ((c or 0) / total_cost * 100) if total_cost > 0 else 0
                }
                for p, c in cost_by_provider
            ],
            'by_model': [
                {
                    'model': m,
                    'cost_cents': c or 0,
                    'cost_dollars': (c or 0) / 100.0,
                    'call_count': cc,
                    'avg_cost_per_call_cents': (c / cc) if cc > 0 else 0,
                    'percentage': ((c or 0) / total_cost * 100) if total_cost > 0 else 0
                }
                for m, c, cc in cost_by_model
            ],
            'by_purpose': [
                {
                    'purpose': p or 'unknown',
                    'cost_cents': c or 0,
                    'cost_dollars': (c or 0) / 100.0,
                    'call_count': cc,
                    'percentage': ((c or 0) / total_cost * 100) if total_cost > 0 else 0
                }
                for p, c, cc in cost_by_purpose
            ]
        }
    
    def get_usage_trends(self, days: int = 7) -> List[Dict[str, Any]]:
        """
        Get daily usage trends
        
        Args:
            days: Number of days to analyze
            
        Returns:
            List of daily statistics
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        # Group by date
        results = self.db.query(
            func.date(LLMUsage.created_at).label('date'),
            func.count(LLMUsage.id).label('total_calls'),
            func.sum(LLMUsage.total_tokens).label('total_tokens'),
            func.sum(LLMUsage.cost).label('total_cost')
        ).filter(
            LLMUsage.created_at >= cutoff
        ).group_by(
            func.date(LLMUsage.created_at)
        ).order_by('date').all()
        
        return [
            {
                'date': date.isoformat(),
                'total_calls': total_calls,
                'total_tokens': total_tokens or 0,
                'total_cost_cents': total_cost or 0,
                'total_cost_dollars': (total_cost or 0) / 100.0
            }
            for date, total_calls, total_tokens, total_cost in results
        ]
