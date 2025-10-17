"""Requirement extraction and splitting logic."""
from __future__ import annotations
import re
from typing import List, Optional, Tuple
from ..ports import RequirementStripper

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
    """
    
    def split(
        self, 
        description: str, 
        existing_reqs: Optional[List[str]] = None
    ) -> Tuple[str, List[str]]:
        """
        Split description into clean description + requirements.
        
        Args:
            description: Full job description text
            existing_reqs: Already extracted requirements (won't be duplicated)
            
        Returns:
            Tuple of (clean_description, requirements_list)
        """
        if not description:
            return "", list(existing_reqs or [])
        
        reqs = list(existing_reqs or [])
        lines = description.split("\n")
        cleaned: List[str] = []
        in_reqs = False
        
        for ln in lines:
            raw = ln
            s = ln.strip()
            
            # Check if we hit a STOP header (culture/benefits section)
            if _STOP_HEADER_RE.match(s):
                # Stop extracting requirements, keep everything else as description
                in_reqs = False
                cleaned.append(raw)
                continue
            
            # Check if we hit a requirement header
            if _REQ_HEADER_RE.match(s):
                in_reqs = True
                continue
            
            # If in requirements section, extract bullets/items
            if in_reqs:
                # Try to match bullet point
                m = _BULLET_RE.match(s)
                if m:
                    item = m.group(1).strip().rstrip(".")
                    if item:
                        reqs.append(item)
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
                    reqs.append(s.rstrip("."))
                    continue
                
                # Non-requirement line, exit requirements mode
                in_reqs = False
            
            # Keep line in description
            cleaned.append(raw)
        
        # Deduplicate requirements
        req_set = {r.strip() for r in reqs if r and r.strip()}
        
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
        
        return clean_desc, reqs
