"""DOM-based extraction coordination."""
from __future__ import annotations
import re
import json as _json
from typing import Dict, Any, List, Optional
from ..ports import MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor
from .utils import ExtractionUtils
from .....infra.logging import get_logger

logger = get_logger(__name__)


class DOMExtractionHandler:
    """Coordinates DOM-based extraction via external ports."""
    
    def __init__(
        self,
        title_company: TitleCompanyExtractor,
        main_content: MainContentExtractor,
        structured: StructuredDataExtractor,
        utils: ExtractionUtils
    ):
        self.title_company = title_company
        self.main_content = main_content
        self.structured = structured
        self.utils = utils
    
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
        
        Fallback when main content extraction fails.
        
        Args:
            xhr_logs: List of XHR log entries with 'body' field
            
        Returns:
            Extracted text content (may be empty)
        """
        if not xhr_logs:
            return ""
        
        logger.debug("Checking XHR logs", extra={"xhr_count": len(xhr_logs)})
        
        try:
            for i, entry in enumerate(xhr_logs):
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
                            logger.debug(f"Found job content in key '{k}'")
                            break
                    
                    # Sometimes nested one level
                    if not text_candidate and isinstance(j, dict):
                        for v in j.values():
                            if isinstance(v, dict):
                                for k in keys:
                                    if k in v and isinstance(v[k], str):
                                        text_candidate = v[k]
                                        logger.debug(f"Found job content in nested key '{k}'")
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
                if (
                    ('job' in text_candidate.lower() and 'description' in text_candidate.lower())
                    or 'responsibilit' in text_candidate.lower()
                ):
                    txt = re.sub(r'<[^>]+>', ' ', text_candidate)
                    if len(txt) > 800:
                        main_text = self.utils.clean_text(txt)
                        logger.debug("Found suitable job content in XHR", extra={
                            "text_length": len(main_text)
                        })
                        return main_text
        
        except Exception as e:
            logger.warning("XHR fallback failed", extra={"error": str(e)})
        
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
