# backend/app/infra/tracking/llm_tracker.py
"""
LLM Usage Tracking Utility
Wraps OpenAI calls to automatically track usage, tokens, and costs
"""
import time
import uuid
from typing import Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from ...db import models
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Pricing per 1M tokens (as of Oct 2024)
PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.150, "output": 0.600},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> int:
    """
    Calculate cost in cents for LLM call
    Returns cost as integer (cents) to avoid floating point issues
    """
    # Find pricing for this model (fallback to gpt-4o-mini)
    pricing = PRICING.get(model, PRICING["gpt-4o-mini"])
    
    # Calculate cost per million tokens
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    
    total_cost_usd = input_cost + output_cost
    
    # Convert to cents and round
    return int(total_cost_usd * 100)


def track_llm_call(
    db: Session,
    *,
    provider: str = "openai",
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    user_id: Optional[uuid.UUID] = None,
    purpose: Optional[str] = None,
    endpoint: Optional[str] = None,
    latency_ms: Optional[int] = None,
    request_sample: Optional[str] = None,
    response_sample: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Track an LLM API call to database
    
    Args:
        db: Database session
        provider: 'openai', 'anthropic', etc.
        model: Model name (e.g., 'gpt-4o-mini')
        prompt_tokens: Input tokens used
        completion_tokens: Output tokens used
        total_tokens: Total tokens used
        user_id: User who triggered this call (if applicable)
        purpose: What this call was for ('resume_analysis', 'cover_letter', etc.)
        endpoint: API endpoint that triggered this
        latency_ms: Response time in milliseconds
        request_sample: First 500 chars of request (for debugging)
        response_sample: First 500 chars of response (for debugging)
        error: Error message if call failed
    """
    try:
        cost_cents = calculate_cost(model, prompt_tokens, completion_tokens)
        
        usage = models.LLMUsage(
            id=uuid.uuid4(),
            created_at=datetime.now(timezone.utc),
            user_id=user_id,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost=cost_cents,
            purpose=purpose,
            endpoint=endpoint,
            latency_ms=latency_ms,
            request_sample=request_sample[:500] if request_sample else None,
            response_sample=response_sample[:500] if response_sample else None,
            error=error,
        )
        
        db.add(usage)
        db.commit()
        
        logger.info("LLM call tracked", extra={
            "model": model,
            "tokens": total_tokens,
            "cost_cents": cost_cents,
            "purpose": purpose,
        })
        
    except Exception as e:
        logger.error("Failed to track LLM call", extra={"error": str(e)}, exc_info=True)
        db.rollback()


class TrackedLLMWrapper:
    """
    Wrapper around OpenAI client that automatically tracks all calls
    """
    
    def __init__(self, llm_client: Any, db: Session, user_id: Optional[uuid.UUID] = None, purpose: Optional[str] = None):
        self._llm = llm_client
        self._db = db
        self._user_id = user_id
        self._purpose = purpose
    
    def chat_completions_create(self, *, model: str, messages: list, **kwargs) -> Any:
        """
        Tracked version of chat.completions.create()
        """
        start_time = time.time()
        error_msg = None
        response = None
        
        try:
            response = self._llm.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            
            # Track successful call
            latency_ms = int((time.time() - start_time) * 1000)
            
            track_llm_call(
                self._db,
                provider="openai",
                model=model,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens,
                user_id=self._user_id,
                purpose=self._purpose,
                latency_ms=latency_ms,
                request_sample=str(messages[0]) if messages else None,
                response_sample=response.choices[0].message.content if response.choices else None,
            )
            
            return response
            
        except Exception as e:
            error_msg = str(e)
            logger.error("LLM call failed", extra={"error": error_msg}, exc_info=True)
            
            # Track failed call
            track_llm_call(
                self._db,
                provider="openai",
                model=model,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                user_id=self._user_id,
                purpose=self._purpose,
                error=error_msg,
            )
            
            raise
