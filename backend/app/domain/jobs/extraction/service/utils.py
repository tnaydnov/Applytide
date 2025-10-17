"""Text processing and extraction utilities."""
from __future__ import annotations
import re
from typing import Dict, Any
from .....infra.logging import get_logger

logger = get_logger(__name__)


class ExtractionUtils:
    """Shared utilities for job extraction."""
    
    @staticmethod
    def validate_job_content(job: Dict[str, Any], context: str = "") -> None:
        """
        Validate that extracted job has meaningful content.
        
        Args:
            job: Job dictionary to validate
            context: Optional context for error messages
            
        Raises:
            ValueError: If job lacks title and company, or has invalid content
        """
        title = (job.get("title") or "").strip()
        company = (job.get("company_name") or "").strip()
        description = (job.get("description") or "").strip()
        
        if not title and not company:
            raise ValueError(
                f"Job extraction failed - no title or company found"
                f"{' (' + context + ')' if context else ''}"
            )
        
        if len(description) < 10:  # Very short descriptions are likely extraction failures
            logger.warning(
                f"Job extraction produced very short description: {len(description)} chars"
                f"{' (' + context + ')' if context else ''}"
            )
        
        logger.info(
            f"Job validation passed{' (' + context + ')' if context else ''}: "
            f"title='{title[:50]}...', company='{company}', desc_len={len(description)}"
        )
    
    @staticmethod
    def clean_text(s: str) -> str:
        """
        Normalize text: remove non-breaking spaces, clean whitespace, normalize newlines.
        
        Args:
            s: Text to clean
            
        Returns:
            Cleaned text
        """
        s = s or ""
        s = s.replace("\u00A0", " ")  # Non-breaking space to regular space
        s = re.sub(r"[ \t]+\n", "\n", s)  # Remove trailing spaces before newlines
        s = re.sub(r"\n{3,}", "\n\n", s)  # Collapse multiple newlines to max 2
        return s.strip()
    
    @staticmethod
    def extract_remote_type(text: str, *candidates: str) -> str:
        """
        Detect remote work type from text.
        
        Args:
            text: Main text to search
            *candidates: Additional text fields to check
            
        Returns:
            "Remote", "Hybrid", "On-site", or empty string
        """
        blob = " ".join([c or "" for c in candidates] + [text or ""]).lower()
        
        if any(w in blob for w in ["hybrid", "partial remote"]):
            return "Hybrid"
        if any(w in blob for w in ["telecommute", "remote", "work from home", "wfh"]):
            return "Remote"
        if any(w in blob for w in ["on-site", "onsite", "on site", "in office", "in-office"]):
            return "On-site"
        
        return ""
    
    @staticmethod
    def extract_location_freeform(text: str) -> str:
        """
        Extract location from text using pattern matching.
        
        Tries two strategies:
        1. Explicit "Location:" label
        2. City-like pattern in first 80 lines
        
        Args:
            text: Text to extract location from
            
        Returns:
            Location string or empty string if not found
        """
        if not text:
            return ""
        
        # Strategy 1: Look for "Location:" label
        m = re.search(r"(?:^|\n)\s*Location\s*:\s*([^\n]{2,90})", text, flags=re.I)
        if m:
            val = m.group(1).strip(" .,\t")
            val = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", val, flags=re.I)
            return val
        
        # Strategy 2: Look for city-like patterns
        head = text[:5000]
        lines = [ln.strip() for ln in head.split("\n") if ln.strip()]
        
        # Pattern: "City, State" or "City, State, Country"
        city_like = re.compile(
            r"^[A-Z][A-Za-z .''\-()]+,\s*[A-Z][A-Za-z .''\-()]+"
            r"(?:,\s*[A-Z][A-Za-z .''\-()]+)?"
            r"(?:\s*\((?:Remote|Hybrid|On-?site)\))?$"
        )
        
        for ln in lines[:80]:
            if len(ln) <= 90 and city_like.match(ln):
                # Filter out lines that look like job titles
                if not re.search(r"(job|engineer|developer|senior|full\-?time)", ln, flags=re.I):
                    ln = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", ln, flags=re.I)
                    return ln.strip(" .,")
        
        return ""
    
    @staticmethod
    def preclean_noise(text: str) -> str:
        """
        Remove obvious UI chrome from LinkedIn/ATS pages.
        
        Removes common UI noise lines but PRESERVES company information sections.
        Company sections like "Company Overview", "About the Company", "About Us" 
        often appear BEFORE "About the Role" and should be preserved.
        The LLM is smart enough to filter out actual UI chrome.
        
        Args:
            text: Text to clean
            
        Returns:
            Text with UI noise removed
        """
        if not text:
            return ""
        
        # Drop common UI/noise lines
        drop_line_patterns = [
            r"^\s*Back\s*line\s*AI logo\s*$",
            r"^\s*Share\s*$",
            r"^\s*Show more options\s*$",
            r"^\s*Easy Apply\s*$",
            r"^\s*Save(\s+.+)?$",
            r"^\s*Promoted by hirer.*$",
            r"^\s*Actively reviewing applicants.*$",
            r"^\s*\d+\s+applicants\s*$",
            r"^\s*Your AI-powered job assessment\s*$",
            r"^\s*Am I a good match\??\s*$",
            r"^\s*Tailor my resume\s*$",
            r"^\s*Meet the hiring team\s*$",
            r"^\s*Message\s*$",
            r"^\s*Show more\s*$",
            r"^\s*Hide\s*$",
            r"^\s*2nd\s*$",
            r"^\s*Job poster.*$",
            r"^\s*\d+\s+mutual connections\s*$",
            r"^\s*—\s*$",
            r"^\s*Matches your job preferences.*$",
            r"^\s*workplace type is.*$",
            r"^\s*job type is.*$",
        ]
        
        lines = text.splitlines()
        kept = []
        
        for ln in lines:
            # Skip lines matching noise patterns
            if any(re.match(p, ln.strip(), flags=re.I) for p in drop_line_patterns):
                continue
            kept.append(ln)
        
        cleaned = "\n".join(kept)
        return ExtractionUtils.clean_text(cleaned)
