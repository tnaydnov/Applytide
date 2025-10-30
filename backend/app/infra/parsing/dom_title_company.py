"""
DOM Title and Company Extraction Module

This module provides HTML parsing functionality to extract job titles and
company names from HTML documents using BeautifulSoup and CSS selectors.

Features:
    - Generic title and company extraction from HTML
    - Multiple CSS selector fallback chains for robustness
    - Comprehensive error handling for malformed HTML
    - Input validation and sanitization
    - Detailed logging for debugging failed extractions

The module tries multiple common CSS selectors to find job titles and company
names, making it work across many different website structures.

Constants:
    TITLE_SELECTORS: Ordered list of CSS selectors for job titles
    COMPANY_SELECTORS: Ordered list of CSS selectors for company names
    MAX_HTML_SIZE: Maximum HTML size to process (1MB)
    MIN_TEXT_LENGTH: Minimum text length to consider valid (3 characters)
    MAX_TEXT_LENGTH: Maximum text length for extracted values (500 characters)

Example:
    >>> from app.infra.parsing.dom_title_company import GenericTitleCompany
    >>> 
    >>> html = '''
    ... <html>
    ...     <h1 class="job-title">Senior Software Engineer</h1>
    ...     <span class="company-name">Tech Corp</span>
    ... </html>
    ... '''
    >>> 
    >>> extractor = GenericTitleCompany()
    >>> result = extractor.extract(html)
    >>> print(result)
    {'title': 'Senior Software Engineer', 'company_name': 'Tech Corp'}
"""

from __future__ import annotations
import logging
from typing import Dict, List
from bs4 import BeautifulSoup

from ...domain.jobs.extraction.ports import TitleCompanyExtractor

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class TitleCompanyExtractionError(Exception):
    """Base exception for title/company extraction operations"""
    pass

class HTMLValidationError(TitleCompanyExtractionError):
    """Exception raised when HTML validation fails"""
    pass

class ExtractionError(TitleCompanyExtractionError):
    """Exception raised when extraction fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# HTML size limits
MAX_HTML_SIZE = 1024 * 1024  # 1MB
MIN_HTML_LENGTH = 10

# Text validation
MIN_TEXT_LENGTH = 3  # Minimum chars to consider valid text
MAX_TEXT_LENGTH = 500

# CSS Selectors for job title extraction (in priority order)
TITLE_SELECTORS = [
    "h1",
    "[itemprop='title']",
    "header h1",
    "article h1",
    "h1.job-title",
    "h1.jobTitle",
    "[data-job-title]",
]

# CSS Selectors for company name extraction (in priority order)
COMPANY_SELECTORS = [
    "[itemprop='hiringOrganization'] [itemprop='name']",
    ".company, .company-name, .employer, [data-company]",
    "a[href*='/company/']",
    "span.company",
    "div.company",
]

# BeautifulSoup parser settings
DEFAULT_PARSER = "lxml"
FALLBACK_PARSER = "html.parser"

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_html(html: str, operation: str) -> None:
    """
    Validate HTML input for parsing.
    
    Args:
        html: The HTML content to validate
        operation: Description of operation (for error messages)
        
    Raises:
        HTMLValidationError: If HTML is invalid
    """
    if not isinstance(html, str):
        raise HTMLValidationError(
            f"HTML for {operation} must be a string, got {type(html).__name__}"
        )
    
    if not html or not html.strip():
        raise HTMLValidationError(f"HTML for {operation} cannot be empty")
    
    if len(html) < MIN_HTML_LENGTH:
        raise HTMLValidationError(
            f"HTML for {operation} too short ({len(html)} chars, min {MIN_HTML_LENGTH})"
        )
    
    if len(html) > MAX_HTML_SIZE:
        raise HTMLValidationError(
            f"HTML for {operation} too large ({len(html)} bytes, max {MAX_HTML_SIZE})"
        )

def _validate_text(text: str, field_name: str) -> str:
    """
    Validate and sanitize extracted text.
    
    Args:
        text: The text to validate
        field_name: Name of field (for logging)
        
    Returns:
        Sanitized text (empty string if invalid)
    """
    if not text:
        return ""
    
    # Normalize whitespace
    text = " ".join(text.split())
    
    # Check minimum length
    if len(text) < MIN_TEXT_LENGTH:
        logger.debug(
            f"Extracted {field_name} too short",
            extra={"field": field_name, "length": len(text)}
        )
        return ""
    
    # Truncate if too long
    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(
            f"Extracted {field_name} too long, truncating",
            extra={"field": field_name, "original_length": len(text)}
        )
        text = text[:MAX_TEXT_LENGTH]
    
    return text

# ============================================================================
# Extractor Class
# ============================================================================

class GenericTitleCompany(TitleCompanyExtractor):
    """
    Generic HTML parser for extracting job titles and company names.
    
    Uses BeautifulSoup with multiple CSS selector fallback chains to extract
    job title and company name from HTML documents. Tries selectors in order
    until a match is found.
    """
    
    def __init__(self):
        """Initialize the title/company extractor."""
        logger.info("Initialized GenericTitleCompany extractor")
    
    def extract(self, html: str) -> dict[str, str]:
        """
        Extract job title and company name from HTML.
        
        Parses HTML with BeautifulSoup and tries multiple CSS selectors to
        find job title and company name. Returns dictionary with extracted
        values (empty strings for missing values).
        
        Args:
            html: HTML content to parse.
                Must be non-empty string, max MAX_HTML_SIZE bytes.
                
        Returns:
            Dictionary with keys:
                - 'title': Job title string (empty if not found)
                - 'company_name': Company name string (empty if not found)
                
        Raises:
            HTMLValidationError: If HTML validation fails
            ExtractionError: If parsing fails critically
            
        Example:
            >>> extractor = GenericTitleCompany()
            >>> html = '''
            ... <html>
            ...     <h1>Software Engineer</h1>
            ...     <span class="company">Tech Corp</span>
            ... </html>
            ... '''
            >>> result = extractor.extract(html)
            >>> print(result['title'])
            'Software Engineer'
            >>> print(result['company_name'])
            'Tech Corp'
            
        Notes:
            - Uses lxml parser (falls back to html.parser if unavailable)
            - Returns empty string for missing fields (doesn't raise)
            - Validates and sanitizes all extracted text
            - Logs all extraction attempts for debugging
        """
        try:
            # Validate HTML input
            _validate_html(html, "title/company extraction")
            
            logger.debug(
                "Starting title/company extraction",
                extra={
                    "html_length": len(html),
                    "html_preview": html[:100],
                }
            )
            
            # Parse HTML with BeautifulSoup
            try:
                soup = BeautifulSoup(html or "", DEFAULT_PARSER)
            except Exception as parser_error:
                # Try fallback parser
                logger.warning(
                    f"Failed to parse with {DEFAULT_PARSER}, trying fallback",
                    extra={"error": str(parser_error)}
                )
                try:
                    soup = BeautifulSoup(html or "", FALLBACK_PARSER)
                except Exception as fallback_error:
                    raise ExtractionError(
                        f"Failed to parse HTML with both parsers: {fallback_error}"
                    ) from fallback_error
            
            # Helper function to try multiple selectors
            def pick(selectors: List[str], field_name: str) -> str:
                """Try selectors in order until match found"""
                try:
                    logger.debug(
                        f"Trying {len(selectors)} selectors for {field_name}",
                        extra={"field": field_name, "selector_count": len(selectors)}
                    )
                    
                    for idx, sel in enumerate(selectors):
                        try:
                            el = soup.select_one(sel)
                            if el:
                                # Get text with space separator
                                text = el.get_text(" ")
                                # Validate and sanitize
                                validated = _validate_text(text, field_name)
                                
                                if validated:
                                    logger.info(
                                        f"Successfully extracted {field_name}",
                                        extra={
                                            "field": field_name,
                                            "selector": sel,
                                            "text_length": len(validated),
                                        }
                                    )
                                    return validated
                        except Exception as e:
                            logger.debug(
                                f"Selector failed for {field_name}",
                                extra={
                                    "field": field_name,
                                    "selector": sel,
                                    "error": str(e),
                                }
                            )
                            continue
                    
                    # No selector matched
                    logger.warning(
                        f"No selector matched for {field_name}",
                        extra={"field": field_name, "tried_selectors": len(selectors)}
                    )
                    return ""
                    
                except Exception as e:
                    logger.error(
                        f"Error in pick() for {field_name}",
                        exc_info=True,
                        extra={"field": field_name, "error": str(e)}
                    )
                    return ""
            
            # Extract title and company using selector chains
            title = pick(TITLE_SELECTORS, "title")
            company = pick(COMPANY_SELECTORS, "company")
            
            # Prepare result
            result = {"title": title, "company_name": company}
            
            logger.info(
                "Completed title/company extraction",
                extra={
                    "title_found": bool(title),
                    "company_found": bool(company),
                    "html_length": len(html),
                }
            )
            
            return result
            
        except HTMLValidationError:
            # Re-raise validation errors
            raise
        except ExtractionError:
            # Re-raise extraction errors
            raise
        except Exception as e:
            # Wrap unexpected errors
            logger.error(
                "Title/company extraction failed",
                exc_info=True,
                extra={
                    "html_length": len(html) if isinstance(html, str) else None,
                    "error": str(e),
                }
            )
            raise ExtractionError(f"Title/company extraction failed: {e}") from e
