"""Shared utilities for document service."""
from __future__ import annotations

from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import os
import re

from ....infra.files.document_store import DocumentStore
from ....infra.logging import get_logger

logger = get_logger(__name__)

# Optional OpenAI for LLM calls
try:
    from openai import OpenAI  # type: ignore
    _OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
except Exception:
    OpenAI = None  # type: ignore
    _OPENAI_API_KEY = ""


class DocumentUtils:
    """Shared utility methods for document operations."""
    
    def __init__(self, store: DocumentStore, llm: Optional[Any] = None):
        self.store = store
        self._llm = llm
    
    def sidecar(self, file_path: Path) -> Dict[str, Any]:
        """Read sidecar metadata for a document."""
        return self.store.read_sidecar(file_path)
    
    def write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Write sidecar metadata for a document."""
        self.store.write_sidecar(file_path, data)
    
    def clamp_pct(self, x, default=0.0) -> float:
        """Clamp value to percentage range (0-100)."""
        try:
            x = float(x)
        except Exception:
            return float(default)
        return max(0.0, min(100.0, x))
    
    def coerce_list(self, v) -> List[str]:
        """Coerce value to list of strings."""
        if not v:
            return []
        if isinstance(v, list):
            return [str(x) for x in v if x is not None]
        return [str(v)]
    
    def normalize_ai_detailed_analysis(self, ai_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure ai_detailed_analysis always has complete structure with all keys.
        Fills missing keys with empty arrays/objects so frontend doesn't need fallbacks.
        """
        if not isinstance(ai_data, dict):
            ai_data = {}
        
        # Start with complete skeleton
        normalized = {
            "detected_headers": self.coerce_list(ai_data.get("detected_headers")),
            "expected_sections": self.coerce_list(ai_data.get("expected_sections")),
            "technical_skills": {
                "strengths": self.coerce_list(ai_data.get("technical_skills", {}).get("strengths")),
                "weaknesses": self.coerce_list(ai_data.get("technical_skills", {}).get("weaknesses")),
                "missing_elements": self.coerce_list(ai_data.get("technical_skills", {}).get("missing_elements")),
                "improvements": ai_data.get("technical_skills", {}).get("improvements") or [],
            },
            "keywords": {
                "strengths": self.coerce_list(ai_data.get("keywords", {}).get("strengths")),
                "weaknesses": self.coerce_list(ai_data.get("keywords", {}).get("weaknesses")),
                "missing_elements": self.coerce_list(ai_data.get("keywords", {}).get("missing_elements")),
                "keywords_found": self.coerce_list(ai_data.get("keywords", {}).get("keywords_found")),
                "keywords_missing": self.coerce_list(ai_data.get("keywords", {}).get("keywords_missing")),
                "improvements": ai_data.get("keywords", {}).get("improvements") or [],
            },
            "soft_skills": {
                "relevant_skills": self.coerce_list(ai_data.get("soft_skills", {}).get("relevant_skills")),
                "missing_elements": self.coerce_list(ai_data.get("soft_skills", {}).get("missing_elements")),
                "improvements": ai_data.get("soft_skills", {}).get("improvements") or [],
            },
            "formatting": {
                "strengths": self.coerce_list(ai_data.get("formatting", {}).get("strengths")),
                "weaknesses": self.coerce_list(ai_data.get("formatting", {}).get("weaknesses")),
                "improvements": ai_data.get("formatting", {}).get("improvements") or [],
            },
            "overall_suggestions": self.coerce_list(ai_data.get("overall_suggestions")),
        }
        return normalized
    
    def normalize_tokens(self, text: str) -> List[str]:
        """Normalize tokens from text for keyword matching."""
        toks = re.findall(r"[a-zA-Z0-9\+\#\.]{2,}", text.lower())
        fix = {"nodejs": "node.js", "node": "node.js"}
        return [fix.get(t, t) for t in toks]
    
    def llm_call(self, *, system: str, user: str, max_tokens: int = 2600) -> dict:
        """Safe LLM call that always returns a JSON object or {}."""
        if self._llm is None:
            return {}
        
        try:
            resp = self._llm.chat.completions.create(
                model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                temperature=0.0,
                top_p=1.0,
                presence_penalty=0,
                frequency_penalty=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            logger.error("LLM call failed", extra={"error": str(e)}, exc_info=True)
            return {}
    
    def generate_html_via_openai(self, text: str) -> str:
        """Generate HTML preview from plain text using OpenAI."""
        if self._llm is None:
            raise RuntimeError("OpenAI not configured")
        
        try:
            resp = self._llm.chat.completions.create(
                model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a formatter that turns plain resume text into simple semantic HTML. Do not invent content."
                    },
                    {"role": "user", "content": text[:6000]},
                ],
            )
            return resp.choices[0].message.content or "<div>(no preview)</div>"
        except Exception as e:
            logger.error("HTML generation failed", extra={"error": str(e)}, exc_info=True)
            return "<div>(preview generation failed)</div>"
    
    def log_analysis_data(self, job_meta: str, requirements: List[str], 
                         required_tech: List[str], resume_text: str) -> Optional[str]:
        """Log analysis data to desktop for debugging."""
        try:
            from datetime import datetime
            
            log_dir = Path.home() / "Desktop" / "ApplytideLogs"
            log_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = log_dir / f"job_analysis_{timestamp}.txt"
            
            with open(log_file, "w", encoding="utf-8") as f:
                f.write("===== JOB META =====\n")
                f.write(f"{job_meta}\n\n")
                f.write("===== REQUIREMENTS =====\n")
                f.write("\n".join(requirements) + "\n\n")
                f.write("===== REQUIRED TECH =====\n")
                f.write("\n".join(required_tech) + "\n\n")
                f.write("===== RESUME TEXT =====\n")
                f.write(f"{resume_text}\n\n")
            
            logger.debug("Analysis log written", extra={"log_file": str(log_file)})
            return str(log_file)
        except Exception as e:
            logger.error("Failed to write analysis log file", extra={"error": str(e)})
            return None
