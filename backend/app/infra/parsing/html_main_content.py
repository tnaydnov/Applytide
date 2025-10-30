"""
HTML Main Content Extraction Module

This module provides intelligent HTML content extraction using Readability
and BeautifulSoup to extract clean, readable text from web pages.

Features:
    - Readability algorithm for intelligent content extraction
    - BeautifulSoup fallback for robust parsing
    - Text normalization and whitespace cleanup
    - Comprehensive error handling with graceful degradation
    - Detailed logging for extraction debugging

The module uses Mozilla's Readability algorithm (via python-readability) to
extract the main content from HTML, falling back to BeautifulSoup if needed.

Constants:
    MIN_HTML_LENGTH: Minimum HTML length to process (10 characters)
    MAX_HTML_SIZE: Maximum HTML size to process (5MB)
    MAX_OUTPUT_LENGTH: Maximum output text length (1MB)
    TEXT_PREVIEW_LENGTH: Preview length for logging (200 characters)

Example:
    >>> from app.infra.parsing.html_main_content import ReadabilityMainContent
    >>> 
    >>> html = '''
    ... <html>
    ...     <body>
    ...         <article>
    ...             <h1>Job Title</h1>
    ...             <p>This is the main content of the job posting.</p>
    ...         </article>
    ...     </body>
    ... </html>
    ... '''
    >>> 
    >>> extractor = ReadabilityMainContent()
    >>> content = extractor.extract(html)
    >>> print(content)
    Job Title
    This is the main content of the job posting.
"""

from __future__ import annotations
import re
import logging
from bs4 import BeautifulSoup
from readability import Document

from ...domain.jobs.extraction.ports import MainContentExtractor

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class MainContentExtractionError(Exception):
    """Base exception for main content extraction operations"""
    pass

class HTMLValidationError(MainContentExtractionError):
    """Exception raised when HTML validation fails"""
    pass

class ExtractionError(MainContentExtractionError):
    """Exception raised when extraction fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# HTML size limits
MIN_HTML_LENGTH = 10
MAX_HTML_SIZE = 5 * 1024 * 1024  # 5MB

# Output size limits
MAX_OUTPUT_LENGTH = 1024 * 1024  # 1MB

# Preview settings
TEXT_PREVIEW_LENGTH = 200

# Parser settings
DEFAULT_PARSER = "lxml"
FALLBACK_PARSER = "html.parser"

# Text normalization patterns
NBSP_CHAR = "\u00A0"
TRAILING_WHITESPACE_PATTERN = r"[ \t]+\n"
MULTIPLE_NEWLINES_PATTERN = r"\n{3,}"

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_html(html: str, operation: str) -> None:
    """
    Validate HTML input for extraction.
    
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

def _normalize_text(text: str) -> str:
    """
    Normalize extracted text by cleaning whitespace.
    
    Args:
        text: The text to normalize
        
    Returns:
        Normalized text with cleaned whitespace
        
    Notes:
        - Replaces non-breaking spaces with regular spaces
        - Removes trailing whitespace before newlines
        - Collapses multiple newlines to double newlines
    """
    if not text:
        return ""
    
    # Replace non-breaking spaces with regular spaces
    text = text.replace(NBSP_CHAR, " ")
    
    # Remove trailing spaces/tabs before newlines
    text = re.sub(TRAILING_WHITESPACE_PATTERN, "\n", text)
    
    # Collapse 3+ consecutive newlines to 2
    text = re.sub(MULTIPLE_NEWLINES_PATTERN, "\n\n", text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    # Truncate if too long
    if len(text) > MAX_OUTPUT_LENGTH:
        logger.warning(
            "Extracted text too long, truncating",
            extra={
                "original_length": len(text),
                "max_length": MAX_OUTPUT_LENGTH,
            }
        )
        text = text[:MAX_OUTPUT_LENGTH]
    
    return text

# ============================================================================
# Extractor Class
# ============================================================================

class ReadabilityMainContent(MainContentExtractor):
    """
    HTML main content extractor using Readability and BeautifulSoup.
    
    Uses Mozilla's Readability algorithm to intelligently extract the main
    content from HTML pages, with BeautifulSoup as a fallback. The extractor
    removes navigation, ads, and other non-content elements.
    """
    
    def __init__(self):
        """Initialize the main content extractor."""
        logger.info("Initialized ReadabilityMainContent extractor")
    
    def extract(self, html: str) -> str:
        """
        Extract main content text from HTML.
        
        Uses Readability algorithm to extract main content, falling back to
        BeautifulSoup if Readability fails. The extracted text is normalized
        by removing excess whitespace and non-breaking spaces.
        
        Args:
            html: HTML content to extract from.
                Must be non-empty string, max MAX_HTML_SIZE bytes.
                
        Returns:
            Extracted and normalized text content (empty string if extraction fails).
            
        Raises:
            HTMLValidationError: If HTML validation fails
            
        Example:
            >>> extractor = ReadabilityMainContent()
            >>> html = '<html><body><article><p>Main content here</p></article></body></html>'
            >>> content = extractor.extract(html)
            >>> print(content)
            'Main content here'
            
        Notes:
            - Uses Readability → BeautifulSoup fallback chain
            - Returns empty string on failure (graceful degradation)
            - Normalizes whitespace and removes non-breaking spaces
            - Logs all extraction attempts for debugging
            - Truncates output if exceeds MAX_OUTPUT_LENGTH
        """
        try:
            html_len = len(html or '')
            
            logger.debug(
                "HTML content extraction started",
                extra={"html_length": html_len}
            )
            
            # Validate HTML input
            _validate_html(html, "main content extraction")
            
            # Try Readability extraction first
            logger.debug("Attempting Readability extraction")
            try:
                doc = Document(html)
                summary_html = doc.summary(html_partial=True)
                
                # Parse Readability output with BeautifulSoup
                try:
                    soup = BeautifulSoup(summary_html, DEFAULT_PARSER)
                except Exception as parser_error:
                    logger.debug(
                        f"Failed to parse with {DEFAULT_PARSER}, trying fallback",
                        extra={"error": str(parser_error)}
                    )
                    soup = BeautifulSoup(summary_html, FALLBACK_PARSER)
                
                text = soup.get_text("\n")
                
                logger.info(
                    "Readability extraction successful",
                    extra={
                        "html_length": html_len,
                        "text_length": len(text),
                        "compression_ratio": round(len(text) / html_len, 2) if html_len > 0 else 0,
                    }
                )
                
            except Exception as e:
                # Readability failed, fall back to BeautifulSoup
                logger.warning(
                    "Readability extraction failed, falling back to BeautifulSoup",
                    extra={
                        "html_length": html_len,
                        "error": str(e),
                    }
                )
                
                try:
                    # Parse directly with BeautifulSoup
                    try:
                        soup = BeautifulSoup(html, DEFAULT_PARSER)
                    except Exception as parser_error:
                        logger.debug(
                            f"Failed to parse with {DEFAULT_PARSER}, trying fallback",
                            extra={"error": str(parser_error)}
                        )
                        soup = BeautifulSoup(html, FALLBACK_PARSER)
                    
                    text = soup.get_text("\n")
                    
                    logger.info(
                        "BeautifulSoup extraction successful",
                        extra={
                            "html_length": html_len,
                            "text_length": len(text),
                        }
                    )
                    
                except Exception as e2:
                    # Both methods failed
                    logger.error(
                        "BeautifulSoup extraction also failed, returning empty string",
                        exc_info=True,
                        extra={
                            "html_length": html_len,
                            "error": str(e2),
                        }
                    )
                    return ""
            
            # Normalize text
            result = _normalize_text(text)
            
            logger.info(
                "HTML extraction complete",
                extra={
                    "html_length": html_len,
                    "final_length": len(result),
                    "preview": result[:TEXT_PREVIEW_LENGTH],
                }
            )
            
            return result
            
        except HTMLValidationError:
            # Re-raise validation errors
            raise
        except Exception as e:
            # Unexpected errors: log and return empty string (graceful degradation)
            logger.error(
                "Main content extraction failed unexpectedly, returning empty string",
                exc_info=True,
                extra={
                    "html_length": len(html) if isinstance(html, str) else None,
                    "error": str(e),
                }
            )
            return ""
