from __future__ import annotations
import re
from typing import Dict, Any, Optional, List
from .ports import (
    MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor,
    LLMExtractor, RequirementStripper
)

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
    def _clean_text(s: str) -> str:
        s = s or ""
        s = s.replace("\u00A0", " ")
        s = re.sub(r"[ \t]+\n", "\n", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip()

    @staticmethod
    def _extract_remote_type(text: str, *candidates: str) -> str:
        blob = " ".join([c or "" for c in candidates] + [text or ""]).lower()
        if "hybrid" in blob: return "Hybrid"
        if "remote" in blob: return "Remote"
        if "on-site" in blob or "onsite" in blob: return "On-site"
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

    def extract_job(self, *, url: str, html: str, hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        hints = hints or {}

        # 0) Quick DOM hints
        t_c = {}
        try:
            t_c = self.title_company.extract(html) or {}
        except Exception:
            t_c = {}

        # 1) Structured data
        mapped: Dict[str, Any] = {}
        try:
            obj = self.structured.find_job(html, url)
            if obj:
                mapped = self.structured.map_job(obj, url) or {}
        except Exception:
            mapped = {}

        # 2) Main content text (for LLM and fallback)
        try:
            main_text = self.main_content.extract(html)
        except Exception:
            main_text = ""

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
                llm_job = self.llm.extract_job(url=url, text=main_text, hints=llm_hints) or {}
            except Exception:
                llm_job = {}

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

        return {
            "title": (llm_job.get("title") or mapped.get("title") or t_c.get("title") or "").strip(),
            "company_name": (llm_job.get("company_name") or mapped.get("company_name") or t_c.get("company_name") or "").strip(),
            "source_url": url,
            "location": (llm_job.get("location") or mapped.get("location") or loc_fallback or "").strip(),
            "remote_type": (llm_job.get("remote_type") or rem_fallback or "").strip(),
            "job_type": (llm_job.get("job_type") or mapped.get("job_type") or "").strip(),
            "description": self._clean_text(description),
            "requirements": [x.strip() for x in (requirements or []) if x and x.strip()],
            "skills": [x.strip() for x in (skills or []) if x and x.strip()],
        }

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
