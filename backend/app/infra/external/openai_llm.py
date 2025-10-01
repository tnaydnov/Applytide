from __future__ import annotations
import os, json, logging
from openai import OpenAI
from ...domain.jobs.extraction.ports import LLMExtractor

logger = logging.getLogger(__name__)

# System prompt for TEXT-based extraction (when user pastes text)
_EXTRACT_TEXT_SYSTEM = """
You are a PRECISE JOB EXTRACTOR for ANY type of job posting (tech, healthcare, retail, finance, education, etc).

OUTPUT CONTRACT (JSON ONLY):
{
  "title": string,
  "company_name": string, 
  "source_url": string,
  "location": string,
  "remote_type": "Remote" | "Hybrid" | "On-site" | "",
  "job_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "",
  "description": string,       # FILTERED job-related text only
  "requirements": string[],    # extracted qualification lines
  "skills": string[]           # extracted skills/keywords
}

CONTENT FILTERING:
1. KEEP only text related to the job posting itself
2. REMOVE website navigation, UI elements, irrelevant footers/headers
3. REMOVE application instructions unless they contain key job details
4. KEEP company descriptions if they provide context about the workplace

FIELD GUIDELINES:

description:
- Include ALL job-relevant text (job details, company info, responsibilities, etc)
- CRITICALLY IMPORTANT: NEVER remove ANY section headers - headers like "About the Company", "Position Overview", "Key Responsibilities", "Advantages", "Work Environment", etc. MUST remain in the description
- Keep any "nice-to-have" skills, "preferred qualifications", "advantages", "bonus" items in the description (including their headers). use your judgment to decide what is "nice-to-have".
- Only remove lines that are core mandatory requirements (these go in requirements array)
- Keep EXACT original wording - do not rewrite or rephrase
- Add TWO line breaks (\\n\\n) before section headers
- Preserve bullet points and list formatting

requirements[]:
- Extract ONLY CORE/MANDATORY qualification lines (must-have requirements)
- Use your judgment to distinguish between:
  * CORE requirements: essential qualifications without which applications would be rejected
  * NICE-TO-HAVE features: preferred skills, advantages, or bonuses that should stay in description
- Look for statements containing language like "required", "must have", "essential"
- Keep EXACT wording, one requirement per array item
- Strip bullet symbols but preserve the full text
- These lines should NOT appear in the description

skills[]:
- Extract ALL specific skills, tools, technologies, and keywords mentioned ANYWHERE
- Include both hard skills (Excel, Python, CNC machine) and soft skills (leadership, communication)
- Identify industry-specific terminology (HIPAA, GAAP, HACCP, etc)
- Include keywords relevant for job search/filtering
- For technical skills, standardize common names (js→JavaScript, etc)

remote_type/job_type:
- Only use the specified values or empty string if uncertain

Return ONLY the JSON object.
"""

# System prompt for IMAGE-based extraction (when user takes screenshot)
_EXTRACT_IMAGE_SYSTEM = """
You are a JOB POSTING EXTRACTOR for ANY type of job (not just tech jobs).

OUTPUT CONTRACT (JSON ONLY):
{
  "title": string,
  "company_name": string,
  "source_url": string,
  "location": string,
  "remote_type": "Remote" | "Hybrid" | "On-site" | "",
  "job_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "",
  "description": string,       # FILTERED job-related text only
  "requirements": string[],    # extracted qualification lines
  "skills": string[]           # extracted skills/keywords
}

READING INSTRUCTIONS:
1. First, read and transcribe ALL text from the image
2. Focus on main job content area (usually central/light background)
3. IGNORE navigation bars, user comments, application buttons, sidebars
4. Read top-to-bottom, left-to-right
5. Include all section headers and full paragraph content

CONTENT PROCESSING:
1. Filter out website UI elements, menus, buttons, etc.
2. Keep only text relevant to the job posting itself
3. Extract the complete job description
4. Identify requirements even without explicit "Requirements" headers
5. Look for skills mentioned throughout the entire text

FIELD GUIDELINES:

description:
- Include ALL job-relevant text (job details, company info, responsibilities, etc)
- CRITICALLY IMPORTANT: NEVER remove ANY section headers - headers like "About the Company", "Position Overview", "Key Responsibilities", "Advantages", "Work Environment", etc. MUST remain in the description
- Keep any "nice-to-have" skills, "preferred qualifications", "advantages", "bonus" items in the description (including their headers). use your judgment to decide what is "nice-to-have".
- Only remove lines that are core mandatory requirements (these go in requirements array)
- Keep EXACT original wording - do not rewrite or rephrase
- Add TWO line breaks (\\n\\n) before section headers
- Preserve bullet points and list formatting

requirements[]:
- Extract ONLY CORE/MANDATORY qualification lines (must-have requirements)
- Use your judgment to distinguish between:
  * CORE requirements: essential qualifications without which applications would be rejected
  * NICE-TO-HAVE features: preferred skills, advantages, or bonuses that should stay in description
- Look for statements containing language like "required", "must have", "essential"
- Keep EXACT wording, one requirement per array item
- Strip bullet symbols but preserve the full text
- These lines should NOT appear in the description

skills[]:
- Extract ALL specific skills, tools, technologies, and keywords mentioned ANYWHERE
- Include both hard skills (Excel, Python, CNC machine) and soft skills (leadership, communication)
- Identify industry-specific terminology (HIPAA, GAAP, HACCP, etc)
- Include keywords relevant for job search/filtering
- For technical skills, standardize common names (js→JavaScript, etc)

remote_type/job_type:
- Only use the specified values or empty string if uncertain

Return ONLY the JSON object.
"""



class OpenAILLMExtractor(LLMExtractor):
    def __init__(self, model: str | None = None):
        api = os.getenv("OPENAI_API_KEY", "")
        if not api:
            raise RuntimeError("OPENAI_API_KEY not set")
        self.client = OpenAI(api_key=api)
        # Use cost-effective models by default, allow upgrade via env vars
        # Cost comparison: gpt-4o-mini ~$0.00015/1K tokens vs gpt-4o ~$0.0025/1K tokens (16x cheaper!)
        self.text_model = model or os.getenv("JOB_EXTRACT_MODEL", "gpt-4o-mini")
        self.image_model = os.getenv("JOB_EXTRACT_IMAGE_MODEL", "gpt-4o-mini")  # Use mini by default for cost efficiency
        # To upgrade image model: set JOB_EXTRACT_IMAGE_MODEL=gpt-4o in environment
        print(f"OpenAI LLM: Using text_model='{self.text_model}', image_model='{self.image_model}'")
    
    def _clean_array(self, items):
        """Clean and deduplicate requirements array - minimal processing"""
        if not items:
            return []
        
        cleaned = []
        seen = set()
        
        for item in items:
            if not item or not isinstance(item, str):
                continue
            
            # Minimal cleaning - just strip whitespace
            cleaned_item = item.strip()
            if not cleaned_item or len(cleaned_item) < 5:
                continue
            
            # Simple deduplication (case-insensitive)
            item_lower = cleaned_item.lower()
            if item_lower not in seen:
                seen.add(item_lower)
                cleaned.append(cleaned_item)
        
        return cleaned
    
    def _clean_skills_array(self, items):
        """Clean and deduplicate skills array with basic normalization"""
        if not items:
            return []
        
        # Basic skill normalization map - only obvious ones
        skill_map = {
            'js': 'JavaScript',
            'ts': 'TypeScript', 
            'react.js': 'React',
            'vue.js': 'Vue.js',
            'node.js': 'Node.js',
            'aws': 'AWS',
            'gcp': 'GCP',
        }
        
        cleaned = []
        seen = set()
        
        for item in items:
            if not item or not isinstance(item, str):
                continue
            
            # Minimal cleaning
            cleaned_item = item.strip()
            if not cleaned_item or len(cleaned_item) < 2:
                continue
            
            # Basic normalization
            item_lower = cleaned_item.lower()
            normalized_skill = skill_map.get(item_lower, cleaned_item)
            
            # Simple deduplication (case-insensitive)
            skill_lower = normalized_skill.lower()
            if skill_lower not in seen:
                seen.add(skill_lower)
                cleaned.append(normalized_skill)
        
        return cleaned

    def extract_job(self, url: str, text: str, hints=None) -> dict:
        print("\n=== OPENAI LLM EXTRACTOR START ===")
        hints = hints or {}
        text_len = len(text)
        print(f"OpenAI Extractor: Starting extraction")
        print(f"OpenAI Extractor: text_len = {text_len}")
        print(f"OpenAI Extractor: text_model = {self.text_model}")
        print(f"OpenAI Extractor: url = {url}")
        print(f"OpenAI Extractor: hints = {hints}")
        print(f"OpenAI Extractor: text preview = {repr(text[:300])}")
        
        if text_len < 50:
            print(f"OpenAI Extractor ERROR: Text too short: {text_len} characters")
            raise ValueError(f"Text too short for extraction: {text_len} characters")

        # Build two views: raw (for exact description) and numbered (for line-pointer extraction)
        lines = (text or "").splitlines()
        numbered = "\n".join(f"{i+1:05d} {ln}" for i, ln in enumerate(lines))

        messages = [{"role": "system", "content": _EXTRACT_TEXT_SYSTEM}]
        if hints:
            messages.append({"role": "user", "content": f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        messages.append({
            "role": "user",
            "content": (
                f"Source URL: {url}\n\n"
                "RAW_DESCRIPTION (use this text verbatim for the JSON 'description' field):\n"
                "<<<BEGIN_RAW>>>\n"
                f"{text}\n"
                "<<<END_RAW>>>\n\n"
                "DESCRIPTION_LINES (1-based; use this ONLY to decide remove_lines[]):\n"
                f"{numbered}"
            )
        })

        print(f"OpenAI Extractor: Prepared {len(messages)} messages for API call")
        print(f"OpenAI Extractor: Making API call to OpenAI...")

        try:
            resp = self.client.chat.completions.create(
                model=self.text_model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=messages,
                max_tokens=2500
            )
            print(f"OpenAI Extractor: API call successful")

            if not resp.choices or not resp.choices[0].message.content:
                print("OpenAI Extractor ERROR: OpenAI returned empty response")
                raise ValueError("OpenAI returned empty response")

            print(f"OpenAI Extractor: Parsing JSON response...")
            print(f"OpenAI Extractor: Raw response preview = {resp.choices[0].message.content[:200]}")

            data = json.loads(resp.choices[0].message.content)
            job = data.get("job") or data

            # Force description to the exact raw input (do NOT trust model echoing)
            job["description"] = (text or "").strip()

            # Clean arrays
            job["requirements"] = self._clean_array(job.get("requirements") or [])
            job["skills"] = self._clean_skills_array(job.get("skills") or [])
            if not job.get("source_url"):
                job["source_url"] = url

            print(f"OpenAI Extractor: Final requirements count = {len(job['requirements'])}")
            print(f"OpenAI Extractor: Final skills count = {len(job['skills'])}")
            print(f"OpenAI Extractor: Extraction completed successfully")
            print("=== OPENAI EXTRACTOR SUCCESS ===")
            return job

        except json.JSONDecodeError as e:
            print(f"OpenAI Extractor ERROR: Invalid JSON response: {str(e)}")
            raise ValueError(f"OpenAI returned invalid JSON response: {str(e)}")
        except Exception as e:
            print(f"OpenAI Extractor ERROR: API error: {str(e)}")
            print(f"OpenAI Extractor ERROR: Error type: {type(e).__name__}")
            print("=== OPENAI EXTRACTOR ERROR ===")
            if "rate limit" in str(e).lower():
                raise ValueError("OpenAI API rate limit exceeded - please try again later")
            elif "insufficient quota" in str(e).lower():
                raise ValueError("OpenAI API quota exceeded - please check your billing")
            elif "invalid api key" in str(e).lower():
                raise ValueError("Invalid OpenAI API key - please check configuration")
            else:
                raise ValueError(f"OpenAI API error: {str(e)}")

    
    def extract_job_from_image(self, url: str, data_url: str, hints=None) -> dict:
        """
        data_url: "data:image/png;base64,...."
        Uses a vision-capable model to read the screenshot and extract the same fields.
        """
        print("\n=== OPENAI IMAGE EXTRACTOR START ===")
        hints = hints or {}
        print(f"OpenAI Image Extractor: Starting extraction")
        print(f"OpenAI Image Extractor: text_model = {self.text_model}")
        print(f"OpenAI Image Extractor: image_model = {self.image_model}")
        print(f"OpenAI Image Extractor: url = {url}")
        print(f"OpenAI Image Extractor: image data length = {len(data_url) if data_url else 0}")
        print(f"OpenAI Image Extractor: hints = {hints}")
        
        if not data_url or not data_url.startswith("data:image/"):
            raise ValueError("Invalid image data URL format")
        
        # Check if model supports vision
        if "gpt-4" not in self.image_model.lower() and "vision" not in self.image_model.lower():
            print(f"OpenAI Image Extractor WARNING: Model {self.image_model} may not support vision - proceeding anyway")
        
        messages = [{"role": "system", "content": _EXTRACT_IMAGE_SYSTEM}]
        if hints:
            messages.append({"role": "user", "content": f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": f"Source URL: {url}\n\nEXTRACT FROM: Main job content area with WHITE/LIGHT background (center-right of screenshot)\nIGNORE: Any dark modal overlays, popups, or 'Job Details' windows\n\nPlease transcribe the job posting content EXACTLY as written - do not rephrase or change any wording."},
                {"type": "image_url", "image_url": { "url": data_url }}
            ]
        })
        
        print(f"OpenAI Image Extractor: Prepared {len(messages)} messages for API call")
        print(f"OpenAI Image Extractor: System prompt length = {len(_EXTRACT_IMAGE_SYSTEM)}")
        print(f"OpenAI Image Extractor: Making API call to OpenAI...")
        
        try:
            resp = self.client.chat.completions.create(
                model=self.image_model,  # Use full gpt-4o for better vision capabilities
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=messages,
                max_tokens=8000  # Increased tokens for complete screenshot extraction
            )
            
            if not resp.choices or not resp.choices[0].message.content:
                raise ValueError("OpenAI returned empty response for image")
            
            raw_content = resp.choices[0].message.content
            logger.debug(f"Raw OpenAI response length: {len(raw_content)}")
            
            # Check if response appears truncated (common issue with complex screenshots)
            if raw_content.strip() and not raw_content.strip().endswith('}'):
                logger.warning("OpenAI response appears truncated - attempting to fix JSON")
                # Try to close any unclosed JSON objects
                raw_content = raw_content.rstrip() + '}'
            
            data = json.loads(raw_content)
            job = data.get("job") or data
            
            # Clean and validate response
            job["description"] = (job.get("description") or "").strip()
            job["requirements"] = self._clean_array(job.get("requirements") or [])
            job["skills"] = self._clean_skills_array(job.get("skills") or [])
            if not job.get("source_url"): job["source_url"] = url
            
            print(f"OpenAI Image Extractor: API call successful")
            print(f"OpenAI Image Extractor: Extracted title = '{job.get('title', '')}'")
            print(f"OpenAI Image Extractor: Extracted company = '{job.get('company_name', '')}'")
            print(f"OpenAI Image Extractor: Description length = {len(job.get('description', ''))}")
            print(f"OpenAI Image Extractor: Requirements count = {len(job.get('requirements', []))}")
            print(f"OpenAI Image Extractor: Skills count = {len(job.get('skills', []))}")
            print(f"OpenAI Image Extractor: remove_lines = {job.get('remove_lines', [])}")
            print("=== OPENAI IMAGE EXTRACTOR SUCCESS ===")
            return job
            
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI returned invalid JSON for image: {str(e)}")
            logger.error(f"Raw response content: {resp.choices[0].message.content if resp and resp.choices else 'No response'}")
            # Check if response was truncated due to token limit
            if resp and resp.choices and len(resp.choices[0].message.content) > 3500:
                raise ValueError(f"OpenAI response appears truncated (likely hit token limit). Try using a shorter screenshot or increase max_tokens. JSON error: {str(e)}")
            else:
                raise ValueError(f"OpenAI returned invalid JSON response for image: {str(e)}")
        except Exception as e:
            logger.error(f"OpenAI image API error: {str(e)}")
            if "rate limit" in str(e).lower():
                raise ValueError("OpenAI API rate limit exceeded - please try again later")
            elif "insufficient quota" in str(e).lower():
                raise ValueError("OpenAI API quota exceeded - please check your billing")
            elif "invalid api key" in str(e).lower():
                raise ValueError("Invalid OpenAI API key - please check configuration")
            elif "model" in str(e).lower() and "vision" in str(e).lower():
                raise ValueError(f"Model {self.image_model} does not support vision - use gpt-4o-mini or gpt-4o")
            else:
                raise ValueError(f"OpenAI image API error: {str(e)}")
