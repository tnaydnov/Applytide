# app/ai/router.py
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json, re, os

import extruct
from w3lib.html import get_base_url
from bs4 import BeautifulSoup
from readability import Document
from openai import OpenAI

# Optional auth import
try:
    from app.auth.deps import get_current_user  # noqa
except Exception:
    def get_current_user():
        return None

# Config
try:
    from app.config import settings
    OPENAI_API_KEY = settings.OPENAI_API_KEY
except Exception:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ----------------- Schemas -----------------
class ExtractIn(BaseModel):
    url: str
    html: str
    quick: Optional[Dict[str, Any]] = None  # optional hints/chips you might pass from the extension

class JobOut(BaseModel):
    title: str = ""
    company_name: str = ""
    source_url: str = ""
    location: str = ""
    remote_type: str = ""
    job_type: str = ""
    description: str = ""
    requirements: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)

class ExtractOut(BaseModel):
    job: JobOut

class SuggestIn(BaseModel):
    url: str
    html: str

class Suggestion(BaseModel):
    title: str
    reason: str
    preview: Optional[str] = ""

class SuggestOut(BaseModel):
    suggestions: List[Suggestion]

class ApplyIn(BaseModel):
    suggestion_indexes: List[int] = Field(default_factory=list)

class ApplyOut(BaseModel):
    resume_id: str

# ----------------- LLM helpers -----------------
def _get_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY is not set")
    # Lazy-create client at call-time to avoid reloader/proxy kwargs issues
    return OpenAI(api_key=OPENAI_API_KEY)

EXTRACT_SYSTEM_TEXT = """
You are a precise extractor for job postings. You will receive CLEANED TEXT (never raw HTML).
Return STRICT JSON with keys:
- title, company_name, source_url, location, remote_type, job_type, description
- requirements: array of bullet items (each a single line, no numbering/bullet characters)
- skills: array of short technical tokens/phrases (2-4 words max). Include programming languages, tools, DBs, clouds, frameworks, libraries. Avoid soft skills.

IMPORTANT:
- Do NOT summarize. Keep the description FULL and in original order.
- The description must preserve paragraphs and bullet lines using plain newlines; do NOT add or remove content.
- The description MUST NOT contain any “Requirements/Qualifications/Skills/Nice to have/About you/What you'll need” sections; put those lines into 'requirements' or 'skills'. Even if it doesn't use one of these specific headers, if you see a section that looks like requirements/skills, move those lines out of the description and into the appropriate array.
- If a field is unknown, use empty string.
- De-duplicate requirements and skills.
"""


SUGGEST_SYSTEM = """You propose concrete, optional resume edits to better match the role.
Return JSON: suggestions: array of {title, reason, preview}.
- preview shows before/after or the new bullet text; keep under 80 words each.
- Avoid generic advice. Make them specific and actionable.
"""

APPLY_SYSTEM = """Given the user's resume and the array of previously proposed suggestions,
apply only the subset of suggestions (by index) and return UPDATED_RESUME plain text."""

# ----------------- HTML/Text utilities -----------------
def _clean_text(s: str) -> str:
    s = s or ""
    s = s.replace("\u00A0", " ")
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def _readability_text(html: str) -> str:
    # Best-effort "main content" text
    try:
        doc = Document(html)
        summary_html = doc.summary(html_partial=True)
        soup = BeautifulSoup(summary_html, "lxml")
        return _clean_text(soup.get_text("\n"))
    except Exception:
        soup = BeautifulSoup(html, "lxml")
        return _clean_text(soup.get_text("\n"))

def _extract_remote_type(text: str, *candidates: str) -> str:
    blob = " ".join([c or "" for c in candidates] + [text or ""]).lower()
    if "hybrid" in blob: return "Hybrid"
    if "remote" in blob: return "Remote"
    if "on-site" in blob or "onsite" in blob: return "On-site"
    return ""

def _extract_location_freeform(text: str) -> str:
    """
    Generic location finder that works for many sites (including LinkedIn headers):
    - 'Location: <line>'
    - A short line with 2-3 comma-separated parts that looks like City, Region[, Country]
    - We also strip a trailing '(Remote|Hybrid|On-site)' if present.
    We only trust short lines (< 90 chars).
    """
    if not text:
        return ""

    # 1) Explicit "Location:" line
    m = re.search(r"(?:^|\n)\s*Location\s*:\s*([^\n]{2,90})", text, flags=re.I)
    if m:
        val = m.group(1).strip(" .,\t")
        val = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", val, flags=re.I)
        return val

    # 2) First plausible "City, Region[, Country]" line near the top
    head = text[:5000]
    lines = [ln.strip() for ln in head.split("\n") if ln.strip()]
    city_like = re.compile(
        r"^[A-Z][A-Za-z .'’\-()]+,\s*[A-Z][A-Za-z .'’\-()]+(?:,\s*[A-Z][A-Za-z .'’\-()]+)?(?:\s*\((?:Remote|Hybrid|On-?site)\))?$"
    )
    for ln in lines[:80]:
        if len(ln) <= 90 and city_like.match(ln):
            if not re.search(r"(job|engineer|developer|senior|full\-?time)", ln, flags=re.I):
                # strip "(Hybrid)" etc from the end if present
                ln = re.sub(r"\s*\((?:Remote|Hybrid|On-?site)\)\s*$", "", ln, flags=re.I)
                return ln.strip(" .,")

    return ""

# Headers that often precede hard requirements (LinkedIn uses "About you" a lot)
_REQ_HEADER_RE = re.compile(
    r"^\s*(requirements|qualifications|about you|what you(?:'|’)ll need|what we(?:'|’)re looking for|must have|nice to have|skills|required skills|preferred qualifications)\s*:?\s*$",
    re.I
)
_BULLET_RE = re.compile(r"^\s*(?:[-–—•·\*]|\d{1,2}[.)])\s*(.+)$")

_TECH_TOKEN = re.compile(
    r"\b(aws|gcp|azure|kubernetes|docker|python|java|go|rust|node\.?js|react|redis|postgres|singlestore|elasticsearch|kafka|spark|hadoop|linux|microservices|sql|nosql|mongodb|snowflake|terraform)\b",
    re.I
)

def _strip_requirements_from_description(description: str,
                                         existing_reqs: List[str] | None = None) -> tuple[str, List[str]]:
    """
    Walk the description and:
    - Detect requirement-like sections even if there are no bullets.
    - Collect their lines into requirements.
    - Return cleaned description (structure preserved) and the collected requirements.
    """
    if not description:
        return "", existing_reqs or []

    reqs = list(existing_reqs or [])
    lines = description.split("\n")
    cleaned: List[str] = []
    in_reqs = False

    for ln in lines:
        raw = ln
        s = ln.strip()

        # Start of a requirement block?
        if _REQ_HEADER_RE.match(s):
            in_reqs = True
            continue

        if in_reqs:
            # Bullet line → definitely a requirement
            m = _BULLET_RE.match(s)
            if m:
                item = m.group(1).strip().rstrip(".")
                if item:
                    reqs.append(item)
                continue

            # Blank lines inside reqs → skip
            if not s:
                continue

            # Non-bullet but *looks like* a requirement (short techy line)
            if len(s) <= 160 and (_TECH_TOKEN.search(s) or re.search(r"(years|experience|degree|proficien|hands-on|familiar|understanding)\b", s, re.I)):
                reqs.append(s.rstrip("."))
                continue

            # Non-bullet normal text → end of req section
            in_reqs = False

        # Outside requirements → keep the line
        cleaned.append(raw)

    # Also remove lines that exactly duplicate gathered requirements
    req_set = {r.strip() for r in reqs if r and r.strip()}
    cleaned = [ln for ln in cleaned if ln.strip() not in req_set]

    # Dedup and normalize reqs
    reqs = list(dict.fromkeys([r.strip(" -*•·.") for r in reqs if r.strip()]))

    return _clean_text("\n".join(cleaned)), reqs


def _extract_title_company_generic(html: str) -> Dict[str,str]:
    soup = BeautifulSoup(html, "lxml")

    def pick(selectors: list[str]) -> str:
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                t = _clean_text(el.get_text(" "))
                if len(t) > 2:
                    return t
        return ""

    title = pick(["h1", "[itemprop='title']", "header h1", "article h1"])
    company = pick([
        "[itemprop='hiringOrganization'] [itemprop='name']",
        ".company, .company-name, .employer, [data-company]",
        "a[href*='/company/']",
    ])
    return {"title": title, "company_name": company}

def _find_structured_job(html: str, url: str) -> dict | None:
    base = get_base_url(html, url)
    data = extruct.extract(
        html, base_url=base,
        syntaxes=["json-ld", "microdata", "rdfa", "opengraph"],
        errors="ignore"
    )

    def is_job(obj: dict) -> bool:
        t = obj.get("@type") or obj.get("type") or obj.get("itemtype") or ""
        if isinstance(t, list):
            t = " ".join(map(str, t))
        return "JobPosting" in str(t)

    cands: list[dict] = []
    for item in (data.get("json-ld") or []):
        if isinstance(item, dict):
            if "@graph" in item and isinstance(item["@graph"], list):
                cands.extend([g for g in item["@graph"] if isinstance(g, dict)])
            else:
                cands.append(item)
    for key in ("microdata", "rdfa"):
        for item in (data.get(key) or []):
            if isinstance(item, dict):
                cands.append(item)

    for obj in cands:
        if is_job(obj):
            return obj

    # Fallback OG (can give title/site_name)
    og = {}
    for meta in (data.get("opengraph") or []):
        if isinstance(meta, dict):
            og.update(meta)
    return og or None

def _map_structured(obj: dict, url: str) -> Dict[str, Any]:
    title = obj.get("title") or obj.get("og:title") or ""
    company = ""
    org = obj.get("hiringOrganization") or obj.get("hiringorganization") or {}
    if isinstance(org, dict):
        company = org.get("name") or ""
    if not company:
        company = obj.get("og:site_name") or obj.get("site_name") or ""

    def loc_from_joblocation(val):
        if isinstance(val, list) and val:
            val = val[0]
        if isinstance(val, dict):
            addr = val.get("address") or {}
            parts = [addr.get("addressLocality"), addr.get("addressRegion"), addr.get("addressCountry")]
            return ", ".join([p for p in parts if p])
        if isinstance(val, str):
            return val
        return ""

    location = loc_from_joblocation(obj.get("jobLocation")) or obj.get("joblocation") or ""
    emp = obj.get("employmentType") or obj.get("employmenttype") or ""
    if isinstance(emp, list):
        emp = ", ".join(emp)

    desc_html = obj.get("description") or obj.get("og:description") or ""
    desc_text = BeautifulSoup(str(desc_html), "lxml").get_text("\n").strip()
    rem = "remote" if "remote" in desc_text.lower() else ""

    return {
        "title": title or "",
        "company_name": company or "",
        "source_url": url,
        "location": location or "",
        "remote_type": rem,
        "job_type": emp or "",
        "description": _clean_text(desc_text),
        "requirements": [],
        "skills": []
    }

# ----------------- LLM extraction -----------------
def _llm_extract(url: str, text_body: str, hints: Dict[str, Any] | None) -> JobOut:
    # We send up to ~16k chars (safety cap)
    short = text_body[:16000]
    parts = [{"role": "system", "content": EXTRACT_SYSTEM_TEXT}]
    if hints:
        parts.append({"role": "user", "content": f"HINTS (may be partial): {json.dumps(hints, ensure_ascii=False)}"})
    parts.append({"role": "user", "content": f"Source URL: {url}\n\nTEXT:\n{short}"})

    resp = _get_client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=parts,
        max_tokens=2000
    )
    try:
        data = json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(500, f"LLM JSON parse error: {e}")

    job = data.get("job") or data
    # Normalize arrays & text
    reqs = [x.strip() for x in (job.get("requirements") or []) if x and x.strip()]
    skills = [x.strip() for x in (job.get("skills") or []) if x and x.strip()]
    desc = _clean_text(job.get("description") or "")

    return JobOut(
        title=job.get("title",""),
        company_name=job.get("company_name",""),
        source_url=job.get("source_url") or url,
        location=job.get("location",""),
        remote_type=job.get("remote_type",""),
        job_type=job.get("job_type",""),
        description=desc,
        requirements=reqs,
        skills=skills,
    )

# ----------------- Route: Extract -----------------
@router.post("/extract", response_model=ExtractOut)
def extract_job(payload: ExtractIn, request: Request):
    url  = payload.url
    html = payload.html or ""
    hints = payload.quick or {}

    # 0) Cheap DOM grabs for title/company if available
    t_c = _extract_title_company_generic(html)

    # 1) Structured data
    mapped = {}
    obj = _find_structured_job(html, url)
    if obj:
        mapped = _map_structured(obj, url)

    # 2) Full-page cleaned TEXT (for LLM)
    main_text = _readability_text(html)

    # Location/remote fallbacks from raw text (helps LinkedIn header)
    loc_fallback = _extract_location_freeform(_clean_text(BeautifulSoup(html, "lxml").get_text("\n")))
    rem_fallback = _extract_remote_type(main_text, hints.get("remote_type", ""), mapped.get("remote_type", ""))

    # Build hints for the LLM (non-binding)
    llm_hints = {
        "title": t_c.get("title") or mapped.get("title") or "",
        "company_name": t_c.get("company_name") or mapped.get("company_name") or "",
        "location": loc_fallback or mapped.get("location") or "",
        "remote_type": rem_fallback or "",
        "job_type": mapped.get("job_type") or "",
    }
    # allow extension-provided quick hints to override if present
    llm_hints.update({k:v for k,v in (hints or {}).items() if v})

    # 3) Ask LLM for the structure (FULL description, arrays split out)
    llm_job = _llm_extract(url, main_text, llm_hints)

    # 4) Merge best data: prefer LLM for desc/reqs/skills; prefer structured/DOM for sparse fields
    out = JobOut(
        title=llm_job.title or mapped.get("title") or t_c.get("title") or "",
        company_name=llm_job.company_name or mapped.get("company_name") or t_c.get("company_name") or "",
        source_url=url,
        location=llm_job.location or mapped.get("location") or loc_fallback or "",
        remote_type=llm_job.remote_type or rem_fallback or "",
        job_type=llm_job.job_type or mapped.get("job_type") or "",
        description=llm_job.description,  # already cleaned by LLM
        requirements=llm_job.requirements,
        skills=llm_job.skills,
    )

    # Last tiny cleanup: make sure description has no "Requirements" chunks accidentally left
    # Move any bullet lines following a requirements-ish header into the array.
    # Strong cleanup: move any remaining requirement-like content out of description
    new_desc, extra_reqs = _strip_requirements_from_description(out.description, out.requirements)
    out.description = new_desc
    out.requirements = list(dict.fromkeys((out.requirements or []) + extra_reqs))

    # Finally, if any requirement line still slipped into description verbatim, drop exact duplicates
    req_set = {r.strip() for r in out.requirements}
    out.description = "\n".join([ln for ln in out.description.split("\n") if ln.strip() not in req_set])


    return ExtractOut(job=out)

# ----------------- Resume suggestion/apply (unchanged) -----------------
@router.post("/resume/suggest", response_model=SuggestOut)
def resume_suggest(payload: SuggestIn, user=Depends(get_current_user)):
    resume_text = "(server loads user's current resume text…)"  # TODO
    text_body = _readability_text(payload.html)[:16000]
    messages = [
        {"role":"system","content":SUGGEST_SYSTEM},
        {"role":"user","content":f"JOB TEXT (cleaned):\n{text_body}"},
        {"role":"user","content":f"RESUME:\n{resume_text[:8000]}"},
    ]
    resp = _get_client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type":"json_object"},
        messages=messages,
        max_tokens=900
    )
    data = json.loads(resp.choices[0].message.content)
    suggestions = [
        Suggestion(
            title=s.get("title","Suggestion"),
            reason=s.get("reason",""),
            preview=s.get("preview","")
        ) for s in data.get("suggestions", [])
    ]
    return SuggestOut(suggestions=suggestions)

@router.post("/resume/apply", response_model=ApplyOut)
def resume_apply(payload: ApplyIn, user=Depends(get_current_user)):
    resume_text = "(server loads user's current resume text…)"
    chosen = payload.suggestion_indexes  # placeholder

    messages = [
        {"role":"system","content":APPLY_SYSTEM},
        {"role":"user","content":f"ORIGINAL_RESUME:\n{resume_text[:60000]}"},
        {"role":"user","content":f"CHOSEN_SUGGESTIONS:\n{json.dumps(chosen)}"}
    ]
    resp = _get_client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=messages,
        max_tokens=2000
    )
    updated_text = resp.choices[0].message.content.strip()

    # Save updated resume, return id
    resume_id = "new-resume-id"
    return ApplyOut(resume_id=resume_id)
