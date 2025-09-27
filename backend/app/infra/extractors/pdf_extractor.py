"""
PDF Text Extraction Service with multiple fallback methods
"""
import PyPDF2
import pdfplumber
import fitz  # PyMuPDF
import io
import re
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class PDFExtractor:
    def __init__(self):
        self.extraction_methods = [
            self._extract_with_pdfplumber,
            self._extract_with_pymupdf,
            self._extract_with_pypdf2,
        ]
    
    def extract_text(self, pdf_content: bytes) -> Dict[str, any]:
        """
        Extract text from PDF using multiple methods as fallbacks
        Returns structured data with text, metadata, and extraction method used
        """
        pdf_stream = io.BytesIO(pdf_content)
        
        for method_name, method in zip(
            ["pdfplumber", "pymupdf", "pypdf2"], 
            self.extraction_methods
        ):
            try:
                logger.info(f"Attempting PDF extraction with {method_name}")
                text = method(pdf_stream)
                
                if text and len(text.strip()) > 50:  # Ensure meaningful content
                    logger.info(f"Successfully extracted {len(text)} characters with {method_name}")
                    return {
                        "text": text,
                        "word_count": len(text.split()),
                        "extraction_method": method_name,
                        "success": True,
                        "sections": self._parse_sections(text)
                    }
                
                pdf_stream.seek(0)  # Reset for next method
                
            except Exception as e:
                logger.warning(f"PDF extraction failed with {method_name}: {str(e)}")
                pdf_stream.seek(0)
                continue
        
        logger.error("All PDF extraction methods failed")
        return {
            "text": "",
            "word_count": 0,
            "extraction_method": "failed",
            "success": False,
            "error": "Unable to extract text from PDF",
            "sections": {}
        }
    
    def _extract_with_pdfplumber(self, pdf_stream: io.BytesIO) -> str:
        """Extract using pdfplumber (best for complex layouts)"""
        text_parts = []
        
        with pdfplumber.open(pdf_stream) as pdf:
            for page in pdf.pages:
                # Try table extraction first
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            if row:
                                text_parts.append(" | ".join([cell or "" for cell in row]))
                
                # Extract regular text
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        return "\n".join(text_parts)
    
    def _extract_with_pymupdf(self, pdf_stream: io.BytesIO) -> str:
        """Extract using PyMuPDF (good for complex PDFs)"""
        text_parts = []
        
        pdf_document = fitz.open(stream=pdf_stream.read(), filetype="pdf")
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            
            # Extract text blocks (maintains formatting better)
            blocks = page.get_text("dict")
            for block in blocks["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        line_text = ""
                        for span in line["spans"]:
                            line_text += span["text"]
                        if line_text.strip():
                            text_parts.append(line_text)
        
        pdf_document.close()
        return "\n".join(text_parts)
    
    def _extract_with_pypdf2(self, pdf_stream: io.BytesIO) -> str:
        """Extract using PyPDF2 (fallback method)"""
        text_parts = []
        
        pdf_reader = PyPDF2.PdfReader(pdf_stream)
        
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        
        return "\n".join(text_parts)
    
    def _parse_sections(self, text: str) -> Dict[str, str]:
        """Parse resume into logical sections"""
        text_lower = text.lower()
        sections = {}
        
        # Common section patterns
        section_patterns = {
            "summary": [r"summary", r"profile", r"objective", r"about"],
            "experience": [r"experience", r"employment", r"work history", r"professional"],
            "education": [r"education", r"academic", r"qualifications"],
            "skills": [r"skills", r"competencies", r"technical skills", r"technologies"],
            "projects": [r"projects", r"portfolio"],
            "certifications": [r"certifications", r"certificates", r"licenses"],
            "achievements": [r"achievements", r"awards", r"accomplishments"]
        }
        
        lines = text.split('\n')
        current_section = None
        section_content = []
        
        for line in lines:
            line_clean = line.strip()
            if not line_clean:
                continue
            
            # Check if this line starts a new section
            is_section_header = False
            for section_name, patterns in section_patterns.items():
                for pattern in patterns:
                    if re.search(f'^{pattern}', line_clean.lower()) and len(line_clean) < 50:
                        # Save previous section
                        if current_section and section_content:
                            sections[current_section] = '\n'.join(section_content)
                        
                        # Start new section
                        current_section = section_name
                        section_content = []
                        is_section_header = True
                        break
                if is_section_header:
                    break
            
            # Add content to current section
            if not is_section_header and current_section:
                section_content.append(line_clean)
        
        # Save final section
        if current_section and section_content:
            sections[current_section] = '\n'.join(section_content)
        
        return sections
