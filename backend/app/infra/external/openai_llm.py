from __future__ import annotations
import os, json, logging
from openai import OpenAI
from ...domain.jobs.extraction.ports import LLMExtractor

logger = logging.getLogger(__name__)

# System prompt for TEXT-based extraction (when user pastes text)
_EXTRACT_TEXT_SYSTEM = """
You are a STRICT, DETERMINISTIC extractor for job postings.

🚧 OUTPUT CONTRACT (JSON ONLY, no markdown, no commentary):
{
  "title": string,
  "company_name": string,
  "source_url": string,
  "location": string,
  "remote_type": "Remote" | "Hybrid" | "On-site" | "",
  "job_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "",
  "description": string,
  "requirements": string[],      // each item = one concrete qualification/bullet
  "skills": string[],            // canonical tech/tool names
  "remove_lines": integer[],     // 1-based line numbers from DESCRIPTION_LINES to drop
  "section_headers": string[]    // major section titles present in the text
}

CRITICAL INVARIANTS:
- description MUST BE EXACTLY the RAW_DESCRIPTION text (verbatim). Do NOT rewrite, reflow, fix typos, or delete anything. Your reasoning must NOT modify description.
- remove_lines[] MUST reference the 1-based indices from DESCRIPTION_LINES (the numbered view), not from RAW_DESCRIPTION. Sort ascending, unique integers only.
- If a field is unknown, use "" (or [] for arrays). NEVER invent values.

LINE CLASSIFICATION (how to decide remove_lines):
Mark a line number N for removal ONLY if the line is ANY of:
A) REQUIREMENT/QUALIFICATION LINES:
   - A bullet/short line under a requirement-like header (see “Header dictionaries” below)
   - A concise requirement-like sentence (<= 200 chars) in the requirement block (years/degree/must-have/familiar with/etc.)
B) STANDALONE SECTION HEADERS:
   - Lines that are just a section title (e.g., "Requirements", "Qualifications", "Skills", "Responsibilities", "Benefits", "Work Environment", "About You", etc.)
   - Keep the content under them for description except requirement bullets you also move into requirements[]
C) UI/PLATFORM CHROME (copied from LinkedIn/ATS/etc.):
   - “Easy Apply”, “Save”, “Share”, “Show more options”, “Promoted by hirer”, “Actively reviewing applicants”,
     “Your AI-powered job assessment”, “Meet the hiring team”, “Message”, “2nd”, “—”, “Show more”, “Hide”,
     “XX applicants”, “Matches your job preferences”, “Workplace type is…”, “Job type is…”, pagination, counters.
   - Also: “Apply”, “Apply now”, “Copy link”, “People also viewed”, “Similar jobs”, “Back”, “Sign in”, “Log in”.

DO NOT mark for removal:
- Real paragraphs of the job description (overview, responsibilities prose, culture, benefits text, DEI/EEO policies, salary ranges, legal statements).
- Company overview, mission, or any legitimate narrative content. Only remove the CHROME, the pure HEADERS, and the requirement items.

FIELDS:
- requirements[]: Each item is a single qualification line (years, degrees, certifications, tech + level, legal right to work, security clearance, etc.). Strip bullets/leading symbols only; keep wording otherwise. De-duplicate case-insensitively.
- skills[]: Tech/tools/frameworks/languages/platforms. Canonicalize trivial variants:
    js→JavaScript, ts→TypeScript, node/nodejs→Node.js, react.js→React, vue.js→Vue.js, aws/gcp→AWS/GCP, k8s→Kubernetes, postgres→PostgreSQL, sql→SQL.
  Keep short tokens (≤ 4 words), drop sentences. De-duplicate case-insensitively.
- section_headers[]: Titles that segment the description (e.g., "Company Overview", "Position Overview", "Key Responsibilities", "Responsibilities",
  "Qualifications", "Requirements", "About You", "Skills", "Benefits", "Compensation", "Work Environment", "Why Join Us"). Return the visible text as-is (trim punctuation).

REMOTE / JOB TYPE CANON:
- remote_type: map to exactly one of {"Remote","Hybrid","On-site",""} by reading any hints in text; default "" if unsure.
- job_type: map to exactly one of {"Full-time","Part-time","Contract","Internship",""}; else "".

LOCATION:
- Prefer explicit "Location: ..." style lines. Otherwise infer the best city/region/country phrase seen near title/company. If unsure → "".

HEADER DICTIONARIES (case-insensitive; optional colon allowed):
- Requirement-like headers (begin requirement block):
  "requirements","minimum requirements","basic qualifications","preferred qualifications","qualifications","about you",
  "must have","nice to have","what you'll need","what you bring","skills & qualifications","experience","required skills",
  "preferred skills","eligibility","who you are","candidate profile"
- Skill headers (begin skills block):
  "skills","required skills","preferred skills","technical skills","tech stack","technology stack","our stack","stack","tools"
- Display headers (keep in description; classify as section_headers):
  "about the job","company overview","about the company","about us","position overview","role summary","summary","overview",
  "key responsibilities","responsibilities","what you'll do","what you will do","day to day","duties","work environment","culture",
  "benefits","perks","compensation","salary","why join us","mission","values","diversity & inclusion","eeo statement","visa","relocation"

ALGORITHM (follow in order):
1) NEVER modify RAW_DESCRIPTION. That exact text becomes description.
2) Use DESCRIPTION_LINES (numbered view) ONLY to compute remove_lines[].
   a) Detect requirement/skill/display headers using the dictionaries (exact match after trimming punctuation).
   b) When inside a requirement block, collect bullets/short lines into requirements[], and add their line numbers to remove_lines[].
   c) Add standalone header lines to remove_lines[] (we’ll style headers at render time).
   d) Add pure UI-chrome lines to remove_lines[] (see list above).
3) Extract skills[] from explicit skill blocks and inline lists; keep short tokens; canonicalize trivial variants; de-dupe.
4) Build section_headers[] by scanning description for visible section titles (don’t include UI).
5) De-duplicate requirements[] and skills[] (case-insensitive). Sort remove_lines ascending, unique.

VALIDATION (do this BEFORE answering):
- description equals RAW_DESCRIPTION EXACTLY (same bytes, except trailing newline differences).
- remove_lines[] contains ONLY integers between 1 and number of DESCRIPTION_LINES.
- Arrays contain strings; no empty strings after trimming; deduplicated.
- No additional keys in the root object besides those specified.

Return ONLY the JSON object.
"""


# System prompt for IMAGE-based extraction (when user takes screenshot)
_EXTRACT_IMAGE_SYSTEM = """
You are a PROFESSIONAL TRANSCRIBER + EXTRACTOR for job postings from a screenshot.

🚧 OUTPUT CONTRACT (JSON ONLY, no markdown, no commentary):
{
  "title": string,
  "company_name": string,
  "source_url": string,
  "location": string,
  "remote_type": "Remote" | "Hybrid" | "On-site" | "",
  "job_type": "Full-time" | "Part-time" | "Contract" | "Internship" | "",
  "description": string,         // verbatim transcription from the MAIN job content
  "requirements": string[],      // one bullet/line each, copied verbatim (minus bullet symbol)
  "skills": string[],            // canonical tech/tool names
  "remove_lines": [],            // ALWAYS []
  "section_headers": string[]    // visible section titles exactly as they appear
}

WHAT TO READ (and what to IGNORE):
- READ: The MAIN job content pane with a white/light background (center/right). This contains headings like “Company Overview”, “Responsibilities”, “Qualifications”, paragraphs and bullets.
- IGNORE COMPLETELY: dark/transparent modals, overlays/popups (“Job details”), left nav, sidebars, footer, buttons (“Easy Apply”, “Save”, “Share”, “Apply”), counters (“89 applicants”), social widgets, “Meet the hiring team”, avatars, timestamps (“Just posted”), pagination, “Show more”.
- If both an overlay and the main page are visible, ALWAYS read the MAIN page. Prefer the longer, complete description. Do not mix areas.

TRANSCRIPTION RULES (NO PARAPHRASING):
- description MUST BE a character-for-character copy of the visible job text from the MAIN content area only.
- Preserve original words, capitalization, punctuation, line breaks, paragraph breaks, and section headings exactly as they appear.
- Company names must NOT be altered (e.g., “Backline” must stay “Backline”, never “BackBox”).
- Do NOT summarize or fix grammar. No reformatting.

EXTRACTION RULES:
- requirements[]: Copy each requirement bullet from “Qualifications/Requirements/About You/Basic/Preferred” sections. Remove only the bullet symbol; keep wording as-is. One bullet → one array item. De-duplicate case-insensitively.
- skills[]: Extract tech/tools/frameworks/languages mentioned; short tokens (≤ 4 words). Canonicalize trivial variants (js→JavaScript, ts→TypeScript, node→Node.js, react.js→React, vue.js→Vue.js, aws/gcp→AWS/GCP, k8s→Kubernetes, postgres→PostgreSQL, sql→SQL). De-duplicate case-insensitively.
- section_headers[]: All major section titles visible in the main content (e.g., “Company Overview”, “Position Overview”, “Key Responsibilities”, “Responsibilities”, “Qualifications”, “Requirements”, “About You”, “Skills”, “Benefits”, “Compensation”, “Work Environment”, “Why Join Us”).

REMOTE / JOB TYPE CANON:
- remote_type: map visible phrases to {"Remote","Hybrid","On-site",""}.
- job_type: map to {"Full-time","Part-time","Contract","Internship",""} or "".

IMPORTANT:
- remove_lines MUST be an empty array [] for images (no line-number removals in OCR mode).
- If some heading is visible, include it in description exactly and list it in section_headers[].

VALIDATION (do this BEFORE answering):
- description is non-empty and looks like full sentences/paragraphs from the main pane.
- remove_lines is exactly [].
- Arrays contain strings; de-duplicated; no empty items.

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

            # Normalize remove_lines[]
            rls = job.get("remove_lines") or []
            try:
                rls = sorted({int(x) for x in rls if isinstance(x, (int, str)) and str(x).strip().isdigit()})
            except Exception:
                rls = []
            job["remove_lines"] = rls

            print(f"OpenAI Extractor: Final requirements count = {len(job['requirements'])}")
            print(f"OpenAI Extractor: Final skills count = {len(job['skills'])}")
            print(f"OpenAI Extractor: remove_lines count = {len(job['remove_lines'])}")
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
            
            # For images, ensure remove_lines is always empty (no line removal for generated content)
            job["remove_lines"] = []
            # Keep section_headers as extracted by the LLM for images
            
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
