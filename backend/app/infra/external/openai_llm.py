from __future__ import annotations
import os, json
from openai import OpenAI
from ...domain.jobs.extraction.ports import LLMExtractor

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
        hints = hints or {}
        messages = [{"role":"system","content":_EXTRACT_SYSTEM}]
        if hints:
            messages.append({"role":"user","content":f"HINTS: {json.dumps(hints, ensure_ascii=False)}"})
        messages.append({"role":"user","content":f"Source URL: {url}\n\nTEXT:\n{text[:16000]}"})

        resp = self.client.chat.completions.create(
            model=self.model,
            temperature=0.1,
            response_format={"type":"json_object"},
            messages=messages,
            max_tokens=2000
        )
        data = json.loads(resp.choices[0].message.content)
        job = data.get("job") or data
        job["description"] = (job.get("description") or "").strip()
        job["requirements"] = [x.strip() for x in (job.get("requirements") or []) if x and x.strip()]
        job["skills"] = [x.strip() for x in (job.get("skills") or []) if x and x.strip()]
        if not job.get("source_url"): job["source_url"] = url
        return job
