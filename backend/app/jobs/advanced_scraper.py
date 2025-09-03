"""
Advanced Job Scraper with Multiple Strategies
============================================

This is a next-generation job scraper that uses multiple approaches to handle
modern job boards with anti-bot measures, complex JavaScript, and various architectures.
"""

from __future__ import annotations
import re
import json
import time
import asyncio
import random
from urllib.parse import urlparse, urljoin
from typing import Dict, List, Optional, Any
import httpx
from bs4 import BeautifulSoup

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class AdvancedJobScraper:
    """Advanced job scraper with multiple strategies and anti-detection"""
    
    def __init__(self):
        self.session = httpx.Client(
            timeout=30.0,
            follow_redirects=True,
            headers=self._get_random_headers()
        )
    
    def _get_random_headers(self) -> Dict[str, str]:
        """Get randomized headers to avoid detection"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]
        
        return {
            "User-Agent": random.choice(user_agents),
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
    
    async def scrape_with_playwright(self, url: str, wait_strategies: List[str] = None) -> Optional[str]:
        """Enhanced Playwright scraping with multiple wait strategies"""
        if not PLAYWRIGHT_AVAILABLE:
            return None
            
        wait_strategies = wait_strategies or [
            'networkidle',
            'domcontentloaded', 
            'load'
        ]
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor'
                    ]
                )
                
                context = await browser.new_context(
                    user_agent=random.choice([
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ]),
                    viewport={'width': 1920, 'height': 1080},
                    java_script_enabled=True,
                    bypass_csp=True,
                )
                
                page = await context.new_page()
                
                # Add extra headers
                await page.set_extra_http_headers({
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                })
                
                # Navigate with different wait strategies
                for strategy in wait_strategies:
                    try:
                        print(f"Trying Playwright with wait strategy: {strategy}")
                        await page.goto(url, wait_until=strategy, timeout=30000)
                        
                        # Wait for dynamic content
                        await page.wait_for_timeout(3000)
                        
                        # Try to wait for common job content selectors
                        job_selectors = [
                            '[class*="job-title"]',
                            '[class*="title"]', 
                            '[class*="position"]',
                            '[class*="role"]',
                            'h1', 'h2',
                            '[data-testid*="title"]',
                            '[data-testid*="job"]',
                            # Comeet-specific selectors
                            '.job-header',
                            '.position-title',
                            '.company-name',
                            # Wait for content that's not template variables
                            ':not(:contains("{{"))'
                        ]
                        
                        for selector in job_selectors:
                            try:
                                await page.wait_for_selector(selector, timeout=2000)
                                break
                            except:
                                continue
                        
                        # For heavy JS sites, wait longer and try to trigger content loading
                        if 'comeet.com' in url or 'lever.co' in url or 'greenhouse.io' in url:
                            print("Detected specialized job board, using extended wait...")
                            await page.wait_for_timeout(5000)
                            
                            # Try scrolling to trigger lazy loading
                            try:
                                await page.mouse.wheel(0, 1000)
                                await page.wait_for_timeout(2000)
                                await page.mouse.wheel(0, -1000)
                                await page.wait_for_timeout(1000)
                            except:
                                pass
                        
                        # Additional wait for lazy loading
                        await page.wait_for_timeout(2000)
                        
                        # Get content
                        content = await page.content()
                        await browser.close()
                        
                        if len(content) > 10000:  # Good content threshold
                            print(f"✅ Playwright success with {strategy}: {len(content)} chars")
                            return content
                        
                    except Exception as e:
                        print(f"Strategy {strategy} failed: {e}")
                        continue
                
                await browser.close()
                return None
                
        except Exception as e:
            print(f"Playwright scraping failed: {e}")
            return None
    
    def extract_structured_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract structured data (JSON-LD, microdata, etc.)"""
        structured_data = {}
        
        # JSON-LD
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                script_content = script.string or script.get_text()
                
                # Fix JSON with embedded unescaped newlines in string values
                # This is common in Comeet and similar job boards
                
                # First, fix unicode escapes
                cleaned_content = script_content.replace('\\u002D', '-')
                cleaned_content = cleaned_content.replace('\\u003D', '=')
                cleaned_content = cleaned_content.replace('\\u0026', '&')
                cleaned_content = cleaned_content.replace('\\u002F', '/')
                cleaned_content = cleaned_content.replace('\\u0022', '"')
                cleaned_content = cleaned_content.replace('\\u0027', "'")
                
                # Fix unescaped newlines in JSON string values by replacing with escaped newlines
                # This regex finds newlines that are inside quoted strings and escapes them
                import re
                def fix_newlines_in_strings(match):
                    content = match.group(0)
                    # Replace actual newlines with \\n within the quoted string
                    return content.replace('\n', '\\n').replace('\r', '\\r')
                
                # Match quoted strings and fix newlines within them
                cleaned_content = re.sub(r'"[^"]*"', fix_newlines_in_strings, cleaned_content)
                
                # Try to parse the cleaned JSON
                data = json.loads(cleaned_content)
                
                if isinstance(data, dict) and data.get('@type') == 'JobPosting':
                    print("✅ Found structured JobPosting data")
                    structured_data.update({
                        'title': data.get('title'),
                        'company': data.get('hiringOrganization', {}).get('name'),
                        'description': data.get('description'),
                        'location': self._extract_location_from_structured(data.get('jobLocation', {}))
                    })
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') == 'JobPosting':
                            print("✅ Found structured JobPosting data in array")
                            structured_data.update({
                                'title': item.get('title'),
                                'company': item.get('hiringOrganization', {}).get('name'),
                                'description': item.get('description'),
                                'location': self._extract_location_from_structured(item.get('jobLocation', {}))
                            })
                            break
            except Exception as e:
                print(f"JSON-LD parsing failed: {e}")
                continue
        
        return structured_data
    
    def _extract_location_from_structured(self, location_data: Dict) -> str:
        """Extract location from structured data"""
        if isinstance(location_data, dict):
            address = location_data.get('address', {})
            if isinstance(address, dict):
                city = address.get('addressLocality', '')
                country = address.get('addressCountry', '')
                return f"{city}, {country}".strip(', ')
            elif isinstance(address, str):
                return address
        return "Location not specified"
    
    def extract_job_content_advanced(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Advanced job content extraction with multiple strategies"""
        
        # Strategy 1: Structured data
        structured_data = self.extract_structured_data(soup)
        if structured_data.get('title') and len(structured_data.get('title', '')) > 3:
            print("✅ Found structured data (JSON-LD)")
            return structured_data
        
        # Strategy 2: Advanced pattern-based extraction
        job_data = {
            'title': self._extract_title_advanced(soup),
            'company': self._extract_company_advanced(soup, url),
            'description': self._extract_description_advanced(soup),
            'location': self._extract_location_advanced(soup)
        }
        
        return job_data
    
    def _extract_title_advanced(self, soup: BeautifulSoup) -> Optional[str]:
        """Advanced title extraction with priority-based selectors"""
        
        # High-priority selectors (most specific)
        high_priority = [
            '[data-testid*="job-title"]',
            '[data-testid*="title"]',
            '[data-automation-id*="jobTitle"]',
            '[data-automation-id*="title"]',
            '.job-posting-title',
            '.job-title',
            '.position-title',
            '.posting-headline',
            '[class*="job-title"]',
            '[class*="position-title"]',
            '[class*="posting-title"]',
        ]
        
        # Medium-priority selectors
        medium_priority = [
            'h1[class*="title"]',
            'h1[class*="job"]',
            'h1[class*="position"]',
            'h2[class*="title"]',
            'h2[class*="job"]',
            '[id*="job-title"]',
            '[id*="position-title"]',
            '.title',
            '.headline',
        ]
        
        # Low-priority selectors (fallback)
        low_priority = [
            'h1',
            'h2',
            '.page-title',
            'title'
        ]
        
        for selector_group in [high_priority, medium_priority, low_priority]:
            for selector in selector_group:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text(strip=True)
                    if self._is_valid_title(text):
                        return text
        
        return None
    
    def _is_valid_title(self, text: str) -> bool:
        """Check if extracted text is a valid job title"""
        if not text or len(text) < 3 or len(text) > 200:
            return False
        
        # Exclude template variables and generic terms
        invalid_terms = [
            'careers', 'jobs', 'we are hiring', 'join us', 'home', 'search',
            'loading', 'please wait', 'error', '404', 'not found', 'apply now',
            'sign in', 'login', 'register', 'cookie', 'privacy', 'terms',
            '{{', '}}', '{%', '%}', '${', '}$'  # Template variables
        ]
        
        text_lower = text.lower()
        if any(term in text_lower for term in invalid_terms):
            return False
        
        # Check for template variables
        if '{{' in text or '}}' in text or '{%' in text or '%}' in text:
            return False
        
        return True
    
    def _extract_company_advanced(self, soup: BeautifulSoup, url: str) -> Optional[str]:
        """Advanced company name extraction"""
        
        # Try structured data first
        meta_company = soup.find('meta', property='og:site_name')
        if meta_company and meta_company.get('content'):
            return meta_company['content']
        
        # Try specific selectors
        company_selectors = [
            '[data-testid*="company"]',
            '[data-automation-id*="company"]',
            '.company-name',
            '.employer-name',
            '.hiring-company',
            '[class*="company"]',
            '[class*="employer"]',
            '[id*="company"]'
        ]
        
        for selector in company_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text and 2 < len(text) < 100:
                    return text
        
        # Fallback to URL
        return self._guess_company_from_url(url)
    
    def _guess_company_from_url(self, url: str) -> Optional[str]:
        """Extract company name from URL"""
        try:
            host = urlparse(url).netloc.lower()
            # Remove common prefixes
            host = re.sub(r'^(www\.|careers\.|jobs\.|boards\.)', '', host)
            # Remove TLD
            company = host.split('.')[0]
            return company.title() if company else None
        except:
            return None
    
    def _extract_description_advanced(self, soup: BeautifulSoup) -> Optional[str]:
        """Advanced description extraction"""
        
        description_selectors = [
            '[data-testid*="description"]',
            '[data-testid*="job-content"]',
            '[data-automation-id*="description"]',
            '.job-description',
            '.job-content',
            '.position-description',
            '.posting-content',
            '.description',
            '[class*="description"]',
            '[class*="job-content"]',
            '[class*="content"]',
            '[id*="description"]',
            '[id*="job-content"]'
        ]
        
        for selector in description_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(' ', strip=True)
                if text and len(text) > 100:  # Meaningful description
                    return text[:2000]  # Limit length
        
        return None
    
    def _extract_location_advanced(self, soup: BeautifulSoup) -> Optional[str]:
        """Advanced location extraction"""
        
        location_selectors = [
            '[data-testid*="location"]',
            '[data-automation-id*="location"]',
            '.job-location',
            '.location',
            '.position-location',
            '[class*="location"]',
            '[id*="location"]'
        ]
        
        for selector in location_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                if text and 2 < len(text) < 100:
                    return text
        
        return "Location not specified"
    
    async def scrape_job_advanced(self, url: str) -> Dict[str, Any]:
        """Main advanced scraping function with multiple strategies"""
        
        print(f"🔍 Starting advanced scrape of: {url}")
        
        # Strategy 1: Try static HTTP request first
        try:
            print("📄 Trying static HTTP request...")
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            static_result = self.extract_job_content_advanced(soup, url)
            
            # Check if we got template variables (indicates need for JS rendering)
            has_templates = any('{{' in str(v) or '}}' in str(v) for v in static_result.values() if v)
            
            # Check if we got good data
            if (static_result.get('title') and 
                len(static_result.get('title', '')) > 3 and
                not has_templates and
                not any(term in static_result.get('title', '').lower() 
                       for term in ['careers', 'jobs', 'we are hiring'])):
                print("✅ Static scraping successful!")
                return {
                    'title': static_result.get('title', 'Title not found'),
                    'company_name': static_result.get('company', 'Company not found'),
                    'location': static_result.get('location', 'Location not specified'),
                    'description': static_result.get('description', 'Description not available'),
                    'source_url': url,
                    'method': 'static'
                }
            elif has_templates:
                print("⚠️ Detected template variables, forcing JavaScript rendering...")
                
        except Exception as e:
            print(f"❌ Static scraping failed: {e}")
        
        # Strategy 2: Try Playwright with multiple wait strategies
        print("🎭 Trying Playwright with multiple strategies...")
        js_html = await self.scrape_with_playwright(url)
        
        if js_html:
            soup = BeautifulSoup(js_html, 'lxml')
            js_result = self.extract_job_content_advanced(soup, url)
            
            if (js_result.get('title') and 
                len(js_result.get('title', '')) > 3 and
                not any('{{' in str(v) or '}}' in str(v) for v in js_result.values() if v)):
                print("✅ Playwright scraping successful!")
                return {
                    'title': js_result.get('title', 'Title not found'),
                    'company_name': js_result.get('company', 'Company not found'),
                    'location': js_result.get('location', 'Location not specified'),
                    'description': js_result.get('description', 'Description not available'),
                    'source_url': url,
                    'method': 'playwright'
                }
        
        # Strategy 3: Fallback with basic info
        print("⚠️ Advanced extraction failed, using fallback...")
        return {
            'title': 'Job posting detected but details not extractable',
            'company_name': self._guess_company_from_url(url) or 'Company not found',
            'location': 'Location not specified',
            'description': 'This job posting uses advanced anti-bot measures or complex JavaScript that prevents content extraction. Please visit the URL directly.',
            'source_url': url,
            'method': 'fallback'
        }


# Synchronous wrapper function for the existing interface
def scrape_job_advanced(url: str, timeout: float = 30.0) -> Dict[str, Any]:
    """Synchronous wrapper for advanced job scraping"""
    scraper = AdvancedJobScraper()
    try:
        return asyncio.run(scraper.scrape_job_advanced(url))
    except Exception as e:
        return {
            'title': 'Scraping failed',
            'company_name': 'Unknown',
            'location': 'Location not specified',
            'description': f'Failed to scrape job details: {str(e)}',
            'source_url': url,
            'method': 'error'
        }
