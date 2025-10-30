"""
LLM-Powered Analysis Methods

This module contains pure LLM-powered analysis methods for document analysis.
These methods leverage OpenAI's API for intelligent resume analysis:
- General resume analysis (job-agnostic)
- Job-specific resume analysis

All methods include comprehensive error handling, validation, and logging.
Designed to be imported by the main DocumentAnalysisModule.
"""
from typing import Dict, Any, List, Optional
import uuid

from ....infra.logging import get_logger

logger = get_logger(__name__)

# Import constants from parent module
MIN_RESUME_LENGTH = 50
MAX_JOB_TEXT_LENGTH = 8000
MAX_RESUME_TEXT_LENGTH = 12000


class AnalysisValidationError(Exception):
    """Raised when analysis validation fails."""
    pass


class AnalysisLLMError(Exception):
    """Raised when LLM operations fail."""
    pass


class LLMAnalyzer:
    """
    Provides LLM-powered analysis methods for resumes.
    
    This class contains the two core LLM analysis methods:
    - llm_analyze_general_first: General resume quality assessment
    - llm_analyze_job_first: Job-specific resume matching analysis
    """
    
    def __init__(self, utils):
        """
        Initialize LLM analyzer.
        
        Args:
            utils: DocumentUtils instance with LLM access
        """
        self.utils = utils
    
    def llm_analyze_general_first(self, *, resume_text: str, user_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Perform general, job-agnostic LLM analysis for any profession.
        
        Args:
            resume_text: Resume text content (will be truncated to MAX_RESUME_TEXT_LENGTH)
            user_id: Optional user UUID for usage tracking
        
        Returns:
            Dictionary with comprehensive analysis results
        
        Raises:
            AnalysisValidationError: If resume_text is invalid
            AnalysisLLMError: If LLM call fails
        
        Example:
            result = analyzer.llm_analyze_general_first(
                resume_text="John Doe\\nSoftware Engineer...",
                user_id=uuid.UUID("...")
            )
        """
        try:
            if not resume_text or not isinstance(resume_text, str):
                raise AnalysisValidationError("resume_text must be a non-empty string")
            
            if len(resume_text) < MIN_RESUME_LENGTH:
                raise AnalysisValidationError(
                    f"Resume text too short: {len(resume_text)} chars (minimum: {MIN_RESUME_LENGTH})"
                )
            
            logger.debug(
                "Starting LLM general analysis",
                extra={"text_length": len(resume_text), "user_id": str(user_id) if user_id else None}
            )
            
            resume_snip = resume_text[:MAX_RESUME_TEXT_LENGTH]
            if len(resume_text) > MAX_RESUME_TEXT_LENGTH:
                logger.warning(
                    f"Resume truncated from {len(resume_text)} to {MAX_RESUME_TEXT_LENGTH} chars"
                )
            
            system = (
                "You are an ATS-aware resume reviewer across ALL professions. "
                "Return ONLY valid JSON. No markdown. All percentages 0–100."
            )
            user = f"""
RESUME (source of truth):
<<<RESUME>>>
{resume_snip}
<<<END RESUME>>>

Return JSON with:
- scores: {{ overall, formatting, readability }}  # 0-100
- missing_sections: string[]  # optional/soft; only if obviously absent
- section_scores: Record<string, {{score: number, improvement_needed: boolean, notes?: string}}>
- suggestions: string[]  # prioritized, concise
- language: {{ action_verb_count: number }}
- ai_detailed_analysis: {{
    detected_headers: string[],
    keywords: {{ strengths: string[], weaknesses: string[], missing_elements: string[], improvements: Array<{{suggestion: string, example?: string}}>}}, 
    soft_skills: {{ relevant_skills: string[], missing_elements: string[], improvements: Array<{{suggestion: string}}>}}, 
    formatting: {{ strengths: string[], weaknesses: string[], improvements: Array<{{suggestion: string}}>}}, 
    overall_suggestions: string[]
}}

Rules:
- Do not fabricate content not present in resume.
- 'section_scores' keys can be any sections present or expected (e.g., Summary, Experience, Education, Certifications).
"""
            
            try:
                j = self.utils.llm_call(
                    system=system, 
                    user=user, 
                    usage_type="resume_general",
                    endpoint="resume_analysis_general",
                    user_id=user_id
                )
            except Exception as e:
                logger.error(f"LLM call failed: {e}", exc_info=True)
                raise AnalysisLLMError(f"LLM analysis failed: {e}")
            
            # Parse and validate response
            scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
            formatting = self.utils.clamp_pct(scores.get("formatting"), 70.0)
            readability = self.utils.clamp_pct(scores.get("readability"), 70.0)
            overall = self.utils.clamp_pct(scores.get("overall"), (0.55 * readability + 0.45 * formatting))
            
            sections = j.get("section_scores") if isinstance(j.get("section_scores"), dict) else {}
            section_quality = {}
            for k, v in (sections or {}).items():
                if not isinstance(v, dict):
                    continue
                section_quality[k] = {
                    "score": self.utils.clamp_pct(v.get("score"), 0.0),
                    "improvement_needed": bool(v.get("improvement_needed", False)),
                    **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
                }
            
            lang = j.get("language", {}) if isinstance(j.get("language"), dict) else {}
            action_count = int(lang.get("action_verb_count") or 0)
            
            logger.info(
                "LLM general analysis completed",
                extra={"overall_score": overall, "user_id": str(user_id) if user_id else None}
            )
            
            return {
                "word_count": len(resume_text.split()),
                "overall_score": overall,
                "formatting_score": formatting,
                "readability_score": readability,
                "completeness_score": overall,
                "suggestions": self.utils.coerce_list(j.get("suggestions")),
                "missing_sections": self.utils.coerce_list(j.get("missing_sections")),
                "section_quality": section_quality,
                "action_verb_count": action_count,
                "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis(
                    j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
                ),
            }
            
        except (AnalysisValidationError, AnalysisLLMError):
            raise
        except Exception as e:
            logger.error(f"General LLM analysis failed: {e}", exc_info=True)
            raise AnalysisLLMError(f"Unexpected LLM analysis failure: {e}")
    
    def llm_analyze_job_first(self, *, resume_text: str, job_meta: str,
                            requirements: List[str], required_tech: List[str],
                            extra_keywords: List[str], user_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Perform LLM-powered job-specific analysis across any domain.
        
        Treats 'technical_skills' as 'role-specific hard skills' for the domain
        (e.g., clinical skills for nursing, programming for tech, etc.).
        
        Args:
            resume_text: Resume text content (will be truncated to MAX_RESUME_TEXT_LENGTH)
            job_meta: Job metadata (title, location, company, description)
            requirements: List of job requirements
            required_tech: List of required technical skills
            extra_keywords: Additional keywords from job posting
            user_id: Optional user UUID for usage tracking
        
        Returns:
            Dictionary with comprehensive job-specific analysis results
        
        Raises:
            AnalysisValidationError: If inputs are invalid
            AnalysisLLMError: If LLM call fails
        
        Example:
            result = analyzer.llm_analyze_job_first(
                resume_text="John Doe...",
                job_meta="Senior Engineer at Acme Corp...",
                requirements=["5+ years experience", "Python expertise"],
                required_tech=["Python", "AWS", "Docker"],
                extra_keywords=["agile", "CI/CD"],
                user_id=uuid.UUID("...")
            )
        """
        try:
            # Validate inputs
            if not resume_text or not isinstance(resume_text, str):
                raise AnalysisValidationError("resume_text must be a non-empty string")
            
            if len(resume_text) < MIN_RESUME_LENGTH:
                raise AnalysisValidationError(
                    f"Resume text too short: {len(resume_text)} chars (minimum: {MIN_RESUME_LENGTH})"
                )
            
            if not job_meta or not isinstance(job_meta, str):
                raise AnalysisValidationError("job_meta must be a non-empty string")
            
            logger.debug(
                "Starting LLM job-specific analysis",
                extra={
                    "text_length": len(resume_text),
                    "job_meta_length": len(job_meta),
                    "requirements_count": len(requirements or []),
                    "required_tech_count": len(required_tech or []),
                    "user_id": str(user_id) if user_id else None
                }
            )
            
            # Truncate and prepare inputs
            resume_snip = resume_text[:MAX_RESUME_TEXT_LENGTH]
            if len(resume_text) > MAX_RESUME_TEXT_LENGTH:
                logger.warning(
                    f"Resume truncated from {len(resume_text)} to {MAX_RESUME_TEXT_LENGTH} chars"
                )
            
            job_req_blobs = "\n".join([f"- {r}" for r in (requirements or [])][:60])
            job_skills = ", ".join(required_tech or [])
            job_keywords = ", ".join(sorted(set(extra_keywords or []))[:60])
            
            system = (
                "You are a strict, domain-agnostic resume-to-job assessor. "
                "Return ONLY valid JSON. Never invent facts not present in the RESUME. "
                "First, infer the industry/domain from the job title and description (e.g., healthcare, tech, retail, finance, education, hospitality, construction, etc.). "
                "Then treat 'technical_skills' as 'role-specific hard skills' for that domain. "
                "For example: clinical skills for nursing, POS systems for retail, programming languages for tech, financial modeling for finance. "
                "All percentages are 0–100."
            )
            user = f"""
JOB META:
{job_meta}

REQUIREMENTS (bullets):
{job_req_blobs or "(none)"}

JOB SKILLS (from posting):
{job_skills or "(none)"}

EXTRA KEYWORDS (from title/desc):
{job_keywords or "(none)"}

RESUME (source of truth):
<<<RESUME>>>
{resume_snip}
<<<END RESUME>>>

Return JSON with exactly these keys:
- scores: {{
    overall, technical_skills, soft_skills, keyword, formatting, readability
}}  # all 0-100
- job_match_summary: string  # concise, like "Tech skills match: 72%, Requirements: 64%, Keywords: 58%"
- keyword_analysis: {{
    keywords_found: string[],
    keywords_missing: string[],
    keyword_density: Array<{{term: string, count: number}}>
}}
- tech_analysis: {{
    tech_found: string[],
    tech_missing: string[]
}}  # 'tech' means 'hard skills' for the role
- recommendations: string[]  # prioritized, 1 sentence each
- ai_detailed_analysis: {{
    detected_headers: string[],
    technical_skills: {{
    strengths: string[], weaknesses: string[], missing_elements: string[],
    improvements: Array<{{suggestion: string, example_before?: string, example_after?: string, example?: string}}>
    }},
    keywords: {{
    strengths: string[], weaknesses: string[], missing_elements: string[],
    improvements: Array<{{suggestion: string, example_before?: string, example_after?: string, example?: string}}>
    }},
    soft_skills: {{
    relevant_skills: string[], missing_elements: string[],
    improvements: Array<{{suggestion: string, example?: string}}>
    }},
    formatting: {{
    strengths: string[], weaknesses: string[],
    improvements: Array<{{suggestion: string}}>
    }},
    overall_suggestions: string[]
}}
- section_scores: Record<string, {{score: number, improvement_needed: boolean, notes?: string}}>
    # e.g. "Experience": {{score: 82, improvement_needed: false}}

Rules:
- Only mark a hard skill as 'found' if present in RESUME.
- Prefer concise bullets. No markdown. Keep arrays short but useful.
"""
            
            try:
                j = self.utils.llm_call(
                    system=system, 
                    user=user,
                    usage_type="resume_job",
                    endpoint="resume_analysis_job",
                    user_id=user_id
                )
            except Exception as e:
                logger.error(f"LLM job analysis call failed: {e}", exc_info=True)
                raise AnalysisLLMError(f"LLM job analysis failed: {e}")
            
            # Defensive coercion & defaults
            scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
            formatting_score = self.utils.clamp_pct(scores.get("formatting"), 70.0)
            readability_score = self.utils.clamp_pct(scores.get("readability"), 70.0)
            keyword_score = self.utils.clamp_pct(scores.get("keyword"), 60.0)
            tech_score = self.utils.clamp_pct(scores.get("technical_skills"), 60.0)
            soft_score = self.utils.clamp_pct(scores.get("soft_skills"), 70.0)
            
            # If overall missing, synthesize with mild weights (LLM-first mindset)
            overall = scores.get("overall")
            if overall is None:
                overall = (
                    0.45 * tech_score
                    + 0.25 * keyword_score
                    + 0.15 * soft_score
                    + 0.10 * formatting_score
                    + 0.05 * readability_score
                )
            overall = self.utils.clamp_pct(overall, 65.0)
            
            # Keyword density => flatten to mapping
            kd_list = j.get("keyword_analysis", {}).get("keyword_density") or []
            kd_map = {}
            for entry in kd_list if isinstance(kd_list, list) else []:
                try:
                    term = str(entry.get("term", "")).lower().strip()
                    cnt = int(entry.get("count", 0))
                    if term:
                        kd_map[term] = int(max(0, cnt))
                except Exception:
                    pass
            
            section_scores = j.get("section_scores") if isinstance(j.get("section_scores"), dict) else {}
            norm_sections = {}
            for k, v in (section_scores or {}).items():
                if not isinstance(v, dict):
                    continue
                norm_sections[k] = {
                    "score": self.utils.clamp_pct(v.get("score"), 0.0),
                    "improvement_needed": bool(v.get("improvement_needed", False)),
                    **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
                }
            
            logger.info(
                "LLM job analysis completed",
                extra={"overall_score": overall, "user_id": str(user_id) if user_id else None}
            )
            
            return {
                "word_count": len(resume_text.split()),
                "overall_score": overall,
                "formatting_score": formatting_score,
                "readability_score": readability_score,
                "keyword_score": keyword_score,
                "technical_skills_score": tech_score,
                "soft_skills_score": soft_score,
                "recommendations": self.utils.coerce_list(j.get("recommendations")),
                "missing_sections": [],
                "job_match_summary": j.get("job_match_summary") or
                    f"Tech skills match: {tech_score:.0f}%, Keywords: {keyword_score:.0f}%",
                "keyword_analysis": {
                    "keywords_found": self.utils.coerce_list(j.get("keyword_analysis", {}).get("keywords_found")),
                    "keywords_missing": self.utils.coerce_list(j.get("keyword_analysis", {}).get("keywords_missing")),
                    "keyword_density": kd_map,
                },
                "tech_analysis": {
                    "tech_found": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_found")),
                    "tech_missing": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
                },
                "missing_skills": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
                "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis(
                    j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
                ),
                "section_quality": norm_sections,
            }
            
        except (AnalysisValidationError, AnalysisLLMError):
            raise
        except Exception as e:
            logger.error(f"Job-specific LLM analysis failed: {e}", exc_info=True)
            raise AnalysisLLMError(f"Unexpected job analysis failure: {e}")
