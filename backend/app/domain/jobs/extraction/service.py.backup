from __future__ import annotations
import re
from typing import Dict, Any, Optional, List
from .ports import (
    MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor,
    LLMExtractor, RequirementStripper
)
import json as _json
from ....infra.logging import get_logger

logger = get_logger(__name__)


class JobExtractionService:
    """
    Orchestrates job extraction: DOM hints → structured data         if not main_text and xhr_logs:
            logger.debug("Main text empty, checking XHR logs", extra={"xhr_count": len(xhr_logs)})ain text → (optional) LLM →
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
    
    def _preclean_noise(self, text: str) -> str:
        """
        Remove obvious non-job UI chrome commonly copied from LinkedIn/ATS pages.
        Removes common UI noise lines but PRESERVES company information sections.
        """
        if not text:
            return ""

        s = text

        # DON'T cut off content at anchor points - this removes company overviews!
        # Company sections like "Company Overview", "About the Company", "About Us" 
        # often appear BEFORE "About the Role" and should be preserved.
        # The LLM is smart enough to filter out actual UI chrome.

        # Drop common UI/noise lines anywhere
        drop_line_res = [
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

        lines = s.splitlines()
        kept = []
        for ln in lines:
            if any(re.match(p, ln.strip(), flags=re.I) for p in drop_line_res):
                continue
            kept.append(ln)

        s = "\n".join(kept)
        s = self._clean_text(s)
        return s


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

    def _hints_from_raw_paste(self, raw: str) -> Dict[str, str]:
        out: Dict[str, str] = {}
        if not raw: return out
        s = self._clean_text(raw)

        # Pattern like: "Backline AI · Ramat Gan, Tel Aviv District, Israel (Hybrid)"
        m = re.search(r"^\s*([A-Z][^\n]{1,80}?)\s*·\s*([^\n(]{2,120}?)(?:\s*\((Remote|Hybrid|On-?site)\))?\s*$", s, re.I | re.M)
        if m:
            out["company_name"] = m.group(1).strip()
            out["location"] = m.group(2).strip()
            rt = (m.group(3) or "").lower()
            out["remote_type"] = "Hybrid" if "hybrid" in rt else "Remote" if "remote" in rt else "On-site" if "on" in rt else ""

        # “Save Senior Software Engineer at Backline AI”
        cm = out.get("company_name", "")
        if cm:
            m2 = re.search(rf"Save\s+(.{{2,80}}?)\s+at\s+{re.escape(cm)}", s, re.I)
            if m2:
                out["title"] = m2.group(1).strip()

        # Also pick up standalone title lines often repeated before the company dot-line
        if "title" not in out:
            m3 = re.search(r"^\s*([A-Z][A-Za-z0-9 /&+\-]{2,80})\s*$\s*^\s*" + (re.escape(cm) if cm else r"[A-Z]"),
                        s, re.M)
            if m3:
                out["title"] = m3.group(1).strip()

        # Job type from chrome lines
        if re.search(r"\bFull-?time\b", s, re.I): out.setdefault("job_type", "Full-time")
        elif re.search(r"\bPart-?time\b", s, re.I): out.setdefault("job_type", "Part-time")
        elif re.search(r"\bContract\b", s, re.I): out.setdefault("job_type", "Contract")
        elif re.search(r"\bIntern(ship|)\b", s, re.I): out.setdefault("job_type", "Internship")

        # Remote type as fallback
        if "remote_type" not in out:
            if re.search(r"\bHybrid\b", s, re.I): out["remote_type"] = "Hybrid"
            elif re.search(r"\bRemote\b", s, re.I): out["remote_type"] = "Remote"
            elif re.search(r"\bOn[- ]?site\b", s, re.I): out["remote_type"] = "On-site"

        return out


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
    ) -> Dict[str, Any]:
        logger.info("Job extraction started", extra={
            "url": url[:150] if url else None,
            "html_length": len(html or ''),
            "manual_text_length": len(manual_text or ''),
            "jsonld_items": len(jsonld or []),
            "has_readable": bool(readable),
            "has_hints": bool(hints),
            "llm_available": self.llm is not None
        })
        
        hints = hints or {}
        
        # Manual text path - Early return to avoid duplicate processing
        if manual_text and manual_text.strip():
            logger.info("Using manual text extraction path", extra={
                "text_length": len(manual_text),
                "stripped_length": len(manual_text.strip())
            })
            
            if not self.llm:
                logger.error("LLM service not available for manual text extraction")
                raise ValueError("LLM service is not available - cannot extract job from text")
            
            logger.debug("Starting manual text LLM extraction")
            try:
                full_raw = self._clean_text(manual_text)
                derived = self._hints_from_raw_paste(full_raw)
                hints = hints or {}
                for k, v in derived.items():
                    if v and not hints.get(k):
                        hints[k] = v

                text = self._preclean_noise(full_raw)  # then run your current LLM call
                job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
                logger.info("LLM extraction completed successfully", extra={
                    "title": job.get('title', '')[:50],
                    "company": job.get('company_name', '')
                })
                
                # 1) Start from the exact user text as description
                desc_raw = self._clean_text(text)

                # 3) Backstop: run regex splitter to catch missed bullets & dedupe against LLM requirements
                desc_clean, extra_reqs = self.req_splitter.split(desc_raw, job.get("requirements") or [])
                merged_reqs = list(dict.fromkeys((job.get("requirements") or []) + (extra_reqs or [])))

                # 4) Remove any exact requirement lines that still linger in description
                req_set = {r.strip() for r in merged_reqs}
                if desc_clean:
                    desc_clean = "\n".join([ln for ln in desc_clean.split("\n") if ln.strip() not in req_set])

                result = {
                    "title": (job.get("title") or hints.get("title") or "").strip(),
                    "company_name": (job.get("company_name") or hints.get("company_name") or "").strip(),
                    "source_url": url,
                    "location": (job.get("location") or "").strip(),
                    "remote_type": (job.get("remote_type") or "").strip(),
                    "job_type": (job.get("job_type") or "").strip(),
                    "description": self._clean_text(desc_clean),
                    "requirements": [x.strip() for x in merged_reqs if x and x.strip()],
                    "skills": [x.strip() for x in (job.get("skills") or []) if x and x.strip()],
                }
                result["title"] = result["title"] or hints.get("title", "")
                result["company_name"] = result["company_name"] or hints.get("company_name", "")
                result["location"] = result["location"] or hints.get("location", "")
                result["remote_type"] = result["remote_type"] or hints.get("remote_type", "")
                result["job_type"] = result["job_type"] or hints.get("job_type", "")

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
        
        # Regular HTML processing path - Only if no manual_text
        logger.info("Using HTML processing path", extra={
            "html_length": len(html or '')
        })
        
        if not html or len(html.strip()) < 50:
            logger.error("Insufficient HTML content", extra={
                "html_length": len(html or '')
            })
            raise ValueError("No content available for extraction - please try text selection instead")
        
        logger.debug("HTML validation passed, starting extraction")

        # 0) Quick DOM hints
        logger.debug("Phase 0: Extracting title/company from DOM")
        t_c = {}
        try:
            t_c = self.title_company.extract(html) or {}
            logger.debug("DOM extraction successful", extra={
                "title": t_c.get('title'),
                "company_name": t_c.get('company_name')
            })
        except Exception as e:
            logger.warning("DOM extraction failed", extra={"error": str(e)})
            t_c = {}

        # 1) Structured data
        logger.debug("Phase 1: Starting structured data extraction")
        logger.debug("Looking for JSON-LD JobPosting...")
        mapped: Dict[str, Any] = {}
        jd = self._find_job_from_jsonld(jsonld or [])
        if jd:
            mapped = self._map_job_jsonld(jd, url)
            logger.debug("Found JSON-LD JobPosting", extra={"title": mapped.get('title'), "company_name": mapped.get('company_name'), "location": mapped.get('location'), "remote_type": mapped.get('remote_type'), "job_type": mapped.get('job_type')})
        else:
            logger.debug("No JSON-LD JobPosting found, trying server-side structured extraction...")
            # fall back to server-side structured extraction
            try:
                obj = self.structured.find_job(html, url)
                if obj:
                    logger.debug("Server-side structured data found")
                    mapped = self.structured.map_job(obj, url) or {}
                    logger.debug("Mapped structured data", extra={"mapped_keys": list(mapped.keys())})
                else:
                    logger.debug("No server-side structured data found")
            except Exception as e:
                logger.warning("Server-side structured extraction failed", extra={"error": str(e)})
                mapped = {}

        readable_title = ""
        readable_site  = ""
        # 2) Main content text (for LLM and fallback)
        logger.debug("Phase 2: Main content text extraction")
        logger.debug("Readable object check", extra={"readable_provided": readable is not None})
        try:
            if readable and isinstance(readable, dict):
                logger.debug("Using Readability content")
                readable_title = (readable.get('title') or '').strip()
                readable_site  = (readable.get('siteName') or '').strip()
                logger.debug("Readability metadata", extra={"title": readable_title, "siteName": readable_site})
                # Prefer Readability's textContent, else strip tags from 'content'
                main_text = readable.get('textContent') or ''
                if not main_text and readable.get('content'):
                    logger.debug("No textContent, extracting from HTML content")
                    main_text = self._clean_text(re.sub(r"<[^>]+>", "", readable['content']))
                logger.debug("Readability text extracted", extra={"text_length": len(main_text)})
            else:
                logger.debug("No Readability, using main_content extractor")
                main_text = self.main_content.extract(html)
                logger.debug("Main content extracted", extra={"text_length": len(main_text)})
        except Exception as e:
            logger.warning("Main content extraction failed", extra={"error": str(e)}, exc_info=True)
            main_text = ""

            
        if not main_text and xhr_logs:
            logger.debug("Main text empty, checking XHR logs", extra={"xhr_count": len(xhr_logs)})
            try:
                for i, entry in enumerate(xhr_logs):
                    body = entry.get('body') or ''
                    if not body:
                        continue
                    logger.debug(f"Checking XHR entry {i+1}", extra={"body_length": len(body)})
                    text_candidate = ""
                    # Try JSON parse
                    try:
                        j = _json.loads(body)
                        logger.debug(f"XHR entry {i+1} is valid JSON")
                        # walk shallowly for common fields
                        keys = ['jobDescription','description','job_desc','content','responsibilities','qualifications']
                        for k in keys:
                            if isinstance(j, dict) and k in j and isinstance(j[k], str):
                                text_candidate = j[k]
                                logger.debug(f"Found job content in key '{k}'")
                                break
                        # Sometimes nested one level
                        if not text_candidate and isinstance(j, dict):
                            for v in j.values():
                                if isinstance(v, dict):
                                    for k in keys:
                                        if k in v and isinstance(v[k], str):
                                            text_candidate = v[k]
                                            logger.debug(f"Found job content in nested key '{k}'")
                                            break
                                if text_candidate: break
                    except Exception:
                        logger.debug(f"XHR entry {i+1} is not JSON, using as plain text")
                        pass
                    # Fallback: as-is text
                    if not text_candidate:
                        text_candidate = body

                    if ('job' in text_candidate.lower() and 'description' in text_candidate.lower()) or ('responsibilit' in text_candidate.lower()):
                        txt = re.sub(r'<[^>]+>', ' ', text_candidate)
                        if len(txt) > 800:
                            main_text = self._clean_text(txt)
                            logger.debug("Found suitable job content in XHR", extra={"text_length": len(main_text)})
                            break
            except Exception as e:
                logger.warning("XHR fallback failed", extra={"error": str(e)})
        
        logger.debug("Pre-cleaning main text noise")
        main_text = self._preclean_noise(main_text)
        logger.debug("Main text after pre-clean", extra={"text_length": len(main_text)})

        # 3) Fallbacks from raw text
        logger.debug("Phase 3: Extracting location and remote type")
        raw_text = self._clean_text(re.sub(r"<[^>]+>", "", html or ""))
        logger.debug("Raw text length", extra={"length": len(raw_text)})
        loc_fallback = self._extract_location_freeform(raw_text)
        logger.debug("Location fallback extracted", extra={"location": loc_fallback})
        rem_fallback = self._extract_remote_type(main_text, hints.get("remote_type", ""), mapped.get("remote_type", ""))
        logger.debug("Remote type fallback extracted", extra={"remote_type": rem_fallback})

        # 4) Build LLM hints
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

        # 5) Ask LLM (optional)
        logger.debug("Phase 5: LLM extraction (optional)")
        llm_job: Dict[str, Any] = {}
        if self.llm and main_text.strip():
            logger.debug("LLM check", extra={"llm_available": True, "text_length": len(main_text)})
            logger.debug("Calling LLM extractor")
            try:
                logger.info(f"Processing regular extraction with LLM: {len(main_text)} chars")
                llm_start = __import__('time').time()
                llm_job = self.llm.extract_job(url=url, text=main_text, hints=llm_hints) or {}
                llm_time = __import__('time').time() - llm_start
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
            except Exception as e:
                logger.warning(f"LLM extraction failed for regular extraction: {str(e)}")
                llm_job = {}  # For regular extraction, we can fall back to structured data
        else:
            logger.debug("Skipping LLM extraction", extra={"llm_available": self.llm is not None, "has_text": bool(main_text.strip())})

        # 6) Description processing - prefer LLM's cleaned description
        logger.debug("Phase 6: Description processing")
        
        # Check if LLM successfully extracted with non-empty description
        llm_succeeded = bool(
            llm_job 
            and llm_job.get("description") is not None 
            and llm_job.get("description").strip()
        )
        
        # Use LLM's description if available (it's already cleaned and filtered)
        if llm_succeeded:
            description = self._clean_text(llm_job.get("description"))
            logger.debug("Using LLM-extracted description", extra={"length": len(description)})
        else:
            # Fallback to raw text if LLM didn't provide description
            description = self._clean_text(main_text)
            logger.debug("Using raw main_text as description (LLM didn't provide)", extra={"length": len(description)})
        
        requirements = llm_job.get("requirements") or []
        skills = llm_job.get("skills") or []
        logger.debug("LLM results summary", extra={"requirements_count": len(requirements), "skills_count": len(skills)})

        # 7) Backstop: regex splitter ONLY if LLM didn't extract (fallback mode)
        logger.debug("Phase 7: Requirement splitting (fallback)")
        if not llm_succeeded:
            # LLM failed or didn't run - use regex splitter as backup
            logger.debug("Running regex requirement splitter as fallback")
            try:
                desc_raw = self._clean_text(main_text)
                description, extra_reqs = self.req_splitter.split(desc_raw, requirements)
                logger.debug("Splitter results", extra={"extra_requirements": len(extra_reqs)})
                requirements = list(dict.fromkeys((requirements or []) + (extra_reqs or [])))
                logger.debug("Total requirements after merge", extra={"count": len(requirements)})
                req_set = {r.strip() for r in requirements}
                if description:
                    description = "\n".join([ln for ln in description.split("\n") if ln.strip() not in req_set])
                logger.debug("Final description length", extra={"length": len(description)})
            except Exception as e:
                logger.warning("Requirement splitting failed", extra={"error": str(e)})
                description = self._clean_text(main_text)
        else:
            logger.debug("Using LLM results directly - NO post-processing")



        logger.debug("Phase 8: Final result assembly")
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
        
        # For regular extraction, we're more lenient but still log issues
        logger.debug("Validating result")
        try:
            self._validate_job_content(final_result, "regular extraction")
            logger.debug("Validation passed")
        except ValueError as e:
            logger.warning(f"Regular extraction produced minimal content: {str(e)}")
            # Don't fail for regular extraction, but warn
        
        logger.info("Extraction service completed successfully", extra={
            "title": final_result['title'],
            "company": final_result['company_name']
        })
        return final_result

# --- default requirement stripper (regex-based, safe fallback) ---
_REQ_HEADER_RE = re.compile(
    r"^\s*(requirements|qualifications|what you(?:'|')ll need|what we(?:'|')re looking for|must have|required skills|minimum qualifications|what you bring)\s*:?\s*$",
    re.I
)
_STOP_HEADER_RE = re.compile(
    r"^\s*(why join us\??|about us|company culture|benefits|perks|what we offer|our culture|our values|our team|the team|working here|life at)\s*:?\s*$",
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

            # Check if we hit a STOP header (culture/benefits section)
            if _STOP_HEADER_RE.match(s):
                # Stop extracting requirements, keep everything else as description
                in_reqs = False
                cleaned.append(raw)
                continue

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
