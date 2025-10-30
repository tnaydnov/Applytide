"""
PDF Text Extraction Service with Multiple Fallback Methods

This module provides robust PDF text extraction using multiple libraries
as fallback strategies. It handles edge cases like corrupted PDFs, empty
content, large files, and complex layouts (tables, multi-column).

Features:
    - Three extraction methods: pdfplumber (best), PyMuPDF (good), PyPDF2 (fallback)
    - Automatic fallback on extraction failure
    - Table detection and extraction
    - Section parsing (Summary, Experience, Education, Skills, etc.)
    - Memory-efficient streaming for large PDFs
    - Comprehensive error handling and logging

Extraction Strategy:
    1. Try pdfplumber first (best for complex layouts and tables)
    2. Fall back to PyMuPDF if pdfplumber fails
    3. Fall back to PyPDF2 as last resort
    4. Return structured result with metadata

Supported Features:
    - Text extraction from all pages
    - Table detection and structured extraction
    - Section parsing (resume/document structure)
    - Word count and character count
    - Metadata tracking (method used, success status)

Error Handling:
    - Graceful degradation (try next method on failure)
    - Minimum content validation (50 chars threshold)
    - Detailed error logging with method name
    - Returns empty result with error details on complete failure

Author: ApplyTide Team
Last Updated: 2025-01-18
"""
from __future__ import annotations
import io
import re
from typing import Dict, Any, Optional
import logging

# PDF extraction libraries with fallback support
try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False
    
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MIN_CONTENT_LENGTH = 50  # Minimum characters for valid extraction
MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024  # 50MB max PDF size
MAX_SECTION_HEADER_LENGTH = 50  # Max chars for section headers
DEFAULT_WORD_COUNT = 0


class PDFExtractionError(Exception):
    """Raised when PDF extraction fails with all methods."""
    pass


class PDFValidationError(Exception):
    """Raised when PDF validation fails (size, format, etc.)."""
    pass

class PDFExtractor:
    """
    Robust PDF text extraction with multiple fallback methods.
    
    This class attempts to extract text from PDFs using three different
    libraries in order of preference:
    1. pdfplumber - Best for complex layouts, tables, multi-column
    2. PyMuPDF (fitz) - Good balance of speed and accuracy
    3. PyPDF2 - Simple fallback for basic PDFs
    
    Features:
        - Automatic fallback on extraction failure
        - Table detection and structured extraction
        - Section parsing (resume structure: summary, experience, etc.)
        - Memory-efficient streaming
        - Comprehensive error handling
    
    Attributes:
        extraction_methods: List of extraction method callables in priority order
    
    Thread Safety:
        - Thread-safe (no shared state)
        - Each extraction creates new BytesIO stream
        - Safe for concurrent use
    
    Example:
        >>> extractor = PDFExtractor()
        >>> result = extractor.extract_text(pdf_bytes)
        >>> if result["success"]:
        ...     print(f"Extracted {result['word_count']} words")
        ...     print(f"Method: {result['extraction_method']}")
    """
    
    def __init__(self) -> None:
        """
        Initialize PDF Extractor with available extraction methods.
        
        Notes:
            - Methods are tried in order of reliability
            - Missing libraries are skipped (graceful degradation)
            - At least one method must be available
        
        Raises:
            PDFExtractionError: If no extraction libraries are available
        """
        self.extraction_methods: list[tuple[str, callable]] = []
        
        # Build list of available methods in priority order
        if HAS_PDFPLUMBER:
            self.extraction_methods.append(("pdfplumber", self._extract_with_pdfplumber))
        if HAS_PYMUPDF:
            self.extraction_methods.append(("pymupdf", self._extract_with_pymupdf))
        if HAS_PYPDF2:
            self.extraction_methods.append(("pypdf2", self._extract_with_pypdf2))
        
        if not self.extraction_methods:
            logger.critical("No PDF extraction libraries available")
            raise PDFExtractionError(
                "No PDF extraction libraries (PyPDF2, pdfplumber, PyMuPDF) are installed"
            )
        
        logger.info(
            "PDFExtractor initialized",
            extra={
                "available_methods": [name for name, _ in self.extraction_methods],
                "method_count": len(self.extraction_methods)
            }
        )
    
    def extract_text(self, pdf_content: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF using multiple methods as fallbacks.
        
        Attempts extraction with available methods in priority order:
        pdfplumber → PyMuPDF → PyPDF2. Stops at first successful extraction
        that produces meaningful content (>50 characters).
        
        Args:
            pdf_content: Raw PDF file bytes
        
        Returns:
            Dict containing:
                - text (str): Extracted text content
                - word_count (int): Number of words extracted
                - extraction_method (str): Method that succeeded ("pdfplumber", "pymupdf", "pypdf2", or "failed")
                - success (bool): True if extraction succeeded
                - sections (Dict[str, str]): Parsed sections (summary, experience, etc.)
                - error (str, optional): Error message if all methods failed
                - char_count (int, optional): Number of characters extracted
        
        Raises:
            PDFValidationError: If PDF content is invalid (empty, too large, corrupted header)
        
        Example:
            >>> extractor = PDFExtractor()
            >>> with open("resume.pdf", "rb") as f:
            ...     result = extractor.extract_text(f.read())
            >>> if result["success"]:
            ...     print(result["text"])
        
        Notes:
            - Returns empty result (not exception) if all methods fail
            - Validates minimum content length (50 chars)
            - Resets stream between method attempts
            - Logs warnings for each failed method
        """
        # Validate input
        if not pdf_content:
            logger.error("Empty PDF content provided")
            raise PDFValidationError("PDF content is empty")
        
        if not isinstance(pdf_content, bytes):
            logger.error(
                "Invalid PDF content type",
                extra={"type": type(pdf_content).__name__}
            )
            raise PDFValidationError(f"PDF content must be bytes, got {type(pdf_content).__name__}")
        
        # Check size limit
        content_size = len(pdf_content)
        if content_size > MAX_PDF_SIZE_BYTES:
            logger.error(
                "PDF too large",
                extra={
                    "size_bytes": content_size,
                    "max_bytes": MAX_PDF_SIZE_BYTES,
                    "size_mb": round(content_size / (1024 * 1024), 2)
                }
            )
            raise PDFValidationError(
                f"PDF too large ({content_size / (1024 * 1024):.1f}MB). "
                f"Maximum: {MAX_PDF_SIZE_BYTES / (1024 * 1024):.0f}MB"
            )
        
        # Validate PDF header
        if not pdf_content.startswith(b'%PDF'):
            logger.warning(
                "Invalid PDF header",
                extra={"first_bytes": pdf_content[:10]}
            )
            raise PDFValidationError("File does not appear to be a valid PDF (missing %PDF header)")
        
        logger.debug(
            "Starting PDF extraction",
            extra={
                "size_bytes": content_size,
                "size_kb": round(content_size / 1024, 2),
                "available_methods": len(self.extraction_methods)
            }
        )
        
        pdf_stream = io.BytesIO(pdf_content)
        last_error: Optional[str] = None
        
        # Try each extraction method in priority order
        for method_name, method_func in self.extraction_methods:
            try:
                logger.info(f"Attempting PDF extraction with {method_name}")
                text = method_func(pdf_stream)
                
                # Validate extraction produced meaningful content
                if text and len(text.strip()) >= MIN_CONTENT_LENGTH:
                    char_count = len(text)
                    word_count = len(text.split())
                    
                    logger.info(
                        f"Successfully extracted text with {method_name}",
                        extra={
                            "char_count": char_count,
                            "word_count": word_count,
                            "method": method_name
                        }
                    )
                    
                    # Parse sections
                    try:
                        sections = self._parse_sections(text)
                        section_count = len(sections)
                    except Exception as e:
                        logger.warning(
                            "Failed to parse sections",
                            extra={"error": str(e)},
                            exc_info=True
                        )
                        sections = {}
                        section_count = 0
                    
                    return {
                        "text": text,
                        "word_count": word_count,
                        "char_count": char_count,
                        "extraction_method": method_name,
                        "success": True,
                        "sections": sections,
                        "section_count": section_count
                    }
                
                else:
                    # Extraction produced insufficient content
                    logger.warning(
                        f"Insufficient content extracted with {method_name}",
                        extra={
                            "content_length": len(text) if text else 0,
                            "min_required": MIN_CONTENT_LENGTH
                        }
                    )
                
                # Reset stream for next method
                pdf_stream.seek(0)
                
            except Exception as e:
                error_msg = str(e)
                last_error = error_msg
                
                logger.warning(
                    f"PDF extraction failed with {method_name}",
                    extra={
                        "method": method_name,
                        "error": error_msg,
                        "error_type": type(e).__name__
                    },
                    exc_info=True
                )
                
                # Reset stream for next method
                try:
                    pdf_stream.seek(0)
                except Exception:
                    # Stream is corrupted, recreate it
                    pdf_stream = io.BytesIO(pdf_content)
        
        # All methods failed
        logger.error(
            "All PDF extraction methods failed",
            extra={
                "methods_tried": [name for name, _ in self.extraction_methods],
                "last_error": last_error
            }
        )
        
        return {
            "text": "",
            "word_count": DEFAULT_WORD_COUNT,
            "char_count": 0,
            "extraction_method": "failed",
            "success": False,
            "error": last_error or "Unable to extract text from PDF with any method",
            "sections": {},
            "section_count": 0
        }
    
    def _extract_with_pdfplumber(self, pdf_stream: io.BytesIO) -> str:
        """
        Extract text using pdfplumber (best for complex layouts).
        
        pdfplumber excels at:
        - Complex multi-column layouts
        - Table detection and extraction
        - Maintaining text structure
        - Handling mixed content (text + tables)
        
        Args:
            pdf_stream: BytesIO stream containing PDF data
        
        Returns:
            str: Extracted text with tables formatted as pipe-separated values
        
        Raises:
            Exception: If pdfplumber fails to open or parse PDF
        
        Notes:
            - Extracts tables first, then regular text
            - Tables are formatted as: "cell1 | cell2 | cell3"
            - Empty cells are preserved with empty strings
            - Pages are processed sequentially
        """
        if not HAS_PDFPLUMBER:
            raise PDFExtractionError("pdfplumber library not available")
        
        text_parts: list[str] = []
        page_count = 0
        table_count = 0
        
        try:
            with pdfplumber.open(pdf_stream) as pdf:
                page_count = len(pdf.pages)
                
                logger.debug(
                    "pdfplumber opened PDF",
                    extra={"page_count": page_count}
                )
                
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        # Try table extraction first
                        tables = page.extract_tables()
                        if tables:
                            for table_idx, table in enumerate(tables):
                                if table:
                                    table_count += 1
                                    for row in table:
                                        if row:
                                            # Join cells with pipe separator, handle None cells
                                            row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                                            if row_text.strip():
                                                text_parts.append(row_text)
                        
                        # Extract regular text
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                    
                    except Exception as e:
                        logger.warning(
                            f"pdfplumber failed on page {page_num}",
                            extra={
                                "page_num": page_num,
                                "error": str(e)
                            }
                        )
                        # Continue with other pages
                        continue
        
        except Exception as e:
            logger.error(
                "pdfplumber failed to open PDF",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True
            )
            raise
        
        result = "\n".join(text_parts)
        
        logger.debug(
            "pdfplumber extraction complete",
            extra={
                "pages_processed": page_count,
                "tables_found": table_count,
                "char_count": len(result)
            }
        )
        
        return result
    
    def _extract_with_pymupdf(self, pdf_stream: io.BytesIO) -> str:
        """
        Extract text using PyMuPDF/fitz (good balance of speed and accuracy).
        
        PyMuPDF (fitz) excels at:
        - Fast extraction speed
        - Good text block detection
        - Maintaining formatting (bold, italic, etc.)
        - Memory efficiency
        
        Args:
            pdf_stream: BytesIO stream containing PDF data
        
        Returns:
            str: Extracted text with preserved line structure
        
        Raises:
            Exception: If PyMuPDF fails to open or parse PDF
        
        Notes:
            - Extracts text blocks (maintains formatting better than raw text)
            - Processes spans within lines for better structure
            - Filters empty lines
            - Pages are processed sequentially
        """
        if not HAS_PYMUPDF:
            raise PDFExtractionError("PyMuPDF (fitz) library not available")
        
        text_parts: list[str] = []
        pdf_document = None
        
        try:
            # Open PDF from bytes
            pdf_bytes = pdf_stream.read()
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = pdf_document.page_count
            
            logger.debug(
                "PyMuPDF opened PDF",
                extra={"page_count": page_count}
            )
            
            for page_num in range(page_count):
                try:
                    page = pdf_document[page_num]
                    
                    # Extract text blocks (maintains formatting better)
                    blocks = page.get_text("dict")
                    
                    if not blocks or "blocks" not in blocks:
                        logger.debug(f"No blocks found on page {page_num + 1}")
                        continue
                    
                    for block in blocks["blocks"]:
                        if "lines" not in block:
                            continue
                        
                        for line in block["lines"]:
                            line_text = ""
                            if "spans" in line:
                                for span in line["spans"]:
                                    if "text" in span:
                                        line_text += span["text"]
                            
                            if line_text.strip():
                                text_parts.append(line_text)
                
                except Exception as e:
                    logger.warning(
                        f"PyMuPDF failed on page {page_num + 1}",
                        extra={
                            "page_num": page_num + 1,
                            "error": str(e)
                        }
                    )
                    # Continue with other pages
                    continue
        
        except Exception as e:
            logger.error(
                "PyMuPDF failed to open PDF",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True
            )
            raise
        
        finally:
            # Always close document to free resources
            if pdf_document:
                try:
                    pdf_document.close()
                except Exception:
                    pass
        
        result = "\n".join(text_parts)
        
        logger.debug(
            "PyMuPDF extraction complete",
            extra={
                "pages_processed": page_count if pdf_document else 0,
                "lines_extracted": len(text_parts),
                "char_count": len(result)
            }
        )
        
        return result
    
    def _extract_with_pypdf2(self, pdf_stream: io.BytesIO) -> str:
        """
        Extract text using PyPDF2 (simple fallback method).
        
        PyPDF2 is used as a last-resort fallback when other methods fail.
        It provides basic text extraction but may struggle with:
        - Complex layouts
        - Multi-column documents
        - Tables
        - Special fonts
        
        Args:
            pdf_stream: BytesIO stream containing PDF data
        
        Returns:
            str: Extracted text (may have formatting issues)
        
        Raises:
            Exception: If PyPDF2 fails to open or parse PDF
        
        Notes:
            - Basic text extraction only (no table support)
            - May produce jumbled text for complex layouts
            - Fastest method but least accurate
            - Good for simple single-column documents
        """
        if not HAS_PYPDF2:
            raise PDFExtractionError("PyPDF2 library not available")
        
        text_parts: list[str] = []
        page_count = 0
        
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_stream)
            page_count = len(pdf_reader.pages)
            
            logger.debug(
                "PyPDF2 opened PDF",
                extra={"page_count": page_count}
            )
            
            for page_num, page in enumerate(pdf_reader.pages, start=1):
                try:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
                
                except Exception as e:
                    logger.warning(
                        f"PyPDF2 failed on page {page_num}",
                        extra={
                            "page_num": page_num,
                            "error": str(e)
                        }
                    )
                    # Continue with other pages
                    continue
        
        except Exception as e:
            logger.error(
                "PyPDF2 failed to open PDF",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True
            )
            raise
        
        result = "\n".join(text_parts)
        
        logger.debug(
            "PyPDF2 extraction complete",
            extra={
                "pages_processed": page_count,
                "char_count": len(result)
            }
        )
        
        return result
    
    def _parse_sections(self, text: str) -> Dict[str, str]:
        """
        Parse resume/document text into logical sections.
        
        Identifies common resume sections based on header patterns:
        - Summary/Profile/Objective/About
        - Experience/Employment/Work History/Professional
        - Education/Academic/Qualifications
        - Skills/Competencies/Technical Skills/Technologies
        - Projects/Portfolio
        - Certifications/Certificates/Licenses
        - Achievements/Awards/Accomplishments
        
        Args:
            text: Full extracted text from PDF
        
        Returns:
            Dict mapping section names to their content (e.g., {"experience": "...text..."})
        
        Notes:
            - Case-insensitive pattern matching
            - Section headers must be < 50 chars (avoids false positives)
            - Returns empty dict if no sections detected
            - Handles multiple section formats (e.g., "Work Experience" or "Professional Experience")
        
        Edge Cases:
            - Text with no clear sections → returns empty dict
            - Multiple sections with same name → keeps last one
            - Empty sections → skipped
            - Non-ASCII characters → handled gracefully
        """
        if not text or not isinstance(text, str):
            logger.debug("Empty or invalid text for section parsing")
            return {}
        
        text_lower = text.lower()
        sections: Dict[str, str] = {}
        
        # Common section patterns (regex patterns for flexible matching)
        section_patterns: Dict[str, list[str]] = {
            "summary": [r"summary", r"profile", r"objective", r"about"],
            "experience": [r"experience", r"employment", r"work history", r"professional"],
            "education": [r"education", r"academic", r"qualifications"],
            "skills": [r"skills", r"competencies", r"technical skills", r"technologies"],
            "projects": [r"projects", r"portfolio"],
            "certifications": [r"certifications", r"certificates", r"licenses"],
            "achievements": [r"achievements", r"awards", r"accomplishments"]
        }
        
        try:
            lines = text.split('\n')
            current_section: Optional[str] = None
            section_content: list[str] = []
            
            for line in lines:
                line_clean = line.strip()
                if not line_clean:
                    continue
                
                # Check if this line starts a new section
                is_section_header = False
                
                # Only consider short lines as potential headers
                if len(line_clean) <= MAX_SECTION_HEADER_LENGTH:
                    for section_name, patterns in section_patterns.items():
                        for pattern in patterns:
                            # Match pattern at start of line (case-insensitive)
                            if re.search(f'^{pattern}', line_clean.lower()):
                                # Save previous section if exists
                                if current_section and section_content:
                                    sections[current_section] = '\n'.join(section_content)
                                
                                # Start new section
                                current_section = section_name
                                section_content = []
                                is_section_header = True
                                
                                logger.debug(
                                    f"Found section: {section_name}",
                                    extra={"header": line_clean}
                                )
                                break
                        
                        if is_section_header:
                            break
                
                # Add content to current section (if not a header)
                if not is_section_header and current_section:
                    section_content.append(line_clean)
            
            # Save final section if exists
            if current_section and section_content:
                sections[current_section] = '\n'.join(section_content)
            
            logger.debug(
                "Section parsing complete",
                extra={
                    "sections_found": list(sections.keys()),
                    "section_count": len(sections)
                }
            )
        
        except Exception as e:
            logger.error(
                "Error during section parsing",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            # Return empty dict on parse error (graceful degradation)
            return {}
        
        return sections
