# app/services/ai_cover_letter.py
"""
Real AI-powered cover letter generation using OpenAI GPT-4o-mini (or override via env).
- Uses AsyncOpenAI (non-blocking in FastAPI)
- Compatible with openai==1.40.0
- Optional HTTP(S) proxy support via env or settings
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Optional, List, Tuple

import httpx
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

# If your project exposes settings, we try to import them; else we fall back to env vars.
try:
    from app.config import settings  # type: ignore
    OPENAI_API_KEY = settings.OPENAI_API_KEY
    OPENAI_BASE_URL = getattr(settings, "OPENAI_BASE_URL", None)
    OPENAI_ORG = getattr(settings, "OPENAI_ORGANIZATION", None)
    OPENAI_PROJECT = getattr(settings, "OPENAI_PROJECT", None)
    HTTP_PROXY = getattr(settings, "HTTP_PROXY", None) or os.getenv("HTTP_PROXY")
    HTTPS_PROXY = getattr(settings, "HTTPS_PROXY", None) or os.getenv("HTTPS_PROXY")
    DEFAULT_MODEL = getattr(settings, "COVER_LETTER_MODEL", None) or os.getenv("COVER_LETTER_MODEL", "gpt-4o-mini")
except Exception:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
    OPENAI_ORG = os.getenv("OPENAI_ORGANIZATION")
    OPENAI_PROJECT = os.getenv("OPENAI_PROJECT")
    HTTP_PROXY = os.getenv("HTTP_PROXY")
    HTTPS_PROXY = os.getenv("HTTPS_PROXY")
    DEFAULT_MODEL = os.getenv("COVER_LETTER_MODEL", "gpt-4o-mini")

# Import your ORM models
from ..db import models  # noqa: E402


def _safe_str(x: object, limit: int | None = None) -> str:
    """Convert to string and optionally hard-trim by characters."""
    s = "" if x is None else str(x)
    if limit is not None and limit >= 0 and len(s) > limit:
        return s[:limit]
    return s


def _resolve_job_and_company(db: Session, job_id: str) -> Tuple[models.Job, Optional[str]]:
    """
    Retrieve a job and its company name (outer join).
    Works on SQLAlchemy ORM without relying on Core select().
    """
    q = (
        db.query(models.Job, models.Company.name.label("company_name"))
        .outerjoin(models.Company, models.Job.company_id == models.Company.id)
        .filter(models.Job.id == job_id)
        .first()
    )
    if not q:
        raise ValueError("Job not found")
    job, company_name = q
    return job, company_name


class AICoverLetterService:
    def __init__(self) -> None:
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        # If you need an explicit proxy, use transport= with proxy= (works across httpx versions).
        proxy_url = HTTPS_PROXY or HTTP_PROXY  # e.g. "http://user:pass@host:port"
        transport = None
        if proxy_url:
            transport = httpx.AsyncHTTPTransport(proxy=proxy_url)

        # NOTE: do NOT pass `proxies=` here. Many httpx versions reject it on AsyncClient.
        self._http_client = httpx.AsyncClient(
            transport=transport,                # or None; httpx will use env HTTP(S)_PROXY if set
            timeout=httpx.Timeout(60.0, read=60.0, write=60.0, connect=20.0),
            # trust_env=True is default; keeps env proxy support if you didn't set transport
        )

        # Construct AsyncOpenAI client — no `proxies=` here either.
        self.client = AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL or None,
            organization=OPENAI_ORG or None,
            project=OPENAI_PROJECT or None,
            http_client=self._http_client,
        )

        self.model = DEFAULT_MODEL


    async def aclose(self) -> None:
        """Optionally call this on shutdown to close the shared httpx client."""
        try:
            await self._http_client.aclose()
        except Exception:
            pass

    async def generate_intelligent_cover_letter(
        self,
        db: Session,
        job_id: str,
        resume_content: str,
        user_profile: dict,
        tone: str = "professional",
        length: str = "medium",
    ) -> dict:
        """
        Generate a tailored cover letter using GPT-4o-mini (async).
        """
        # 1) Fetch job + company
        job, company_name = _resolve_job_and_company(db, job_id)

        # 2) Normalize inputs and trim to keep prompt compact
        job_title = _safe_str(job.title, 180)
        job_location = _safe_str(job.location, 180)
        job_desc = _safe_str(job.description, 4000)  # allow more context if you want
        resume_text = _safe_str(resume_content, 6000)  # keep reasonable
        user_profile_json = _safe_str(json.dumps(user_profile, ensure_ascii=False), 4000)

        word_count = {
            "short": "200-300",
            "medium": "300-400",
            "long": "400-500",
        }.get(length, "300-400")

        tone_instructions = {
            "professional": "formal and professional",
            "conversational": "warm and conversational while maintaining professionalism",
            "confident": "confident and assertive while remaining respectful",
            "creative": "creative and engaging while staying professional",
        }.get(tone, "formal and professional")

        # 3) Compose prompt
        prompt = (
            f"Create a compelling, personalized cover letter based on the following information.\n\n"
            f"JOB DETAILS:\n"
            f"- Position: {job_title}\n"
            f"- Company: {company_name or 'Not specified'}\n"
            f"- Location: {job_location}\n"
            f"- Job Description:\n{job_desc}\n\n"
            f"CANDIDATE INFORMATION:\n"
            f"- Resume Content:\n{resume_text}\n\n"
            f"- User Profile (JSON):\n{user_profile_json}\n\n"
            f"REQUIREMENTS:\n"
            f"- Length: {word_count} words\n"
            f"- Tone: {tone_instructions}\n"
            f"- Must be personalized to the specific job and company\n"
            f"- Highlight relevant experience from the resume\n"
            f"- Show enthusiasm for the role and company\n"
            f"- Include a strong opening and closing\n"
            f"- Use specific examples from the resume when possible\n"
            f"- Address key requirements inferred from the job description\n\n"
            f"Output a complete, ready-to-send cover letter."
        )

        try:
            # 4) Call OpenAI (async)
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert career counselor and professional writer. "
                            "Write concise, tailored, high-quality cover letters."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=900,     # a little more headroom
                temperature=0.7,
            )

            cover_letter_text = (response.choices[0].message.content or "").strip()

            return {
                "success": True,
                "cover_letter": cover_letter_text,
                "job_title": job_title,
                "company_name": company_name,
                "generated_at": datetime.utcnow().isoformat(),
                "model_used": self.model,
                "tone": tone,
                "length": length,
                "word_count": len(cover_letter_text.split()),
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate cover letter: {e}",
                "fallback_message": "Please use the template generator as a fallback.",
            }

    def generate_template_cover_letter(
        self,
        job_title: str,
        company_name: str,
        user_name: str,
        key_skills: List[str],
        tone: str = "professional",
    ) -> str:
        """
        Generate a simple template-based cover letter when AI is not available.
        """
        skills_text = ", ".join(key_skills[:3]) if key_skills else "relevant technical skills"

        if tone == "conversational":
            return (
                f"Dear Hiring Manager,\n\n"
                f"I'm excited to apply for the {job_title} position at {company_name}. "
                f"Your company's reputation for innovation and excellence aligns perfectly with my goals and values.\n\n"
                f"In my previous roles, I've developed strong expertise in {skills_text}. "
                f"I'm particularly drawn to this opportunity because it would allow me to contribute to "
                f"{company_name}'s continued success while growing my skills in a dynamic environment.\n\n"
                f"I'd love the opportunity to discuss how my background and enthusiasm can contribute to your team. "
                f"Thank you for considering my application.\n\n"
                f"Best regards,\n{user_name}"
            )

        # professional (default)
        return (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my strong interest in the {job_title} position at {company_name}. "
            f"With my background in {skills_text}, I am confident I would be a valuable addition to your team.\n\n"
            f"My experience has prepared me well for this role, and I am particularly impressed by {company_name}'s "
            f"commitment to excellence in the industry. I am eager to contribute to your organization's continued "
            f"success and growth.\n\n"
            f"I would welcome the opportunity to discuss my qualifications further. Thank you for your time and consideration.\n\n"
            f"Sincerely,\n{user_name}"
        )
