"""LLM-based job extraction and enhancement."""
from __future__ import annotations
from typing import Dict, Any, List, Optional
from ..ports import LLMExtractor
from .utils import ExtractionUtils


class LLMExtractionHandler:
    """Handles LLM-based extraction and result merging."""
    
    def __init__(self, llm: Optional[LLMExtractor], utils: ExtractionUtils):
        self.llm = llm
        self.utils = utils
    
    def is_available(self) -> bool:
        """Check if LLM service is available."""
        return self.llm is not None
    
    def extract_from_text(
        self,
        url: str,
        text: str,
        hints: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Extract job from plain text using LLM.
        
        Used for manual text paste path.
        
        Args:
            url: Source URL
            text: Raw text to extract from
            hints: Optional hints (title, company, location, etc.)
            
        Returns:
            Dictionary with extracted job fields
            
        Raises:
            ValueError: If LLM is not available
        """
        if not self.llm:
            raise ValueError("LLM service is not available - cannot extract job from text")
        
        hints = hints or {}
        job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
        
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
    
    def enhance_extraction(
        self,
        url: str,
        text: str,
        hints: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Enhance extraction using LLM.
        
        Used for HTML processing path to extract/refine fields.
        
        Args:
            url: Source URL
            text: Main content text
            hints: Hints from DOM/JSON-LD/raw text
            
        Returns:
            Dictionary with extracted job fields (may be empty if LLM unavailable)
        """
        if not self.llm or not text.strip():
            return {}
        
        try:
            job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
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
        except Exception:
            # For enhancement, failures are non-fatal
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
        
        Args:
            llm_result: LLM extraction result
            
        Returns:
            True if description is present and non-empty
        """
        return bool(
            llm_result 
            and llm_result.get("description") is not None 
            and llm_result.get("description").strip()
        )
