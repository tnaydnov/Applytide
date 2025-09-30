from __future__ import annotations
import os, json, logging
from openai import OpenAI
from ...domain.jobs.extraction.ports import LLMExtractor

logger = logging.getLogger(__name__)

_EXTRACT_SYSTEM = """
You are a precise extractor for job postings. You will receive CLEANED TEXT.
Return STRICT JSON with keys: title, company_name, source_url, location, remote_type, job_type, description, requirements[], skills[].
- description keeps original order, paragraphs, lines. No requirements/skills sections inside.
- If unknown => empty string. De-duplicate arrays.
"""

class OpenAILLMExtractor(LLMExtractor):
    def __init__(self, model: str | None = None):
        api = os.getenv("OPENAI_API_KEY", "")
        if not api:
            raise RuntimeError("OPENAI_API_KEY not set")
        self.client = OpenAI(api_key=api)
        self.model = model or os.getenv("JOB_EXTRACT_MODEL", "gpt-4o-mini")

    def extract_job(self, url: str, text: str, hints=None) -> dict:
        print("\n=== OPENAI LLM EXTRACTOR START ===")
        hints = hints or {}
        text_len = len(text)
        print(f"OpenAI Extractor: Starting extraction")
        print(f"OpenAI Extractor: text_len = {text_len}")
        print(f"OpenAI Extractor: model = {self.model}")
        print(f"OpenAI Extractor: url = {url}")
        print(f"OpenAI Extractor: hints = {hints}")
        print(f"OpenAI Extractor: text preview = {repr(text[:300])}")
        
        if text_len < 50:
            print(f"OpenAI Extractor ERROR: Text too short: {text_len} characters")
            raise ValueError(f"Text too short for extraction: {text_len} characters")
        
        messages = [{"role":"system","content":_EXTRACT_SYSTEM}]
        if hints:
            messages.append({"role":"user","content":f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        messages.append({"role":"user","content":f"Source URL: {url}\n\nTEXT:\n{text[:60000]}"})
        
        print(f"OpenAI Extractor: Prepared {len(messages)} messages for API call")
        print(f"OpenAI Extractor: Making API call to OpenAI...")
        
        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                temperature=0.1,
                response_format={"type":"json_object"},
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
            
            print(f"OpenAI Extractor: JSON parsing successful")
            print(f"OpenAI Extractor: Extracted title = '{job.get('title', '')[:50]}'")
            print(f"OpenAI Extractor: Extracted company = '{job.get('company_name', '')}'")
            print(f"OpenAI Extractor: Extracted description length = {len(job.get('description', ''))}")
            
            # Clean and validate response
            job["description"] = (job.get("description") or "").strip()
            job["requirements"] = [x.strip() for x in (job.get("requirements") or []) if x and x.strip()]
            job["skills"] = [x.strip() for x in (job.get("skills") or []) if x and x.strip()]
            if not job.get("source_url"): job["source_url"] = url
            
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
        hints = hints or {}
        logger.info(f"Starting OpenAI image extraction: model={self.model}")
        
        if not data_url or not data_url.startswith("data:image/"):
            raise ValueError("Invalid image data URL format")
        
        # Check if model supports vision
        if "gpt-4" not in self.model.lower() and "vision" not in self.model.lower():
            logger.warning(f"Model {self.model} may not support vision - proceeding anyway")
        
        messages = [{"role": "system", "content": _EXTRACT_SYSTEM}]
        if hints:
            messages.append({"role": "user", "content": f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": f"Source URL: {url}\nPlease read the image and extract the job posting."},
                {"type": "image_url", "image_url": { "url": data_url }}
            ]
        })
        
        try:
            resp = self.client.chat.completions.create(
                model=self.model,  # ensure this is vision-capable (e.g., gpt-4o-mini)
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=messages,
                max_tokens=2500
            )
            
            if not resp.choices or not resp.choices[0].message.content:
                raise ValueError("OpenAI returned empty response for image")
            
            data = json.loads(resp.choices[0].message.content)
            job = data.get("job") or data
            
            # Clean and validate response
            job["description"] = (job.get("description") or "").strip()
            job["requirements"] = [x.strip() for x in (job.get("requirements") or []) if x and x.strip()]
            job["skills"] = [x.strip() for x in (job.get("skills") or []) if x and x.strip()]
            if not job.get("source_url"): job["source_url"] = url
            
            logger.info(f"OpenAI image extraction successful: title='{job.get('title', '')[:50]}...', company='{job.get('company_name', '')}'")
            return job
            
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI returned invalid JSON for image: {str(e)}")
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
                raise ValueError(f"Model {self.model} does not support vision - use gpt-4o-mini or gpt-4o")
            else:
                raise ValueError(f"OpenAI image API error: {str(e)}")
