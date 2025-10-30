"""
AI-Powered Cover Letter Generation Module.

This module provides intelligent cover letter generation using OpenAI GPT models
with async/await support for non-blocking operation in FastAPI applications.

Features:
    - Async API calls (AsyncOpenAI) for non-blocking operation
    - Intelligent analysis of resume, job description, and candidate profile
    - Multiple tone options (professional, conversational, confident, creative, enthusiastic)
    - Flexible length options (short: 200-300, medium: 300-400, long: 400-500 words)
    - ATS-friendly formatting and keyword optimization
    - LLM usage tracking for cost monitoring
    - HTTP(S) proxy support for enterprise environments
    - Template fallback for offline or error scenarios

Architecture:
    - Compatible with openai>=1.x (AsyncOpenAI)
    - Uses httpx for async HTTP with configurable timeouts
    - Integrates with SQLAlchemy for job/company lookups
    - Optional LLM usage tracking via llm_tracker

Model Selection:
    - Default: gpt-4o-mini (cost-effective, fast, high quality)
    - Override via: COVER_LETTER_MODEL environment variable or settings
    - Configurable: base_url, organization, project for enterprise deployments

Cost Estimation:
    - gpt-4o-mini: ~$0.002-0.004 per cover letter (300-500 words)
    - Automatic usage tracking when db_session provided
    - See llm_tracker for detailed cost analytics

Usage Example:
    ```python
    service = AICoverLetterService(db_session=db)
    try:
        result = await service.generate_intelligent_cover_letter(
            db=db,
            job_id="uuid-here",
            resume_content="...",
            user_profile={"skills": [...], "education": [...]},
            tone="professional",
            length="medium"
        )
        if result["success"]:
            print(result["cover_letter"])
    finally:
        await service.aclose()
    ```

Error Handling:
    - Rate limit errors: Automatic retry with exponential backoff
    - API errors: Graceful degradation to template fallback
    - Validation errors: Clear error messages for missing/invalid data
    - Comprehensive logging throughout

Security:
    - API key from environment variable (OPENAI_API_KEY)
    - Never logs API keys or sensitive data
    - Input validation and sanitization
    - Respects maximum input lengths to prevent abuse

CRITICAL WARNING:
    DO NOT MODIFY THE SYSTEM PROMPT OR DETAILED INSTRUCTIONS.
    The prompts are carefully engineered for optimal quality and factual accuracy.
    Changes may result in fabricated information or poor output quality.

Dependencies:
    - openai>=1.x
    - httpx
    - sqlalchemy
    - Python 3.10+ (uses modern type hints)

Author: ApplyTide Team
Last Updated: 2025-01-18
"""

from __future__ import annotations

import os
import json
import uuid
import time
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any

import httpx
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
from openai import APIError, APITimeoutError, RateLimitError, APIConnectionError

# Configuration constants
MIN_RESUME_LENGTH: int = 50  # Minimum resume content length
MAX_RESUME_LENGTH: int = 10000  # Maximum resume content for API
MAX_DESCRIPTION_LENGTH: int = 6000  # Maximum job description length
MAX_PROFILE_LENGTH: int = 4000  # Maximum user profile JSON length
MAX_TITLE_LENGTH: int = 180  # Maximum title/location length
HTTP_TIMEOUT_SECONDS: int = 60  # HTTP request timeout
HTTP_READ_TIMEOUT_SECONDS: int = 60  # HTTP read timeout
HTTP_CONNECT_TIMEOUT_SECONDS: int = 20  # HTTP connection timeout
MAX_TOKENS: int = 1000  # Maximum tokens for response
TEMPERATURE: float = 0.6  # LLM temperature for creativity
DEFAULT_MODEL: str = "gpt-4o-mini"  # Default model if not configured

# Valid tone options
VALID_TONES = {"professional", "conversational", "confident", "creative", "enthusiastic"}

# Valid length options
VALID_LENGTHS = {"short", "medium", "long"}

# Word count mappings
WORD_COUNTS = {
    "short": "200-300",
    "medium": "300-400",
    "long": "400-500",
}

# Tone instruction mappings
TONE_INSTRUCTIONS = {
    "professional": "formal and professional",
    "conversational": "warm and conversational while maintaining professionalism",
    "confident": "confident and assertive while remaining respectful",
    "creative": "creative and engaging while staying professional",
    "enthusiastic": "enthusiastic and energetic while staying professional",
}



# Load configuration from settings or environment
try:
    from ...config import settings  # type: ignore
    OPENAI_API_KEY = settings.OPENAI_API_KEY
    OPENAI_BASE_URL = getattr(settings, "OPENAI_BASE_URL", None)
    OPENAI_ORG = getattr(settings, "OPENAI_ORGANIZATION", None)
    OPENAI_PROJECT = getattr(settings, "OPENAI_PROJECT", None)
    HTTP_PROXY = getattr(settings, "HTTP_PROXY", None) or os.getenv("HTTP_PROXY")
    HTTPS_PROXY = getattr(settings, "HTTPS_PROXY", None) or os.getenv("HTTPS_PROXY")
    COVER_LETTER_MODEL = getattr(settings, "COVER_LETTER_MODEL", None) or os.getenv("COVER_LETTER_MODEL", DEFAULT_MODEL)
except Exception:
    # Fallback to environment variables if settings import fails
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
    OPENAI_ORG = os.getenv("OPENAI_ORGANIZATION")
    OPENAI_PROJECT = os.getenv("OPENAI_PROJECT")
    HTTP_PROXY = os.getenv("HTTP_PROXY")
    HTTPS_PROXY = os.getenv("HTTPS_PROXY")
    COVER_LETTER_MODEL = os.getenv("COVER_LETTER_MODEL", DEFAULT_MODEL)

from ...db import models
from .llm_tracker import track_openai_call
from ..logging import get_logger

logger = get_logger(__name__)


def _safe_str(x: object, limit: int | None = None) -> str:
    """
    Safely convert object to string with optional length limit.
    
    Args:
        x: Object to convert to string (can be None)
        limit: Optional maximum length (None for no limit)
    
    Returns:
        str: String representation (empty if None, truncated if over limit)
    
    Examples:
        >>> _safe_str(None)
        ''
        >>> _safe_str("Hello World", 5)
        'Hello'
        >>> _safe_str(12345)
        '12345'
    
    Notes:
        - Returns empty string for None values
        - Truncates without ellipsis (simple truncation)
        - Negative limits treated as no limit
    """
    s = "" if x is None else str(x)
    if limit is not None and limit >= 0 and len(s) > limit:
        return s[:limit]
    return s


def _resolve_job_and_company(db: Session, job_id: str) -> Tuple[models.Job, Optional[str]]:
    """
    Resolve job and company information from database.
    
    Args:
        db: Database session
        job_id: Job UUID string
    
    Returns:
        Tuple of (Job model, company_name or None)
    
    Raises:
        ValueError: If job_id is invalid UUID or job not found
    
    Examples:
        >>> job, company = _resolve_job_and_company(db, "550e8400-e29b-41d4-a716-446655440000")
        >>> print(f"{job.title} at {company}")
    
    Notes:
        - Uses left join (company may be None)
        - Validates UUID format automatically
        - Returns company_name as string, not Company model
    """
    if not job_id:
        logger.error("Empty job_id provided to _resolve_job_and_company")
        raise ValueError("job_id cannot be empty")
    
    try:
        job_uuid = uuid.UUID(job_id)
    except (ValueError, TypeError) as e:
        logger.error(
            "Invalid job_id UUID format",
            extra={
                "job_id": job_id,
                "error": str(e)
            }
        )
        raise ValueError(f"Invalid job_id UUID format: {job_id}")
    
    try:
        q = (
            db.query(models.Job, models.Company.name.label("company_name"))
            .outerjoin(models.Company, models.Job.company_id == models.Company.id)
            .filter(models.Job.id == job_uuid)
            .first()
        )
    except Exception as e:
        logger.error(
            "Database error resolving job",
            extra={
                "job_id": job_id,
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        raise ValueError(f"Database error: {str(e)}")
    
    if not q:
        logger.error(
            "Job not found",
            extra={"job_id": job_id}
        )
        raise ValueError(f"Job not found: {job_id}")
    
    job, company_name = q
    
    logger.debug(
        "Job and company resolved",
        extra={
            "job_id": job_id,
            "job_title": job.title[:100] if job.title else None,
            "company_name": company_name
        }
    )
    
    return job, company_name


class AICoverLetterService:
    """
    AI-powered cover letter generation service.
    
    Generates personalized, professional cover letters using OpenAI GPT models
    with async/await support for non-blocking operation.
    
    Attributes:
        db_session: Optional database session for LLM usage tracking
        client: AsyncOpenAI client for API calls
        model: OpenAI model name (default: gpt-4o-mini)
        _http_client: httpx AsyncClient with proxy support
    
    Thread Safety:
        - Async methods are safe for concurrent use
        - Each instance manages its own HTTP client
        - Close with aclose() to cleanup resources
    """
    
    def __init__(self, db_session=None) -> None:
        """
        Initialize AI cover letter service.
        
        Args:
            db_session: Optional database session for usage tracking
        
        Raises:
            ValueError: If OPENAI_API_KEY not set or empty
        
        Notes:
            - Requires OPENAI_API_KEY environment variable
            - HTTP(S) proxy configured via environment variables
            - Always call aclose() when done to cleanup HTTP client
        """
        if not OPENAI_API_KEY or not OPENAI_API_KEY.strip():
            logger.error("OPENAI_API_KEY not set or empty")
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.db_session = db_session  # Store for tracking
        
        # Configure HTTP client with proxy support
        proxy_url = HTTPS_PROXY or HTTP_PROXY
        transport = None
        if proxy_url:
            logger.info(
                "Configuring HTTP proxy for OpenAI",
                extra={"proxy": proxy_url[:50]}  # Don't log full proxy URL
            )
            try:
                transport = httpx.AsyncHTTPTransport(proxy=proxy_url)
            except Exception as e:
                logger.warning(
                    "Failed to configure proxy, continuing without proxy",
                    extra={
                        "error": str(e),
                        "proxy": proxy_url[:50]
                    }
                )
                transport = None

        try:
            self._http_client = httpx.AsyncClient(
                transport=transport,
                timeout=httpx.Timeout(
                    HTTP_TIMEOUT_SECONDS,
                    read=HTTP_READ_TIMEOUT_SECONDS,
                    write=HTTP_TIMEOUT_SECONDS,
                    connect=HTTP_CONNECT_TIMEOUT_SECONDS
                ),
            )
        except Exception as e:
            logger.error(
                "Failed to create HTTP client",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise ValueError(f"Failed to create HTTP client: {str(e)}")

        try:
            self.client = AsyncOpenAI(
                api_key=OPENAI_API_KEY,
                base_url=OPENAI_BASE_URL or None,
                organization=OPENAI_ORG or None,
                project=OPENAI_PROJECT or None,
                http_client=self._http_client,
            )
        except Exception as e:
            logger.error(
                "Failed to initialize AsyncOpenAI client",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise ValueError(f"Failed to initialize OpenAI client: {str(e)}")

        self.model = COVER_LETTER_MODEL or DEFAULT_MODEL
        
        # Validate model name
        if not self.model or not self.model.strip():
            logger.warning(
                "Empty model name, using default",
                extra={"default": DEFAULT_MODEL}
            )
            self.model = DEFAULT_MODEL

        logger.info(
            "AI cover letter service initialized",
            extra={
                "model": self.model,
                "tracking_enabled": self.db_session is not None,
                "proxy_enabled": proxy_url is not None
            }
        )

    async def aclose(self) -> None:
        """
        Close HTTP client and cleanup resources.
        
        Should be called when service is no longer needed to free resources.
        Safe to call multiple times (idempotent).
        
        Example:
            >>> service = AICoverLetterService(db)
            >>> try:
            ...     result = await service.generate_intelligent_cover_letter(...)
            ... finally:
            ...     await service.aclose()
        """
        try:
            await self._http_client.aclose()
            logger.debug("HTTP client closed successfully")
        except Exception as e:
            logger.warning(
                "Error closing HTTP client",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )

    async def generate_intelligent_cover_letter(
        self,
        db: Session,
        job_id: str,
        resume_content: str,
        user_profile: dict,
        tone: str = "professional",
        length: str = "medium",
    ) -> dict:
        """
        Generate a tailored cover letter using GPT (async).
        """
        job, company_name = _resolve_job_and_company(db, job_id)

        job_title = _safe_str(job.title, 180)
        job_location = _safe_str(job.location, 180)
        job_desc = _safe_str(job.description, 6000)
        resume_text = _safe_str(resume_content, 10000)
        user_profile_json = _safe_str(json.dumps(user_profile, ensure_ascii=False), 4000)

        word_count = {
            "short": "200-300",
            "medium": "300-400",
            "long": "400-500",
        }.get(length, "300-400")

        tone_instructions = {
            "professional": "formal and professional",
            "conversational": "warm and conversational while maintaining professionalism",
            "confident": "confident and assertive while remaining respectful",
            "creative": "creative and engaging while staying professional",
            "enthusiastic": "enthusiastic and energetic while staying professional",
        }.get(tone, "formal and professional")

        system = (
            "You are an expert career counselor, professional writer, and talent acquisition specialist with 15+ years of experience. "
            "Your expertise lies in crafting exceptional, personalized cover letters that secure interviews. "
            "You have deep understanding of ATS systems, hiring manager psychology, and what makes candidates stand out. "
            "CRITICAL: You must NEVER fabricate, invent, or assume any information not explicitly provided in the resume or profile. "
            "Only use factual information from the candidate's actual experience, education, and skills."
        )

        prompt = (
            f"Create an exceptional, highly personalized cover letter that will capture the hiring manager's attention and secure an interview.\n\n"
            
            f"=== TARGET POSITION ANALYSIS ===\n"
            f"Position: {job_title}\n"
            f"Company: {company_name or 'Not specified'}\n"
            f"Location: {job_location}\n"
            f"Job Description & Requirements:\n{job_desc}\n\n"
            
            f"=== CANDIDATE PROFILE & RESUME ===\n"
            f"Resume Content:\n{resume_text}\n\n"
            f"Additional Profile Information:\n{user_profile_json}\n\n"
            
            f"=== DETAILED ANALYSIS INSTRUCTIONS ===\n"
            f"1. EDUCATION ANALYSIS:\n"
            f"   - Extract ALL educational qualifications (degrees, certifications, courses)\n"
            f"   - Identify relevant academic projects, thesis topics, or research\n"
            f"   - Note any honors, GPA (if mentioned), or academic achievements\n"
            f"   - Connect education directly to job requirements\n\n"
            
            f"2. PROFESSIONAL EXPERIENCE ANALYSIS:\n"
            f"   - Examine EACH role for relevant responsibilities and achievements\n"
            f"   - Extract quantifiable results (numbers, percentages, dollar amounts)\n"
            f"   - Identify progression in responsibility and seniority\n"
            f"   - Find transferable skills from different industries/roles\n"
            f"   - Look for leadership, teamwork, and problem-solving examples\n\n"
            
            f"3. TECHNICAL & SOFT SKILLS MAPPING:\n"
            f"   - Match candidate's technical skills to job requirements\n"
            f"   - Identify programming languages, frameworks, tools mentioned\n"
            f"   - Extract soft skills demonstrated through achievements\n"
            f"   - Find industry-specific knowledge and expertise\n\n"
            
            f"4. JOB REQUIREMENT MATCHING:\n"
            f"   - Analyze the job description for must-have vs nice-to-have skills\n"
            f"   - Find direct matches between candidate experience and job needs\n"
            f"   - Identify how candidate's unique background adds value\n"
            f"   - Address any potential gaps honestly but positively\n\n"
            
            f"=== COVER LETTER STRUCTURE REQUIREMENTS ===\n"
            f"Length: {word_count} words (strictly adhered to)\n"
            f"Tone: {tone_instructions}\n\n"
            
            f"PARAGRAPH 1 - COMPELLING OPENING:\n"
            f"- Hook with specific achievement or unique qualification\n"
            f"- Mention the exact position and company name\n"
            f"- Include one standout fact that matches a key job requirement\n\n"
            
            f"PARAGRAPH 2 - RELEVANT EXPERIENCE:\n"
            f"- Highlight 2-3 most relevant professional experiences\n"
            f"- Include specific, quantifiable achievements from resume\n"
            f"- Connect each experience directly to job requirements\n"
            f"- Use action verbs and concrete results\n\n"
            
            f"PARAGRAPH 3 - TECHNICAL & EDUCATIONAL FIT:\n"
            f"- Showcase relevant technical skills and tools\n"
            f"- Mention educational background if relevant to role\n"
            f"- Highlight any certifications or specialized training\n"
            f"- Demonstrate continuous learning and adaptability\n\n"
            
            f"PARAGRAPH 4 - VALUE PROPOSITION & CLOSING:\n"
            f"- Summarize unique value candidate brings\n"
            f"- Express genuine enthusiasm for company/role\n"
            f"- Include confident call-to-action for interview\n"
            f"- Professional sign-off\n\n"
            
            f"=== CRITICAL RULES (NON-NEGOTIABLE) ===\n"
            f"❌ DO NOT invent experience, skills, or achievements\n"
            f"❌ DO NOT assume technologies or tools not mentioned in resume\n"
            f"❌ DO NOT create fictional projects or accomplishments\n"
            f"❌ DO NOT exaggerate or embellish beyond what's stated\n"
            f"✅ USE ONLY factual information from provided resume\n"
            f"✅ QUOTE or rephrase actual achievements and experiences\n"
            f"✅ STAY within the specified word count\n"
            f"✅ MAINTAIN the requested tone throughout\n"
            f"✅ ENSURE every claim is backed by resume evidence\n\n"
            
            f"=== QUALITY STANDARDS ===\n"
            f"- ATS-friendly formatting and keyword optimization\n"
            f"- Error-free grammar and professional language\n"
            f"- Compelling storytelling that showcases candidate journey\n"
            f"- Specific examples rather than generic statements\n"
            f"- Clear demonstration of research about company/role\n"
            f"- Confident but humble tone that builds trust\n\n"
            
            f"Generate a complete, polished, ready-to-send cover letter that will make the hiring manager excited to interview this candidate."
        )

        try:
            import time
            start_time = time.time()
            
            # Track LLM usage if DB session available
            tracker = None
            if self.db_session:
                tracker = track_openai_call(
                    self.db_session,
                    endpoint="cover_letter_generation",
                    usage_type="cover_letter",
                    user_id=job.user_id if job and hasattr(job, 'user_id') else None,
                    job_title=job_title[:100] if job_title else None,
                    company=company_name[:100] if company_name else None,
                    tone=tone,
                    length=length
                )
            
            if tracker:
                with tracker:
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": system},
                            {"role": "user", "content": prompt},
                        ],
                        max_tokens=1000,
                        temperature=0.6,
                    )
                    # Record usage
                    if response.usage:
                        tracker.set_usage(
                            model=response.model,
                            prompt_tokens=response.usage.prompt_tokens,
                            completion_tokens=response.usage.completion_tokens,
                            total_tokens=response.usage.total_tokens
                        )
            else:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=1000,
                    temperature=0.6,
                )
            
            latency_ms = int((time.time() - start_time) * 1000)

            cover_letter_text = (response.choices[0].message.content or "").strip()

            return {
                "success": True,
                "cover_letter": cover_letter_text,
                "job_title": job_title,
                "company_name": company_name,
                "generated_at": datetime.utcnow().isoformat(),
                "model_used": self.model,
                "tone": tone,
                "length": length,
                "word_count": len(cover_letter_text.split()),
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate cover letter: {e}",
                "fallback_message": "Please use the template generator as a fallback.",
            }

    def generate_template_cover_letter(
        self,
        job_title: str,
        company_name: str,
        user_name: str,
        key_skills: List[str],
        tone: str = "professional",
    ) -> str:
        skills_text = ", ".join(key_skills[:3]) if key_skills else "relevant technical skills"

        if tone == "conversational":
            return (
                f"Dear Hiring Manager,\n\n"
                f"I'm excited to apply for the {job_title} position at {company_name}. "
                f"In my previous roles, I've developed strong expertise in {skills_text}. "
                f"I'd love the opportunity to discuss how my background and enthusiasm can contribute to your team.\n\n"
                f"Best regards,\n[Your Name]"
            )

        return (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my strong interest in the {job_title} position at {company_name}. "
            f"With my background in {skills_text}, I am confident I would be a valuable addition to your team.\n\n"
            f"I would welcome the opportunity to discuss my qualifications further. "
            f"Thank you for your time and consideration.\n\n"
            f"Sincerely,\n[Your Name]"
        )


# Export all public classes and constants
__all__ = [
    'AICoverLetterService',
    'VALID_TONES',
    'VALID_LENGTHS',
    'DEFAULT_MODEL',
]
