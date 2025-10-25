"""Main extraction orchestration logic."""
from __future__ import annotations
from typing import Dict, Any, List, Optional
from .utils import ExtractionUtils
from .jsonld import JSONLDExtractor
from .requirements import RequirementSplitter
from .llm import LLMExtractionHandler
from .dom import DOMExtractionHandler
from .....infra.logging import get_logger
import re

logger = get_logger(__name__)


class ExtractionOrchestrator:
    """Orchestrates job extraction from multiple sources with fallback strategies."""
    
    def __init__(
        self,
        utils: ExtractionUtils,
        jsonld: JSONLDExtractor,
        requirements: RequirementSplitter,
        llm: LLMExtractionHandler,
        dom: DOMExtractionHandler
    ):
        self.utils = utils
        self.jsonld = jsonld
        self.requirements = requirements
        self.llm = llm
        self.dom = dom
    
    def extract_job(
        self,
        url: str,
        html: str,
        hints: Optional[Dict[str, Any]] = None,
        jsonld: Optional[List[Dict[str, Any]]] = None,
        readable: Optional[Dict[str, Any]] = None,
        metas: Optional[Dict[str, Any]] = None,
        xhr_logs: Optional[List[Dict[str, Any]]] = None,
        manual_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main extraction entry point.
        
        Routes between manual text path (LLM-first) and HTML path (DOM + structured data + LLM).
        
        Args:
            url: Source URL
            html: HTML content
            hints: Optional hints (title, company, location, remote_type, job_type)
            jsonld: Optional JSON-LD structured data
            readable: Optional Readability.parse() result
            metas: Optional meta tags
            xhr_logs: Optional XHR response logs
            manual_text: Optional manually pasted text (triggers LLM-first path)
            
        Returns:
            Dictionary with extracted job fields
            
        Raises:
            ValueError: If content is insufficient or extraction fails
        """
        logger.info("Job extraction started", extra={
            "url": url[:150] if url else None,
            "html_length": len(html or ''),
            "manual_text_length": len(manual_text or ''),
            "jsonld_items": len(jsonld or []),
            "has_readable": bool(readable),
            "has_hints": bool(hints),
            "llm_available": self.llm.is_available()
        })
        
        hints = hints or {}
        
        # Route: Manual text path or HTML path
        if manual_text and manual_text.strip():
            return self._extract_via_manual_text(url, manual_text, hints)
        else:
            return self._extract_via_html(
                url, html, hints, jsonld, readable, metas, xhr_logs
            )
    
    def _extract_via_manual_text(
        self,
        url: str,
        manual_text: str,
        hints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract job from manually pasted text using LLM.
        
        Strategy: Clean text → Extract hints → LLM extraction → Regex requirement split → Merge
        
        Args:
            url: Source URL
            manual_text: Raw pasted text
            hints: Optional hints
            
        Returns:
            Extracted job dictionary
            
        Raises:
            ValueError: If LLM is unavailable or extraction fails
        """
        logger.info("Using manual text extraction path", extra={
            "text_length": len(manual_text),
            "stripped_length": len(manual_text.strip())
        })
        
        if not self.llm.is_available():
            logger.error("LLM service not available for manual text extraction")
            raise ValueError("LLM service is not available - cannot extract job from text")
        
        logger.debug("Starting manual text LLM extraction")
        
        try:
            # Clean and extract hints from raw paste
            full_raw = self.utils.clean_text(manual_text)
            derived = self.jsonld.hints_from_raw_paste(full_raw)
            
            # Merge derived hints with provided hints
            for k, v in derived.items():
                if v and not hints.get(k):
                    hints[k] = v
            
            # Pre-clean noise (LinkedIn chrome, etc.)
            text = self.utils.preclean_noise(full_raw)
            
            # LLM extraction
            job = self.llm.extract_from_text(url=url, text=text, hints=hints)
            
            logger.info("LLM extraction completed successfully", extra={
                "title": job.get('title', '')[:50],
                "company": job.get('company_name', ''),
                "description_length": len(job.get('description', '')),
                "requirements_count": len(job.get('requirements', [])),
                "skills_count": len(job.get('skills', []))
            })
            
            # TRUST LLM COMPLETELY - no post-processing for manual text path
            # The LLM (gpt-4.1-mini) with our detailed prompt is better at:
            # - Extracting requirements vs nice-to-haves
            # - Removing requirement lines from description
            # - Preserving section headers correctly
            # - Avoiding duplicate extractions
            
            # Build final result using LLM output directly
            result = {
                "title": (job.get("title") or hints.get("title") or "").strip(),
                "company_name": (job.get("company_name") or hints.get("company_name") or "").strip(),
                "source_url": url,
                "location": (job.get("location") or hints.get("location") or "").strip(),
                "remote_type": (job.get("remote_type") or hints.get("remote_type") or "").strip(),
                "job_type": (job.get("job_type") or hints.get("job_type") or "").strip(),
                "description": job.get("description", "").strip(),  # Use LLM's cleaned description
                "requirements": [x.strip() for x in (job.get("requirements") or []) if x and x.strip()],
                "skills": [x.strip() for x in (job.get("skills") or []) if x and x.strip()],
            }
            
            logger.info("Manual text extraction completed successfully", extra={
                "title": result["title"][:50] if result["title"] else None,
                "company": result["company_name"]
            })
            
            return result
        
        except Exception as e:
            logger.error("Manual text extraction failed", extra={
                "error": str(e),
                "error_type": type(e).__name__
            }, exc_info=True)
            raise ValueError(f"Failed to extract job from text: {str(e)}")
    
    def _extract_via_html(
        self,
        url: str,
        html: str,
        hints: Dict[str, Any],
        jsonld_data: Optional[List[Dict[str, Any]]],
        readable: Optional[Dict[str, Any]],
        metas: Optional[Dict[str, Any]],
        xhr_logs: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Extract job from HTML using DOM + structured data + LLM.
        
        Strategy: DOM hints → JSON-LD → Main content → XHR fallback → LLM enhancement → Merge
        
        Args:
            url: Source URL
            html: HTML content
            hints: Optional hints
            jsonld_data: Optional JSON-LD structured data
            readable: Optional Readability result
            metas: Optional meta tags
            xhr_logs: Optional XHR logs
            
        Returns:
            Extracted job dictionary
            
        Raises:
            ValueError: If HTML content is insufficient
        """
        logger.info("Using HTML processing path", extra={
            "html_length": len(html or '')
        })
        
        if not html or len(html.strip()) < 50:
            logger.error("Insufficient HTML content", extra={
                "html_length": len(html or '')
            })
            raise ValueError(
                "No content available for extraction - please try text selection instead"
            )
        
        logger.debug("HTML validation passed, starting extraction")
        
        # Phase 0: DOM hints (title/company)
        logger.debug("Phase 0: Extracting title/company from DOM")
        t_c = self.dom.extract_title_company(html)
        
        # Phase 1: Structured data (JSON-LD)
        logger.debug("Phase 1: Starting structured data extraction")
        mapped = self._extract_structured_data(url, html, jsonld_data)
        
        # Phase 2: Main content text
        logger.debug("Phase 2: Main content text extraction")
        main_text, readable_title, readable_site = self.dom.extract_main_content(
            html, readable
        )
        
        # Fallback: XHR logs
        if not main_text and xhr_logs:
            main_text = self.dom.extract_from_xhr_logs(xhr_logs)
        
        # Pre-clean noise
        logger.debug("Pre-cleaning main text noise")
        main_text = self.utils.preclean_noise(main_text)
        logger.debug("Main text after pre-clean", extra={
            "text_length": len(main_text)
        })
        
        # Phase 3: Fallbacks from raw text
        logger.debug("Phase 3: Extracting location and remote type")
        raw_text = self.utils.clean_text(re.sub(r"<[^>]+>", "", html or ""))
        logger.debug("Raw text length", extra={"length": len(raw_text)})
        
        loc_fallback = self.utils.extract_location_freeform(raw_text)
        logger.debug("Location fallback extracted", extra={"location": loc_fallback})
        
        rem_fallback = self.utils.extract_remote_type(
            main_text,
            hints.get("remote_type", ""),
            mapped.get("remote_type", "")
        )
        logger.debug("Remote type fallback extracted", extra={
            "remote_type": rem_fallback
        })
        
        # Phase 4: Build LLM hints
        logger.debug("Phase 4: Building LLM hints")
        llm_hints = {
            "title": t_c.get("title") or mapped.get("title") or "",
            "company_name": t_c.get("company_name") or mapped.get("company_name") or "",
            "location": loc_fallback or mapped.get("location") or "",
            "remote_type": rem_fallback or "",
            "job_type": mapped.get("job_type") or "",
        }
        llm_hints.update({k: v for k, v in hints.items() if v})
        logger.debug("LLM hints prepared", extra={"hints": llm_hints})
        
        # Phase 5: LLM extraction (optional)
        logger.debug("Phase 5: LLM extraction (optional)")
        llm_job = self._extract_with_llm(url, main_text, llm_hints)
        
        # Phase 6-7: Description and requirements processing
        logger.debug("Phase 6-7: Description and requirements processing")
        description, requirements, skills = self._process_description_and_requirements(
            main_text, llm_job
        )
        
        # Phase 8: Merge all sources
        logger.debug("Phase 8: Final result assembly")
        final_result = self._merge_all_sources(
            url=url,
            llm_job=llm_job,
            mapped=mapped,
            t_c=t_c,
            readable_title=readable_title,
            readable_site=readable_site,
            loc_fallback=loc_fallback,
            rem_fallback=rem_fallback,
            description=description,
            requirements=requirements,
            skills=skills
        )
        
        logger.debug("Final result assembled", extra={
            "title": final_result['title'],
            "company_name": final_result['company_name'],
            "location": final_result['location'],
            "remote_type": final_result['remote_type'],
            "job_type": final_result['job_type'],
            "description_length": len(final_result['description']),
            "requirements_count": len(final_result['requirements']),
            "skills_count": len(final_result['skills'])
        })
        
        # Validate result (warnings only for regular extraction)
        logger.debug("Validating result")
        try:
            self.utils.validate_job_content(final_result, "regular extraction")
            logger.debug("Validation passed")
        except ValueError as e:
            logger.warning(f"Regular extraction produced minimal content: {str(e)}")
        
        logger.info("Extraction service completed successfully", extra={
            "title": final_result['title'],
            "company": final_result['company_name']
        })
        
        return final_result
    
    def _extract_structured_data(
        self,
        url: str,
        html: str,
        jsonld_data: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Extract structured data from JSON-LD or server-side extraction.
        
        Args:
            url: Source URL
            html: HTML content
            jsonld_data: Optional JSON-LD data
            
        Returns:
            Mapped job dictionary
        """
        logger.debug("Looking for JSON-LD JobPosting...")
        
        # Try JSON-LD first
        jd = self.jsonld.find_job_from_jsonld(jsonld_data or [])
        if jd:
            mapped = self.jsonld.map_job_jsonld(jd, url)
            logger.debug("Found JSON-LD JobPosting", extra={
                "title": mapped.get('title'),
                "company_name": mapped.get('company_name'),
                "location": mapped.get('location'),
                "remote_type": mapped.get('remote_type'),
                "job_type": mapped.get('job_type')
            })
            return mapped
        
        # Fallback: Server-side structured extraction
        logger.debug("No JSON-LD JobPosting found, trying server-side structured extraction...")
        try:
            obj = self.dom.structured.find_job(html, url)
            if obj:
                logger.debug("Server-side structured data found")
                mapped = self.dom.structured.map_job(obj, url) or {}
                logger.debug("Mapped structured data", extra={
                    "mapped_keys": list(mapped.keys())
                })
                return mapped
            else:
                logger.debug("No server-side structured data found")
        except Exception as e:
            logger.warning("Server-side structured extraction failed", extra={
                "error": str(e)
            })
        
        return {}
    
    def _extract_with_llm(
        self,
        url: str,
        text: str,
        hints: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Extract job using LLM (optional enhancement).
        
        Args:
            url: Source URL
            text: Main content text
            hints: Hints from DOM/structured data
            
        Returns:
            LLM extraction result (may be empty)
        """
        if not self.llm.is_available() or not text.strip():
            logger.debug("Skipping LLM extraction", extra={
                "llm_available": self.llm.is_available(),
                "has_text": bool(text.strip())
            })
            return {}
        
        logger.debug("Calling LLM extractor")
        
        try:
            import time
            logger.info(f"Processing regular extraction with LLM: {len(text)} chars")
            llm_start = time.time()
            
            llm_job = self.llm.enhance_extraction(url, text, hints)
            
            llm_time = time.time() - llm_start
            logger.info("LLM extraction completed for regular extraction", extra={
                "duration": f"{llm_time:.2f}s",
                "title": llm_job.get('title'),
                "company_name": llm_job.get('company_name'),
                "location": llm_job.get('location'),
                "remote_type": llm_job.get('remote_type'),
                "job_type": llm_job.get('job_type'),
                "requirements_count": len(llm_job.get('requirements', [])),
                "skills_count": len(llm_job.get('skills', []))
            })
            
            return llm_job
        
        except Exception as e:
            logger.warning(f"LLM extraction failed for regular extraction: {str(e)}")
            return {}
    
    def _process_description_and_requirements(
        self,
        main_text: str,
        llm_job: Dict[str, Any]
    ) -> tuple[str, List[str], List[str]]:
        """
        Process description and requirements with fallback to regex splitter.
        
        Args:
            main_text: Main content text
            llm_job: LLM extraction result
            
        Returns:
            Tuple of (description, requirements, skills)
        """
        logger.debug("Phase 6: Description processing")
        
        # Check if LLM successfully extracted description
        llm_succeeded = self.llm.has_valid_description(llm_job)
        
        if llm_succeeded:
            # Use LLM's cleaned description directly
            description = self.utils.clean_text(llm_job.get("description"))
            logger.debug("Using LLM-extracted description", extra={
                "length": len(description)
            })
            requirements = llm_job.get("requirements") or []
            skills = llm_job.get("skills") or []
            logger.debug("Using LLM results directly - NO post-processing")
        else:
            # Fallback: Use regex splitter
            logger.debug("Using raw main_text as description (LLM didn't provide)", extra={
                "length": len(main_text)
            })
            logger.debug("Phase 7: Running regex requirement splitter as fallback")
            
            try:
                desc_raw = self.utils.clean_text(main_text)
                description, extra_reqs = self.requirements.split(
                    desc_raw,
                    llm_job.get("requirements") or []
                )
                logger.debug("Splitter results", extra={
                    "extra_requirements": len(extra_reqs)
                })
                
                requirements = list(dict.fromkeys(
                    (llm_job.get("requirements") or []) + (extra_reqs or [])
                ))
                logger.debug("Total requirements after merge", extra={
                    "count": len(requirements)
                })
                
                # Remove requirement lines from description
                req_set = {r.strip() for r in requirements}
                if description:
                    description = "\n".join([
                        ln for ln in description.split("\n")
                        if ln.strip() not in req_set
                    ])
                logger.debug("Final description length", extra={
                    "length": len(description)
                })
                
                skills = llm_job.get("skills") or []
            
            except Exception as e:
                logger.warning("Requirement splitting failed", extra={
                    "error": str(e)
                })
                description = self.utils.clean_text(main_text)
                requirements = []
                skills = []
        
        return description, requirements, skills
    
    def _merge_all_sources(
        self,
        url: str,
        llm_job: Dict[str, Any],
        mapped: Dict[str, Any],
        t_c: Dict[str, str],
        readable_title: str,
        readable_site: str,
        loc_fallback: str,
        rem_fallback: str,
        description: str,
        requirements: List[str],
        skills: List[str]
    ) -> Dict[str, Any]:
        """
        Merge all extraction sources with priority order.
        
        Priority: LLM > JSON-LD > DOM > Readability > Fallbacks
        
        Args:
            url: Source URL
            llm_job: LLM extraction result
            mapped: JSON-LD/structured data result
            t_c: DOM title/company hints
            readable_title: Readability title
            readable_site: Readability site name
            loc_fallback: Location fallback
            rem_fallback: Remote type fallback
            description: Processed description
            requirements: Processed requirements
            skills: Processed skills
            
        Returns:
            Final merged result
        """
        return {
            "title": (
                llm_job.get("title")
                or mapped.get("title")
                or t_c.get("title")
                or readable_title
                or ""
            ).strip(),
            "company_name": (
                llm_job.get("company_name")
                or mapped.get("company_name")
                or t_c.get("company_name")
                or readable_site
                or ""
            ).strip(),
            "source_url": url,
            "location": (
                llm_job.get("location")
                or mapped.get("location")
                or loc_fallback
                or ""
            ).strip(),
            "remote_type": (
                llm_job.get("remote_type")
                or rem_fallback
                or ""
            ).strip(),
            "job_type": (
                llm_job.get("job_type")
                or mapped.get("job_type")
                or ""
            ).strip(),
            "description": self.utils.clean_text(description),
            "requirements": [x.strip() for x in requirements if x and x.strip()],
            "skills": [x.strip() for x in skills if x and x.strip()],
        }
