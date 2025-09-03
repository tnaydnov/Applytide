from __future__ import annotations
import re
import json
import time
import asyncio
from urllib.parse import urlparse, urljoin
import httpx
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Any

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# Import the advanced scraper
try:
    from .advanced_scraper import scrape_job_advanced
    ADVANCED_SCRAPER_AVAILABLE = True
except ImportError:
    ADVANCED_SCRAPER_AVAILABLE = False

def guess_company_from_url(url: str) -> str | None:
    """
    Heuristic: take domain, strip TLD/subdomains, return core (e.g., jobs.example.com -> example).
    """
    host = urlparse(url).netloc.lower()
    parts = [p for p in host.split(".") if p not in ("www", "jobs", "careers", "boards")]
    if not parts:
        return None
    return parts[-2] if len(parts) >= 2 else parts[0]

def extract_job_id_from_url(url: str) -> Optional[str]:
    """Extract job ID from various URL patterns without hardcoding specific services"""
    # Generic patterns for job IDs - ordered by specificity
    patterns = [
        r'[?&](?:job_?id|jobid|posting_?id|position_?id|jid|gh_jid)=(\w+)',  # Query parameters
        r'/(?:jobs?|positions?|postings?|careers?)/(\w+)(?:[/?]|$)',  # Path segments
        r'/(\d{4,})(?:[/?]|$)',  # Numeric IDs (4+ digits to avoid false matches)
        r'[?&]id=(\w+)',  # Generic ID parameter
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            job_id = match.group(1)
            # Filter out obvious non-job-IDs
            if len(job_id) >= 3 and not job_id.lower() in ['new', 'all', 'list', 'search']:
                return job_id
    return None

def detect_job_board_type(url: str, html: str) -> str:
    """Detect what type of job board we're dealing with based on patterns, not hardcoded names"""
    url_lower = url.lower()
    html_lower = html.lower()
    
    # Look for data attributes that indicate specific frameworks
    if 'data-automation-id' in html_lower:
        return 'automation_based'  # Common in enterprise solutions
    elif 'posting-headline' in html_lower or 'posting-description' in html_lower:
        return 'posting_based'  # Common pattern in job boards
    elif '.app-title' in html_lower or 'app-title' in html_lower:
        return 'app_based'  # Single page applications
    elif 'job-detail' in html_lower or 'jv-job' in html_lower:
        return 'detail_based'  # Detail-focused layouts
    elif 'position-title' in html_lower or 'position-header' in html_lower:
        return 'position_based'  # Position-focused layouts
    elif any(framework in html_lower for framework in ['react', 'vue', 'angular']):
        return 'spa_framework'  # Single page applications
    elif 'boards.' in url_lower or '/boards/' in url_lower:
        return 'board_system'  # Dedicated job board systems
    else:
        return 'generic'

def find_alternative_job_urls(url: str, html: str, job_id: str = None) -> List[str]:
    """Find alternative URLs that might contain the actual job data using generic patterns"""
    urls = []
    soup = BeautifulSoup(html, 'lxml')
    parsed_url = urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    # Look for iframes that might contain job content
    iframes = soup.find_all('iframe')
    for iframe in iframes:
        src = iframe.get('src')
        if src:
            if src.startswith('//'):
                src = f"{parsed_url.scheme}:{src}"
            elif src.startswith('/'):
                src = f"{base_url}{src}"
            elif not src.startswith('http'):
                src = urljoin(url, src)
            urls.append(src)
    
    # Look for API endpoints in script tags
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string:
            # Look for API URLs with job-related patterns
            api_patterns = [
                r'["\']([^"\']*(?:api|jobs?|job|posting|position|career)[^"\']*)["\']',
                r'["\']([^"\']*\.(?:json|xml)[^"\']*)["\']',  # Data endpoints
                r'["\']([^"\']*(?:boards?|apply|recruit)[^"\']*)["\']',  # Board systems
            ]
            
            for pattern in api_patterns:
                matches = re.findall(pattern, script.string, re.IGNORECASE)
                for match in matches:
                    if len(match) > 5:  # Filter out short/meaningless matches
                        if match.startswith('/'):
                            urls.append(f"{base_url}{match}")
                        elif match.startswith('http'):
                            urls.append(match)
    
    # If we have a job ID, try common API patterns
    if job_id:
        company = guess_company_from_url(url)
        potential_urls = [
            f"{base_url}/api/jobs/{job_id}",
            f"{base_url}/api/v1/jobs/{job_id}",
            f"{base_url}/api/v2/jobs/{job_id}",
            f"{base_url}/jobs/{job_id}",
            f"{base_url}/job/{job_id}",
            f"{base_url}/posting/{job_id}",
            f"{base_url}/positions/{job_id}",
            f"{base_url}/careers/{job_id}",
        ]
        
        # Try to construct board URLs dynamically based on URL patterns
        if company and any(param in url for param in ['jid=', 'job_id=', 'jobId=']):
            # Look for board subdomain patterns
            board_patterns = [
                f"https://boards.{parsed_url.netloc}/{company}/jobs/{job_id}",
                f"https://jobs.{parsed_url.netloc}/{company}/jobs/{job_id}",
                f"https://careers.{parsed_url.netloc}/{company}/jobs/{job_id}",
            ]
            potential_urls.extend(board_patterns)
        
        urls.extend([u for u in potential_urls if u])
    
    return list(set(urls))  # Remove duplicates

def extract_json_from_scripts(soup: BeautifulSoup) -> List[Dict]:
    """Extract JSON data from script tags that might contain job information"""
    json_data = []
    
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string:
            # Look for JSON-LD structured data
            if 'application/ld+json' in str(script.get('type', '')):
                try:
                    data = json.loads(script.string)
                    json_data.append(data)
                except:
                    pass
            
            # Look for other JSON structures in scripts
            json_patterns = [
                r'window\.__INITIAL_STATE__\s*=\s*({.+?});',
                r'window\.__DATA__\s*=\s*({.+?});',
                r'window\.jobData\s*=\s*({.+?});',
                r'var\s+jobData\s*=\s*({.+?});',
                r'const\s+jobData\s*=\s*({.+?});',
                r'"job"\s*:\s*({.+?})',
                r'"posting"\s*:\s*({.+?})',
            ]
            
            for pattern in json_patterns:
                matches = re.findall(pattern, script.string, re.DOTALL)
                for match in matches:
                    try:
                        data = json.loads(match)
                        json_data.append(data)
                    except:
                        pass
    
    return json_data

def extract_title_from_content(soup: BeautifulSoup, job_board_type: str) -> Optional[str]:
    """Extract job title using adaptive selectors based on detected patterns"""
    
    # Define selectors based on detected patterns, not specific services
    selectors_by_type = {
        'automation_based': [
            '[data-automation-id*="title"]',
            '[data-automation-id*="job"]',
            '[data-automation-id*="position"]',
            'h1[data-automation-id]',
            'h2[data-automation-id]',
        ],
        'posting_based': [
            '.posting-headline .posting-headline__title',
            '.posting-headline h1',
            '.posting-headline h2',
            '.posting-title',
            '.posting-header h1',
            '.posting-header h2',
        ],
        'app_based': [
            '.app-title',
            '#app-title',
            '.application-title',
            '#application-title',
        ],
        'detail_based': [
            '.job-detail-name',
            '.job-detail-title',
            '.detail-title',
            '.detail-name',
        ],
        'position_based': [
            '.position-title',
            '.position-name',
            'h1.position-title',
            '.job-position',
        ],
        'spa_framework': [
            '[data-testid*="title"]',
            '[data-testid*="job"]',
            '.title',
            '#title',
            '[role="heading"]',
        ],
        'board_system': [
            '.board-title',
            '.job-board-title',
            'header h1',
            'header h2',
        ],
        'generic': [
            '.job-title',
            '.job-name',
            '.position-title',
            '.title',
            '[class*="job-title"]',
            '[class*="position-title"]',
            '[class*="job-name"]',
            '[id*="job-title"]',
            '[id*="position-title"]',
            '[id*="title"]',
            'h1',
            'h2',
            'h3',
        ]
    }
    
    # Get selectors for this board type, fallback to generic
    selectors = selectors_by_type.get(job_board_type, selectors_by_type['generic'])
    
    # Always include generic selectors as fallback
    if job_board_type != 'generic':
        selectors.extend(selectors_by_type['generic'])
    
    for selector in selectors:
        elements = soup.select(selector)
        for element in elements:
            text = element.get_text(strip=True)
            # Skip generic/empty titles with adaptive filtering
            excluded_terms = [
                'careers', 'we are hiring', 'join the', 'join our team', 
                'home', 'jobs', 'search', 'loading', 'apply now',
                'welcome', 'sign in', 'login', 'register', 'menu'
            ]
            if (text and len(text) > 3 and len(text) < 200 and  # Reasonable length
                not any(term in text.lower() for term in excluded_terms)):
                return text
    
    return None

def detect_javascript_content(html: str) -> bool:
    """Detect if the page heavily relies on JavaScript for content"""
    indicators = [
        'window.__INITIAL_STATE__',
        'window.__DATA__',
        'ng-app',  # Angular
        'data-reactroot',  # React
        'id="app"',  # Vue or other SPA
        'loading...',
        'please enable javascript',
        'noscript',
        'window.jobData',
        'window.postingData',
        'document.getElementById',
        'querySelector',
        'addEventListener',
        'iframe',
    ]
    
    html_lower = html.lower()
    js_indicators = sum(1 for indicator in indicators if indicator.lower() in html_lower)
    
    # Also check script to content ratio
    soup = BeautifulSoup(html, 'lxml')
    scripts = soup.find_all('script')
    script_content = sum(len(script.get_text()) for script in scripts)
    
    # Remove scripts and check remaining content
    for script in scripts:
        script.decompose()
    
    remaining_text = soup.get_text(strip=True)
    
    # If there's a lot of script content relative to visible content, it's likely JS-heavy
    if len(remaining_text) > 0:
        script_ratio = script_content / len(remaining_text)
        if script_ratio > 1.5:  # More script than content
            js_indicators += 2
    
    # Check for minimal meaningful content
    if len(remaining_text) < 200:
        js_indicators += 1
    
    return js_indicators >= 2

def extract_job_data_from_page(soup: BeautifulSoup, url: str, job_board_type: str) -> dict:
    """Extract job data from a BeautifulSoup page"""
    
    def meta(prop: str, attr: str = "property"):
        tag = soup.find("meta", {attr: prop})
        return tag["content"].strip() if tag and tag.has_attr("content") else None

    # Try meta tags first
    title = meta("og:title") or meta("title", "name") or (soup.title.string.strip() if soup.title else None)
    description = meta("og:description") or meta("description", "name")
    company = guess_company_from_url(url)
    
    # Extract structured data from JSON-LD or other scripts
    json_data_list = extract_json_from_scripts(soup)
    for json_data in json_data_list:
        json_result = extract_job_data_from_json(json_data)
        if json_result.get('title'):
            # Merge with existing data
            if not title or 'careers' in title.lower():
                title = json_result.get('title')
            if not description:
                description = json_result.get('description')
            if not company:
                company = json_result.get('company')
    
    # If title is generic or missing, try content-based extraction
    if not title or any(generic in title.lower() for generic in ['careers', 'we are hiring', 'join']):
        content_title = extract_title_from_content(soup, job_board_type)
        if content_title:
            title = content_title
    
    # Extract description if not found in meta
    if not description:
        description = extract_description_from_content(soup, job_board_type)
    
    # Extract company if not guessed from URL
    if not company:
        company = extract_company_from_content(soup, job_board_type)
    
    return {
        "title": title or "Job Title Not Found",
        "company": company or "Company Not Found", 
        "description": description or "Description not available",
        "url": url
    }

def extract_job_data_from_json(json_data: Any) -> dict:
    """Extract job data from JSON structures"""
    result = {}
    
    if isinstance(json_data, dict):
        # Handle different JSON structures
        for key, value in json_data.items():
            key_lower = key.lower()
            
            # Title extraction
            if 'title' in key_lower or 'name' in key_lower or 'position' in key_lower:
                if isinstance(value, str) and len(value) > 2:
                    result['title'] = value
            
            # Company extraction
            elif 'company' in key_lower or 'employer' in key_lower or 'organization' in key_lower:
                if isinstance(value, str):
                    result['company'] = value
                elif isinstance(value, dict) and 'name' in value:
                    result['company'] = value['name']
            
            # Description extraction
            elif 'description' in key_lower or 'content' in key_lower or 'summary' in key_lower:
                if isinstance(value, str) and len(value) > 10:
                    result['description'] = value
            
            # Recursively search nested objects
            elif isinstance(value, dict):
                nested_result = extract_job_data_from_json(value)
                for k, v in nested_result.items():
                    if k not in result:
                        result[k] = v
            
            # Search arrays
            elif isinstance(value, list) and len(value) > 0:
                for item in value:
                    if isinstance(item, dict):
                        nested_result = extract_job_data_from_json(item)
                        for k, v in nested_result.items():
                            if k not in result:
                                result[k] = v
    
    return result

def extract_description_from_content(soup: BeautifulSoup, job_board_type: str) -> Optional[str]:
    """Extract job description from page content using adaptive selectors"""
    
    selectors_by_type = {
        'automation_based': [
            '[data-automation-id*="description"]',
            '[data-automation-id*="jobDescription"]',
            '[data-automation-id*="content"]',
        ],
        'posting_based': [
            '.posting-content',
            '.posting-description',
            '.posting-body',
            '#content .posting-description',
        ],
        'app_based': [
            '.app-content',
            '.application-content',
            '.app-description',
        ],
        'detail_based': [
            '.job-detail-content',
            '.detail-description',
            '.detail-content',
        ],
        'position_based': [
            '.position-description',
            '.position-content',
            '.position-details',
        ],
        'spa_framework': [
            '[data-testid*="description"]',
            '[data-testid*="content"]',
            '.content',
            '.description',
        ],
        'board_system': [
            '.board-content',
            '.job-board-content',
            'main .content',
        ],
        'generic': [
            '.job-description',
            '.description',
            '.content',
            '.job-content',
            '.job-details',
            '[class*="description"]',
            '[class*="content"]',
            '[class*="details"]',
            '[id*="description"]',
            '[id*="content"]',
            '.main-content',
            'main',
            'article',
            '.body',
            '.text',
        ]
    }
    
    selectors = selectors_by_type.get(job_board_type, selectors_by_type['generic'])
    if job_board_type != 'generic':
        selectors.extend(selectors_by_type['generic'])
    
    for selector in selectors:
        elements = soup.select(selector)
        for element in elements:
            text = element.get_text(strip=True)
            if text and len(text) > 50:  # Meaningful description length
                return text[:1500]  # Limit length
    
    return None

def extract_company_from_content(soup: BeautifulSoup, job_board_type: str) -> Optional[str]:
    """Extract company name from page content"""
    
    selectors = [
        '.company-name',
        '.employer-name',
        '[class*="company"]',
        '[class*="employer"]',
        '.posting-company',
        '.job-company',
    ]
    
    for selector in selectors:
        elements = soup.select(selector)
        for element in elements:
            text = element.get_text(strip=True)
            if text and len(text) > 1 and len(text) < 100:
                return text
    
    return None

async def scrape_with_javascript(url: str, timeout: float = 10.0, wait_for_selector: str = None) -> Optional[str]:
    """
    Scrape a page that requires JavaScript rendering using Playwright.
    Returns the fully rendered HTML content.
    """
    if not PLAYWRIGHT_AVAILABLE:
        print("Playwright not available, falling back to static scraping")
        return None
    
    try:
        async with async_playwright() as p:
            # Use Chromium for better compatibility
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            )
            
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 720}
            )
            
            page = await context.new_page()
            
            # Set timeout
            page.set_default_timeout(timeout * 1000)
            
            # Navigate to the page
            await page.goto(url, wait_until='networkidle')
            
            # Wait for specific selector if provided
            if wait_for_selector:
                try:
                    await page.wait_for_selector(wait_for_selector, timeout=5000)
                except:
                    pass  # Continue even if selector not found
            
            # Wait a bit more for dynamic content to load
            await page.wait_for_timeout(2000)
            
            # Get the fully rendered HTML
            html_content = await page.content()
            
            await browser.close()
            return html_content
            
    except Exception as e:
        print(f"JavaScript scraping failed: {e}")
        return None

def detect_javascript_heavy_page(html: str) -> bool:
    """Detect if a page heavily relies on JavaScript for content rendering"""
    html_lower = html.lower()
    
    # Check for minimal content indicators
    text_content = BeautifulSoup(html, 'lxml').get_text(strip=True)
    
    # Signs of a JavaScript-heavy page
    js_indicators = [
        len(text_content) < 200,  # Very little text content
        'loading...' in html_lower,
        'please enable javascript' in html_lower,
        'javascript is required' in html_lower,
        html_lower.count('<script') > 5,  # Many script tags
        'react' in html_lower or 'vue' in html_lower or 'angular' in html_lower,
        'data-reactroot' in html_lower,
        'ng-app' in html_lower,
        '__webpack' in html_lower,
        'chunk.js' in html_lower,
    ]
    
    return sum(js_indicators) >= 2  # If multiple indicators present

def scrape_with_javascript_sync(url: str, timeout: float = 10.0) -> Optional[str]:
    """Synchronous wrapper for JavaScript scraping"""
    try:
        return asyncio.run(scrape_with_javascript(url, timeout))
    except Exception as e:
        print(f"JavaScript scraping failed: {e}")
        return None

# Synchronous wrapper function for the existing interface
def scrape_job_advanced_sync(url: str, timeout: float = 30.0) -> Dict[str, Any]:
    """Enhanced synchronous wrapper that uses the advanced scraper when needed"""
    
    # Check if this URL is likely to need advanced scraping
    advanced_needed_indicators = [
        'comeet.com',
        'lever.co', 
        'greenhouse.io',
        'workday.com',
        'successfactors.com',
        'taleo.net',
        'icims.com',
        'smartrecruiters.com',
        'jobvite.com',
        'bamboohr.com'
    ]
    
    # Force advanced scraper for known problematic domains
    if ADVANCED_SCRAPER_AVAILABLE and any(domain in url.lower() for domain in advanced_needed_indicators):
        print(f"🚀 Using advanced scraper for: {url}")
        try:
            return scrape_job_advanced(url, timeout)
        except Exception as e:
            print(f"❌ Advanced scraper failed, falling back to basic: {e}")
    
    # Try basic scraper first for unknown domains
    try:
        result = scrape_job(url, timeout)
        
        # Check if basic scraper got template variables or poor results
        title = result.get('title', '')
        if ('{{' in title or '}}' in title or 
            title in ['Job Title Not Found', 'Where Do We Go From Here?'] or
            len(title) < 5):
            
            if ADVANCED_SCRAPER_AVAILABLE:
                print(f"🔄 Basic scraper got poor results, trying advanced scraper...")
                return scrape_job_advanced(url, timeout)
        
        return result
        
    except Exception as e:
        if ADVANCED_SCRAPER_AVAILABLE:
            print(f"🔄 Basic scraper failed, trying advanced scraper...")
            return scrape_job_advanced(url, timeout)
        else:
            return {
                'title': 'Scraping failed',
                'company_name': 'Unknown',
                'location': 'Location not specified', 
                'description': f'Failed to scrape job details: {str(e)}',
                'source_url': url
            }

def scrape_job_enhanced(url: str, timeout: float = 30.0) -> dict:
    """
    Enhanced job scraper that automatically chooses the best strategy.
    This is the new recommended function to use.
    """
    return scrape_job_advanced_sync(url, timeout)

def scrape_job(url: str, timeout: float = 10.0) -> dict:
    """
    Advanced job scraper that can handle various job boards, JavaScript content, and iframes.
    Uses multiple strategies to extract job information.
    """
    
    # Standard headers to appear like a real browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    }
    
    job_id = extract_job_id_from_url(url)
    
    # Try the main URL first
    try:
        resp = httpx.get(url, timeout=timeout, headers=headers, follow_redirects=True)
        resp.raise_for_status()
        html = resp.text
        soup = BeautifulSoup(html, "lxml")
        
        # Detect what type of job board this is
        job_board_type = detect_job_board_type(url, html)
        
        # Check if this looks like a page with JavaScript-rendered content
        is_js_heavy = detect_javascript_content(html)
        print(f"JavaScript-heavy page detected: {is_js_heavy}")
        
        # If it's JS-heavy, find alternative URLs to try
        alternative_urls = []
        if is_js_heavy:
            alternative_urls = find_alternative_job_urls(url, html, job_id)
        
        # Try to extract data from the current page first
        result = extract_job_data_from_page(soup, url, job_board_type)
        
        # If we got good data, return it
        if result.get('title') and len(result['title']) > 3 and 'not found' not in result['title'].lower():
            return {
                "title": result['title'],
                "company_name": result['company'],
                "location": "Location Not Specified",
                "description": result['description'],
                "source_url": url,
            }
        
        # If initial attempt failed and page seems JavaScript-heavy, try browser rendering
        if is_js_heavy and PLAYWRIGHT_AVAILABLE:
            print(f"Detected JavaScript-heavy page, trying browser rendering...")
            js_html = scrape_with_javascript_sync(url, timeout)
            if js_html:
                js_soup = BeautifulSoup(js_html, "lxml")
                js_result = extract_job_data_from_page(js_soup, url, job_board_type)
                
                if js_result.get('title') and len(js_result['title']) > 3 and 'not found' not in js_result['title'].lower():
                    return {
                        "title": js_result['title'],
                        "company_name": js_result['company'],
                        "location": "Location Not Specified",
                        "description": js_result['description'],
                        "source_url": url,
                    }
        
        # If not successful and we have alternative URLs, try them
        for alt_url in alternative_urls[:5]:  # Limit to prevent too many requests
            try:
                print(f"Trying alternative URL: {alt_url}")
                alt_resp = httpx.get(alt_url, timeout=timeout, headers=headers, follow_redirects=True)
                alt_resp.raise_for_status()
                
                # Try as JSON first (API endpoint)
                try:
                    json_data = alt_resp.json()
                    json_result = extract_job_data_from_json(json_data)
                    if json_result.get('title') and len(json_result['title']) > 3:
                        return {
                            "title": json_result['title'],
                            "company_name": json_result.get('company', guess_company_from_url(url)),
                            "location": "Location Not Specified",
                            "description": json_result.get('description', 'Description not available'),
                            "source_url": url,
                        }
                except:
                    pass
                
                # Try as HTML
                alt_soup = BeautifulSoup(alt_resp.text, "lxml")
                alt_result = extract_job_data_from_page(alt_soup, alt_url, job_board_type)
                if alt_result.get('title') and len(alt_result['title']) > 3 and 'not found' not in alt_result['title'].lower():
                    return {
                        "title": alt_result['title'],
                        "company_name": alt_result['company'],
                        "location": "Location Not Specified", 
                        "description": alt_result['description'],
                        "source_url": url,
                    }
                
                # If HTML parsing failed and page might be JavaScript-heavy, try browser rendering
                if detect_javascript_content(alt_resp.text) and PLAYWRIGHT_AVAILABLE:
                    print(f"Trying JavaScript rendering for alternative URL: {alt_url}")
                    js_html = scrape_with_javascript_sync(alt_url, timeout)
                    if js_html:
                        js_soup = BeautifulSoup(js_html, "lxml")
                        js_result = extract_job_data_from_page(js_soup, alt_url, job_board_type)
                        
                        if js_result.get('title') and len(js_result['title']) > 3 and 'not found' not in js_result['title'].lower():
                            return {
                                "title": js_result['title'],
                                "company_name": js_result['company'],
                                "location": "Location Not Specified",
                                "description": js_result['description'],
                                "source_url": url,
                            }
                    
            except Exception as e:
                print(f"Failed to fetch alternative URL {alt_url}: {e}")
                continue
        
        # If still no good data, provide helpful feedback
        if is_js_heavy and (not result.get('title') or 'not found' in result.get('title', '').lower()):
            return {
                "title": "JavaScript-Rendered Content Detected",
                "company_name": result.get('company', guess_company_from_url(url)) or "Company Not Found",
                "location": "Location Not Available",
                "description": "This page appears to load job content via JavaScript or in an iframe. The job details may not be fully accessible via basic web scraping. Try accessing the page directly in a browser or look for a direct job posting URL.",
                "source_url": url,
            }
        
        # Return what we have
        return {
            "title": result.get('title', 'Job Title Not Found'),
            "company_name": result.get('company', guess_company_from_url(url)) or "Company Not Found",
            "location": "Location Not Specified",
            "description": result.get('description', 'Description not available'),
            "source_url": url,
        }
        
    except Exception as e:
        return {
            "title": "Error Fetching Job",
            "company_name": guess_company_from_url(url) or "Unknown Company",
            "location": "Location Not Available",
            "description": f"Failed to fetch URL: {e}",
            "source_url": url,
        }
