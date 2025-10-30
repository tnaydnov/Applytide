"""
Shared Utilities for Document Service

Provides common utility functions for document operations including:
- Sidecar metadata management
- Data validation and normalization
- LLM integration with usage tracking
- Text processing and tokenization
- HTML generation from plain text
- Debug logging utilities

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import os
import re
import uuid

from ....infra.files.document_store import DocumentStore
from ....infra.logging import get_logger

logger = get_logger(__name__)

# Optional OpenAI for LLM calls
try:
    from openai import OpenAI  # type: ignore
    from ....infra.external.llm_tracker import track_openai_call
    _OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
except Exception:
    OpenAI = None  # type: ignore
    track_openai_call = None  # type: ignore
    _OPENAI_API_KEY = ""


class DocumentUtilsError(Exception):
    """Base exception for document utilities."""
    pass


class LLMError(DocumentUtilsError):
    """Raised when LLM operations fail."""
    pass


class ValidationError(DocumentUtilsError):
    """Raised when validation fails."""
    pass


class DocumentUtils:
    """
    Shared utility methods for document operations.
    
    Provides common functionality for document processing including
    metadata management, LLM integration, and data normalization.
    """
    
    def __init__(self, store: DocumentStore, llm: Optional[Any] = None, db_session=None):
        """
        Initialize document utilities.
        
        Args:
            store: DocumentStore instance for file operations
            llm: Optional LLM client (OpenAI) for AI operations
            db_session: Optional database session for LLM usage tracking
        
        Raises:
            ValidationError: If store is None
        """
        if not store:
            logger.error("DocumentUtils initialized with None store")
            raise ValidationError("DocumentStore instance is required")
        
        self.store = store
        self._llm = llm
        self.db_session = db_session
        
        logger.debug(
            "DocumentUtils initialized",
            extra={
                "has_llm": llm is not None,
                "has_db_session": db_session is not None
            }
        )
    
    def sidecar(self, file_path: Path) -> Dict[str, Any]:
        """
        Read sidecar metadata for a document.
        
        Args:
            file_path: Path to document file
        
        Returns:
            Sidecar metadata dict (empty dict if not found)
        
        Raises:
            ValidationError: If file_path is invalid
        """
        if not file_path:
            raise ValidationError("file_path is required")
        
        if not isinstance(file_path, Path):
            raise ValidationError(f"file_path must be Path, got {type(file_path)}")
        
        try:
            return self.store.read_sidecar(file_path)
        except Exception as e:
            logger.debug(
                f"Could not read sidecar: {e}",
                extra={"file": str(file_path)}
            )
            return {}
    
    def write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        """
        Write sidecar metadata for a document.
        
        Args:
            file_path: Path to document file
            data: Metadata dict to write
        
        Raises:
            ValidationError: If inputs are invalid
            DocumentUtilsError: If write fails
        """
        if not file_path:
            raise ValidationError("file_path is required")
        
        if not isinstance(file_path, Path):
            raise ValidationError(f"file_path must be Path, got {type(file_path)}")
        
        if not isinstance(data, dict):
            raise ValidationError(f"data must be dict, got {type(data)}")
        
        try:
            self.store.write_sidecar(file_path, data)
            logger.debug(
                "Sidecar written",
                extra={"file": str(file_path), "keys": list(data.keys())}
            )
        except Exception as e:
            logger.error(
                f"Failed to write sidecar: {e}",
                extra={"file": str(file_path)},
                exc_info=True
            )
            raise DocumentUtilsError(f"Failed to write sidecar: {e}")
    
    def clamp_pct(self, x, default=0.0) -> float:
        """
        Clamp value to percentage range (0-100).
        
        Args:
            x: Value to clamp (will be converted to float)
            default: Default value if conversion fails
        
        Returns:
            Float clamped to [0.0, 100.0]
        
        Example:
            score = utils.clamp_pct(85.5)  # Returns 85.5
            score = utils.clamp_pct(150)   # Returns 100.0
            score = utils.clamp_pct(-10)   # Returns 0.0
            score = utils.clamp_pct("bad") # Returns 0.0 (default)
        """
        try:
            x = float(x)
        except (TypeError, ValueError) as e:
            logger.debug(
                f"Could not convert to float, using default: {e}",
                extra={"value": str(x), "default": default}
            )
            return float(default)
        
        clamped = max(0.0, min(100.0, x))
        if clamped != x:
            logger.debug(
                f"Value clamped: {x} -> {clamped}",
                extra={"original": x, "clamped": clamped}
            )
        
        return clamped
    
    def coerce_list(self, v) -> List[str]:
        """
        Coerce value to list of strings.
        
        Args:
            v: Value to coerce (can be None, str, list, etc.)
        
        Returns:
            List of strings (empty list if input is None/empty)
        
        Example:
            utils.coerce_list(None)           # Returns []
            utils.coerce_list("hello")        # Returns ["hello"]
            utils.coerce_list([1, 2, "3"])    # Returns ["1", "2", "3"]
            utils.coerce_list([None, "a"])    # Returns ["a"]
        """
        if not v:
            return []
        
        if isinstance(v, list):
            result = [str(x) for x in v if x is not None]
            logger.debug(
                f"Coerced list: {len(v)} items -> {len(result)} strings",
                extra={"input_length": len(v), "output_length": len(result)}
            )
            return result
        
        return [str(v)]
    
    def normalize_ai_detailed_analysis(self, ai_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure AI analysis data has complete structure with all expected keys.
        
        Fills missing keys with empty arrays/objects so frontend doesn't need
        fallbacks. Provides consistent data shape regardless of AI response quality.
        
        Args:
            ai_data: Raw AI analysis data (can be incomplete or invalid)
        
        Returns:
            Normalized analysis dict with all required keys
        
        Example:
            raw_data = {"technical_skills": {"strengths": ["Python"]}}
            normalized = utils.normalize_ai_detailed_analysis(raw_data)
            # All keys guaranteed: detected_headers, expected_sections, etc.
        """
        if not isinstance(ai_data, dict):
            logger.warning(
                f"AI data is not a dict, using empty dict",
                extra={"type": type(ai_data).__name__}
            )
            ai_data = {}
        
        logger.debug(
            f"Normalizing AI analysis data",
            extra={"input_keys": list(ai_data.keys())}
        )
        
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
        
        logger.debug(
            "AI analysis data normalized",
            extra={
                "detected_headers_count": len(normalized["detected_headers"]),
                "technical_strengths_count": len(normalized["technical_skills"]["strengths"]),
                "has_formatting": bool(normalized["formatting"]["strengths"])
            }
        )
        
        return normalized
    
    def normalize_tokens(self, text: str) -> List[str]:
        """
        Normalize tokens from text for keyword matching.
        
        Extracts alphanumeric tokens (2+ chars) and applies tech-specific fixes
        (e.g., nodejs -> node.js).
        
        Args:
            text: Text to tokenize
        
        Returns:
            List of normalized lowercase tokens
        
        Example:
            tokens = utils.normalize_tokens("Python, Node.js, and C++")
            # Returns: ["python", "node.js", "and"]
        """
        if not text:
            return []
        
        if not isinstance(text, str):
            logger.warning(
                f"Text is not a string, converting",
                extra={"type": type(text).__name__}
            )
            text = str(text)
        
        toks = re.findall(r"[a-zA-Z0-9\+\#\.]{2,}", text.lower())
        fix = {"nodejs": "node.js", "node": "node.js"}
        normalized = [fix.get(t, t) for t in toks]
        
        logger.debug(
            f"Tokenized text: {len(normalized)} tokens",
            extra={"token_count": len(normalized)}
        )
        
        return normalized
    
    def normalize_format(self, raw_ext: str) -> str:
        """
        Normalize file extension to standard format.
        
        Args:
            raw_ext: Raw file extension (e.g., "doc", "pdf")
        
        Returns:
            Normalized format string
        
        Example:
            utils.normalize_format("doc")  # Returns "docx"
            utils.normalize_format("PDF")  # Returns "pdf"
        """
        if not raw_ext:
            return "txt"
        
        ext = raw_ext.lower().strip()
        ext_map = {"doc": "docx"}
        
        return ext_map.get(ext, ext)
    
    def llm_call(self, *, system: str, user: str, max_tokens: int = 2600, usage_type: str = "resume_general", endpoint: str = "resume_analysis", user_id: Optional[uuid.UUID] = None) -> dict:
        """
        Safe LLM call that always returns a JSON object.
        
        Makes OpenAI API call with usage tracking, error handling, and
        guaranteed JSON response. Returns empty dict on any failure.
        
        Args:
            system: System prompt
            user: User prompt
            max_tokens: Maximum response tokens
            usage_type: Usage tracking category
            endpoint: Endpoint name for tracking
            user_id: Optional user ID for tracking
        
        Returns:
            Parsed JSON dict (empty dict on failure)
        
        Raises:
            LLMError: If LLM is not configured
        
        Example:
            result = utils.llm_call(
                system="You are an expert resume analyzer.",
                user="Analyze this resume: ...",
                max_tokens=2000,
                usage_type="resume_analysis"
            )
        """
        if self._llm is None:
            logger.warning("LLM call attempted but LLM not configured")
            raise LLMError("LLM not configured")
        
        # Validate inputs
        if not system or not isinstance(system, str):
            logger.warning(f"Invalid system prompt: {type(system)}")
            return {}
        
        if not user or not isinstance(user, str):
            logger.warning(f"Invalid user prompt: {type(user)}")
            return {}
        
        if max_tokens < 1:
            logger.warning(f"Invalid max_tokens: {max_tokens}, using default 2600")
            max_tokens = 2600
        
        logger.debug(
            f"Making LLM call",
            extra={
                "usage_type": usage_type,
                "endpoint": endpoint,
                "system_length": len(system),
                "user_length": len(user),
                "max_tokens": max_tokens,
                "has_user_id": user_id is not None
            }
        )
        
        try:
            # Track LLM usage if DB session available
            tracker = None
            if self.db_session and track_openai_call:
                try:
                    tracker = track_openai_call(
                        self.db_session,
                        endpoint=endpoint,
                        usage_type=usage_type,
                        user_id=user_id,
                        system_prompt_length=len(system),
                        user_prompt_length=len(user)
                    )
                except Exception as e:
                    logger.warning(f"Failed to initialize LLM tracker: {e}")
                    tracker = None
            
            model = os.getenv("RESUME_MODEL", "gpt-4o-mini")
            
            if tracker:
                with tracker:
                    resp = self._llm.chat.completions.create(
                        model=model,
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
                    # Record usage
                    if resp.usage:
                        tracker.set_usage(
                            model=resp.model,
                            prompt_tokens=resp.usage.prompt_tokens,
                            completion_tokens=resp.usage.completion_tokens,
                            total_tokens=resp.usage.total_tokens
                        )
            else:
                resp = self._llm.chat.completions.create(
                    model=model,
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
            
            try:
                result = json.loads(content)
                logger.info(
                    f"LLM call successful",
                    extra={
                        "usage_type": usage_type,
                        "model": resp.model if hasattr(resp, 'model') else model,
                        "response_keys": list(result.keys()) if isinstance(result, dict) else None
                    }
                )
                return result
            except json.JSONDecodeError as e:
                logger.error(
                    f"Failed to parse LLM response as JSON: {e}",
                    extra={"content_preview": content[:200]},
                    exc_info=True
                )
                return {}
            
        except Exception as e:
            logger.error(
                f"LLM call failed: {e}",
                extra={
                    "usage_type": usage_type,
                    "endpoint": endpoint,
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            return {}
    
    def generate_html_via_openai(self, text: str) -> str:
        """
        Generate HTML preview from plain text using OpenAI.
        
        Converts plain resume text into semantic HTML for preview.
        
        Args:
            text: Plain text to convert (will be truncated to 6000 chars)
        
        Returns:
            HTML string (fallback message on failure)
        
        Raises:
            LLMError: If LLM is not configured
        
        Example:
            html = utils.generate_html_via_openai("Name: John Doe\\nSkills: Python")
        """
        if self._llm is None:
            logger.warning("HTML generation attempted but LLM not configured")
            raise LLMError("LLM not configured")
        
        if not text:
            logger.warning("Empty text for HTML generation")
            return "<div>(no content provided)</div>"
        
        if not isinstance(text, str):
            logger.warning(f"Text is not string: {type(text)}, converting")
            text = str(text)
        
        # Truncate for safety
        truncated_text = text[:6000]
        if len(text) > 6000:
            logger.debug(
                f"Text truncated for HTML generation: {len(text)} -> 6000 chars",
                extra={"original_length": len(text)}
            )
        
        logger.debug(
            f"Generating HTML preview",
            extra={"text_length": len(truncated_text)}
        )
        
        try:
            model = os.getenv("RESUME_MODEL", "gpt-4o-mini")
            
            resp = self._llm.chat.completions.create(
                model=model,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a formatter that turns plain resume text into simple semantic HTML. Do not invent content."
                    },
                    {"role": "user", "content": truncated_text},
                ],
            )
            
            html = resp.choices[0].message.content or "<div>(no preview)</div>"
            
            logger.info(
                f"HTML generated successfully",
                extra={
                    "model": model,
                    "html_length": len(html)
                }
            )
            
            return html
            
        except Exception as e:
            logger.error(
                f"HTML generation failed: {e}",
                extra={"text_length": len(truncated_text)},
                exc_info=True
            )
            return "<div>(preview generation failed)</div>"
    
    def log_analysis_data(self, job_meta: str, requirements: List[str], 
                         required_tech: List[str], resume_text: str) -> Optional[str]:
        """
        Log analysis data to desktop for debugging.
        
        Creates a timestamped log file on the desktop with analysis inputs
        for troubleshooting and quality assurance.
        
        Args:
            job_meta: Job metadata string
            requirements: List of job requirements
            required_tech: List of required technologies
            resume_text: Resume text content
        
        Returns:
            Path to log file if successful, None on failure
        
        Example:
            log_path = utils.log_analysis_data(
                job_meta="Senior Engineer at ACME Corp",
                requirements=["5+ years Python", "AWS experience"],
                required_tech=["Python", "AWS", "Docker"],
                resume_text="Experienced developer..."
            )
        """
        try:
            from datetime import datetime
            
            log_dir = Path.home() / "Desktop" / "ApplytideLogs"
            
            try:
                log_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.error(f"Failed to create log directory: {e}", exc_info=True)
                return None
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = log_dir / f"job_analysis_{timestamp}.txt"
            
            logger.debug(
                f"Writing analysis log",
                extra={
                    "log_file": str(log_file),
                    "requirements_count": len(requirements),
                    "tech_count": len(required_tech),
                    "resume_length": len(resume_text)
                }
            )
            
            with open(log_file, "w", encoding="utf-8") as f:
                f.write("===== JOB META =====\n")
                f.write(f"{job_meta}\n\n")
                f.write("===== REQUIREMENTS =====\n")
                f.write("\n".join(requirements) + "\n\n")
                f.write("===== REQUIRED TECH =====\n")
                f.write("\n".join(required_tech) + "\n\n")
                f.write("===== RESUME TEXT =====\n")
                f.write(f"{resume_text}\n\n")
            
            logger.info(
                "Analysis log written successfully",
                extra={"log_file": str(log_file)}
            )
            return str(log_file)
            
        except Exception as e:
            logger.error(
                f"Failed to write analysis log: {e}",
                exc_info=True
            )
            return None
