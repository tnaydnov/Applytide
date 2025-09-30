from __future__ import annotations
import re
import logging
from typing import Dict, Any, Optional, List
from .ports import (
    MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor,
    LLMExtractor, RequirementStripper
)
import json as _json

logger = logging.getLogger(__name__)


class JobExtractionService:
    """
    Orchestrates job extraction: DOM hints → structured data → main text → (optional) LLM →
    requirement cleanup. Never throws on best-effort branches; returns a complete dict.
    """
    def __init__(
        self,
        *,
        main_content: MainContentExtractor,
        structured: StructuredDataExtractor,
        title_company: TitleCompanyExtractor,
        llm: Optional[LLMExtractor] = None,
        req_splitter: Optional[RequirementStripper] = None,
    ):
        self.main_content = main_content
        self.structured = structured
        self.title_company = title_company
        self.llm = llm
        self.req_splitter = req_splitter or _DefaultRequirementStripper()

    @staticmethod
    def _validate_job_content(job: Dict[str, Any], context: str = "") -> None:
        """Validate that extracted job has meaningful content."""
        title = (job.get("title") or "").strip()
        company = (job.get("company_name") or "").strip()
        description = (job.get("description") or "").strip()
        
        if not title and not company:
            raise ValueError(f"Job extraction failed - no title or company found{' (' + context + ')' if context else ''}")
        
        if len(description) < 10:  # Very short descriptions are likely extraction failures
            logger.warning(f"Job extraction produced very short description: {len(description)} chars{' (' + context + ')' if context else ''}")
        
        logger.info(f"Job validation passed{' (' + context + ')' if context else ''}: title='{title[:50]}...', company='{company}', desc_len={len(description)}")

    @staticmethod
    def _clean_text(s: str) -> str:
        s = s or ""
        s = s.replace("\u00A0", " ")
        s = re.sub(r"[ \t]+\n", "\n", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip()

    @staticmethod
    def _extract_remote_type(text: str, *candidates: str) -> str:
        blob = " ".join([c or "" for c in candidates] + [text or ""]).lower()
        if any(w in blob for w in ["hybrid", "partial remote"]): return "Hybrid"
        if any(w in blob for w in ["telecommute", "remote", "work from home", "wfh"]): return "Remote"
        if any(w in blob for w in ["on-site", "onsite", "on site", "in office", "in-office"]): return "On-site"
        return ""

    @staticmethod
    def _extract_location_freeform(text: str) -> str:
        if not text:
            return ""
        m = re.search(r"(?:^|\n)\s*Location\s*:\s*([^\n]{2,90})", text, flags=re.I)
        if m:
            val = m.group(1).strip(" .,\t")
            val = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", val, flags=re.I)
            return val
        head = text[:5000]
        lines = [ln.strip() for ln in head.split("\n") if ln.strip()]
        city_like = re.compile(
            r"^[A-Z][A-Za-z .'’\-()]+,\s*[A-Z][A-Za-z .'’\-()]+(?:,\s*[A-Z][A-Za-z .'’\-()]+)?(?:\s*\((?:Remote|Hybrid|On-?site)\))?$"
        )
        for ln in lines[:80]:
            if len(ln) <= 90 and city_like.match(ln):
                if not re.search(r"(job|engineer|developer|senior|full\-?time)", ln, flags=re.I):
                    ln = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", ln, flags=re.I)
                    return ln.strip(" .,")
        return ""

    def _iter_jsonld_items(self, arr: List[Dict[str, Any]]):
        # Flatten top-level objects and @graph arrays
        for obj in arr or []:
            if not isinstance(obj, dict):
                continue
            graph = obj.get('@graph') or obj.get('graph')
            if isinstance(graph, list):
                for g in graph:
                    if isinstance(g, dict):
                        yield g
            else:
                yield obj

    def _is_type(self, obj: Dict[str, Any], name: str) -> bool:
        t = obj.get('@type') or obj.get('type') or ''
        if isinstance(t, list):
            t = [str(x).lower() for x in t]
            return any(name in x for x in t)
        return name in str(t).lower()

    def _find_job_from_jsonld(self, arr: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        for obj in self._iter_jsonld_items(arr):
            if self._is_type(obj, 'jobposting'):
                return obj
        return None

    def _map_job_jsonld(self, obj: Dict[str, Any], url: str) -> Dict[str, Any]:
        if not obj:
            return {}
        def pick(src, *keys, default=""):
            for k in keys:
                if k in src and src[k]:
                    return src[k]
            return default

        title = pick(obj, 'title','name','headline')
        org = pick(obj, 'hiringOrganization','hiringorganization')
        if isinstance(org, dict):
            company = pick(org, 'name')
        else:
            company = org or ''

        job_type = pick(obj, 'employmentType','employmenttype')
        desc = pick(obj, 'description')

        # jobLocation may be dict or list
        jl = pick(obj, 'jobLocation','joblocation', default=[])
        jl_list = jl if isinstance(jl, list) else ([jl] if jl else [])
        locations = []
        for place in jl_list:
            if not isinstance(place, dict):
                continue
            addr = place.get('address') or {}
            if isinstance(addr, dict):
                city = addr.get('addressLocality') or ''
                reg  = addr.get('addressRegion') or ''
                ctry = addr.get('addressCountry')
                if isinstance(ctry, dict):
                    ctry = ctry.get('name') or ctry.get('identifier') or ''
                loc = ", ".join([x for x in [city, reg, ctry] if x])
                if loc:
                    locations.append(loc)
            elif isinstance(addr, str):
                locations.append(addr.strip())
        location = locations[0] if locations else ""

        # Remote / hybrid from schema
        jlt = (pick(obj, 'jobLocationType','joblocationtype') or '').upper().strip()
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
            "description": self._clean_text(desc or ''),
            "requirements": [],
            "skills": []
        }

    def extract_job(
        self,
        *,
        url: str,
        html: str,
        hints: Optional[Dict[str, Any]] = None,
        jsonld: Optional[List[Dict[str, Any]]] = None,
        readable: Optional[Dict[str, Any]] = None,
        metas: Optional[Dict[str, Any]] = None,
        xhr_logs: Optional[List[Dict[str, Any]]] = None,
        manual_text: Optional[str] = None,
        screenshot_data_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        hints = hints or {}
        
        # Debug logging to track all inputs
        logger.info(f"JobExtractionService.extract_job called with:")
        logger.info(f"  url={url}")
        logger.info(f"  html_len={len(html or '')}")
        logger.info(f"  manual_text_len={len(manual_text or '')}")
        logger.info(f"  screenshot_data_url_len={len(screenshot_data_url or '')}")
        logger.info(f"  jsonld items={len(jsonld or [])}")
        logger.info(f"  hints={list(hints.keys()) if hints else 'None'}")

        # Assisted modes take precedence - skip all HTML processing
        if manual_text and manual_text.strip():
            logger.info(f"MANUAL TEXT PATH: manual_text provided, length={len(manual_text)}")
            text = self._clean_text(manual_text)
            logger.info(f"Processing manual text extraction: {len(text)} chars")
            
            if not self.llm:
                logger.error("LLM service is not available for manual text extraction")
                raise ValueError("LLM service is not available - cannot extract job from text")
            
            llm_job = {}
            try:
                logger.info(f"Calling LLM extractor for manual text of {len(text)} chars")
                llm_job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
                logger.info(f"LLM extraction completed for manual text successfully")
            except Exception as e:
                logger.error(f"LLM extraction failed for manual text: {str(e)}")
                raise ValueError(f"Failed to extract job from text: {str(e)}")
            
            job_result = {
                "title": (llm_job.get("title") or hints.get("title") or "").strip(),
                "company_name": (llm_job.get("company_name") or hints.get("company_name") or "").strip(),
                "source_url": url,
                "location": (llm_job.get("location") or "").strip(),
                "remote_type": (llm_job.get("remote_type") or "").strip(),
                "job_type": (llm_job.get("job_type") or "").strip(),
                "description": self._clean_text(llm_job.get("description") or text),
                "requirements": [x.strip() for x in (llm_job.get("requirements") or []) if x and x.strip()],
                "skills": [x.strip() for x in (llm_job.get("skills") or []) if x and x.strip()],
            }
            
            logger.info(f"Manual text extraction completed, validating job content")
            self._validate_job_content(job_result, "manual text")
            logger.info(f"Manual text extraction validation passed, returning result")
            return job_result

        if screenshot_data_url:
            logger.info(f"Processing screenshot extraction")
            
            if not self.llm:
                raise ValueError("LLM service is not available - cannot extract job from screenshot")
            
            # Let the LLM do OCR+extraction from the image in one pass
            try:
                llm_job = self.llm.extract_job_from_image(url=url, data_url=screenshot_data_url, hints=hints) or {}
                logger.info(f"LLM extraction completed for screenshot")
                
                job_result = {
                    "title": (llm_job.get("title") or "").strip(),
                    "company_name": (llm_job.get("company_name") or "").strip(),
                    "source_url": url,
                    "location": (llm_job.get("location") or "").strip(),
                    "remote_type": (llm_job.get("remote_type") or "").strip(),
                    "job_type": (llm_job.get("job_type") or "").strip(),
                    "description": self._clean_text(llm_job.get("description") or ""),
                    "requirements": [x.strip() for x in (llm_job.get("requirements") or []) if x and x.strip()],
                    "skills": [x.strip() for x in (llm_job.get("skills") or []) if x and x.strip()],
                }
                
                self._validate_job_content(job_result, "screenshot")
                return job_result
            except ValueError:
                raise  # Re-raise validation errors
            except Exception as e:
                logger.error(f"LLM extraction failed for screenshot: {str(e)}")
                raise ValueError(f"Failed to extract job from screenshot: {str(e)}")

        # Regular extraction mode - only process HTML if we have meaningful content
        logger.info(f"HTML PROCESSING PATH: manual_text was empty or None, proceeding with HTML processing")
        if not html or len(html.strip()) < 50:
            logger.warning(f"Empty or minimal HTML provided for regular extraction: {len(html or '')} chars")
            raise ValueError("No content available for extraction - please try text selection or screenshot instead")

        # 0) Quick DOM hints
        t_c = {}
        try:
            t_c = self.title_company.extract(html) or {}
        except Exception:
            t_c = {}

        # 1) Structured data
        mapped: Dict[str, Any] = {}
        jd = self._find_job_from_jsonld(jsonld or [])
        if jd:
            mapped = self._map_job_jsonld(jd, url)
        else:
            # fall back to server-side structured extraction
            try:
                obj = self.structured.find_job(html, url)
                if obj:
                    mapped = self.structured.map_job(obj, url) or {}
            except Exception:
                mapped = {}

        readable_title = ""
        readable_site  = ""
        # 2) Main content text (for LLM and fallback)
        try:
            if readable and isinstance(readable, dict):
                readable_title = (readable.get('title') or '').strip()
                readable_site  = (readable.get('siteName') or '').strip()
                # Prefer Readability's textContent, else strip tags from 'content'
                main_text = readable.get('textContent') or ''
                if not main_text and readable.get('content'):
                    main_text = self._clean_text(re.sub(r"<[^>]+>", "", readable['content']))
            else:
                main_text = self.main_content.extract(html)
        except Exception as e:
            logger.warning(f"Failed to extract main content from HTML: {str(e)}")
            main_text = ""

            
        if not main_text and xhr_logs:
            try:
                for entry in xhr_logs:
                    body = entry.get('body') or ''
                    if not body:
                        continue
                    text_candidate = ""
                    # Try JSON parse
                    try:
                        j = _json.loads(body)
                        # walk shallowly for common fields
                        keys = ['jobDescription','description','job_desc','content','responsibilities','qualifications']
                        for k in keys:
                            if isinstance(j, dict) and k in j and isinstance(j[k], str):
                                text_candidate = j[k]
                                break
                        # Sometimes nested one level
                        if not text_candidate and isinstance(j, dict):
                            for v in j.values():
                                if isinstance(v, dict):
                                    for k in keys:
                                        if k in v and isinstance(v[k], str):
                                            text_candidate = v[k]; break
                                if text_candidate: break
                    except Exception:
                        pass
                    # Fallback: as-is text
                    if not text_candidate:
                        text_candidate = body

                    if ('job' in text_candidate.lower() and 'description' in text_candidate.lower()) or ('responsibilit' in text_candidate.lower()):
                        txt = re.sub(r'<[^>]+>', ' ', text_candidate)
                        if len(txt) > 800:
                            main_text = self._clean_text(txt)
                            break
            except Exception:
                pass


        # 3) Fallbacks from raw text
        raw_text = self._clean_text(re.sub(r"<[^>]+>", "", html or ""))
        loc_fallback = self._extract_location_freeform(raw_text)
        rem_fallback = self._extract_remote_type(main_text, hints.get("remote_type", ""), mapped.get("remote_type", ""))

        # 4) Build LLM hints
        llm_hints = {
            "title": t_c.get("title") or mapped.get("title") or "",
            "company_name": t_c.get("company_name") or mapped.get("company_name") or "",
            "location": loc_fallback or mapped.get("location") or "",
            "remote_type": rem_fallback or "",
            "job_type": mapped.get("job_type") or "",
        }
        llm_hints.update({k: v for k, v in hints.items() if v})

        # 5) Ask LLM (optional)
        llm_job: Dict[str, Any] = {}
        if self.llm and main_text.strip():
            try:
                logger.info(f"Processing regular extraction with LLM: {len(main_text)} chars")
                llm_job = self.llm.extract_job(url=url, text=main_text, hints=llm_hints) or {}
                logger.info(f"LLM extraction completed for regular extraction")
            except Exception as e:
                logger.warning(f"LLM extraction failed for regular extraction: {str(e)}")
                llm_job = {}  # For regular extraction, we can fall back to structured data

        # 6) Merge best fields
        description = (llm_job.get("description") or "").strip() or main_text
        requirements = llm_job.get("requirements") or []
        skills = llm_job.get("skills") or []

        # 7) Strip requirement-like content from description
        try:
            description, extra_reqs = self.req_splitter.split(description, requirements)
            requirements = list(dict.fromkeys((requirements or []) + (extra_reqs or [])))
            req_set = {r.strip() for r in requirements}
            if description:
                description = "\n".join([ln for ln in description.split("\n") if ln.strip() not in req_set])
        except Exception:
            pass

        final_result = {
            "title": (llm_job.get("title") or mapped.get("title") or t_c.get("title") or readable_title or "").strip(),
            "company_name": (llm_job.get("company_name") or mapped.get("company_name") or t_c.get("company_name") or readable_site or "").strip(),
            "source_url": url,
            "location": (llm_job.get("location") or mapped.get("location") or loc_fallback or "").strip(),
            "remote_type": (llm_job.get("remote_type") or rem_fallback or "").strip(),
            "job_type": (llm_job.get("job_type") or mapped.get("job_type") or "").strip(),
            "description": self._clean_text(description),
            "requirements": [x.strip() for x in (requirements or []) if x and x.strip()],
            "skills": [x.strip() for x in (skills or []) if x and x.strip()],
        }
        
        # For regular extraction, we're more lenient but still log issues
        try:
            self._validate_job_content(final_result, "regular extraction")
        except ValueError as e:
            logger.warning(f"Regular extraction produced minimal content: {str(e)}")
            # Don't fail for regular extraction, but warn
        
        return final_result

# --- default requirement stripper (regex-based, safe fallback) ---
_REQ_HEADER_RE = re.compile(
    r"^\s*(requirements|qualifications|about you|what you(?:'|’)ll need|what we(?:'|’)re looking for|must have|nice to have|skills|required skills|preferred qualifications)\s*:?\s*$",
    re.I
)
_BULLET_RE = re.compile(r"^\s*(?:[-–—•·\*]|\d{1,2}[.)])\s*(.+)$")
_TECH_TOKEN = re.compile(
    r"\b(aws|gcp|azure|kubernetes|docker|python|java|go|rust|node\.?js|react|redis|postgres|elasticsearch|kafka|spark|linux|microservices|sql|nosql|mongodb|snowflake|terraform)\b",
    re.I
)

class _DefaultRequirementStripper(RequirementStripper):
    def split(self, description: str, existing_reqs: Optional[List[str]] = None) -> tuple[str, List[str]]:
        if not description:
            return "", list(existing_reqs or [])

        reqs = list(existing_reqs or [])
        lines = description.split("\n")
        cleaned: List[str] = []
        in_reqs = False

        for ln in lines:
            raw = ln
            s = ln.strip()

            if _REQ_HEADER_RE.match(s):
                in_reqs = True
                continue

            if in_reqs:
                m = _BULLET_RE.match(s)
                if m:
                    item = m.group(1).strip().rstrip(".")
                    if item:
                        reqs.append(item)
                    continue
                if not s:
                    continue
                if len(s) <= 160 and (_TECH_TOKEN.search(s) or re.search(r"(years|experience|degree|proficien|hands-on|familiar|understanding)\b", s, re.I)):
                    reqs.append(s.rstrip("."))
                    continue
                in_reqs = False

            cleaned.append(raw)

        req_set = {r.strip() for r in reqs if r and r.strip()}
        cleaned = [ln for ln in cleaned if ln.strip() not in req_set]
        reqs = list(dict.fromkeys([r.strip(" -*•·.") for r in reqs if r.strip()]))

        return JobExtractionService._clean_text("\n".join(cleaned)), reqs
