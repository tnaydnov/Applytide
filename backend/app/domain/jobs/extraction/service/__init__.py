"""
Job extraction service - modular implementation with comprehensive error handling.

This module provides the main JobExtractionService class for extracting structured
job data from HTML pages or manual text input. It orchestrates multiple extraction
strategies including DOM parsing, JSON-LD structured data, LLM enhancement, and
requirement splitting.

Features:
- Dual extraction paths: Manual text (LLM-first) vs HTML (multi-source)
- Graceful fallbacks between extraction methods
- Comprehensive validation and error handling
- Structured logging throughout
- Modular architecture with clear separation of concerns

Exception Hierarchy:
- JobExtractionError: Base exception for all extraction errors
  - ExtractionValidationError: Invalid input parameters
  - ExtractionContentError: Insufficient or invalid content
  - LLMServiceError: LLM service unavailable or failed
  - StructuredDataError: Structured data parsing failed
"""
from __future__ import annotations
from typing import Dict, Any, Optional, List
from ..ports import (
    MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor,
    LLMExtractor, RequirementStripper
)
from .utils import ExtractionUtils
from .jsonld import JSONLDExtractor
from .requirements import RequirementSplitter
from .llm import LLMExtractionHandler
from .dom import DOMExtractionHandler
from .orchestrator import ExtractionOrchestrator
from .....infra.logging import get_logger

logger = get_logger(__name__)

# ===========================
# CONFIGURATION CONSTANTS
# ===========================

MIN_HTML_LENGTH = 50  # Minimum HTML length for extraction
MIN_TEXT_LENGTH = 20  # Minimum manual text length for extraction
MAX_URL_LENGTH = 2048  # Maximum URL length
MIN_DESCRIPTION_LENGTH = 10  # Minimum description length for validation
MAX_HINTS_ITEMS = 20  # Maximum number of hint items


# ===========================
# EXCEPTION CLASSES
# ===========================

class JobExtractionError(Exception):
    """Base exception for job extraction errors."""
    pass


class ExtractionValidationError(JobExtractionError):
    """Raised when extraction input validation fails."""
    pass


class ExtractionContentError(JobExtractionError):
    """Raised when content is insufficient or invalid for extraction."""
    pass


class LLMServiceError(JobExtractionError):
    """Raised when LLM service is unavailable or fails."""
    pass


class StructuredDataError(JobExtractionError):
    """Raised when structured data parsing fails critically."""
    pass


# ===========================
# LEGACY ALIASES (for backward compatibility)
# ===========================

ExtractionError = JobExtractionError  # Legacy alias
ValidationError = ExtractionValidationError  # Legacy alias


# ===========================
# MAIN SERVICE CLASS
# ===========================

class JobExtractionService:
    """
    Orchestrates job extraction: DOM hints → structured data → main text → (optional) LLM →
    requirement cleanup. Never throws on best-effort branches; returns a complete dict.
    
    This is a refactored implementation using composition/delegation pattern.
    The public API remains unchanged for backward compatibility.
    
    Attributes:
        main_content: Main content extractor instance
        structured: Structured data extractor instance
        title_company: Title/company extractor instance
        llm: Optional LLM extractor instance
        req_splitter: Requirement splitter instance
    """
    
    def __init__(
        self,
        *,
        main_content: MainContentExtractor,
        structured: StructuredDataExtractor,
        title_company: TitleCompanyExtractor,
        llm: Optional[LLMExtractor] = None,
        req_splitter: Optional[RequirementStripper] = None,
    ):
        """
        Initialize extraction service with required dependencies.
        
        Args:
            main_content: Extractor for main page content
            structured: Extractor for structured data (JSON-LD, etc.)
            title_company: Extractor for job title and company name
            llm: Optional LLM-based extractor for enhanced extraction
            req_splitter: Optional requirement splitter (defaults to RequirementSplitter)
            
        Raises:
            ExtractionValidationError: If required dependencies are missing
        """
        # Validate required dependencies
        if not main_content:
            logger.error("Missing required dependency: main_content")
            raise ExtractionValidationError("main_content extractor is required")
        if not structured:
            logger.error("Missing required dependency: structured")
            raise ExtractionValidationError("structured extractor is required")
        if not title_company:
            logger.error("Missing required dependency: title_company")
            raise ExtractionValidationError("title_company extractor is required")
        
        logger.debug("Initializing JobExtractionService", extra={
            "has_llm": llm is not None,
            "has_req_splitter": req_splitter is not None
        })
        
        # Store original dependencies
        self.main_content = main_content
        self.structured = structured
        self.title_company = title_company
        self.llm = llm
        self.req_splitter = req_splitter or RequirementSplitter()
        
        # Create specialized modules
        self._utils = ExtractionUtils()
        self._jsonld = JSONLDExtractor(self._utils)
        self._requirements = self.req_splitter if isinstance(self.req_splitter, RequirementSplitter) else RequirementSplitter()
        self._llm_handler = LLMExtractionHandler(llm, self._utils)
        self._dom_handler = DOMExtractionHandler(
            title_company, main_content, structured, self._utils
        )
        self._orchestrator = ExtractionOrchestrator(
            self._utils, self._jsonld, self._requirements,
            self._llm_handler, self._dom_handler
        )
        
        logger.info("JobExtractionService initialized successfully")
    
    def extract_job(
        self,
        url: str,
        html: str,
        hints: Optional[Dict[str, Any]] = None,
        jsonld: Optional[List[Dict[str, Any]]] = None,
        readable: Optional[Dict[str, Any]] = None,
        metas: Optional[Dict[str, Any]] = None,
        xhr_logs: Optional[List[Dict[str, Any]]] = None,
        manual_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract job information from HTML or manual text.
        
        Routes between two extraction strategies:
        1. Manual text path (manual_text provided): LLM-first extraction
        2. HTML path: DOM + structured data + LLM enhancement
        
        Args:
            url: Source URL of the job posting
            html: HTML content of the page
            hints: Optional hints (title, company_name, location, remote_type, job_type)
            jsonld: Optional JSON-LD structured data array
            readable: Optional Readability.parse() result with title/siteName/textContent
            metas: Optional meta tags dictionary
            xhr_logs: Optional XHR response logs for fallback extraction
            manual_text: Optional manually pasted text (triggers LLM-first path)
            
        Returns:
            Dictionary with extracted job fields:
            - title: Job title
            - company_name: Company name
            - source_url: Source URL
            - location: Job location
            - remote_type: Remote work type (Remote/Hybrid/On-site)
            - job_type: Job type (Full-time/Part-time/Contract/Internship)
            - description: Job description (cleaned)
            - requirements: List of job requirements
            - skills: List of required skills
            
        Raises:
            ExtractionValidationError: If input parameters are invalid
            ExtractionContentError: If content is insufficient for extraction
            LLMServiceError: If LLM is required but unavailable
            
        Examples:
            >>> # Manual text extraction
            >>> result = service.extract_job(
            ...     url="https://example.com/job",
            ...     html="",
            ...     manual_text="Software Engineer at Company\\n\\nDescription here..."
            ... )
            
            >>> # HTML extraction with hints
            >>> result = service.extract_job(
            ...     url="https://example.com/job",
            ...     html="<html>...</html>",
            ...     hints={"title": "Software Engineer", "company_name": "Company"}
            ... )
        """
        # Input validation
        logger.debug("Validating extraction inputs", extra={
            "url_length": len(url or ''),
            "html_length": len(html or ''),
            "manual_text_length": len(manual_text or ''),
            "has_hints": bool(hints),
            "has_jsonld": bool(jsonld),
            "has_readable": bool(readable)
        })
        
        if not url or not isinstance(url, str):
            logger.error("Invalid URL parameter", extra={"url": url})
            raise ExtractionValidationError("URL parameter is required and must be a string")
        
        if len(url) > MAX_URL_LENGTH:
            logger.error("URL too long", extra={"url_length": len(url)})
            raise ExtractionValidationError(f"URL exceeds maximum length of {MAX_URL_LENGTH}")
        
        # Validate hints structure
        if hints is not None:
            if not isinstance(hints, dict):
                logger.error("Invalid hints type", extra={"hints_type": type(hints).__name__})
                raise ExtractionValidationError("hints must be a dictionary")
            
            if len(hints) > MAX_HINTS_ITEMS:
                logger.error("Too many hint items", extra={"hints_count": len(hints)})
                raise ExtractionValidationError(f"hints exceeds maximum of {MAX_HINTS_ITEMS} items")
        
        # Validate content availability
        has_manual_text = manual_text and isinstance(manual_text, str) and len(manual_text.strip()) >= MIN_TEXT_LENGTH
        has_html = html and isinstance(html, str) and len(html.strip()) >= MIN_HTML_LENGTH
        
        if not has_manual_text and not has_html:
            logger.error("Insufficient content for extraction", extra={
                "manual_text_length": len(manual_text or ''),
                "html_length": len(html or '')
            })
            raise ExtractionContentError(
                f"No valid content provided - need either manual_text (>={MIN_TEXT_LENGTH} chars) "
                f"or html (>={MIN_HTML_LENGTH} chars)"
            )
        
        logger.info("Input validation passed, starting extraction")
        
        try:
            return self._orchestrator.extract_job(
                url=url,
                html=html,
                hints=hints,
                jsonld=jsonld,
                readable=readable,
                metas=metas,
                xhr_logs=xhr_logs,
                manual_text=manual_text
            )
        except ValueError as e:
            # Convert ValueError to appropriate exception type
            error_msg = str(e).lower()
            if "llm" in error_msg or "service" in error_msg:
                logger.error("LLM service error during extraction", extra={"error": str(e)})
                raise LLMServiceError(str(e)) from e
            elif "content" in error_msg or "insufficient" in error_msg:
                logger.error("Content error during extraction", extra={"error": str(e)})
                raise ExtractionContentError(str(e)) from e
            else:
                logger.error("Validation error during extraction", extra={"error": str(e)})
                raise ExtractionValidationError(str(e)) from e
        except Exception as e:
            logger.error("Unexpected error during extraction", extra={
                "error": str(e),
                "error_type": type(e).__name__
            }, exc_info=True)
            raise JobExtractionError(f"Extraction failed: {str(e)}") from e
    
    # ===========================
    # UTILITY METHODS (for backward compatibility)
    # ===========================
    
    @staticmethod
    def _validate_job_content(job: Dict[str, Any], context: str = "extraction") -> None:
        """
        Validate job content (delegated to utils).
        
        Args:
            job: Job dictionary to validate
            context: Optional context for error messages
            
        Raises:
            ExtractionValidationError: If job content is invalid
        """
        try:
            ExtractionUtils.validate_job_content(job, context)
        except ValueError as e:
            raise ExtractionValidationError(str(e)) from e
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Clean text (delegated to utils).
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text
        """
        return ExtractionUtils.clean_text(text)
    
    @staticmethod
    def _extract_remote_type(text: str, hint: str = "", mapped: str = "") -> str:
        """
        Extract remote type (delegated to utils).
        
        Args:
            text: Main text to search
            hint: Additional hint text
            mapped: Additional mapped text
            
        Returns:
            Remote type string ("Remote", "Hybrid", "On-site", or empty)
        """
        return ExtractionUtils.extract_remote_type(text, hint, mapped)
    
    @staticmethod
    def _extract_location_freeform(text: str) -> str:
        """
        Extract location freeform (delegated to utils).
        
        Args:
            text: Text to extract location from
            
        Returns:
            Location string or empty string
        """
        return ExtractionUtils.extract_location_freeform(text)
    
    @staticmethod
    def _preclean_noise(text: str) -> str:
        """
        Pre-clean noise (delegated to utils).
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text
        """
        return ExtractionUtils.preclean_noise(text)


# Export main service and exceptions
__all__ = [
    'JobExtractionService',
    'JobExtractionError',
    'ExtractionValidationError',
    'ExtractionContentError',
    'LLMServiceError',
    'StructuredDataError',
    'ExtractionError',  # Legacy alias
    'ValidationError',  # Legacy alias
]
