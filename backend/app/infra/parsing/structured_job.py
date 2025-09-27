from __future__ import annotations
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
import extruct
from w3lib.html import get_base_url
from ...domain.jobs.extraction.ports import StructuredDataExtractor

class ExtructStructuredData(StructuredDataExtractor):
    def find_job(self, html: str, url: str) -> Optional[Dict[str, Any]]:
        base = get_base_url(html or "", url or "")
        data = extruct.extract(html or "", base_url=base,
                               syntaxes=["json-ld", "microdata", "rdfa", "opengraph"],
                               errors="ignore")

        def is_job(obj: dict) -> bool:
            t = obj.get("@type") or obj.get("type") or obj.get("itemtype") or ""
            if isinstance(t, list): t = " ".join(map(str, t))
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

        og = {}
        for meta in (data.get("opengraph") or []):
            if isinstance(meta, dict):
                og.update(meta)
        return og or None

    def map_job(self, obj: Dict[str, Any], url: str) -> Dict[str, Any]:
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
            "description": " ".join(desc_text.split()),
            "requirements": [],
            "skills": []
        }
