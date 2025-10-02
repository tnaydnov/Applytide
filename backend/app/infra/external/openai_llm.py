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
- CRITICAL: Read the ENTIRE job posting first to understand its structure and context before extracting
- Extract ONLY CORE/MANDATORY qualifications that candidates MUST have to be considered
- Use your judgment to identify requirement sections (commonly: "Requirements", "Qualifications", "What You Bring", "Must Have", "Essential Skills")
- IMPORTANT: Many job postings have sections AFTER requirements that describe company culture, benefits, team, or perks
  → These sections should STAY in description, NOT be extracted as requirements
  → Examples of non-requirement sections: "Why Join Us?", "About Us", "Company Culture", "Benefits", "What We Offer", "Our Team", "Life At [Company]", "Perks"
  → Even if these sections have bullet points, they are NOT requirements!
- Distinguish between requirement types:
  * CORE/MANDATORY: "5+ years experience", "Bachelor's degree required", "Must have X", "Proficient in Y"
    → These are dealbreakers - extract to requirements[]
  * NICE-TO-HAVE: "X is a plus", "preferred", "bonus points", "familiarity with Y is helpful"
    → These increase chances but aren't required - KEEP in description
  * CULTURE/BENEFITS: "Collaborative team", "Great benefits", "Work-life balance", "Learning opportunities"
    → These describe the workplace - KEEP in description
- Look for requirement indicators: "required", "must have", "essential", "minimum", "X+ years", "proficient", "strong experience"
- Keep EXACT wording, one requirement per array item
- Strip bullet symbols (•, -, *, etc.) but preserve the full text
- Remove duplicates (case-insensitive comparison)
- Skip empty strings or strings shorter than 5 characters
- CRITICAL: When you extract requirements from a section, you MUST do BOTH:
  1. Add the requirement lines to requirements[] array
  2. REMOVE those exact lines AND the section header from description
  → This prevents duplicate content and orphaned headers

skills[]:
- Extract ALL specific skills, tools, technologies, and keywords mentioned ANYWHERE in the job posting
- Scan the ENTIRE text - skills can appear in ANY section (requirements, responsibilities, nice-to-have, projects, etc.)
- Include both hard skills (Excel, Python, SQL, CNC machine, AutoCAD) and soft skills (leadership, communication, problem-solving)
- Include industry-specific terminology and certifications (HIPAA, GAAP, PMP, AWS Certified, etc.)
- Include relevant keywords for job search/filtering
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
  * azure → Azure
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
        print("\n" + "#"*80)
        print("### OPENAI LLM EXTRACTOR START ###")
        print("#"*80)
        
        hints = hints or {}
        text_len = len(text)
        
        print(f"\n[LLM] INPUT PARAMETERS:")
        print(f"  URL: {url}")
        print(f"  Text length: {text_len} characters")
        print(f"  Text is empty: {not text}")
        print(f"  Text preview (first 500 chars):\n{repr(text[:500])}...\n")
        print(f"  Model: {self.text_model}")
        print(f"  Hints provided: {list(hints.keys())}")
        print(f"  Hints values: {hints}")
        
        if text_len < 50:
            print(f"\n[LLM] ✗ ERROR: Text too short: {text_len} characters")
            print(f"[LLM] Minimum required: 50 characters")
            raise ValueError(f"Text too short for extraction: {text_len} characters")
        
        print(f"\n[LLM] ✓ Text length validation passed")

        # Build two views: raw (for exact description) and numbered (for line-pointer extraction)
        print(f"\n[LLM] Preparing text for LLM...")
        lines = (text or "").splitlines()
        numbered = "\n".join(f"{i+1:05d} {ln}" for i, ln in enumerate(lines))
        print(f"[LLM] Text split into {len(lines)} lines")

        print(f"\n[LLM] Building message array...")
        messages = [{"role": "system", "content": _EXTRACT_TEXT_SYSTEM}]
        if hints:
            print(f"[LLM] Adding hints message")
            messages.append({"role": "user", "content": f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        
        user_content = (
            f"Source URL: {url}\n\n"
            "RAW_DESCRIPTION (use this text verbatim for the JSON 'description' field):\n"
            "<<<BEGIN_RAW>>>\n"
            f"{text}\n"
            "<<<END_RAW>>>\n\n"
            "DESCRIPTION_LINES (1-based; use this ONLY to decide remove_lines[]):\n"
            f"{numbered}"
        )
        messages.append({"role": "user", "content": user_content})
        
        print(f"[LLM] Message array prepared: {len(messages)} messages")
        print(f"[LLM] Message sizes:")
        for i, msg in enumerate(messages):
            print(f"  Message {i}: {len(msg['content'])} chars")
        print(f"[LLM] Total prompt size: {sum(len(m['content']) for m in messages)} chars")

        print(f"\n[LLM] Making OpenAI API call...")
        print(f"[LLM] Model: {self.text_model}")
        print(f"[LLM] Temperature: 0.1")
        print(f"[LLM] Max tokens: 2500")
        print(f"[LLM] Response format: json_object")

        try:
            api_start = __import__('time').time()
            resp = self.client.chat.completions.create(
                model=self.text_model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=messages,
                max_tokens=2500
            )
            api_time = __import__('time').time() - api_start
            
            print(f"\n[LLM] ✓ API call successful in {api_time:.2f}s")
            print(f"[LLM] Response metadata:")
            print(f"  Model: {resp.model}")
            print(f"  Finish reason: {resp.choices[0].finish_reason if resp.choices else 'None'}")
            print(f"  Total tokens: {resp.usage.total_tokens if resp.usage else 'Unknown'}")
            print(f"  Prompt tokens: {resp.usage.prompt_tokens if resp.usage else 'Unknown'}")
            print(f"  Completion tokens: {resp.usage.completion_tokens if resp.usage else 'Unknown'}")

            if not resp.choices or not resp.choices[0].message.content:
                print(f"\n[LLM] ✗ ERROR: OpenAI returned empty response")
                print(f"[LLM] Response object: {resp}")
                raise ValueError("OpenAI returned empty response")

            raw_content = resp.choices[0].message.content
            print(f"\n[LLM] Response content length: {len(raw_content)} chars")
            print(f"[LLM] Response preview (first 300 chars):\n{raw_content[:300]}...\n")
            print(f"[LLM] Parsing JSON response...")
            
            data = json.loads(raw_content)
            job = data.get("job") or data
            
            print(f"\n[LLM] ✓ JSON parsed successfully")
            print(f"[LLM] Extracted fields from LLM:")
            print(f"  title: {job.get('title', 'None')}")
            print(f"  company_name: {job.get('company_name', 'None')}")
            print(f"  location: {job.get('location', 'None')}")
            print(f"  remote_type: {job.get('remote_type', 'None')}")
            print(f"  job_type: {job.get('job_type', 'None')}")
            print(f"  description length: {len(job.get('description', ''))}")
            print(f"  requirements count: {len(job.get('requirements', []))}")
            print(f"  requirements: {job.get('requirements', [])}")
            print(f"  skills count: {len(job.get('skills', []))}")
            print(f"  skills: {job.get('skills', [])}")

            # Force description to the exact raw input (do NOT trust model echoing)
            print(f"\n[LLM] Post-processing...")
            print(f"[LLM] Forcing description to use original text (not LLM echo)")
            job["description"] = (text or "").strip()

            # Trust LLM to return properly formatted, deduplicated arrays
            job["requirements"] = job.get("requirements") or []
            job["skills"] = job.get("skills") or []
            if not job.get("source_url"):
                job["source_url"] = url

            print(f"\n[LLM] FINAL RESULT:")
            print(f"  title: {job.get('title')}")
            print(f"  company_name: {job.get('company_name')}")
            print(f"  location: {job.get('location')}")
            print(f"  remote_type: {job.get('remote_type')}")
            print(f"  job_type: {job.get('job_type')}")
            print(f"  source_url: {job.get('source_url')}")
            print(f"  description length: {len(job.get('description', ''))}")
            print(f"  description preview: {job.get('description', '')[:200]}...")
            print(f"  requirements count: {len(job['requirements'])}")
            print(f"  requirements: {job['requirements']}")
            print(f"  skills count: {len(job['skills'])}")
            print(f"  skills: {job['skills'][:20]}..." if len(job['skills']) > 20 else f"  skills: {job['skills']}")
            
            print(f"\n[LLM] ✓✓✓ EXTRACTION SUCCESSFUL")
            print("#"*80)
            print("### OPENAI LLM EXTRACTOR SUCCESS ###")
            print("#"*80 + "\n")
            return job

        except json.JSONDecodeError as e:
            print(f"\n[LLM] ✗✗✗ JSON DECODE ERROR")
            print(f"[LLM] Error: {str(e)}")
            print(f"[LLM] Raw response content:")
            print(raw_content if 'raw_content' in locals() else 'Response not available')
            print("#"*80)
            print("### OPENAI LLM EXTRACTOR ERROR ###")
            print("#"*80)
            raise ValueError(f"OpenAI returned invalid JSON response: {str(e)}")
        except Exception as e:
            print(f"\n[LLM] ✗✗✗ API ERROR")
            print(f"[LLM] Error type: {type(e).__name__}")
            print(f"[LLM] Error message: {str(e)}")
            import traceback
            print(f"[LLM] Stack trace:")
            traceback.print_exc()
            print("#"*80)
            print("### OPENAI LLM EXTRACTOR ERROR ###")
            print("#"*80)
            
            error_msg = str(e).lower()
            if "rate limit" in error_msg:
                raise ValueError("OpenAI API rate limit exceeded - please try again later")
            elif "insufficient quota" in error_msg or "quota" in error_msg:
                raise ValueError("OpenAI API quota exceeded - please check your billing")
            elif "invalid api key" in error_msg or "authentication" in error_msg:
                raise ValueError("Invalid OpenAI API key - please check configuration")
            else:
                raise ValueError(f"OpenAI API error: {str(e)}")