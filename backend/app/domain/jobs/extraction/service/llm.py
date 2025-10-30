"""
LLM-based job extraction and enhancement.

This module provides LLM-powered extraction capabilities with graceful fallbacks
when the LLM service is unavailable. It handles both full extraction from text
and enhancement of existing extraction results.

Features:
- Full job extraction from plain text using LLM
- Enhancement of existing extractions with LLM refinement
- Result merging with configurable source priority
- Graceful degradation when LLM is unavailable
- Description validation and quality checks

Extraction Modes:
1. extract_from_text: Full LLM extraction from manual text (LLM-first path)
2. enhance_extraction: LLM enhancement of existing data (HTML path)
3. merge_results: Multi-source merging with priority (LLM > Structured > DOM > Fallbacks)
"""
from __future__ import annotations
from typing import Dict, Any, List, Optional
from ..ports import LLMExtractor
from .utils import ExtractionUtils
from .....infra.logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MIN_DESCRIPTION_LENGTH = 10  # Minimum valid description length
MAX_LLM_TEXT_LENGTH = 50000  # Maximum text length for LLM processing


class LLMExtractionHandler:
    """
    Handles LLM-based extraction and result merging.
    
    This handler provides an abstraction layer over the LLM service,
    managing availability checks, error handling, and result processing.
    
    Attributes:
        llm: Optional LLM extractor instance
        utils: Utility functions for text processing
    """
    
    def __init__(self, llm: Optional[LLMExtractor], utils: ExtractionUtils):
        """
        Initialize LLM extraction handler.
        
        Args:
            llm: Optional LLM extractor instance (None if unavailable)
            utils: Utility functions instance
        """
        self.llm = llm
        self.utils = utils
        
        logger.debug("LLMExtractionHandler initialized", extra={
            "llm_available": llm is not None
        })
    
    def is_available(self) -> bool:
        """
        Check if LLM service is available.
        
        Returns:
            True if LLM service is available, False otherwise
        """
        available = self.llm is not None
        logger.debug("LLM availability check", extra={"available": available})
        return available
    
    def extract_from_text(
        self,
        url: str,
        text: str,
        hints: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Extract job from plain text using LLM.
        
        Used for manual text paste path. Requires LLM service to be available.
        
        Args:
            url: Source URL
            text: Raw text to extract from
            hints: Optional hints (title, company, location, etc.)
            
        Returns:
            Dictionary with extracted job fields:
            - title: Job title
            - company_name: Company name
            - location: Location
            - remote_type: Remote work type
            - job_type: Job type
            - description: Cleaned description
            - requirements: List of requirements
            - skills: List of skills
            
        Raises:
            ValueError: If LLM is not available
            
        Examples:
            >>> handler = LLMExtractionHandler(llm_service, utils)
            >>> result = handler.extract_from_text(
            ...     url="https://example.com/job",
            ...     text="Software Engineer at Company\\n\\nWe are looking for...",
            ...     hints={"company_name": "Company"}
            ... )
        """
        if not self.llm:
            logger.error("LLM extraction requested but service unavailable")
            raise ValueError("LLM service is not available - cannot extract job from text")
        
        if not text or not text.strip():
            logger.warning("Empty text provided for LLM extraction")
            return {
                "title": "",
                "company_name": "",
                "location": "",
                "remote_type": "",
                "job_type": "",
                "description": "",
                "requirements": [],
                "skills": [],
            }
        
        # Limit text length for LLM processing
        if len(text) > MAX_LLM_TEXT_LENGTH:
            logger.warning("Text exceeds maximum LLM length, truncating", extra={
                "original_length": len(text),
                "max_length": MAX_LLM_TEXT_LENGTH
            })
            text = text[:MAX_LLM_TEXT_LENGTH]
        
        logger.debug("Extracting job from text using LLM", extra={
            "text_length": len(text),
            "has_hints": bool(hints)
        })
        
        hints = hints or {}
        
        try:
            job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
            
            logger.info("LLM extraction completed", extra={
                "title": job.get("title", "")[:50],
                "company": job.get("company_name", ""),
                "description_length": len(job.get("description", "")),
                "requirements_count": len(job.get("requirements", [])),
                "skills_count": len(job.get("skills", []))
            })
            
            return {
                "title": (job.get("title") or "").strip(),
                "company_name": (job.get("company_name") or "").strip(),
                "location": (job.get("location") or "").strip(),
                "remote_type": (job.get("remote_type") or "").strip(),
                "job_type": (job.get("job_type") or "").strip(),
                "description": (job.get("description") or "").strip(),
                "requirements": job.get("requirements") or [],
                "skills": job.get("skills") or [],
            }
        except Exception as e:
            logger.error("LLM extraction failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            }, exc_info=True)
            raise
    
    def enhance_extraction(
        self,
        url: str,
        text: str,
        hints: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Enhance extraction using LLM.
        
        Used for HTML processing path to extract/refine fields. Unlike extract_from_text,
        this method treats LLM failures as non-fatal and returns empty dict on error.
        
        Args:
            url: Source URL
            text: Main content text
            hints: Hints from DOM/JSON-LD/raw text
            
        Returns:
            Dictionary with extracted job fields (may be empty if LLM unavailable or fails)
            
        Examples:
            >>> handler = LLMExtractionHandler(llm_service, utils)
            >>> result = handler.enhance_extraction(
            ...     url="https://example.com/job",
            ...     text="Job description text...",
            ...     hints={"title": "Engineer", "company_name": "Company"}
            ... )
        """
        if not self.llm:
            logger.debug("LLM enhancement skipped - service unavailable")
            return {}
        
        if not text or not text.strip():
            logger.debug("LLM enhancement skipped - no text provided")
            return {}
        
        # Limit text length for LLM processing
        if len(text) > MAX_LLM_TEXT_LENGTH:
            logger.warning("Text exceeds maximum LLM length for enhancement, truncating", extra={
                "original_length": len(text),
                "max_length": MAX_LLM_TEXT_LENGTH
            })
            text = text[:MAX_LLM_TEXT_LENGTH]
        
        logger.debug("Enhancing extraction with LLM", extra={
            "text_length": len(text),
            "hints": hints
        })
        
        try:
            job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
            
            logger.info("LLM enhancement completed", extra={
                "title": job.get("title", "")[:50],
                "company": job.get("company_name", ""),
                "description_length": len(job.get("description", "")),
                "requirements_count": len(job.get("requirements", [])),
                "skills_count": len(job.get("skills", []))
            })
            
            return {
                "title": (job.get("title") or "").strip(),
                "company_name": (job.get("company_name") or "").strip(),
                "location": (job.get("location") or "").strip(),
                "remote_type": (job.get("remote_type") or "").strip(),
                "job_type": (job.get("job_type") or "").strip(),
                "description": (job.get("description") or "").strip(),
                "requirements": job.get("requirements") or [],
                "skills": job.get("skills") or [],
            }
        except Exception as e:
            # For enhancement, failures are non-fatal
            logger.warning("LLM enhancement failed (non-fatal)", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return {}
    
    def merge_results(
        self,
        llm_result: Dict[str, Any],
        structured_result: Dict[str, Any],
        dom_hints: Dict[str, str],
        fallbacks: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Merge results from multiple sources with priority order.
        
        Priority: LLM > Structured Data > DOM Hints > Fallbacks
        
        Args:
            llm_result: Result from LLM extraction
            structured_result: Result from JSON-LD/structured data
            dom_hints: Hints from DOM extraction (title/company)
            fallbacks: Fallback values (location, remote_type)
            
        Returns:
            Merged result dictionary
        """
        def pick_first(*values):
            """Pick first non-empty string value."""
            for v in values:
                if v and str(v).strip():
                    return str(v).strip()
            return ""
        
        return {
            "title": pick_first(
                llm_result.get("title"),
                structured_result.get("title"),
                dom_hints.get("title")
            ),
            "company_name": pick_first(
                llm_result.get("company_name"),
                structured_result.get("company_name"),
                dom_hints.get("company_name")
            ),
            "location": pick_first(
                llm_result.get("location"),
                structured_result.get("location"),
                fallbacks.get("location")
            ),
            "remote_type": pick_first(
                llm_result.get("remote_type"),
                fallbacks.get("remote_type")
            ),
            "job_type": pick_first(
                llm_result.get("job_type"),
                structured_result.get("job_type")
            ),
            "description": self.utils.clean_text(
                llm_result.get("description", "")
            ),
            "requirements": [
                x.strip() 
                for x in llm_result.get("requirements", []) 
                if x and x.strip()
            ],
            "skills": [
                x.strip() 
                for x in llm_result.get("skills", []) 
                if x and x.strip()
            ],
        }
    
    def has_valid_description(self, llm_result: Dict[str, Any]) -> bool:
        """
        Check if LLM successfully extracted a valid description.
        
        Used to determine if regex requirement splitting is needed.
        A valid description must be present, non-empty, and meet minimum length.
        
        Args:
            llm_result: LLM extraction result
            
        Returns:
            True if description is present and valid, False otherwise
            
        Examples:
            >>> handler = LLMExtractionHandler(llm_service, utils)
            >>> result = {"description": "This is a job description..."}
            >>> handler.has_valid_description(result)
            True
            >>> handler.has_valid_description({"description": ""})
            False
        """
        if not llm_result:
            logger.debug("LLM result is empty, no valid description")
            return False
        
        desc = llm_result.get("description")
        if desc is None:
            logger.debug("LLM result has no description field")
            return False
        
        desc_str = str(desc).strip()
        if not desc_str:
            logger.debug("LLM description is empty")
            return False
        
        if len(desc_str) < MIN_DESCRIPTION_LENGTH:
            logger.debug("LLM description too short", extra={
                "length": len(desc_str),
                "min_length": MIN_DESCRIPTION_LENGTH
            })
            return False
        
        logger.debug("LLM description is valid", extra={
            "length": len(desc_str)
        })
        return True
