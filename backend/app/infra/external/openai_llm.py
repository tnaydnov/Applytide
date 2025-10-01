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
- Remove duplicates (case-insensitive comparison)
- Skip empty strings or strings shorter than 5 characters
- These lines should NOT appear in the description

skills[]:
- Extract ALL specific skills, tools, technologies, and keywords mentioned ANYWHERE
- Include both hard skills (Excel, Python, CNC machine) and soft skills (leadership, communication)
- Identify industry-specific terminology (HIPAA, GAAP, HACCP, etc)
- Include keywords relevant for job search/filtering
- CRITICAL: Normalize all technical skill names to their proper full form:
  * js → JavaScript
  * ts → TypeScript
  * react.js → React
  * vue.js → Vue.js
  * node.js → Node.js
  * py → Python
  * k8s → Kubernetes
  * aws → AWS
  * gcp → GCP (Google Cloud Platform)
  * And similar common abbreviations
- Remove duplicates (case-insensitive comparison - don't include both "JavaScript" and "javascript")
- Skip empty strings or strings shorter than 2 characters
- Return each skill only once in its standardized form

CRITICAL INSTRUCTION: 
- ONLY include information EXPLICITLY EXIST in the text provided
- DO NOT infer, assume, or generate requirements or skills not shown
- If you cannot read all requirements or skills, leave those fields with only what's existing
- If a section appears cut off, indicate with [...] at the end

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

            # Trust LLM to return properly formatted, deduplicated arrays
            job["requirements"] = job.get("requirements") or []
            job["skills"] = job.get("skills") or []
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