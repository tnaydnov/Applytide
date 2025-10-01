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
    
    def _preclean_noise(self, text: str) -> str:
        """
        Remove obvious non-job UI chrome commonly copied from LinkedIn/ATS pages.
        Keeps everything from 'About the job' / 'Job Description' onward if present.
        Also drops frequent UI lines anywhere in the text.
        """
        if not text:
            return ""

        s = text

        # If there's a clear starting anchor, keep from there forward.
        anchors = [
            r"^\s*About the job\s*$",
            r"^\s*Job Description\s*$",
            r"^\s*Description\s*$",
            r"^\s*About the role\s*$",
            r"^\s*Role Summary\s*$",
        ]
        for pat in anchors:
            m = re.search(pat, s, flags=re.I | re.M)
            if m:
                s = s[m.start():]
                break

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
    
    def _apply_line_removals(self, text: str, remove_lines: list[int]) -> str:
        if not text:
            return ""
        if not remove_lines:
            return text
        lines = text.splitlines()
        # keep only valid 1-based indices
        to_drop = {int(n) for n in remove_lines if isinstance(n, int) and 1 <= int(n) <= len(lines)}
        kept = [ln for idx, ln in enumerate(lines, start=1) if idx not in to_drop]
        return self._clean_text("\n".join(kept))


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
        print("\n=== EXTRACTION SERVICE START ===")
        print(f"Extraction Service: URL = {url[:100] if url else 'None'}")
        print(f"Extraction Service: html_len = {len(html or '')}")
        print(f"Extraction Service: manual_text_len = {len(manual_text or '')}")
        print(f"Extraction Service: screenshot_len = {len(screenshot_data_url or '')}")
        print(f"Extraction Service: jsonld_items = {len(jsonld or [])}")
        print(f"Extraction Service: has_readable = {bool(readable)}")
        print(f"Extraction Service: has_hints = {list(hints.keys()) if hints else []}")
        print(f"Extraction Service: LLM available = {self.llm is not None}")
        
        hints = hints or {}
        
        # Check each path explicitly
        print("\n--- PATH DETECTION ---")
        print(f"manual_text is not None: {manual_text is not None}")
        if manual_text is not None:
            print(f"manual_text length: {len(manual_text)}")
            print(f"manual_text.strip() length: {len(manual_text.strip())}")
            print(f"manual_text preview: {repr(manual_text[:200])}")
        
        print(f"screenshot_data_url is not None: {screenshot_data_url is not None}")
        if screenshot_data_url is not None:
            print(f"screenshot_data_url length: {len(screenshot_data_url)}")
            print(f"screenshot preview: {screenshot_data_url[:100]}")
        
        # Manual text path - Early return to avoid duplicate processing
        if manual_text and manual_text.strip():
            print("\n*** TAKING MANUAL TEXT PATH ***", flush=True)
            print(f"Manual text length after strip: {len(manual_text.strip())}", flush=True)
            
            if not self.llm:
                print("ERROR: LLM service is not available for manual text", flush=True)
                raise ValueError("LLM service is not available - cannot extract job from text")
            
            print("Manual text LLM extraction starting...", flush=True)
            try:
                text = self._preclean_noise(self._clean_text(manual_text))
                print(f"Cleaned text length: {len(text)}", flush=True)
                job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
                print(f"LLM extraction completed successfully", flush=True)
                print(f"LLM result: title='{job.get('title', '')[:50]}', company='{job.get('company_name', '')}'", flush=True)
                
                # 1) Start from the exact user text as description
                desc_raw = self._clean_text(text)

                # 2) Apply model guidance (remove_lines) deterministically
                remove_lines = job.get("remove_lines") or []
                desc_after_llm = self._apply_line_removals(desc_raw, remove_lines)

                # 3) Backstop: run regex splitter to catch missed bullets & dedupe against LLM requirements
                desc_clean, extra_reqs = self.req_splitter.split(desc_after_llm, job.get("requirements") or [])
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

                print(f"Manual text extraction completed successfully", flush=True)
                print("=== EXTRACTION SERVICE SUCCESS ===", flush=True)
                return result
            except Exception as e:
                print(f"ERROR in manual text extraction: {str(e)}", flush=True)
                print("=== EXTRACTION SERVICE ERROR ===", flush=True)
                raise ValueError(f"Failed to extract job from text: {str(e)}")
        
        # Screenshot path - Early return
        if screenshot_data_url:
            print("\n*** TAKING SCREENSHOT PATH ***", flush=True)
            if not self.llm:
                print("ERROR: LLM service is not available for screenshot", flush=True)
                raise ValueError("LLM service is not available - cannot extract job from screenshot")
            
            print("Screenshot LLM extraction starting...", flush=True)
            try:
                job = self.llm.extract_job_from_image(url=url, data_url=screenshot_data_url, hints=hints) or {}
                print(f"Screenshot LLM extraction completed successfully", flush=True)
                
                result = {
                    "title": (job.get("title") or "").strip(),
                    "company_name": (job.get("company_name") or "").strip(),
                    "source_url": url,
                    "location": (job.get("location") or "").strip(),
                    "remote_type": (job.get("remote_type") or "").strip(),
                    "job_type": (job.get("job_type") or "").strip(),
                    "description": self._clean_text(job.get("description") or ""),
                    "requirements": [x.strip() for x in (job.get("requirements") or []) if x and x.strip()],
                    "skills": [x.strip() for x in (job.get("skills") or []) if x and x.strip()],
                }
                # Backstop stripper (no remove_lines for images)
                try:
                    desc_clean, extra_reqs = self.req_splitter.split(result["description"], result.get("requirements") or [])
                    merged_reqs = list(dict.fromkeys((result.get("requirements") or []) + (extra_reqs or [])))
                    req_set = {r.strip() for r in merged_reqs}
                    if desc_clean:
                        desc_clean = "\n".join([ln for ln in desc_clean.split("\n") if ln.strip() not in req_set])

                    result["description"] = self._clean_text(desc_clean)
                    result["requirements"] = [x.strip() for x in merged_reqs if x and x.strip()]
                except Exception:
                    pass
                print(f"Screenshot extraction completed successfully", flush=True)
                print("=== EXTRACTION SERVICE SUCCESS ===", flush=True)
                return result
            except Exception as e:
                print(f"ERROR in screenshot extraction: {str(e)}", flush=True)
                print("=== EXTRACTION SERVICE ERROR ===", flush=True)
                raise ValueError(f"Failed to extract job from screenshot: {str(e)}")
        
        # Regular HTML processing path - Only if no manual_text or screenshot
        print("\n*** TAKING HTML PROCESSING PATH ***", flush=True)
        print(f"HTML length: {len(html or '')}", flush=True)
        
        if not html or len(html.strip()) < 50:
            print(f"ERROR: Empty or minimal HTML provided: {len(html or '')} chars", flush=True)
            raise ValueError("No content available for extraction - please try text selection or screenshot instead")
        print("Proceeding with HTML extraction...", flush=True)

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
        
        main_text = self._preclean_noise(main_text)

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

        # 6) Start from main_text as the source-of-truth description
        desc_raw = self._clean_text(main_text)

        # 6.1) If the model returned remove_lines, apply them deterministically
        remove_lines = llm_job.get("remove_lines") or []
        desc_after_llm = self._apply_line_removals(desc_raw, remove_lines)

        requirements = llm_job.get("requirements") or []
        skills = llm_job.get("skills") or []

        # 7) Backstop: regex splitter + dedupe
        try:
            description, extra_reqs = self.req_splitter.split(desc_after_llm, requirements)
            requirements = list(dict.fromkeys((requirements or []) + (extra_reqs or [])))
            req_set = {r.strip() for r in requirements}
            if description:
                description = "\n".join([ln for ln in description.split("\n") if ln.strip() not in req_set])
        except Exception:
            description = desc_after_llm



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
