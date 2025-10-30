"""
DOM-based extraction coordination.

This module handles extraction from HTML DOM using external port interfaces
for title/company extraction, main content extraction, and structured data parsing.

Features:
- Title and company name extraction from DOM structure
- Main content extraction with Readability fallback
- XHR log parsing for fallback content extraction
- Meta tag extraction (placeholder for future enhancement)
- Graceful error handling with logging

Extraction Methods:
1. extract_title_company: Extract job title and company from DOM selectors
2. extract_main_content: Extract main text using Readability or DOM parser
3. extract_from_xhr_logs: Fallback extraction from XHR response logs
4. extract_from_metas: Extract hints from meta tags (future enhancement)
"""
from __future__ import annotations
import re
import json as _json
from typing import Dict, Any, List, Optional
from ..ports import MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor
from .utils import ExtractionUtils
from .....infra.logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MIN_XHR_TEXT_LENGTH = 800  # Minimum XHR content length to consider valid
MAX_XHR_ENTRIES = 50  # Maximum XHR entries to process


class DOMExtractionHandler:
    """
    Coordinates DOM-based extraction via external ports.
    
    This handler delegates to specialized extractors for different DOM extraction tasks
    while providing consistent error handling and logging.
    
    Attributes:
        title_company: Extractor for job title and company name
        main_content: Extractor for main page content
        structured: Extractor for structured data (JSON-LD, etc.)
        utils: Utility functions for text processing
    """
    
    def __init__(
        self,
        title_company: TitleCompanyExtractor,
        main_content: MainContentExtractor,
        structured: StructuredDataExtractor,
        utils: ExtractionUtils
    ):
        """
        Initialize DOM extraction handler.
        
        Args:
            title_company: Title/company extractor instance
            main_content: Main content extractor instance
            structured: Structured data extractor instance
            utils: Utility functions instance
        """
        self.title_company = title_company
        self.main_content = main_content
        self.structured = structured
        self.utils = utils
        
        logger.debug("DOMExtractionHandler initialized")
    
    def extract_title_company(self, html: str) -> Dict[str, str]:
        """
        Extract title and company name from DOM.
        
        Args:
            html: HTML content
            
        Returns:
            Dictionary with 'title' and 'company_name' keys
        """
        try:
            result = self.title_company.extract(html) or {}
            logger.debug("DOM extraction successful", extra={
                "title": result.get('title'),
                "company_name": result.get('company_name')
            })
            return result
        except Exception as e:
            logger.warning("DOM extraction failed", extra={"error": str(e)})
            return {}
    
    def extract_main_content(
        self,
        html: str,
        readable: Optional[Dict[str, Any]] = None
    ) -> tuple[str, str, str]:
        """
        Extract main content text from HTML or Readability object.
        
        Args:
            html: HTML content
            readable: Optional Readability.parse() result
            
        Returns:
            Tuple of (main_text, readable_title, readable_site)
        """
        readable_title = ""
        readable_site = ""
        
        try:
            if readable and isinstance(readable, dict):
                logger.debug("Using Readability content")
                readable_title = (readable.get('title') or '').strip()
                readable_site = (readable.get('siteName') or '').strip()
                logger.debug("Readability metadata", extra={
                    "title": readable_title,
                    "siteName": readable_site
                })
                
                # Prefer Readability's textContent, else strip tags from 'content'
                main_text = readable.get('textContent') or ''
                if not main_text and readable.get('content'):
                    logger.debug("No textContent, extracting from HTML content")
                    main_text = self.utils.clean_text(
                        re.sub(r"<[^>]+>", "", readable['content'])
                    )
                logger.debug("Readability text extracted", extra={
                    "text_length": len(main_text)
                })
            else:
                logger.debug("No Readability, using main_content extractor")
                main_text = self.main_content.extract(html)
                logger.debug("Main content extracted", extra={
                    "text_length": len(main_text)
                })
        except Exception as e:
            logger.warning("Main content extraction failed", extra={
                "error": str(e)
            }, exc_info=True)
            main_text = ""
        
        return main_text, readable_title, readable_site
    
    def extract_from_xhr_logs(
        self,
        xhr_logs: List[Dict[str, Any]]
    ) -> str:
        """
        Extract job content from XHR response logs.
        
        Fallback when main content extraction fails. Searches XHR logs for
        JSON responses containing job description fields or text that looks
        like job content.
        
        Strategy:
        1. Try JSON parsing to find common job fields
        2. Fallback to plain text if not JSON
        3. Validate content looks like job posting (keywords, length)
        4. Return first valid match
        
        Args:
            xhr_logs: List of XHR log entries with 'body' field
            
        Returns:
            Extracted text content (may be empty if no valid content found)
            
        Note:
            This is a best-effort extraction that may return empty string.
            Failures are logged but not raised to allow other fallbacks.
        """
        if not xhr_logs:
            logger.debug("No XHR logs provided for fallback extraction")
            return ""
        
        # Limit processing to avoid performance issues
        logs_to_check = xhr_logs[:MAX_XHR_ENTRIES]
        if len(xhr_logs) > MAX_XHR_ENTRIES:
            logger.debug(f"Limiting XHR log processing to {MAX_XHR_ENTRIES} entries", extra={
                "total_entries": len(xhr_logs)
            })
        
        logger.debug("Checking XHR logs", extra={"xhr_count": len(logs_to_check)})
        
        try:
            for i, entry in enumerate(logs_to_check):
                if not isinstance(entry, dict):
                    logger.debug(f"XHR entry {i+1} is not a dict, skipping")
                    continue
                
                body = entry.get('body') or ''
                if not body:
                    continue
                
                logger.debug(f"Checking XHR entry {i+1}", extra={
                    "body_length": len(body)
                })
                
                text_candidate = ""
                
                # Try JSON parse
                try:
                    j = _json.loads(body)
                    logger.debug(f"XHR entry {i+1} is valid JSON")
                    
                    # Walk shallowly for common job description fields
                    keys = [
                        'jobDescription', 'description', 'job_desc',
                        'content', 'responsibilities', 'qualifications'
                    ]
                    
                    for k in keys:
                        if isinstance(j, dict) and k in j and isinstance(j[k], str):
                            text_candidate = j[k]
                            logger.debug(f"Found job content in key '{k}'", extra={
                                "content_length": len(text_candidate)
                            })
                            break
                    
                    # Sometimes nested one level
                    if not text_candidate and isinstance(j, dict):
                        for v in j.values():
                            if isinstance(v, dict):
                                for k in keys:
                                    if k in v and isinstance(v[k], str):
                                        text_candidate = v[k]
                                        logger.debug(f"Found job content in nested key '{k}'", extra={
                                            "content_length": len(text_candidate)
                                        })
                                        break
                            if text_candidate:
                                break
                
                except Exception:
                    logger.debug(f"XHR entry {i+1} is not JSON, using as plain text")
                    pass
                
                # Fallback: use body as-is
                if not text_candidate:
                    text_candidate = body
                
                # Validate it looks like job content
                tc_lower = text_candidate.lower()
                has_job_keywords = (
                    ('job' in tc_lower and 'description' in tc_lower)
                    or 'responsibilit' in tc_lower
                    or 'qualification' in tc_lower
                    or 'requirement' in tc_lower
                )
                
                if has_job_keywords:
                    # Strip HTML tags
                    txt = re.sub(r'<[^>]+>', ' ', text_candidate)
                    
                    # Check minimum length
                    if len(txt) > MIN_XHR_TEXT_LENGTH:
                        main_text = self.utils.clean_text(txt)
                        logger.info("Found suitable job content in XHR", extra={
                            "xhr_entry": i + 1,
                            "text_length": len(main_text)
                        })
                        return main_text
                    else:
                        logger.debug(f"XHR content too short: {len(txt)} chars")
        
        except Exception as e:
            logger.warning("XHR fallback failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            }, exc_info=True)
        
        logger.debug("No suitable content found in XHR logs")
        return ""
    
    def extract_from_metas(
        self,
        metas: Optional[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Extract hints from meta tags.
        
        Currently placeholder - meta tag extraction can be added here.
        
        Args:
            metas: Optional meta tag dictionary
            
        Returns:
            Dictionary of extracted hints
        """
        # Placeholder for future meta tag extraction
        # Could extract og:title, og:description, etc.
        return {}
