"""
JSON-LD structured data extraction.

This module handles extraction and mapping of JSON-LD JobPosting structured data
as well as hint extraction from raw pasted text.

Features:
- JSON-LD JobPosting detection and parsing
- Nested @graph structure flattening
- Hint extraction from raw text patterns (LinkedIn, job boards)
- Address parsing from jobLocation
- Remote type detection from jobLocationType

Supported Patterns:
- "Company · Location (Remote/Hybrid)"
- "Save Job Title at Company"
- Job type keywords (Full-time, Part-time, Contract, Internship)
- Standalone title lines repeated before company name
"""
from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Generator
from .utils import ExtractionUtils
from .....infra.logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MAX_JSONLD_DEPTH = 3  # Maximum nesting depth to search
MAX_TITLE_LENGTH = 200  # Maximum title length
MAX_COMPANY_LENGTH = 200  # Maximum company name length
MAX_LOCATION_LENGTH = 300  # Maximum location string length


class JSONLDExtractor:
    """
    Extracts and maps JSON-LD JobPosting structured data.
    
    This class handles both JSON-LD parsing and hint extraction from raw text,
    providing a unified interface for structured data extraction.
    
    Attributes:
        utils: Utility functions for text processing
    """
    
    def __init__(self, utils: ExtractionUtils):
        """
        Initialize JSON-LD extractor.
        
        Args:
            utils: Utility functions instance
        """
        self.utils = utils
        logger.debug("JSONLDExtractor initialized")
    
    def iter_jsonld_items(self, arr: List[Dict[str, Any]]) -> Generator[Dict[str, Any], None, None]:
        """
        Flatten nested JSON-LD structures.
        
        Handles both top-level objects and @graph arrays.
        
        Args:
            arr: List of JSON-LD objects
            
        Yields:
            Individual JSON-LD items
        """
        for obj in arr or []:
            if not isinstance(obj, dict):
                continue
            
            # Check for @graph or graph arrays (nested structures)
            graph = obj.get('@graph') or obj.get('graph')
            if isinstance(graph, list):
                for g in graph:
                    if isinstance(g, dict):
                        yield g
            else:
                yield obj
    
    def hints_from_raw_paste(self, raw: str) -> Dict[str, str]:
        """
        Extract hints from raw pasted text.
        
        Common patterns:
        - "Company · Location (Remote)"
        - "Save Job Title at Company"
        - Job type keywords (Full-time, Part-time, etc.)
        
        Args:
            raw: Raw pasted text
            
        Returns:
            Dictionary of extracted hints (title, company_name, location, remote_type, job_type)
        """
        out: Dict[str, str] = {}
        if not raw:
            return out
        
        s = self.utils.clean_text(raw)
        
        # Pattern: "Company · Location (Hybrid/Remote)"
        m = re.search(
            r"^\s*([A-Z][^\n]{1,80}?)\s*·\s*([^\n(]{2,120}?)"
            r"(?:\s*\((Remote|Hybrid|On-?site)\))?\s*$",
            s,
            re.I | re.M
        )
        if m:
            out["company_name"] = m.group(1).strip()
            out["location"] = m.group(2).strip()
            rt = (m.group(3) or "").lower()
            if "hybrid" in rt:
                out["remote_type"] = "Hybrid"
            elif "remote" in rt:
                out["remote_type"] = "Remote"
            elif "on" in rt:
                out["remote_type"] = "On-site"
        
        # Pattern: "Save Job Title at Company"
        cm = out.get("company_name", "")
        if cm:
            m2 = re.search(rf"Save\s+(.{{2,80}}?)\s+at\s+{re.escape(cm)}", s, re.I)
            if m2:
                out["title"] = m2.group(1).strip()
        
        # Standalone title lines (repeated before company)
        if "title" not in out:
            pattern = r"^\s*([A-Z][A-Za-z0-9 /&+\-]{2,80})\s*$\s*^\s*"
            if cm:
                pattern += re.escape(cm)
            else:
                pattern += r"[A-Z]"
            
            m3 = re.search(pattern, s, re.M)
            if m3:
                out["title"] = m3.group(1).strip()
        
        # Job type from keywords
        if re.search(r"\bFull-?time\b", s, re.I):
            out.setdefault("job_type", "Full-time")
        elif re.search(r"\bPart-?time\b", s, re.I):
            out.setdefault("job_type", "Part-time")
        elif re.search(r"\bContract\b", s, re.I):
            out.setdefault("job_type", "Contract")
        elif re.search(r"\bIntern(ship|)\b", s, re.I):
            out.setdefault("job_type", "Internship")
        
        # Remote type fallback
        if "remote_type" not in out:
            if re.search(r"\bHybrid\b", s, re.I):
                out["remote_type"] = "Hybrid"
            elif re.search(r"\bRemote\b", s, re.I):
                out["remote_type"] = "Remote"
            elif re.search(r"\bOn[- ]?site\b", s, re.I):
                out["remote_type"] = "On-site"
        
        return out
    
    @staticmethod
    def is_type(obj: Dict[str, Any], name: str) -> bool:
        """
        Check if JSON-LD object is of given type.
        
        Handles both string and list @type/@type values.
        
        Args:
            obj: JSON-LD object
            name: Type name to check (e.g., "jobposting")
            
        Returns:
            True if object is of given type
        """
        t = obj.get('@type') or obj.get('type') or ''
        
        if isinstance(t, list):
            t = [str(x).lower() for x in t]
            return any(name in x for x in t)
        
        return name in str(t).lower()
    
    def find_job_from_jsonld(self, arr: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Find JobPosting object in JSON-LD array.
        
        Args:
            arr: List of JSON-LD objects
            
        Returns:
            JobPosting object if found, None otherwise
        """
        for obj in self.iter_jsonld_items(arr):
            if self.is_type(obj, 'jobposting'):
                return obj
        return None
    
    def map_job_jsonld(self, obj: Dict[str, Any], url: str) -> Dict[str, Any]:
        """
        Map JSON-LD JobPosting to internal job format.
        
        Extracts:
        - title (from title/name/headline)
        - company_name (from hiringOrganization.name)
        - location (from jobLocation.address)
        - remote_type (from jobLocationType)
        - job_type (from employmentType)
        - description
        
        Args:
            obj: JSON-LD JobPosting object
            url: Source URL
            
        Returns:
            Dictionary in internal job format
        """
        if not obj:
            return {}
        
        def pick(src, *keys, default=""):
            """Pick first non-empty value from source dict."""
            for k in keys:
                if k in src and src[k]:
                    return src[k]
            return default
        
        # Extract title
        title = pick(obj, 'title', 'name', 'headline')
        
        # Extract company from hiringOrganization
        org = pick(obj, 'hiringOrganization', 'hiringorganization')
        if isinstance(org, dict):
            company = pick(org, 'name')
        else:
            company = org or ''
        
        # Extract job type
        job_type = pick(obj, 'employmentType', 'employmenttype')
        
        # Extract description
        desc = pick(obj, 'description')
        
        # Extract location from jobLocation
        jl = pick(obj, 'jobLocation', 'joblocation', default=[])
        jl_list = jl if isinstance(jl, list) else ([jl] if jl else [])
        
        locations = []
        for place in jl_list:
            if not isinstance(place, dict):
                continue
            
            addr = place.get('address') or {}
            if isinstance(addr, dict):
                city = addr.get('addressLocality') or ''
                reg = addr.get('addressRegion') or ''
                ctry = addr.get('addressCountry')
                
                # Country can be dict or string
                if isinstance(ctry, dict):
                    ctry = ctry.get('name') or ctry.get('identifier') or ''
                
                # Combine: "City, Region, Country"
                loc = ", ".join([x for x in [city, reg, ctry] if x])
                if loc:
                    locations.append(loc)
            elif isinstance(addr, str):
                locations.append(addr.strip())
        
        location = locations[0] if locations else ""
        
        # Extract remote type from jobLocationType
        jlt = (pick(obj, 'jobLocationType', 'joblocationtype') or '').upper().strip()
        remote_type = ""
        if 'TELECOMMUTE' in jlt:
            remote_type = "Remote"
        
        return {
            "title": (title or '').strip(),
            "company_name": (company or '').strip(),
            "source_url": url,
            "location": (location or '').strip(),
            "remote_type": remote_type,
            "job_type": (job_type or '').strip(),
            "description": self.utils.clean_text(desc or ''),
            "requirements": [],
            "skills": []
        }
