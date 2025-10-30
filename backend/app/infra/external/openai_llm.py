"""
OpenAI LLM Job Extraction Module

This module provides intelligent job posting extraction using OpenAI's GPT models.
It handles text-based extraction with comprehensive error handling and LLM usage tracking.

Features:
    - Intelligent field inference (company from URL, location from context)
    - Content filtering (removes navigation, keeps job-relevant text)
    - Skills normalization (js→JavaScript, k8s→Kubernetes)
    - Requirements extraction with nice-to-have detection
    - Comprehensive error handling and logging
    - LLM usage tracking for cost monitoring

Architecture:
    - Implements LLMExtractor port (Hexagonal Architecture)
    - Uses OpenAI Chat Completions API with JSON mode
    - Configurable model selection via environment variables
    - Automatic LLM usage tracking when DB session provided

Model Selection:
    - Default: gpt-4.1-mini ($0.40/1M input, $1.60/1M output)
    - Cheapest: gpt-4.1-nano ($0.10/1M input, $0.40/1M output)
    - Latest: gpt-5-nano ($0.05/1M input, $0.40/1M output)
    - Best Quality: gpt-4.1 ($2.00/1M input, $8.00/1M output)
    - Configure via: JOB_EXTRACT_MODEL environment variable

Cost Estimation:
    - Average cost per job extraction: $0.002-0.003 (with gpt-4.1-mini)
    - Use gpt-4.1-nano or gpt-5-nano for lower costs
    - Use gpt-4.1 or gpt-5 for higher quality

Usage Example:
    from app.infra.external.openai_llm import OpenAILLMExtractor
    
    extractor = OpenAILLMExtractor(db_session=db)
    job_data = extractor.extract_job(
        url="https://company.com/jobs/123",
        text="Job posting text...",
        hints={"company_name": "Acme Corp"}
    )
    
    print(f"Title: {job_data['title']}")
    print(f"Company: {job_data['company_name']}")
    print(f"Skills: {job_data['skills']}")

Error Handling:
    - Validates text length (minimum 50 characters)
    - Handles rate limits with clear error messages
    - Handles quota errors with billing suggestions
    - Handles authentication errors
    - Validates JSON response format
    - Tracks failures for monitoring

Security:
    - API key from environment (not logged)
    - Input validation prevents injection
    - Output validation ensures data integrity

CRITICAL: DO NOT MODIFY THE SYSTEM PROMPT (_EXTRACT_TEXT_SYSTEM)
The prompt is carefully engineered and tested. Changes may break extraction quality.
"""

from __future__ import annotations
import os
import json
import time
from typing import Optional, Dict, Any

from openai import OpenAI
from openai import APIError, APITimeoutError, RateLimitError, APIConnectionError

from ...domain.jobs.extraction.ports import LLMExtractor
from ..logging import get_logger
from .llm_tracker import track_openai_call

logger = get_logger(__name__)

# Configuration constants
MIN_TEXT_LENGTH: int = 50  # Minimum text length for extraction
MAX_TOKENS: int = 2500  # Maximum tokens for response
TEMPERATURE: float = 0.1  # Low temperature for deterministic output
DEFAULT_TEXT_MODEL: str = "gpt-4.1-mini"  # Default model for text extraction
DEFAULT_IMAGE_MODEL: str = "gpt-4.1-mini"  # Default model for image extraction

# System prompt for TEXT-based extraction (when user pastes text)
_EXTRACT_TEXT_SYSTEM = """
You are a PRECISE JOB EXTRACTOR for ANY type of job posting (tech, healthcare, retail, finance, education, etc).

OUTPUT CONTRACT (JSON ONLY):
{
  "title": string,
  "company_name": string, 
  "source_url": string,
  "location": string,
  "remote_type": "Remote" | "Hybrid" | "On-site" | "",
  "job_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "",
  "description": string,       # FILTERED job-related text only
  "requirements": string[],    # extracted qualification lines
  "skills": string[]           # extracted skills/keywords
}

INTELLIGENT FIELD INFERENCE:

company_name:
- Look for the company name in MULTIPLE places (in order of priority):
  1. Explicit headers: "Company:", "About [Company Name]", "Join [Company Name]", etc.
  2. The SOURCE URL - extract company name from domain (e.g., "microsoft.com" → "Microsoft", "greenhouse.io/acme" → "Acme")
  3. Text patterns: "We at [Company]", "[Company] is hiring", "About us at [Company]"
  4. Job board URLs: Extract from paths like "lever.co/company-name", "jobs.company.com", "company.breezy.hr"
  5. Career site branding: Look for company name in headers, footers, or "About Us" sections
- Be intelligent about variations: "Google Inc." and "Google" are the same company
- If found in URL but not in text, still use the URL-derived name (many job posts don't explicitly state the company name)
- If genuinely not found anywhere, return empty string (don't guess or make up names)

location:
- Look for location information in MULTIPLE places (in order of priority):
  1. Explicit fields: "Location:", "Office Location:", "Based in:", "Work Location:", etc.
  2. Geographic mentions in text: "Our [City] office", "Join our team in [City]", "Located in [City, State]"
  3. Remote/hybrid indicators: "Remote - US", "Hybrid - New York", "Remote (EU timezone)", "Anywhere in Canada"
  4. Address patterns: City, State/Country formats (e.g., "San Francisco, CA", "London, UK")
  5. Implicit locations: "Must be authorized to work in [Country]" suggests that country
- Standardize format when possible: "City, State" or "City, Country" or "Remote - Region"
- For fully remote positions, include any geographic restrictions: "Remote - US Only", "Remote - EU", "Remote - Worldwide"
- If multiple locations listed, include the primary location or all if it's "Multiple Locations: NYC, SF, Austin"
- If genuinely not found anywhere, return empty string (don't guess or assume location)

CONTENT FILTERING:
1. KEEP only text related to the job posting itself
2. REMOVE website navigation, UI elements, irrelevant footers/headers
3. REMOVE application instructions unless they contain key job details
4. KEEP company descriptions if they provide context about the workplace

FIELD GUIDELINES:

description:
- Include ALL job-relevant text (job details, company info, responsibilities, etc)
- CRITICALLY IMPORTANT: NEVER remove ANY section headers - headers like "About the Company", "Position Overview", "Key Responsibilities", "Advantages", "Work Environment", etc. MUST remain in the description
- REMOVE section headers for Requirements/Qualifications sections ONLY if ALL lines under them are extracted to requirements[]
- Keep any lines with explicit nice-to-have indicators ("advantage", "preferred", "plus", "bonus", "nice to have", "helpful", "ideal") in the description, even if they're under a requirements section
- IMPORTANT: If a requirements section contains BOTH mandatory and nice-to-have items (e.g., "Ability to support the following: Item A - advantage, Item B - advantage"), keep the ENTIRE section including its header in the description since not all items are being extracted
- Keep EXACT original wording - do not rewrite or rephrase
- Add TWO line breaks (\\n\\n) before section headers
- CRITICAL FORMATTING: When listing bullet points or responsibilities, add ONE line break (\\n) after EACH bullet point to ensure readability
  * Example: "Design systems\\nBuild features\\nCollaborate with teams" (each bullet on its own line)
  * Do NOT run bullets together like "Design systems.Build features.Collaborate with teams"
- Preserve bullet points and list formatting

requirements[]:
- CRITICAL: Read the ENTIRE job posting first to understand its structure and context before extracting
- Identify requirement sections by their headers: "Requirements", "Qualifications", "What You Bring", "Must Have", "Essential Skills", "Required Skills", "Minimum Qualifications", "What You'll Need", etc.
- LOCATION-BASED EXTRACTION RULE:
  * If a line appears UNDER a requirements/qualifications header → Extract it to requirements[] (it's mandatory by default)
  * EXCEPTION: If the line EXPLICITLY contains nice-to-have indicators ("advantage", "preferred", "plus", "bonus", "nice to have", "helpful", "ideal", "great if"), keep it in description instead
  * Lines in OTHER sections (Responsibilities, About Us, Benefits, etc.) → DO NOT extract to requirements, keep in description
- Extract ALL lines from requirements sections UNLESS they explicitly say nice-to-have
- Examples:
  * "5+ years experience" under Qualifications → EXTRACT to requirements[], REMOVE from description
  * "Strong attention to design" under Qualifications → EXTRACT to requirements[], REMOVE from description
  * "Previous experience in fintech - advantage" → KEEP in description (explicitly says "advantage"), do NOT extract
  * "Familiarity with X is a plus" → KEEP in description (explicitly says "plus"), do NOT extract
  * "Strong communication skills" in Responsibilities section → KEEP in description (wrong section), do NOT extract
  * MIXED SECTION EXAMPLE: "Ability to support the following:\n- Spring Boot – significant advantage\n- MySQL – significant advantage"
    → Since ALL items are nice-to-have (advantage/plus), KEEP the entire section including header in description, extract NOTHING
    → If it was "Ability to support:\n- 5 years Java (no qualifier)\n- MySQL – advantage", extract "5 years Java" only, keep header + "MySQL – advantage" in description
- Keep EXACT wording, one requirement per array item
- Strip bullet symbols (•, -, *, etc.) but preserve the full text
- Remove duplicates (case-insensitive comparison)
- Skip empty strings or strings shorter than 5 characters
- ABSOLUTELY CRITICAL REMOVAL RULE (READ THIS TWICE):
  * Step 1: Extract requirement lines to requirements[] array
  * Step 2: REMOVE those EXACT lines from the description field
  * Step 3: If ALL lines under a requirements section header were extracted, also REMOVE the section header itself
  * The description field must NOT contain any text that appears in requirements[]
  * Double-check your final description - if you see requirement lines in it, you made a mistake

- CRITICAL HEADER REMOVAL EXAMPLE:
  * INPUT: "Main tasks:\n•Install software\n\nJob requirements:\nKnowledge of C++\nBachelor's degree\n"
  * After extracting "Knowledge of C++" and "Bachelor's degree" to requirements[]
  * OUTPUT description: "Main tasks:\n•Install software\n\n"  ← Notice "Job requirements:" header is REMOVED
  * OUTPUT requirements: ["Knowledge of C++", "Bachelor's degree"]
  * WRONG OUTPUT: "Main tasks:\n•Install software\n\nJob requirements:\n\n"  ← This is INCORRECT! Header must be removed!

- FINAL CHECK BEFORE RETURNING:
  * Scan your description field for orphaned requirement section headers like "Job requirements:", "Qualifications:", "Requirements:", etc.
  * If you see these headers with NO content under them, YOU MUST REMOVE THEM
  * Common mistake: leaving "\\n\\nJob requirements:\\n\\n" in the description after extracting all requirements
  * These empty headers are visual noise and MUST BE REMOVED
  * ALSO CHECK: Make sure sections containing nice-to-have items (with "advantage", "plus", "preferred") were NOT accidentally removed from description
  * If the original text had "Ability to support: Spring Boot - advantage", this MUST appear in the description field

skills[]:
- Extract ALL specific skills, tools, technologies, and keywords mentioned ANYWHERE in the job posting
- Scan the ENTIRE text - skills can appear in ANY section (requirements, responsibilities, nice-to-have, projects, etc.)
- Include both hard skills (Excel, Python, SQL, CNC machine, AutoCAD) and soft skills (leadership, communication, problem-solving)
- Include industry-specific terminology and certifications (HIPAA, GAAP, PMP, AWS Certified, etc.)
- Include relevant keywords for job search/filtering
- CRITICAL: Normalize all technical skill names to their proper full form:
  * js → JavaScript
  * ts → TypeScript
  * react.js → React
  * vue.js → Vue.js
  * node.js → Node.js
  * py → Python
  * k8s → Kubernetes
  * aws → AWS
  * gcp → GCP (Google Cloud Platform)
  * azure → Azure
  * And similar common abbreviations
- Remove duplicates (case-insensitive comparison - don't include both "JavaScript" and "javascript")
- Skip empty strings or strings shorter than 2 characters
- Return each skill only once in its standardized form

CRITICAL INSTRUCTION: 
- ONLY include information EXPLICITLY EXIST in the text provided
- DO NOT infer, assume, or generate requirements or skills not shown
- If you cannot read all requirements or skills, leave those fields with only what's existing
- If a section appears cut off, indicate with [...] at the end

remote_type/job_type:
- Only use the specified values or empty string if uncertain

Return ONLY the JSON object.
"""


class OpenAILLMExtractor(LLMExtractor):
    """
    OpenAI-powered job posting extractor.
    
    Uses GPT models to intelligently extract structured job data from text.
    Supports hints for known fields and tracks LLM usage for cost monitoring.
    
    Attributes:
        client: OpenAI API client
        db_session: Optional database session for usage tracking
        text_model: Model name for text extraction
        image_model: Model name for image extraction (future use)
    
    Thread Safety:
        - Not thread-safe (uses shared client)
        - Create one instance per request/async task
    """
    
    def __init__(self, model: str | None = None, db_session=None):
        """
        Initialize OpenAI LLM extractor.
        
        Args:
            model: Optional model name override (defaults to env or gpt-4.1-mini)
            db_session: Optional database session for usage tracking
        
        Raises:
            RuntimeError: If OPENAI_API_KEY environment variable not set
        
        Notes:
            - API key must be set in OPENAI_API_KEY environment variable
            - Model selection: JOB_EXTRACT_MODEL env (default: gpt-4.1-mini)
            - Usage tracking enabled when db_session provided
        """
        api = os.getenv("OPENAI_API_KEY", "")
        if not api or not api.strip():
            logger.error("OPENAI_API_KEY not set or empty")
            raise RuntimeError("OPENAI_API_KEY not set")
        
        try:
            self.client = OpenAI(api_key=api)
        except Exception as e:
            logger.error(
                "Failed to initialize OpenAI client",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            raise RuntimeError(f"Failed to initialize OpenAI client: {str(e)}")
        
        self.db_session = db_session  # Store DB session for tracking
        
        # Available models with pricing (Standard tier - as of 2025):
        # gpt-4.1-mini: $0.40/1M input ($0.10 cached), $1.60/1M output - CURRENT DEFAULT
        # gpt-4.1-nano: $0.10/1M input ($0.025 cached), $0.40/1M output - cheapest quality option
        # gpt-4o-mini: $0.15/1M input ($0.075 cached), $0.60/1M output - faster, cheaper
        # gpt-4.1: $2.00/1M input ($0.50 cached), $8.00/1M output - best quality
        # gpt-5-nano: $0.05/1M input ($0.005 cached), $0.40/1M output - latest, cheapest
        # gpt-5-mini: $0.25/1M input ($0.025 cached), $2.00/1M output - latest, balanced
        # gpt-5: $1.25/1M input ($0.125 cached), $10.00/1M output - latest flagship
        # Average job extraction cost with gpt-4.1-mini: ~$0.002-0.003 per job
        self.text_model = model or os.getenv("JOB_EXTRACT_MODEL", DEFAULT_TEXT_MODEL)
        self.image_model = os.getenv("JOB_EXTRACT_IMAGE_MODEL", DEFAULT_IMAGE_MODEL)
        
        # Validate model names
        if not self.text_model or not self.text_model.strip():
            logger.warning(
                "Empty text_model, using default",
                extra={"default": DEFAULT_TEXT_MODEL}
            )
            self.text_model = DEFAULT_TEXT_MODEL
        
        # To optimize costs: set JOB_EXTRACT_MODEL=gpt-4.1-nano or gpt-4o-mini
        # To upgrade quality: set JOB_EXTRACT_MODEL=gpt-4.1 or gpt-5-mini
        logger.info(
            "OpenAI LLM extractor initialized",
            extra={
                "text_model": self.text_model,
                "image_model": self.image_model,
                "tracking_enabled": self.db_session is not None
            }
        )


    def extract_job(self, url: str, text: str, hints: Optional[Dict[str, Any]] = None) -> dict:
        """
        Extract structured job data from text using OpenAI LLM.
        
        Args:
            url: Source URL of the job posting
            text: Job posting text content
            hints: Optional dict with known fields (company_name, location, etc.)
        
        Returns:
            dict: Extracted job data with fields:
                - title (str): Job title
                - company_name (str): Company name
                - source_url (str): Source URL
                - location (str): Job location
                - remote_type (str): "Remote", "Hybrid", "On-site", or ""
                - job_type (str): "Full-time", "Part-time", "Contract", "Internship", or ""
                - description (str): Filtered job description
                - requirements (list[str]): Extracted requirements
                - skills (list[str]): Extracted skills/keywords
        
        Raises:
            ValueError: If text too short (<50 chars), JSON parsing fails, or API error
            RuntimeError: If OpenAI API returns empty response
        
        Example:
            >>> extractor = OpenAILLMExtractor(db_session=db)
            >>> job = extractor.extract_job(
            ...     url="https://company.com/jobs/123",
            ...     text="Software Engineer position at Acme Corp...",
            ...     hints={"company_name": "Acme Corp"}
            ... )
            >>> print(f"Title: {job['title']}")
            >>> print(f"Skills: {', '.join(job['skills'])}")
        
        Notes:
            - Minimum text length: 50 characters
            - Automatic usage tracking if db_session provided
            - Comprehensive error messages for common API errors
            - Handles rate limits, quota, and authentication errors
        """
        hints = hints or {}
        
        # Validate URL
        if not url:
            logger.warning("extract_job called with empty URL")
            url = ""
        
        # Validate text
        if not text:
            logger.error("extract_job called with empty text")
            raise ValueError("Text cannot be empty")
        
        text = text.strip()
        text_len = len(text)
        
        logger.info(
            "OpenAI LLM extraction started",
            extra={
                "url": url[:100] if url else None,
                "text_length": text_len,
                "has_hints": bool(hints),
                "model": self.text_model
            }
        )
        
        logger.debug(
            "Text validation",
            extra={
                "text_length": text_len,
                "text_preview": repr(text[:500]) if text else None,
                "hints_keys": list(hints.keys()) if hints else []
            }
        )
        
        if text_len < MIN_TEXT_LENGTH:
            logger.error(
                "Text too short for extraction",
                extra={
                    "text_length": text_len,
                    "minimum_required": MIN_TEXT_LENGTH
                }
            )
            raise ValueError(
                f"Text too short for extraction: {text_len} characters (minimum {MIN_TEXT_LENGTH})"
            )
        
        logger.debug("Text length validation passed")

        # Build message array
        logger.debug("Building message array")
        messages = [{"role": "system", "content": _EXTRACT_TEXT_SYSTEM}]
        
        if hints:
            # Validate hints is a dict
            if not isinstance(hints, dict):
                logger.warning(
                    "hints is not a dict, ignoring",
                    extra={"hints_type": type(hints).__name__}
                )
                hints = {}
            else:
                logger.debug(
                    "Adding hints message",
                    extra={"hints": hints}
                )
                try:
                    hints_json = json.dumps(hints, ensure_ascii=False)
                    messages.append({"role": "user", "content": f"HINTS: {hints_json}"})
                except (TypeError, ValueError) as e:
                    logger.warning(
                        "Failed to serialize hints, skipping",
                        extra={
                            "error": str(e),
                            "hints": str(hints)[:200]
                        }
                    )
        
        user_content = (
            f"Source URL: {url}\n\n"
            "JOB POSTING TEXT:\n"
            "<<<BEGIN_TEXT>>>\n"
            f"{text}\n"
            "<<<END_TEXT>>>"
        )
        messages.append({"role": "user", "content": user_content})
        
        total_prompt_size = sum(len(m['content']) for m in messages)
        logger.debug(
            "Message array prepared",
            extra={
                "message_count": len(messages),
                "total_prompt_size": total_prompt_size,
                "estimated_tokens": total_prompt_size // 4  # Rough estimate
            }
        )

        logger.debug(
            "Making OpenAI API call",
            extra={
                "model": self.text_model,
                "temperature": TEMPERATURE,
                "max_tokens": MAX_TOKENS,
                "response_format": "json_object"
            }
        )

        # Track LLM usage if DB session available
        tracker = None
        if self.db_session:
            try:
                tracker = track_openai_call(
                    self.db_session,
                    endpoint="job_extraction",
                    usage_type="chrome_extension",
                    url=url[:200] if url else None,
                    text_length=text_len
                )
            except Exception as e:
                logger.warning(
                    "Failed to create LLM tracker, continuing without tracking",
                    extra={
                        "error": str(e),
                        "error_type": type(e).__name__
                    }
                )
                tracker = None
        
        raw_content = None
        try:
            api_start = time.time()
            
            if tracker:
                with tracker:
                    resp = self.client.chat.completions.create(
                        model=self.text_model,
                        temperature=TEMPERATURE,
                        response_format={"type": "json_object"},
                        messages=messages,
                        max_tokens=MAX_TOKENS
                    )
                    # Record usage
                    if resp.usage:
                        tracker.set_usage(
                            model=resp.model,
                            prompt_tokens=resp.usage.prompt_tokens,
                            completion_tokens=resp.usage.completion_tokens,
                            total_tokens=resp.usage.total_tokens
                        )
            else:
                resp = self.client.chat.completions.create(
                    model=self.text_model,
                    temperature=TEMPERATURE,
                    response_format={"type": "json_object"},
                    messages=messages,
                    max_tokens=MAX_TOKENS
                )
            
            api_time = time.time() - api_start
            
            logger.info(
                "OpenAI API call successful",
                extra={
                    "duration": f"{api_time:.2f}s",
                    "model": resp.model,
                    "finish_reason": resp.choices[0].finish_reason if resp.choices else None,
                    "total_tokens": resp.usage.total_tokens if resp.usage else None,
                    "prompt_tokens": resp.usage.prompt_tokens if resp.usage else None,
                    "completion_tokens": resp.usage.completion_tokens if resp.usage else None
                }
            )

            # Validate response structure
            if not resp.choices:
                logger.error(
                    "OpenAI returned response with no choices",
                    extra={"response": str(resp)[:500]}
                )
                raise RuntimeError("OpenAI returned empty response (no choices)")
            
            if not resp.choices[0].message:
                logger.error(
                    "OpenAI returned choice with no message",
                    extra={"choice": str(resp.choices[0])[:500]}
                )
                raise RuntimeError("OpenAI returned empty response (no message)")
            
            if not resp.choices[0].message.content:
                logger.error(
                    "OpenAI returned message with no content",
                    extra={"message": str(resp.choices[0].message)[:500]}
                )
                raise RuntimeError("OpenAI returned empty response (no content)")

            raw_content = resp.choices[0].message.content
            
            logger.debug(
                "Response received",
                extra={
                    "content_length": len(raw_content),
                    "content_preview": raw_content[:300]
                }
            )
            
            logger.debug("Parsing JSON response")
            
            try:
                data = json.loads(raw_content)
            except json.JSONDecodeError as e:
                logger.error(
                    "JSON decode error from OpenAI response",
                    extra={
                        "error": str(e),
                        "error_line": e.lineno,
                        "error_col": e.colno,
                        "raw_content": raw_content[:1000]
                    },
                    exc_info=True
                )
                raise ValueError(f"OpenAI returned invalid JSON response: {str(e)}")
            
            # Handle nested job field or direct response
            job = data.get("job") or data
            
            # Validate required fields exist
            if not isinstance(job, dict):
                logger.error(
                    "Parsed JSON is not a dict",
                    extra={
                        "job_type": type(job).__name__,
                        "job_value": str(job)[:200]
                    }
                )
                raise ValueError(f"Expected dict, got {type(job).__name__}")
            
            logger.debug("JSON parsed successfully")
            logger.debug(
                "Extracted fields from LLM",
                extra={
                    "title": job.get('title'),
                    "company_name": job.get('company_name'),
                    "location": job.get('location'),
                    "remote_type": job.get('remote_type'),
                    "job_type": job.get('job_type'),
                    "description_length": len(job.get('description', '')),
                    "requirements_count": len(job.get('requirements', [])),
                    "skills_count": len(job.get('skills', []))
                }
            )

            # Trust LLM completely - use its cleaned description
            logger.debug("Using LLM's cleaned description directly (NO override)")
            
            # Validate and normalize fields
            job["requirements"] = job.get("requirements") or []
            if not isinstance(job["requirements"], list):
                logger.warning(
                    "requirements is not a list, converting",
                    extra={"requirements_type": type(job["requirements"]).__name__}
                )
                job["requirements"] = []
            
            job["skills"] = job.get("skills") or []
            if not isinstance(job["skills"], list):
                logger.warning(
                    "skills is not a list, converting",
                    extra={"skills_type": type(job["skills"]).__name__}
                )
                job["skills"] = []
            
            # Ensure source_url is set
            if not job.get("source_url"):
                job["source_url"] = url

            logger.info("OpenAI LLM extraction successful", extra={
                "title": job.get('title'),
                "company_name": job.get('company_name'),
                "location": job.get('location'),
                "remote_type": job.get('remote_type'),
                "job_type": job.get('job_type'),
                "description_length": len(job.get('description', '')),
                "requirements_count": len(job['requirements']),
                "skills_count": len(job['skills'])
            })
            return job

        except json.JSONDecodeError as e:
            logger.error(
                "JSON decode error from OpenAI response",
                extra={
                    "error": str(e),
                    "error_line": e.lineno,
                    "error_col": e.colno,
                    "raw_content": raw_content[:1000] if raw_content else 'Response not available'
                },
                exc_info=True
            )
            raise ValueError(f"OpenAI returned invalid JSON response: {str(e)}")
        except Exception as e:
            logger.error("OpenAI API error", extra={
                "error_type": type(e).__name__,
                "error_message": str(e)
            }, exc_info=True)
            
            error_msg = str(e).lower()
            if "rate limit" in error_msg:
                raise ValueError("OpenAI API rate limit exceeded - please try again later")
            elif "insufficient quota" in error_msg or "quota" in error_msg:
                raise ValueError("OpenAI API quota exceeded - please check your billing")
            elif "invalid api key" in error_msg or "authentication" in error_msg:
                raise ValueError("Invalid OpenAI API key - please check configuration")
            else:
                raise ValueError(f"OpenAI API error: {str(e)}")

# Export all public classes and constants
__all__ = [
    'OpenAILLMExtractor',
    'MIN_TEXT_LENGTH',
    'MAX_TOKENS',
    'DEFAULT_TEXT_MODEL',
]
