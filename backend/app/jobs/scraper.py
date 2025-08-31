from __future__ import annotations
import re
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

def guess_company_from_url(url: str) -> str | None:
    """
    Heuristic: take domain, strip TLD/subdomains, return core (e.g., jobs.nike.com -> nike).
    """
    host = urlparse(url).netloc.lower()
    parts = [p for p in host.split(".") if p not in ("www", "jobs", "careers")]
    if not parts:
        return None
    return parts[-2] if len(parts) >= 2 else parts[0]

def scrape_job(url: str, timeout: float = 10.0) -> dict:
    """
    Fetch a job page and try to extract title/company/description using OG tags then fallbacks.
    Returns a dict with possibly-missing fields (caller can override).
    """
    resp = httpx.get(url, timeout=timeout)
    resp.raise_for_status()
    html = resp.text
    soup = BeautifulSoup(html, "lxml")

    def meta(prop: str, attr: str = "property"):
        tag = soup.find("meta", {attr: prop})
        return tag["content"].strip() if tag and tag.has_attr("content") else None

    title = meta("og:title") or (soup.title.string.strip() if soup.title else None)
    company = meta("og:site_name") or guess_company_from_url(url)
    description = meta("og:description") or meta("description", "name")

    # Fallback crude description from first long <p>
    if not description:
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        paragraphs.sort(key=lambda t: -len(t))
        if paragraphs:
            description = paragraphs[0][:2000]  # limit to 2000 chars to keep reasonable

    # Try to guess location from visible text (very naive)
    location = None
    m = re.search(r"\b(Remote|Hybrid|On[- ]?site)\b", html, flags=re.IGNORECASE)
    if m:
        location = m.group(0).title()

    return {
        "title": title or "",
        "company_name": company or "",
        "location": location,
        "description": description or "",
        "source_url": url,
    }
