"""
Requirement extraction and splitting logic.

This module provides regex-based requirement extraction from job descriptions,
splitting the description into clean text and a list of requirements.

Features:
- Pattern matching for requirement headers (Requirements, Qualifications, etc.)
- Bullet point detection (-, •, *, numbered lists)
- Technical keyword detection (AWS, Python, JavaScript, etc.)
- Stop header detection (Benefits, Culture sections)
- Deduplication and cleaning of extracted requirements
- Preservation of non-requirement content

Extraction Strategy:
1. Detect requirement section headers
2. Extract bullet points and technical requirements
3. Stop at culture/benefits sections
4. Remove extracted requirements from description
5. Deduplicate and clean results

Supported Headers:
- Requirement headers: "Requirements:", "Qualifications:", "What you'll need:", etc.
- Stop headers: "Why join us?", "About us", "Benefits:", "Company culture", etc.
"""
from __future__ import annotations
import re
from typing import List, Optional, Tuple
from ..ports import RequirementStripper
from .....infra.logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MAX_REQUIREMENT_LENGTH = 500  # Maximum individual requirement length
MAX_REQUIREMENTS_COUNT = 200  # Maximum number of requirements to extract

# Regex patterns for requirement detection
_REQ_HEADER_RE = re.compile(
    r"^\s*(requirements|qualifications|what you(?:'|')ll need|what we(?:'|')re looking for|"
    r"must have|required skills|minimum qualifications|what you bring)\s*:?\s*$",
    re.I
)

_STOP_HEADER_RE = re.compile(
    r"^\s*(why join us\??|about us|company culture|benefits|perks|what we offer|"
    r"our culture|our values|our team|the team|working here|life at)\s*:?\s*$",
    re.I
)

_BULLET_RE = re.compile(r"^\s*(?:[-–—•·\*]|\d{1,2}[.)])\s*(.+)$")

_TECH_TOKEN = re.compile(
    r"\b(aws|gcp|azure|kubernetes|docker|python|java|go|rust|node\.?js|react|redis|"
    r"postgres|elasticsearch|kafka|spark|linux|microservices|sql|nosql|mongodb|"
    r"snowflake|terraform)\b",
    re.I
)


class RequirementSplitter(RequirementStripper):
    """
    Splits job description into clean description + requirements list.
    
    Uses regex patterns to detect:
    - Requirement headers ("Requirements:", "Qualifications:", etc.)
    - Bullet points (-, •, *, numbered)
    - Tech keywords
    - Stop headers (benefits, culture sections)
    
    This is a fallback extractor used when LLM is unavailable or fails to
    extract requirements. The LLM approach is preferred when available.
    """
    
    def split(
        self, 
        description: str, 
        existing_reqs: Optional[List[str]] = None
    ) -> Tuple[str, List[str]]:
        """
        Split description into clean description + requirements.
        
        Strategy:
        1. Scan for requirement section headers
        2. Extract bullet points and technical requirements
        3. Stop at culture/benefits sections
        4. Remove extracted requirements from description
        5. Deduplicate and clean results
        
        Args:
            description: Full job description text
            existing_reqs: Already extracted requirements (won't be duplicated)
            
        Returns:
            Tuple of (clean_description, requirements_list)
            
        Examples:
            >>> splitter = RequirementSplitter()
            >>> desc, reqs = splitter.split(
            ...     "Job description\\n\\nRequirements:\\n- Python\\n- 5 years exp"
            ... )
            >>> len(reqs)
            2
        """
        if not description:
            logger.debug("Empty description provided to splitter")
            return "", list(existing_reqs or [])
        
        logger.debug("Splitting description", extra={
            "description_length": len(description),
            "existing_requirements": len(existing_reqs or [])
        })
        
        reqs = list(existing_reqs or [])
        lines = description.split("\n")
        cleaned: List[str] = []
        in_reqs = False
        
        requirements_found = 0
        
        for ln in lines:
            raw = ln
            s = ln.strip()
            
            # Check if we hit a STOP header (culture/benefits section)
            if _STOP_HEADER_RE.match(s):
                # Stop extracting requirements, keep everything else as description
                logger.debug("Found stop header, exiting requirement extraction", extra={
                    "header": s
                })
                in_reqs = False
                cleaned.append(raw)
                continue
            
            # Check if we hit a requirement header
            if _REQ_HEADER_RE.match(s):
                logger.debug("Found requirement header", extra={"header": s})
                in_reqs = True
                continue
            
            # If in requirements section, extract bullets/items
            if in_reqs:
                # Try to match bullet point
                m = _BULLET_RE.match(s)
                if m:
                    item = m.group(1).strip().rstrip(".")
                    if item and len(item) <= MAX_REQUIREMENT_LENGTH:
                        reqs.append(item)
                        requirements_found += 1
                        logger.debug("Found bullet requirement", extra={
                            "requirement": item[:50]
                        })
                    continue
                
                # Skip empty lines in requirements section
                if not s:
                    continue
                
                # Detect technical requirements without bullets
                if len(s) <= 160 and (
                    _TECH_TOKEN.search(s) or 
                    re.search(
                        r"(years|experience|degree|proficien|hands-on|familiar|understanding)\b",
                        s,
                        re.I
                    )
                ):
                    if len(s) <= MAX_REQUIREMENT_LENGTH:
                        reqs.append(s.rstrip("."))
                        requirements_found += 1
                        logger.debug("Found technical requirement", extra={
                            "requirement": s[:50]
                        })
                    continue
                
                # Non-requirement line, exit requirements mode
                in_reqs = False
            
            # Keep line in description
            cleaned.append(raw)
        
        logger.info("Requirement splitting completed", extra={
            "requirements_found": requirements_found,
            "total_requirements": len(reqs)
        })
        
        # Deduplicate requirements
        req_set = {r.strip() for r in reqs if r and r.strip()}
        
        # Limit to max count
        if len(req_set) > MAX_REQUIREMENTS_COUNT:
            logger.warning("Requirements exceed maximum count, truncating", extra={
                "original_count": len(req_set),
                "max_count": MAX_REQUIREMENTS_COUNT
            })
            req_list = list(req_set)[:MAX_REQUIREMENTS_COUNT]
            req_set = set(req_list)
        
        # Remove any exact requirement lines from description
        cleaned = [ln for ln in cleaned if ln.strip() not in req_set]
        
        # Clean up requirements (remove bullets, strip, dedupe)
        reqs = list(dict.fromkeys([
            r.strip(" -*•·.")
            for r in reqs
            if r.strip()
        ]))
        
        # Clean the final description
        from .utils import ExtractionUtils
        clean_desc = ExtractionUtils.clean_text("\n".join(cleaned))
        
        logger.debug("Splitting complete", extra={
            "clean_description_length": len(clean_desc),
            "requirements_count": len(reqs)
        })
        
        return clean_desc, reqs
