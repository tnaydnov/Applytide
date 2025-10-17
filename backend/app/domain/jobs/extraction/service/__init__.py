"""Job extraction service - refactored modular implementation."""
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


class JobExtractionService:
    """
    Orchestrates job extraction: DOM hints → structured data → main text → (optional) LLM →
    requirement cleanup. Never throws on best-effort branches; returns a complete dict.
    
    This is a refactored implementation using composition/delegation pattern.
    The public API remains unchanged for backward compatibility.
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
        """
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
            ValueError: If content is insufficient or extraction fails
        """
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
    
    # Expose utility methods for backward compatibility (if needed)
    @staticmethod
    def _validate_job_content(job: Dict[str, Any], context: str = "extraction") -> None:
        """Validate job content (delegated to utils)."""
        ExtractionUtils.validate_job_content(job, context)
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean text (delegated to utils)."""
        return ExtractionUtils.clean_text(text)
    
    @staticmethod
    def _extract_remote_type(text: str, hint: str = "", mapped: str = "") -> str:
        """Extract remote type (delegated to utils)."""
        return ExtractionUtils.extract_remote_type(text, hint, mapped)
    
    @staticmethod
    def _extract_location_freeform(text: str) -> str:
        """Extract location freeform (delegated to utils)."""
        return ExtractionUtils.extract_location_freeform(text)
    
    @staticmethod
    def _preclean_noise(text: str) -> str:
        """Pre-clean noise (delegated to utils)."""
        return ExtractionUtils.preclean_noise(text)


# Export main service
__all__ = ['JobExtractionService']
