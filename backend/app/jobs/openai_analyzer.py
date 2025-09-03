"""
OpenAI-Powered Job Analysis Service
==================================

This service uses OpenAI to analyze job pages and extract detailed information.
Only available for premium users.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
from openai import OpenAI


class OpenAIJobAnalyzer:
    """OpenAI-powered job analyzer for premium users"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = OpenAI(api_key=self.openai_api_key)
        
        # Standard headers to appear like a browser
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

    async def fetch_page_content(self, url: str) -> str:
        """Fetch and clean the content from a job posting URL"""
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                # Parse HTML and extract text
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "header", "footer"]):
                    script.decompose()
                
                # Get text content
                text = soup.get_text()
                
                # Clean up whitespace
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)
                
                return text
                
        except Exception as e:
            raise Exception(f"Failed to fetch page content: {str(e)}")

    async def analyze_job_with_openai(self, page_content: str) -> Dict[str, Any]:
        """Use OpenAI to analyze job posting content and extract structured data"""
        
        prompt = f"""
        Analyze the following job posting content and extract structured information in JSON format.
        
        Please extract the following fields (use exact field names):
        - title: Job title
        - company_name: Company name  
        - location: Location (city, state/country)
        - remote_type: "remote", "hybrid", "on-site", or null
        - employment_type: "full-time", "part-time", "contract", "internship", etc.
        - experience_level: "entry", "mid", "senior", "executive", etc.
        - required_skills: Array of required skills
        - preferred_skills: Array of preferred skills  
        - education: Education requirements
        - salary_min: Minimum salary as number (if mentioned)
        - salary_max: Maximum salary as number (if mentioned)
        - benefits: Array of benefits
        - description: Full job description text
        - summary: 2-3 sentence summary
        - responsibilities: Array of key responsibilities
        - industry: Industry/field
        - department: Department/team

        Job posting content:
        {page_content[:4000]}

        Return ONLY valid JSON with the extracted information. Use null for missing data, empty arrays for missing lists.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Cost-effective model
                messages=[
                    {"role": "system", "content": "You are an expert job posting analyzer. Extract structured information from job postings and return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.1  # Low temperature for consistent extraction
            )
            
            content = response.choices[0].message.content.strip()
            
            # Try to parse as JSON
            import json
            try:
                extracted_data = json.loads(content)
                
                # Ensure we have the basic required fields with defaults
                job_data = {
                    "title": extracted_data.get("title", ""),
                    "company_name": extracted_data.get("company_name", ""),
                    "location": extracted_data.get("location"),
                    "remote_type": extracted_data.get("remote_type"),
                    "employment_type": extracted_data.get("employment_type"),
                    "experience_level": extracted_data.get("experience_level"),
                    "salary_min": extracted_data.get("salary_min"),
                    "salary_max": extracted_data.get("salary_max"),
                    "description": extracted_data.get("description", page_content[:2000]),  # Fallback to original content
                    "required_skills": extracted_data.get("required_skills", []),
                    "preferred_skills": extracted_data.get("preferred_skills", []),
                    "benefits": extracted_data.get("benefits", []),
                    "responsibilities": extracted_data.get("responsibilities", []),
                    "industry": extracted_data.get("industry"),
                    "department": extracted_data.get("department"),
                    "education": extracted_data.get("education"),
                    "summary": extracted_data.get("summary", ""),
                }
                
                return job_data
                
            except json.JSONDecodeError:
                # If parsing fails, try to extract JSON from the response
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    extracted_data = json.loads(json_match.group())
                    # Apply same format processing as above
                    job_data = {
                        "title": extracted_data.get("title", ""),
                        "company_name": extracted_data.get("company_name", ""),
                        "location": extracted_data.get("location"),
                        "remote_type": extracted_data.get("remote_type"),
                        "employment_type": extracted_data.get("employment_type"),
                        "experience_level": extracted_data.get("experience_level"),
                        "salary_min": extracted_data.get("salary_min"),
                        "salary_max": extracted_data.get("salary_max"),
                        "description": extracted_data.get("description", page_content[:2000]),
                        "required_skills": extracted_data.get("required_skills", []),
                        "preferred_skills": extracted_data.get("preferred_skills", []),
                        "benefits": extracted_data.get("benefits", []),
                        "responsibilities": extracted_data.get("responsibilities", []),
                        "industry": extracted_data.get("industry"),
                        "department": extracted_data.get("department"),
                        "education": extracted_data.get("education"),
                        "summary": extracted_data.get("summary", ""),
                    }
                    return job_data
                else:
                    raise ValueError("Could not extract valid JSON from OpenAI response")
                    
        except Exception as e:
            raise Exception(f"OpenAI analysis failed: {str(e)}")

    async def analyze_job_posting(self, url: str) -> Dict[str, Any]:
        """Complete job analysis pipeline: fetch content and analyze with OpenAI"""
        
        # Step 1: Fetch page content
        page_content = await self.fetch_page_content(url)
        
        # Step 2: Analyze with OpenAI
        analysis = await self.analyze_job_with_openai(page_content)
        
        # Step 3: Add metadata
        analysis["analyzed_at"] = datetime.utcnow().isoformat()
        analysis["source_url"] = url
        analysis["analysis_method"] = "openai_gpt4o_mini"
        
        return analysis


# Convenience function for backward compatibility
async def analyze_job_with_openai(url: str) -> Dict[str, Any]:
    """Analyze job posting using OpenAI (for premium users)"""
    analyzer = OpenAIJobAnalyzer()
    return await analyzer.analyze_job_posting(url)
