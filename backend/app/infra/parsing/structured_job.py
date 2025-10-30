"""
Structured Job Data Extraction Module

This module extracts structured job posting data from HTML using multiple
standards: JSON-LD, Microdata, RDFa, and OpenGraph metadata.

Features:
    - Multi-standard extraction (JSON-LD, Microdata, RDFa, OpenGraph)
    - JobPosting schema.org detection and parsing
    - Comprehensive field mapping to normalized format
    - Error handling with graceful degradation
    - Detailed logging for debugging extraction failures

Uses the extruct library to parse structured data from HTML and maps it to
a normalized job posting format.

Constants:
    VALID_JOB_TYPES: List of recognized @type values for job postings
    MAX_HTML_SIZE: Maximum HTML size to process (5MB)
    MAX_URL_LENGTH: Maximum URL length (2048 characters)
    DEFAULT_SYNTAXES: List of extraction syntaxes to try

Example:
    >>> from app.infra.parsing.structured_job import ExtructStructuredData
    >>> 
    >>> html = '''
    ... <script type="application/ld+json">
    ... {
    ...     "@context": "https://schema.org",
    ...     "@type": "JobPosting",
    ...     "title": "Software Engineer",
    ...     "hiringOrganization": {"name": "Tech Corp"}
    ... }
    ... </script>
    ... '''
    >>> 
    >>> extractor = ExtructStructuredData()
    >>> job_data = extractor.find_job(html, "https://example.com/job")
    >>> result = extractor.map_job(job_data, "https://example.com/job")
    >>> print(result['title'])
    'Software Engineer'
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup
import extruct
from w3lib.html import get_base_url

from ...domain.jobs.extraction.ports import StructuredDataExtractor

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class StructuredDataExtractionError(Exception):
    """Base exception for structured data extraction operations"""
    pass

class HTMLValidationError(StructuredDataExtractionError):
    """Exception raised when HTML validation fails"""
    pass

class URLValidationError(StructuredDataExtractionError):
    """Exception raised when URL validation fails"""
    pass

class ExtractionError(StructuredDataExtractionError):
    """Exception raised when extraction fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# HTML size limits
MAX_HTML_SIZE = 5 * 1024 * 1024  # 5MB
MIN_HTML_LENGTH = 10

# URL constraints
MAX_URL_LENGTH = 2048

# Structured data extraction settings
DEFAULT_SYNTAXES = ["json-ld", "microdata", "rdfa", "opengraph"]

# Valid JobPosting type identifiers
VALID_JOB_TYPES = [
    "JobPosting",
    "http://schema.org/JobPosting",
    "https://schema.org/JobPosting",
]

# Text limits
MAX_DESCRIPTION_LENGTH = 100000  # 100KB

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

def _validate_url(url: str, operation: str) -> None:
    """
    Validate URL input.
    
    Args:
        url: The URL to validate
        operation: Description of operation (for error messages)
        
    Raises:
        URLValidationError: If URL is invalid
    """
    if not isinstance(url, str):
        raise URLValidationError(
            f"URL for {operation} must be a string, got {type(url).__name__}"
        )
    
    if not url or not url.strip():
        raise URLValidationError(f"URL for {operation} cannot be empty")
    
    if len(url) > MAX_URL_LENGTH:
        raise URLValidationError(
            f"URL for {operation} too long ({len(url)} chars, max {MAX_URL_LENGTH})"
        )
    
    # Basic URL format check
    if not url.startswith(("http://", "https://")):
        raise URLValidationError(
            f"URL for {operation} must start with http:// or https://, got: {url[:50]}"
        )

# ============================================================================
# Extractor Class
# ============================================================================

class ExtructStructuredData(StructuredDataExtractor):
    """
    Structured data extractor using extruct library.
    
    Extracts job posting data from HTML using multiple structured data formats:
    JSON-LD, Microdata, RDFa, and OpenGraph. Maps extracted data to normalized
    job posting format.
    """
    
    def __init__(self):
        """Initialize the structured data extractor."""
        logger.info("Initialized ExtructStructuredData extractor")
    
    def find_job(self, html: str, url: str) -> Optional[Dict[str, Any]]:
        """
        Find JobPosting structured data in HTML.
        
        Extracts structured data using multiple syntaxes and searches for
        JobPosting schema.org entities. Falls back to OpenGraph metadata
        if no JobPosting found.
        
        Args:
            html: HTML content to extract from
            url: Source URL for base URL resolution
            
        Returns:
            Dictionary with JobPosting data, or OpenGraph data as fallback,
            or None if no structured data found
            
        Raises:
            HTMLValidationError: If HTML validation fails
            URLValidationError: If URL validation fails
            
        Example:
            >>> extractor = ExtructStructuredData()
            >>> html = '<script type="application/ld+json">{"@type":"JobPosting","title":"Engineer"}</script>'
            >>> job_data = extractor.find_job(html, "https://example.com/job")
            >>> print(job_data['@type'])
            'JobPosting'
            
        Notes:
            - Searches JSON-LD @graph arrays for nested JobPostings
            - Checks @type, type, and itemtype fields for JobPosting
            - Returns OpenGraph data if no JobPosting found
            - Returns None if no structured data found
        """
        try:
            # Validate inputs
            _validate_html(html, "structured data extraction")
            _validate_url(url, "structured data extraction")
            
            logger.debug(
                "Starting structured data extraction",
                extra={
                    "html_length": len(html),
                    "url": url,
                    "syntaxes": DEFAULT_SYNTAXES,
                }
            )
            
            # Get base URL for relative URL resolution
            try:
                base = get_base_url(html or "", url or "")
            except Exception as e:
                logger.warning(
                    "Failed to get base URL, using provided URL",
                    extra={"url": url, "error": str(e)}
                )
                base = url
            
            # Extract structured data with extruct
            try:
                data = extruct.extract(
                    html or "",
                    base_url=base,
                    syntaxes=DEFAULT_SYNTAXES,
                    errors="ignore"
                )
            except Exception as e:
                logger.error(
                    "Extruct extraction failed",
                    exc_info=True,
                    extra={"url": url, "error": str(e)}
                )
                raise ExtractionError(f"Structured data extraction failed: {e}") from e
            
            logger.debug(
                "Extruct extraction complete",
                extra={
                    "json_ld_count": len(data.get("json-ld") or []),
                    "microdata_count": len(data.get("microdata") or []),
                    "rdfa_count": len(data.get("rdfa") or []),
                    "has_opengraph": bool(data.get("opengraph")),
                }
            )
            
            # Helper function to check if object is a JobPosting
            def is_job(obj: dict) -> bool:
                """Check if object represents a JobPosting"""
                if not isinstance(obj, dict):
                    return False
                
                # Get @type field (various formats)
                t = obj.get("@type") or obj.get("type") or obj.get("itemtype") or ""
                
                # Handle list of types
                if isinstance(t, list):
                    t = " ".join(map(str, t))
                
                # Check if contains JobPosting
                result = "JobPosting" in str(t)
                
                if result:
                    logger.debug(
                        "Found JobPosting",
                        extra={"type_field": str(t)[:100]}
                    )
                
                return result
            
            # Collect all candidate objects
            cands: List[Dict] = []
            
            # Process JSON-LD data (handle @graph arrays)
            for item in (data.get("json-ld") or []):
                if isinstance(item, dict):
                    # Check for @graph array containing multiple entities
                    if "@graph" in item and isinstance(item["@graph"], list):
                        cands.extend([g for g in item["@graph"] if isinstance(g, dict)])
                    else:
                        cands.append(item)
            
            # Process Microdata and RDFa
            for key in ("microdata", "rdfa"):
                for item in (data.get(key) or []):
                    if isinstance(item, dict):
                        cands.append(item)
            
            logger.debug(
                "Collected candidate objects",
                extra={"candidate_count": len(cands)}
            )
            
            # Search for JobPosting in candidates
            for obj in cands:
                if is_job(obj):
                    logger.info(
                        "Found JobPosting structured data",
                        extra={
                            "url": url,
                            "has_title": bool(obj.get("title")),
                            "has_company": bool(obj.get("hiringOrganization")),
                        }
                    )
                    return obj
            
            # No JobPosting found, try OpenGraph fallback
            og = {}
            for meta in (data.get("opengraph") or []):
                if isinstance(meta, dict):
                    og.update(meta)
            
            if og:
                logger.info(
                    "No JobPosting found, using OpenGraph data",
                    extra={
                        "url": url,
                        "og_keys": list(og.keys())[:10],
                    }
                )
                return og
            
            # No structured data found
            logger.warning(
                "No JobPosting or OpenGraph data found",
                extra={"url": url}
            )
            return None
            
        except (HTMLValidationError, URLValidationError):
            # Re-raise validation errors
            raise
        except ExtractionError:
            # Re-raise extraction errors
            raise
        except Exception as e:
            # Wrap unexpected errors
            logger.error(
                "Structured data search failed unexpectedly",
                exc_info=True,
                extra={
                    "url": url,
                    "html_length": len(html) if isinstance(html, str) else None,
                    "error": str(e),
                }
            )
            raise ExtractionError(f"Failed to find job data: {e}") from e
    
    def map_job(self, obj: Dict[str, Any], url: str) -> Dict[str, Any]:
        """
        Map structured data object to normalized job format.
        
        Extracts and normalizes job fields from structured data object
        (JobPosting or OpenGraph). Handles various field name variations
        and data formats.
        
        Args:
            obj: Structured data object (from find_job())
            url: Source URL for the job posting
            
        Returns:
            Dictionary with normalized job fields:
                - title, company_name, source_url, location
                - remote_type, job_type, description
                - requirements (empty list), skills (empty list)
                
        Example:
            >>> extractor = ExtructStructuredData()
            >>> obj = {"title": "Engineer", "hiringOrganization": {"name": "TechCorp"}}
            >>> result = extractor.map_job(obj, "https://example.com/job")
            >>> print(result['title'])
            'Engineer'
            >>> print(result['company_name'])
            'TechCorp'
            
        Notes:
            - Handles case variations (hiringOrganization vs hiringorganization)
            - Extracts location from nested jobLocation objects
            - Detects remote jobs from description text
            - Normalizes description HTML to plain text
            - Returns empty strings for missing fields (never None)
        """
        try:
            if not isinstance(obj, dict):
                logger.warning(
                    "Object is not a dict, returning empty job",
                    extra={"obj_type": type(obj).__name__}
                )
                obj = {}
            
            logger.debug(
                "Mapping job data",
                extra={
                    "url": url,
                    "obj_keys": list(obj.keys())[:20],
                }
            )
            
            # Extract title
            title = obj.get("title") or obj.get("og:title") or ""
            
            # Extract company name
            company = ""
            org = obj.get("hiringOrganization") or obj.get("hiringorganization") or {}
            if isinstance(org, dict):
                company = org.get("name") or ""
            if not company:
                company = obj.get("og:site_name") or obj.get("site_name") or ""
            
            # Helper function to extract location from jobLocation object
            def loc_from_joblocation(val):
                """Extract location string from jobLocation object"""
                # Handle list of locations
                if isinstance(val, list) and val:
                    val = val[0]
                
                # Handle structured address object
                if isinstance(val, dict):
                    addr = val.get("address") or {}
                    parts = [
                        addr.get("addressLocality"),
                        addr.get("addressRegion"),
                        addr.get("addressCountry")
                    ]
                    result = ", ".join([p for p in parts if p])
                    return result
                
                # Handle plain string location
                if isinstance(val, str):
                    return val
                
                return ""
            
            # Extract location
            location = loc_from_joblocation(obj.get("jobLocation")) or obj.get("joblocation") or ""
            
            # Extract employment type
            emp = obj.get("employmentType") or obj.get("employmenttype") or ""
            if isinstance(emp, list):
                emp = ", ".join(emp)
            
            # Extract and process description
            desc_html = obj.get("description") or obj.get("og:description") or ""
            try:
                desc_text = BeautifulSoup(str(desc_html), "lxml").get_text("\n").strip()
            except Exception as e:
                logger.warning(
                    "Failed to parse description HTML",
                    extra={"error": str(e)}
                )
                desc_text = str(desc_html)
            
            # Truncate description if too long
            if len(desc_text) > MAX_DESCRIPTION_LENGTH:
                logger.warning(
                    "Description too long, truncating",
                    extra={
                        "original_length": len(desc_text),
                        "max_length": MAX_DESCRIPTION_LENGTH,
                    }
                )
                desc_text = desc_text[:MAX_DESCRIPTION_LENGTH]
            
            # Detect remote work from description
            rem = "remote" if "remote" in desc_text.lower() else ""
            
            # Normalize description whitespace
            desc_normalized = " ".join(desc_text.split())
            
            # Build result
            result = {
                "title": title or "",
                "company_name": company or "",
                "source_url": url,
                "location": location or "",
                "remote_type": rem,
                "job_type": emp or "",
                "description": desc_normalized,
                "requirements": [],
                "skills": []
            }
            
            logger.info(
                "Job mapping complete",
                extra={
                    "url": url,
                    "has_title": bool(result["title"]),
                    "has_company": bool(result["company_name"]),
                    "has_location": bool(result["location"]),
                    "has_description": bool(result["description"]),
                    "is_remote": bool(result["remote_type"]),
                }
            )
            
            return result
            
        except Exception as e:
            # Log error and return minimal job data
            logger.error(
                "Job mapping failed, returning partial data",
                exc_info=True,
                extra={
                    "url": url,
                    "error": str(e),
                }
            )
            # Return minimal valid structure
            return {
                "title": "",
                "company_name": "",
                "source_url": url,
                "location": "",
                "remote_type": "",
                "job_type": "",
                "description": "",
                "requirements": [],
                "skills": []
            }
