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
    # Handle Nike URLs - ensure we get English version
    processed_url = url
    if 'careers.nike.com' in url:
        # Replace /he/ or other language codes with /en/ or remove them
        processed_url = re.sub(r'/[a-z]{2}/', '/en/', url)
        if '/en/' not in processed_url and '/careers.nike.com/' in processed_url:
            processed_url = processed_url.replace('/careers.nike.com/', '/careers.nike.com/en/')
    
    # Add headers to appear more like a real browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    
    resp = httpx.get(processed_url, timeout=timeout, headers=headers, follow_redirects=True)
    resp.raise_for_status()
    html = resp.text
    soup = BeautifulSoup(html, "lxml")

    def meta(prop: str, attr: str = "property"):
        tag = soup.find("meta", {attr: prop})
        return tag["content"].strip() if tag and tag.has_attr("content") else None

    title = meta("og:title") or (soup.title.string.strip() if soup.title else None)
    company = meta("og:site_name") or guess_company_from_url(url)
    
    # Better description extraction - prioritize content over meta tags for full descriptions
    description = None
    
    # First try content selectors for full job descriptions
    content_selectors = [
        ".job-description",
        ".job-content", 
        "[data-automation-id*='description']",
        "[data-automation-id*='jobDescription']",
        "[class*='job-description']",
        "[class*='description']", 
        "[class*='content']", 
        "[id*='description']",
        ".job-details", 
        ".position-description"
    ]
    
    for selector in content_selectors:
        desc_elem = soup.select_one(selector)
        if desc_elem:
            desc_text = desc_elem.get_text(" ", strip=True)
            if len(desc_text) > 200:  # Only use if substantial content
                description = desc_text
                break
    
    # If no substantial content found, try structured data
    if not description:
        json_ld = soup.find("script", {"type": "application/ld+json"})
        if json_ld:
            try:
                import json
                data = json.loads(json_ld.string)
                if isinstance(data, dict) and 'description' in data:
                    description = data['description']
                elif isinstance(data, list) and data and 'description' in data[0]:
                    description = data[0]['description']
            except:
                pass
    
    # Fallback to meta tags only if no content found
    if not description:
        description = meta("og:description") or meta("description", "name")

    # Better company name extraction for specific sites
    if not company or company == title:
        # For Nike, use the brand name
        if 'nike.com' in url.lower():
            company = 'Nike'
        else:
            # Try to extract from structured data
            json_ld = soup.find("script", {"type": "application/ld+json"})
            if json_ld:
                try:
                    import json
                    data = json.loads(json_ld.string)
                    if isinstance(data, dict):
                        company = data.get("hiringOrganization", {}).get("name")
                    elif isinstance(data, list) and data:
                        company = data[0].get("hiringOrganization", {}).get("name")
                except:
                    pass
            
            # Fallback to URL-based guess
            if not company:
                company = guess_company_from_url(url)
    
    # Final fallback for description if still not found
    if not description:
        # Try crude description from first long <p>
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        paragraphs.sort(key=lambda t: -len(t))
        if paragraphs and len(paragraphs[0]) > 50:
            description = paragraphs[0][:2000]  # limit to 2000 chars to keep reasonable

    # Better location extraction
    location = None
    # Try structured data first
    json_ld = soup.find("script", {"type": "application/ld+json"})
    if json_ld:
        try:
            import json
            data = json.loads(json_ld.string)
            if isinstance(data, dict):
                job_location = data.get("jobLocation", {})
                if job_location:
                    address = job_location.get("address", {})
                    if isinstance(address, dict):
                        city = address.get("addressLocality")
                        state = address.get("addressRegion")
                        if city and state:
                            location = f"{city}, {state}"
                        elif city:
                            location = city
            elif isinstance(data, list) and data:
                job_location = data[0].get("jobLocation", {})
                if job_location:
                    address = job_location.get("address", {})
                    if isinstance(address, dict):
                        city = address.get("addressLocality")
                        state = address.get("addressRegion")
                        if city and state:
                            location = f"{city}, {state}"
                        elif city:
                            location = city
        except:
            pass
    
    # Fallback location patterns
    if not location:
        location_patterns = [
            r"\b(Remote|Hybrid|On[- ]?site)\b",
            r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b",  # City, State
            r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b"  # City, Country
        ]
        for pattern in location_patterns:
            m = re.search(pattern, html, flags=re.IGNORECASE)
            if m:
                location = m.group(0).title()
                break

    return {
        "title": title or "",
        "company_name": company or "",
        "location": location,
        "description": description or "",
        "source_url": url,
    }
