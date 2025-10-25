from __future__ import annotations
import os, json
from openai import OpenAI
from ...domain.jobs.extraction.ports import LLMExtractor
from ..logging import get_logger
from .llm_tracker import track_openai_call

logger = get_logger(__name__)

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
- REMOVE section headers for Requirements/Qualifications sections ONLY if ALL lines under them are extracted to requirements[]
- Keep any lines with explicit nice-to-have indicators ("advantage", "preferred", "plus", "bonus", "nice to have", "helpful", "ideal") in the description, even if they're under a requirements section
- IMPORTANT: If a requirements section contains BOTH mandatory and nice-to-have items (e.g., "Ability to support the following: Item A - advantage, Item B - advantage"), keep the ENTIRE section including its header in the description since not all items are being extracted
- Keep EXACT original wording - do not rewrite or rephrase
- Add TWO line breaks (\\n\\n) before section headers
- Preserve bullet points and list formatting

requirements[]:
- CRITICAL: Read the ENTIRE job posting first to understand its structure and context before extracting
- Identify requirement sections by their headers: "Requirements", "Qualifications", "What You Bring", "Must Have", "Essential Skills", "Required Skills", "Minimum Qualifications", "What You'll Need", etc.
- LOCATION-BASED EXTRACTION RULE:
  * If a line appears UNDER a requirements/qualifications header → Extract it to requirements[] (it's mandatory by default)
  * EXCEPTION: If the line EXPLICITLY contains nice-to-have indicators ("advantage", "preferred", "plus", "bonus", "nice to have", "helpful", "ideal", "great if"), keep it in description instead
  * Lines in OTHER sections (Responsibilities, About Us, Benefits, etc.) → DO NOT extract to requirements, keep in description
- Extract ALL lines from requirements sections UNLESS they explicitly say nice-to-have
- Examples:
  * "5+ years experience" under Qualifications → EXTRACT to requirements[], REMOVE from description
  * "Strong attention to design" under Qualifications → EXTRACT to requirements[], REMOVE from description
  * "Previous experience in fintech - advantage" → KEEP in description (explicitly says "advantage"), do NOT extract
  * "Familiarity with X is a plus" → KEEP in description (explicitly says "plus"), do NOT extract
  * "Strong communication skills" in Responsibilities section → KEEP in description (wrong section), do NOT extract
  * MIXED SECTION EXAMPLE: "Ability to support the following:\n- Spring Boot – significant advantage\n- MySQL – significant advantage"
    → Since ALL items are nice-to-have (advantage/plus), KEEP the entire section including header in description, extract NOTHING
    → If it was "Ability to support:\n- 5 years Java (no qualifier)\n- MySQL – advantage", extract "5 years Java" only, keep header + "MySQL – advantage" in description
- Keep EXACT wording, one requirement per array item
- Strip bullet symbols (•, -, *, etc.) but preserve the full text
- Remove duplicates (case-insensitive comparison)
- Skip empty strings or strings shorter than 5 characters
- ABSOLUTELY CRITICAL REMOVAL RULE (READ THIS TWICE):
  * Step 1: Extract requirement lines to requirements[] array
  * Step 2: REMOVE those EXACT lines from the description field
  * Step 3: If ALL lines under a requirements section header were extracted, also REMOVE the section header itself
  * The description field must NOT contain any text that appears in requirements[]
  * Double-check your final description - if you see requirement lines in it, you made a mistake

- CRITICAL HEADER REMOVAL EXAMPLE:
  * INPUT: "Main tasks:\n•Install software\n\nJob requirements:\nKnowledge of C++\nBachelor's degree\n"
  * After extracting "Knowledge of C++" and "Bachelor's degree" to requirements[]
  * OUTPUT description: "Main tasks:\n•Install software\n\n"  ← Notice "Job requirements:" header is REMOVED
  * OUTPUT requirements: ["Knowledge of C++", "Bachelor's degree"]
  * WRONG OUTPUT: "Main tasks:\n•Install software\n\nJob requirements:\n\n"  ← This is INCORRECT! Header must be removed!

- FINAL CHECK BEFORE RETURNING:
  * Scan your description field for orphaned requirement section headers like "Job requirements:", "Qualifications:", "Requirements:", etc.
  * If you see these headers with NO content under them, YOU MUST REMOVE THEM
  * Common mistake: leaving "\\n\\nJob requirements:\\n\\n" in the description after extracting all requirements
  * These empty headers are visual noise and MUST BE REMOVED
  * ALSO CHECK: Make sure sections containing nice-to-have items (with "advantage", "plus", "preferred") were NOT accidentally removed from description
  * If the original text had "Ability to support: Spring Boot - advantage", this MUST appear in the description field

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
    def __init__(self, model: str | None = None, db_session=None):
        api = os.getenv("OPENAI_API_KEY", "")
        if not api:
            raise RuntimeError("OPENAI_API_KEY not set")
        
        self.client = OpenAI(api_key=api)
        self.db_session = db_session  # Store DB session for tracking
        
        # Use GPT-4.1-mini for better instruction following at reasonable cost
        # Cost: gpt-4.1-mini ~$0.40/1M input, $1.60/1M output (middle ground between mini and full)
        # Average job extraction: ~$0.002-0.003 - better quality than 4o-mini, cheaper than 4o
        self.text_model = model or os.getenv("JOB_EXTRACT_MODEL", "gpt-4.1-mini")
        self.image_model = os.getenv("JOB_EXTRACT_IMAGE_MODEL", "gpt-4.1-mini")
        # To use cheaper: set JOB_EXTRACT_MODEL=gpt-4o-mini or upgrade: gpt-4o or gpt-4.1
        logger.info("OpenAI LLM initialized", extra={
            "text_model": self.text_model,
            "image_model": self.image_model,
            "tracking_enabled": self.db_session is not None
        })

    def extract_job(self, url: str, text: str, hints=None) -> dict:
        hints = hints or {}
        text_len = len(text)
        
        logger.info("OpenAI LLM extraction started", extra={
            "url": url[:100] if url else None,
            "text_length": text_len,
            "has_hints": bool(hints)
        })
        logger.debug("Text validation", extra={
            "text_length": text_len,
            "text_empty": not text,
            "text_preview": repr(text[:500]) if text else None,
            "model": self.text_model,
            "hints_keys": list(hints.keys()) if hints else []
        })
        
        if text_len < 50:
            logger.error("Text too short for extraction", extra={"text_length": text_len, "minimum_required": 50})
            raise ValueError(f"Text too short for extraction: {text_len} characters")
        
        logger.debug("Text length validation passed")

        # Prepare text for LLM (single view - no line numbering needed since LLM handles text removal directly)
        logger.debug("Preparing text for LLM")

        logger.debug("Building message array")
        messages = [{"role": "system", "content": _EXTRACT_TEXT_SYSTEM}]
        if hints:
            logger.debug("Adding hints message", extra={"hints": hints})
            messages.append({"role": "user", "content": f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        
        user_content = (
            f"Source URL: {url}\n\n"
            "JOB POSTING TEXT:\n"
            "<<<BEGIN_TEXT>>>\n"
            f"{text}\n"
            "<<<END_TEXT>>>"
        )
        messages.append({"role": "user", "content": user_content})
        
        logger.debug("Message array prepared", extra={
            "message_count": len(messages),
            "total_prompt_size": sum(len(m['content']) for m in messages)
        })

        logger.debug("Making OpenAI API call", extra={
            "model": self.text_model,
            "temperature": 0.1,
            "max_tokens": 2500,
            "response_format": "json_object"
        })

        # Track LLM usage if DB session available
        tracker = None
        if self.db_session:
            tracker = track_openai_call(
                self.db_session,
                endpoint="job_extraction",
                usage_type="chrome_extension",
                url=url[:200] if url else None,
                text_length=text_len
            )
        
        try:
            api_start = __import__('time').time()
            
            if tracker:
                with tracker:
                    resp = self.client.chat.completions.create(
                        model=self.text_model,
                        temperature=0.1,
                        response_format={"type": "json_object"},
                        messages=messages,
                        max_tokens=2500
                    )
                    # Record usage
                    if resp.usage:
                        tracker.set_usage(
                            model=resp.model,
                            prompt_tokens=resp.usage.prompt_tokens,
                            completion_tokens=resp.usage.completion_tokens,
                            total_tokens=resp.usage.total_tokens
                        )
            else:
                resp = self.client.chat.completions.create(
                    model=self.text_model,
                    temperature=0.1,
                    response_format={"type": "json_object"},
                    messages=messages,
                    max_tokens=2500
                )
            
            api_time = __import__('time').time() - api_start
            
            logger.info("OpenAI API call successful", extra={
                "duration": f"{api_time:.2f}s",
                "model": resp.model,
                "finish_reason": resp.choices[0].finish_reason if resp.choices else None,
                "total_tokens": resp.usage.total_tokens if resp.usage else None,
                "prompt_tokens": resp.usage.prompt_tokens if resp.usage else None,
                "completion_tokens": resp.usage.completion_tokens if resp.usage else None
            })

            if not resp.choices or not resp.choices[0].message.content:
                logger.error("OpenAI returned empty response", extra={"response": str(resp)})
                raise ValueError("OpenAI returned empty response")

            raw_content = resp.choices[0].message.content
            logger.debug("Response received", extra={
                "content_length": len(raw_content),
                "content_preview": raw_content[:300]
            })
            logger.debug("Parsing JSON response")
            
            data = json.loads(raw_content)
            job = data.get("job") or data
            
            logger.debug("JSON parsed successfully")
            logger.debug("Extracted fields from LLM", extra={
                "title": job.get('title'),
                "company_name": job.get('company_name'),
                "location": job.get('location'),
                "remote_type": job.get('remote_type'),
                "job_type": job.get('job_type'),
                "description_length": len(job.get('description', '')),
                "requirements_count": len(job.get('requirements', [])),
                "skills_count": len(job.get('skills', []))
            })

            # Trust LLM completely - use its cleaned description
            logger.debug("Using LLM's cleaned description directly (NO override)")
            # job["description"] is already set from LLM response
            
            # Trust LLM to return properly formatted, deduplicated arrays
            job["requirements"] = job.get("requirements") or []
            job["skills"] = job.get("skills") or []
            if not job.get("source_url"):
                job["source_url"] = url

            logger.info("OpenAI LLM extraction successful", extra={
                "title": job.get('title'),
                "company_name": job.get('company_name'),
                "location": job.get('location'),
                "remote_type": job.get('remote_type'),
                "job_type": job.get('job_type'),
                "description_length": len(job.get('description', '')),
                "requirements_count": len(job['requirements']),
                "skills_count": len(job['skills'])
            })
            return job

        except json.JSONDecodeError as e:
            logger.error("JSON decode error from OpenAI response", extra={
                "error": str(e),
                "raw_content": raw_content if 'raw_content' in locals() else 'Response not available'
            }, exc_info=True)
            raise ValueError(f"OpenAI returned invalid JSON response: {str(e)}")
        except Exception as e:
            logger.error("OpenAI API error", extra={
                "error_type": type(e).__name__,
                "error_message": str(e)
            }, exc_info=True)
            
            error_msg = str(e).lower()
            if "rate limit" in error_msg:
                raise ValueError("OpenAI API rate limit exceeded - please try again later")
            elif "insufficient quota" in error_msg or "quota" in error_msg:
                raise ValueError("OpenAI API quota exceeded - please check your billing")
            elif "invalid api key" in error_msg or "authentication" in error_msg:
                raise ValueError("Invalid OpenAI API key - please check configuration")
            else:
                raise ValueError(f"OpenAI API error: {str(e)}")