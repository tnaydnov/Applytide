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
        print("\n" + "="*80)
        print("=== EXTRACTION SERVICE START ===")
        print(f"Timestamp: {__import__('datetime').datetime.now().isoformat()}")
        print("="*80)
        print(f"\n[SERVICE] INPUT PARAMETERS:")
        print(f"  URL: {url[:150] if url else 'None'}")
        print(f"  HTML length: {len(html or '')} chars")
        print(f"  HTML preview: {(html or '')[:200]}..." if html else "  HTML preview: None")
        print(f"  Manual text length: {len(manual_text or '')} chars")
        print(f"  Manual text preview: {repr((manual_text or '')[:200])}..." if manual_text else "  Manual text: None")
        print(f"  JSON-LD items: {len(jsonld or [])}")
        if jsonld:
            print(f"  JSON-LD types: {[j.get('@type') for j in jsonld if isinstance(j, dict)]}")
        print(f"  Has Readable: {bool(readable)}")
        if readable:
            print(f"  Readable title: {readable.get('title')}")
            print(f"  Readable text length: {len(readable.get('textContent', ''))}")
        print(f"  Hints provided: {list(hints.keys()) if hints else []}")
        print(f"  Hints values: {hints}" if hints else "")
        print(f"  Metas count: {len(metas or {})}")
        print(f"  XHR logs count: {len(xhr_logs or [])}")
        print(f"  LLM available: {self.llm is not None}")
        print(f"  LLM type: {type(self.llm).__name__ if self.llm else 'None'}")
        
        hints = hints or {}
        
        # Check each path explicitly
        print("\n" + "-"*80)
        print("--- EXTRACTION PATH DETECTION ---")
        print("-"*80)
        print(f"\n[PATH CHECK] Manual Text:")
        print(f"  is not None: {manual_text is not None}")
        if manual_text is not None:
            print(f"  length: {len(manual_text)}")
            print(f"  stripped length: {len(manual_text.strip())}")
            print(f"  is empty after strip: {not manual_text.strip()}")
            print(f"  preview (first 300 chars): {repr(manual_text[:300])}")
        
        # Manual text path - Early return to avoid duplicate processing
        if manual_text and manual_text.strip():
            print("\n" + "*"*80)
            print("*** DECISION: TAKING MANUAL TEXT PATH ***")
            print("*"*80)
            print(f"\n[MANUAL TEXT] Processing pasted text")
            print(f"  Text length: {len(manual_text)}")
            print(f"  Stripped length: {len(manual_text.strip())}")
            print(f"  Text preview:\n{manual_text.strip()[:500]}...\n")
            
            if not self.llm:
                print("\n[ERROR] LLM service is not available for manual text", flush=True)
                print("[ERROR] Cannot proceed with manual text extraction", flush=True)
                raise ValueError("LLM service is not available - cannot extract job from text")
            
            print("Manual text LLM extraction starting...", flush=True)
            try:
                full_raw = self._clean_text(manual_text)
                derived = self._hints_from_raw_paste(full_raw)
                hints = hints or {}
                for k, v in derived.items():
                    if v and not hints.get(k):
                        hints[k] = v

                text = self._preclean_noise(full_raw)  # then run your current LLM call
                job = self.llm.extract_job(url=url, text=text, hints=hints) or {}
                print(f"LLM extraction completed successfully", flush=True)
                print(f"LLM result: title='{job.get('title', '')[:50]}', company='{job.get('company_name', '')}'", flush=True)
                
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

                print(f"Manual text extraction completed successfully", flush=True)
                print("=== EXTRACTION SERVICE SUCCESS ===", flush=True)
                return result
            except Exception as e:
                print(f"\n[MANUAL TEXT] ✗✗✗ ERROR during extraction", flush=True)
                print(f"[MANUAL TEXT] Error type: {type(e).__name__}", flush=True)
                print(f"[MANUAL TEXT] Error message: {str(e)}", flush=True)
                print(f"[MANUAL TEXT] Error details:", flush=True)
                import traceback
                traceback.print_exc()
                print("="*80, flush=True)
                print("=== EXTRACTION SERVICE ERROR ===", flush=True)
                print("="*80, flush=True)
                raise ValueError(f"Failed to extract job from text: {str(e)}")
        
        # Regular HTML processing path - Only if no manual_text
        print("\n" + "*"*80)
        print("*** DECISION: TAKING HTML PROCESSING PATH ***")
        print("*"*80)
        print(f"\n[HTML PATH] Starting HTML-based extraction")
        print(f"[HTML PATH] HTML length: {len(html or '')} chars")
        print(f"[HTML PATH] HTML preview (first 300 chars):\n{(html or '')[:300]}...\n")
        
        if not html or len(html.strip()) < 50:
            print(f"\n[HTML PATH] ✗ ERROR: Insufficient HTML content", flush=True)
            print(f"[HTML PATH] HTML length: {len(html or '')} chars", flush=True)
            print(f"[HTML PATH] Minimum required: 50 chars", flush=True)
            raise ValueError("No content available for extraction - please try text selection instead")
        
        print(f"[HTML PATH] ✓ HTML validation passed")
        print(f"[HTML PATH] Proceeding with extraction...\n")

        # 0) Quick DOM hints
        print(f"\n[HTML PATH] === PHASE 0: Quick DOM hints ===")
        print(f"[HTML PATH] Extracting title/company from DOM...")
        t_c = {}
        try:
            t_c = self.title_company.extract(html) or {}
            print(f"[HTML PATH] ✓ DOM extraction successful:")
            print(f"  title: {t_c.get('title', 'None')}")
            print(f"  company_name: {t_c.get('company_name', 'None')}")
        except Exception as e:
            print(f"[HTML PATH] ✗ DOM extraction failed: {str(e)}")
            t_c = {}

        # 1) Structured data
        print(f"\n[HTML PATH] === PHASE 1: Structured data extraction ===")
        print(f"[HTML PATH] Looking for JSON-LD JobPosting...")
        mapped: Dict[str, Any] = {}
        jd = self._find_job_from_jsonld(jsonld or [])
        if jd:
            print(f"[HTML PATH] ✓ Found JSON-LD JobPosting!")
            print(f"[HTML PATH] JSON-LD data: {jd}")
            mapped = self._map_job_jsonld(jd, url)
            print(f"[HTML PATH] Mapped JSON-LD to:")
            print(f"  title: {mapped.get('title')}")
            print(f"  company_name: {mapped.get('company_name')}")
            print(f"  location: {mapped.get('location')}")
            print(f"  remote_type: {mapped.get('remote_type')}")
            print(f"  job_type: {mapped.get('job_type')}")
        else:
            print(f"[HTML PATH] No JSON-LD JobPosting found, trying server-side structured extraction...")
            # fall back to server-side structured extraction
            try:
                obj = self.structured.find_job(html, url)
                if obj:
                    print(f"[HTML PATH] ✓ Server-side structured data found")
                    mapped = self.structured.map_job(obj, url) or {}
                    print(f"[HTML PATH] Mapped structured data: {mapped}")
                else:
                    print(f"[HTML PATH] No server-side structured data found")
            except Exception as e:
                print(f"[HTML PATH] ✗ Server-side structured extraction failed: {str(e)}")
                mapped = {}

        readable_title = ""
        readable_site  = ""
        # 2) Main content text (for LLM and fallback)
        print(f"\n[HTML PATH] === PHASE 2: Main content text extraction ===")
        print(f"[HTML PATH] Readable object provided: {readable is not None}")
        try:
            if readable and isinstance(readable, dict):
                print(f"[HTML PATH] Using Readability content...")
                readable_title = (readable.get('title') or '').strip()
                readable_site  = (readable.get('siteName') or '').strip()
                print(f"[HTML PATH] Readability metadata:")
                print(f"  title: {readable_title}")
                print(f"  siteName: {readable_site}")
                # Prefer Readability's textContent, else strip tags from 'content'
                main_text = readable.get('textContent') or ''
                if not main_text and readable.get('content'):
                    print(f"[HTML PATH] No textContent, extracting from HTML content...")
                    main_text = self._clean_text(re.sub(r"<[^>]+>", "", readable['content']))
                print(f"[HTML PATH] ✓ Readability text extracted: {len(main_text)} chars")
            else:
                print(f"[HTML PATH] No Readability, using main_content extractor...")
                main_text = self.main_content.extract(html)
                print(f"[HTML PATH] ✓ Main content extracted: {len(main_text)} chars")
        except Exception as e:
            print(f"[HTML PATH] ✗ Main content extraction failed: {str(e)}")
            logger.warning(f"Failed to extract main content from HTML: {str(e)}")
            main_text = ""

            
        if not main_text and xhr_logs:
            print(f"\n[HTML PATH] Main text empty, checking XHR logs...")
            print(f"[HTML PATH] XHR logs available: {len(xhr_logs)} entries")
            try:
                for i, entry in enumerate(xhr_logs):
                    body = entry.get('body') or ''
                    if not body:
                        continue
                    print(f"[HTML PATH] Checking XHR entry {i+1}: body length = {len(body)}")
                    text_candidate = ""
                    # Try JSON parse
                    try:
                        j = _json.loads(body)
                        print(f"[HTML PATH] XHR entry {i+1} is valid JSON")
                        # walk shallowly for common fields
                        keys = ['jobDescription','description','job_desc','content','responsibilities','qualifications']
                        for k in keys:
                            if isinstance(j, dict) and k in j and isinstance(j[k], str):
                                text_candidate = j[k]
                                print(f"[HTML PATH] Found job content in key '{k}'")
                                break
                        # Sometimes nested one level
                        if not text_candidate and isinstance(j, dict):
                            for v in j.values():
                                if isinstance(v, dict):
                                    for k in keys:
                                        if k in v and isinstance(v[k], str):
                                            text_candidate = v[k]
                                            print(f"[HTML PATH] Found job content in nested key '{k}'")
                                            break
                                if text_candidate: break
                    except Exception:
                        print(f"[HTML PATH] XHR entry {i+1} is not JSON, using as plain text")
                        pass
                    # Fallback: as-is text
                    if not text_candidate:
                        text_candidate = body

                    if ('job' in text_candidate.lower() and 'description' in text_candidate.lower()) or ('responsibilit' in text_candidate.lower()):
                        txt = re.sub(r'<[^>]+>', ' ', text_candidate)
                        if len(txt) > 800:
                            main_text = self._clean_text(txt)
                            print(f"[HTML PATH] ✓ Found suitable job content in XHR: {len(main_text)} chars")
                            break
            except Exception as e:
                print(f"[HTML PATH] ✗ XHR fallback failed: {str(e)}")
                pass
        
        print(f"\n[HTML PATH] Pre-cleaning main text noise...")
        main_text = self._preclean_noise(main_text)
        print(f"[HTML PATH] Main text after pre-clean: {len(main_text)} chars")

        # 3) Fallbacks from raw text
        print(f"\n[HTML PATH] === PHASE 3: Extracting location and remote type ===")
        raw_text = self._clean_text(re.sub(r"<[^>]+>", "", html or ""))
        print(f"[HTML PATH] Raw text length: {len(raw_text)} chars")
        loc_fallback = self._extract_location_freeform(raw_text)
        print(f"[HTML PATH] Location fallback: {loc_fallback}")
        rem_fallback = self._extract_remote_type(main_text, hints.get("remote_type", ""), mapped.get("remote_type", ""))
        print(f"[HTML PATH] Remote type fallback: {rem_fallback}")

        # 4) Build LLM hints
        print(f"\n[HTML PATH] === PHASE 4: Building LLM hints ===")
        llm_hints = {
            "title": t_c.get("title") or mapped.get("title") or "",
            "company_name": t_c.get("company_name") or mapped.get("company_name") or "",
            "location": loc_fallback or mapped.get("location") or "",
            "remote_type": rem_fallback or "",
            "job_type": mapped.get("job_type") or "",
        }
        llm_hints.update({k: v for k, v in hints.items() if v})
        print(f"[HTML PATH] LLM hints prepared:")
        for key, val in llm_hints.items():
            print(f"  {key}: {val}")

        # 5) Ask LLM (optional)
        print(f"\n[HTML PATH] === PHASE 5: LLM extraction (optional) ===")
        llm_job: Dict[str, Any] = {}
        if self.llm and main_text.strip():
            print(f"[HTML PATH] LLM available: {self.llm is not None}")
            print(f"[HTML PATH] Main text available: {len(main_text)} chars")
            print(f"[HTML PATH] Calling LLM extractor...")
            try:
                logger.info(f"Processing regular extraction with LLM: {len(main_text)} chars")
                llm_start = __import__('time').time()
                llm_job = self.llm.extract_job(url=url, text=main_text, hints=llm_hints) or {}
                llm_time = __import__('time').time() - llm_start
                logger.info(f"LLM extraction completed for regular extraction")
                print(f"[HTML PATH] ✓ LLM extraction completed in {llm_time:.2f}s")
                print(f"[HTML PATH] LLM returned:")
                print(f"  title: {llm_job.get('title')}")
                print(f"  company_name: {llm_job.get('company_name')}")
                print(f"  location: {llm_job.get('location')}")
                print(f"  remote_type: {llm_job.get('remote_type')}")
                print(f"  job_type: {llm_job.get('job_type')}")
                print(f"  requirements: {len(llm_job.get('requirements', []))} items")
                print(f"  skills: {len(llm_job.get('skills', []))} items")
            except Exception as e:
                logger.warning(f"LLM extraction failed for regular extraction: {str(e)}")
                print(f"[HTML PATH] ✗ LLM extraction failed: {str(e)}")
                llm_job = {}  # For regular extraction, we can fall back to structured data
        else:
            print(f"[HTML PATH] Skipping LLM extraction:")
            print(f"  LLM available: {self.llm is not None}")
            print(f"  Main text available: {bool(main_text.strip())}")

        # 6) Start from main_text as the source-of-truth description
        print(f"\n[HTML PATH] === PHASE 6: Description processing ===")
        desc_raw = self._clean_text(main_text)
        print(f"[HTML PATH] Raw description: {len(desc_raw)} chars")

        requirements = llm_job.get("requirements") or []
        skills = llm_job.get("skills") or []
        print(f"[HTML PATH] Requirements from LLM: {len(requirements)} items")
        print(f"[HTML PATH] Skills from LLM: {len(skills)} items")

        # 7) Backstop: regex splitter + dedupe
        print(f"\n[HTML PATH] === PHASE 7: Requirement splitting ===")
        try:
            print(f"[HTML PATH] Running requirement splitter...")
            description, extra_reqs = self.req_splitter.split(desc_raw, requirements)
            print(f"[HTML PATH] Splitter extracted {len(extra_reqs)} additional requirements")
            requirements = list(dict.fromkeys((requirements or []) + (extra_reqs or [])))
            print(f"[HTML PATH] Total requirements after merge: {len(requirements)}")
            req_set = {r.strip() for r in requirements}
            if description:
                description = "\n".join([ln for ln in description.split("\n") if ln.strip() not in req_set])
            print(f"[HTML PATH] Final description: {len(description)} chars")
        except Exception as e:
            print(f"[HTML PATH] ✗ Requirement splitting failed: {str(e)}")
            description = desc_raw



        print(f"\n[HTML PATH] === PHASE 8: Final result assembly ===")
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
        
        print(f"[HTML PATH] Final result assembled:")
        print(f"  title: {final_result['title']}")
        print(f"  company_name: {final_result['company_name']}")
        print(f"  location: {final_result['location']}")
        print(f"  remote_type: {final_result['remote_type']}")
        print(f"  job_type: {final_result['job_type']}")
        print(f"  description length: {len(final_result['description'])}")
        print(f"  requirements: {len(final_result['requirements'])} items")
        print(f"  skills: {len(final_result['skills'])} items")
        
        # For regular extraction, we're more lenient but still log issues
        print(f"\n[HTML PATH] Validating result...")
        try:
            self._validate_job_content(final_result, "regular extraction")
            print(f"[HTML PATH] ✓ Validation passed")
        except ValueError as e:
            logger.warning(f"Regular extraction produced minimal content: {str(e)}")
            print(f"[HTML PATH] ⚠ Validation warning: {str(e)}")
            # Don't fail for regular extraction, but warn
        
        print(f"\n[HTML PATH] ✓✓✓ SUCCESS - Returning result")
        print("="*80)
        print("=== EXTRACTION SERVICE SUCCESS ===")
        print("="*80 + "\n")
        return final_result

# --- default requirement stripper (regex-based, safe fallback) ---
_REQ_HEADER_RE = re.compile(
    r"^\s*(requirements|qualifications|advantages|about you|what you(?:'|’)ll need|what we(?:'|’)re looking for|must have|nice to have|skills|required skills|preferred qualifications)\s*:?\s*$",
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
