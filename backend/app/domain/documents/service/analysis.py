"""
AI-Powered Document Analysis and ATS Scoring

Provides comprehensive document analysis including:
- ATS (Applicant Tracking System) scoring
- Job-specific resume analysis with keyword matching
- General resume quality assessment
- Technical skills, keywords, and formatting analysis
- AI-powered insights with heuristic fallbacks

Analysis Strategy:
- Primary: LLM-powered analysis (OpenAI) via analysis_llm module
- Caching: Intelligent caching to reduce redundant AI calls
- Fallback: Heuristic analysis when LLM unavailable
- Always returns valid scores and insights

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import re
import json
import os

from ....db import models
from ....api.schemas.documents import DocumentAnalysis as DocumentAnalysisSchema, ATSScore
from ....infra.logging import get_logger
from ....infra.extractors.text_extractor import SAFE_BULLET

# Import LLM analysis functionality
from .analysis_llm import LLMAnalyzer

logger = get_logger(__name__)


class AnalysisError(Exception):
    """Base exception for analysis operations."""
    pass


class AnalysisValidationError(AnalysisError):
    """Raised when analysis validation fails."""
    pass


class AnalysisLLMError(AnalysisError):
    """Raised when LLM operations fail."""
    pass


# Analysis configuration
MIN_RESUME_LENGTH = 50  # Minimum resume text length for meaningful analysis
MAX_JOB_TEXT_LENGTH = 8000  # Maximum job text for LLM processing
MAX_RESUME_TEXT_LENGTH = 12000  # Maximum resume text for LLM processing
DEFAULT_ATS_SCORE = 50.0  # Default score when analysis fails


class DocumentAnalysisModule:
    """
    Handles AI-powered document analysis and ATS scoring.
    
    Provides comprehensive resume analysis with job-specific insights,
    ATS scoring, and intelligent caching to optimize LLM usage.
    
    Delegates LLM-powered analysis to LLMAnalyzer for cleaner separation.
    """
    
    def __init__(self, utils, cache):
        """
        Initialize document analysis module.
        
        Args:
            utils: DocumentUtils instance for LLM access and utilities
            cache: AnalysisCache instance for result caching
        
        Raises:
            AnalysisValidationError: If dependencies are None
        """
        if not utils:
            logger.error("DocumentAnalysisModule initialized with None utils")
            raise AnalysisValidationError("DocumentUtils instance is required")
        
        if not cache:
            logger.error("DocumentAnalysisModule initialized with None cache")
            raise AnalysisValidationError("AnalysisCache instance is required")
        
        self.utils = utils
        self.cache = cache
        
        # Initialize LLM analyzer for AI-powered analysis methods
        self.llm_analyzer = LLMAnalyzer(utils=utils)
        
        logger.debug(
            "DocumentAnalysisModule initialized",
            extra={
                "has_llm": utils._llm is not None,
                "has_db_session": utils.db_session is not None
            }
        )
    
    def extract_keywords_from_job(self, job) -> List[str]:
        """
        Extract relevant keywords from job posting using LLM or fallback heuristics.
        
        Args:
            job: Job model instance with title and description
        
        Returns:
            List of extracted keyword strings (15-40 keywords)
        
        Raises:
            AnalysisValidationError: If job is invalid
        
        Example:
            keywords = analyzer.extract_keywords_from_job(job)
            # Returns: ["Python", "AWS", "Docker", "CI/CD", ...]
        """
        try:
            if not job:
                raise AnalysisValidationError("Job object is required")
            
            text = " ".join(filter(None, [job.title or "", job.description or ""])).strip()
            
            if not text:
                logger.debug("No text in job posting, returning empty keywords")
                return []
            
            if len(text) > MAX_JOB_TEXT_LENGTH:
                logger.warning(
                    f"Job text truncated from {len(text)} to {MAX_JOB_TEXT_LENGTH} chars",
                    extra={"job_id": getattr(job, "id", None)}
                )
                text = text[:MAX_JOB_TEXT_LENGTH]
            
            # LLM-first approach (if available)
            if self.utils._llm is not None:
                try:
                    logger.debug("Using LLM for keyword extraction")
                    resp = self.utils._llm.chat.completions.create(
                        model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                        temperature=0.0,
                        response_format={"type": "json_object"},
                        messages=[
                            {
                                "role": "system",
                                "content": "Extract 15–40 domain-relevant keywords/phrases (hard skills, tools, certifications, domain terms). "
                                          "Return JSON: {\"keywords\": [\"...\"]}. Do not invent."
                            },
                            {"role": "user", "content": text[:8000]},
                        ],
                        max_tokens=600,
                    )
                    data = json.loads(resp.choices[0].message.content or "{}")
                    kws = [k.strip() for k in (data.get("keywords") or []) if k and isinstance(k, str)]
                    keywords = list(dict.fromkeys(kws))
                    logger.info(f"LLM extracted {len(keywords)} keywords")
                    return keywords
                except Exception as e:
                    logger.warning(f"LLM keyword extraction failed, using fallback: {e}")
            
            # Domain-agnostic fallback: proper nouns + frequent terms
            logger.debug("Using heuristic fallback for keyword extraction")
            blob = text.lower()
            stop = set(("the","and","for","with","to","of","in","on","at","a","an","our","we","you","as","by","from","or"))
            words = re.findall(r"[a-z][a-z0-9\-\./+]{2,}", blob)
            freq = {}
            for w in words:
                if w in stop:
                    continue
                freq[w] = freq.get(w, 0) + 1
            
            # Grab top unigrams + simple proper-noun phrases from original text
            caps = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", job.description or "")
            candidates = list(dict.fromkeys([*sorted(freq, key=freq.get, reverse=True)[:25], *caps]))
            keywords = [c for c in candidates if c]
            logger.info(f"Heuristic extraction found {len(keywords)} keywords")
            return keywords
            
        except AnalysisValidationError:
            raise
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}", exc_info=True)
            return []  # Graceful degradation
    
    def perform_general_resume_analysis(self, text_content: str, user_id: Optional[uuid.UUID] = None) -> dict:
        """
        Perform general resume analysis without job-specific context.
        
        Uses LLM if available, otherwise falls back to heuristic analysis.
        
        Args:
            text_content: Resume text content
            user_id: Optional user UUID for logging
        
        Returns:
            Dictionary with analysis results including scores and suggestions
        
        Raises:
            AnalysisValidationError: If text_content is invalid
        
        Example:
            analysis = analyzer.perform_general_resume_analysis(
                text_content="John Doe\\nSoftware Engineer...",
                user_id=uuid.UUID("...")
            )
        """
        try:
            if not text_content or not isinstance(text_content, str):
                raise AnalysisValidationError("text_content must be a non-empty string")
            
            if len(text_content) < MIN_RESUME_LENGTH:
                logger.warning(
                    f"Resume text very short: {len(text_content)} chars",
                    extra={"user_id": str(user_id) if user_id else None}
                )
            
            logger.debug(
                "Starting general resume analysis",
                extra={"text_length": len(text_content), "user_id": str(user_id) if user_id else None}
            )
            
            # Try LLM-powered analysis first
            if self.utils._llm is not None:
                try:
                    logger.debug("Using LLM for general analysis")
                    result = self.llm_analyzer.llm_analyze_general_first(resume_text=text_content, user_id=user_id)
                    logger.info("LLM general analysis completed successfully")
                    return result
                except Exception as e:
                    logger.warning(f"LLM general analysis failed, using fallback: {e}")
            
            # Fallback to heuristic analysis
            logger.debug("Using heuristic fallback for general analysis")
            lines = text_content.split("\n")
            words = text_content.split()
            word_count = len(words)
            
            # Contact information scoring
            contact_score = 0
            email_ok = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text_content))
            if email_ok: contact_score += 33
            phone_ok = bool(re.search(r'\+?\d[\d\s\-().]{7,}', text_content))
            if phone_ok: contact_score += 33
            name_ok = bool(re.search(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text_content))
            if name_ok: contact_score += 34
            
            # Check for critical sections
            missing_sections = []
            critical = ["Technical Skills", "Work Experience", "Education"]
            for c in critical:
                if c.lower() not in text_content.lower():
                    missing_sections.append(c)
            
            # Action verbs analysis
            action_verbs = ["managed", "led", "built", "created", "developed", "designed", 
                           "implemented", "achieved", "improved", "increased", "reduced", 
                           "negotiated", "coordinated"]
            action_verb_count = sum(1 for v in action_verbs if v in text_content.lower())
            action_verb_score = min(100, action_verb_count * 10)
            
            # Formatting analysis
            bullet_count = text_content.count(SAFE_BULLET)
            bullet_score = min(100, bullet_count * 5)
            has_dates = bool(re.search(r'\b(19|20)\d{2}\b', text_content))
            date_score = 80 if has_dates else 0
            
            content_score = (action_verb_score * 0.4 + bullet_score * 0.3 + date_score * 0.3)
            
            # Formatting quality
            non_ascii = [c for c in text_content if ord(c) > 126]
            formatting_score = 0
            if len(non_ascii) < 0.05 * max(1, len(text_content)):
                formatting_score += 40
            if len([ln for ln in lines if not ln.strip()]) < 0.35 * max(1, len(lines)):
                formatting_score += 35
            if bullet_count > 0:
                formatting_score += 25
            formatting_score = min(100, formatting_score)
            
            # Generate suggestions
            suggestions = []
            if not email_ok: suggestions.append("Add a professional email address")
            if not phone_ok: suggestions.append("Include a phone number for contact")
            if not name_ok: suggestions.append("Make your full name prominent at the top")
            for s in missing_sections: suggestions.append(f"Add a {s} section")
            if action_verb_count < 5: 
                suggestions.append("Use more action verbs like 'achieved', 'implemented', or 'developed'")
            if bullet_count < 5: 
                suggestions.append("Use bullet points to make accomplishments stand out")
            if not has_dates: 
                suggestions.append("Include dates for your experiences and education")
            
            overall = (contact_score * 0.25 + (100 - 25*len(missing_sections)) * 0.25 + 
                      content_score * 0.25 + formatting_score * 0.25)
            
            logger.info(
                f"Heuristic analysis completed",
                extra={"overall_score": overall, "word_count": word_count}
            )
            
            return {
                "word_count": word_count,
                "overall_score": overall,
                "formatting_score": formatting_score,
                "readability_score": content_score,
                "completeness_score": (contact_score + (100 - 25*len(missing_sections))) / 2.0,
                "suggestions": suggestions,
                "missing_sections": missing_sections,
                "section_quality": {},
                "action_verb_count": action_verb_count,
                "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis({})
            }
            
        except AnalysisValidationError:
            raise
        except Exception as e:
            logger.error(f"General analysis failed: {e}", exc_info=True)
            raise AnalysisError(f"Failed to analyze resume: {e}")
    
    def analyze_against_job(
        self,
        resume_text: str,
        required_tech: List[str],
        requirements: List[str],
        extra_keywords: List[str],
        use_ai: bool,
        job_meta: str,
        user_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Analyze resume against specific job requirements with LLM or fallback.
        
        Args:
            resume_text: Resume text content
            required_tech: List of required technical skills from job
            requirements: List of job requirements
            extra_keywords: Additional keywords from job posting
            use_ai: Whether to use AI-powered analysis
            job_meta: Job metadata (title, location, company, description)
            user_id: Optional user UUID for logging
        
        Returns:
            Dictionary with job-specific analysis results
        
        Raises:
            AnalysisValidationError: If inputs are invalid
            AnalysisError: If analysis fails
        
        Example:
            analysis = analyzer.analyze_against_job(
                resume_text="John Doe Software Engineer...",
                required_tech=["Python", "AWS"],
                requirements=["5+ years experience"],
                extra_keywords=["agile", "CI/CD"],
                use_ai=True,
                job_meta="Senior Engineer...",
                user_id=uuid.UUID("...")
            )
        """
        try:
            # Validate inputs
            if not resume_text or not isinstance(resume_text, str):
                raise AnalysisValidationError("resume_text must be a non-empty string")
            
            if len(resume_text) < MIN_RESUME_LENGTH:
                logger.warning(
                    f"Resume text short for job analysis: {len(resume_text)} chars",
                    extra={"user_id": str(user_id) if user_id else None}
                )
            
            if not job_meta or not isinstance(job_meta, str):
                raise AnalysisValidationError("job_meta must be a non-empty string")
            
            logger.debug(
                "Starting job-specific analysis",
                extra={
                    "text_length": len(resume_text),
                    "use_ai": use_ai,
                    "required_tech_count": len(required_tech or []),
                    "user_id": str(user_id) if user_id else None
                }
            )
            
            # Try LLM-first if available
            if self.utils._llm is not None and use_ai:
                try:
                    logger.debug("Using LLM for job-specific analysis")
                    result = self.llm_analyzer.llm_analyze_job_first(
                        resume_text=resume_text,
                        job_meta=job_meta,
                        requirements=requirements,
                        required_tech=required_tech,
                        extra_keywords=extra_keywords,
                        user_id=user_id,
                    )
                    logger.info("LLM job-specific analysis completed")
                    return result
                except Exception as e:
                    logger.warning(
                        f"LLM job analysis failed, using fallback: {e}",
                        extra={"job_meta_length": len(job_meta)}
                    )
            
            # Fallback to deterministic heuristic approach
            logger.debug("Using heuristic fallback for job-specific analysis")
            text_lower = resume_text.lower()
            tokens = set(self.utils.normalize_tokens(resume_text))
            
            tech_keywords = [k.lower() for k in (required_tech or [])]
            general_keywords = [k.lower() for k in (extra_keywords or []) if k.lower() not in tech_keywords]
            
            # Technical skills scoring
            found_tech = [s for s in tech_keywords if s in text_lower]
            tech_score = (len(found_tech) / max(1, len(set(tech_keywords)))) * 100
            
            # Requirements scoring
            req_keywords: List[str] = []
            for line in (requirements or []):
                req_keywords.extend(self.utils.normalize_tokens(line))
            req_keywords = list({k for k in req_keywords if len(k) >= 3})
            found_req = [k for k in req_keywords if k in tokens]
            req_score = (len(found_req) / max(1, len(req_keywords))) * 100
            
            # Keyword scoring
            extra_norm = [k.lower() for k in (extra_keywords or []) if k]
            found_extra = [k for k in extra_norm if k in text_lower]
            keyword_score = min(100.0, (len(set(found_extra)) / max(1, len(set(extra_norm)))) * 100)
            
            # Soft skills scoring
            job_description = "\n".join(requirements or [])
            common_soft_skills = {
                "leadership": ["lead", "leadership", "manage", "oversee", "direct"],
                "communication": ["communicate", "presentation", "articulate", "write", "speak"],
                "teamwork": ["team", "collaborate", "cooperation", "group"],
                "problem solving": ["solve", "solution", "resolve", "troubleshoot"],
                "adaptability": ["adapt", "flexible", "versatile", "agile"],
                "time management": ["deadline", "time management", "prioritize", "schedule"],
            }
            
            relevant_soft_skills = [s for s, kws in common_soft_skills.items() 
                                   if any(k in job_description.lower() for k in kws)]
            if relevant_soft_skills:
                found_soft = [s for s in relevant_soft_skills if s in text_lower]
                soft_score = (len(found_soft) / len(relevant_soft_skills)) * 100
            else:
                soft_score = 100
            
            # Formatting and readability heuristics
            soft_weight = 0.1 if len(relevant_soft_skills) >= 2 else 0.05
            formatting_score = 80.0 if SAFE_BULLET in resume_text or "-" in resume_text else 60.0
            readability_score = 85.0 if len(resume_text.split()) >= 200 else 60.0
            
            # Overall score calculation
            overall = (0.45 * tech_score + 0.25 * req_score + 
                      (0.30 - soft_weight) * keyword_score + soft_weight * soft_score)
            
            # Generate recommendations
            recommendations: List[str] = []
            missing_tech = [k for k in tech_keywords if k not in text_lower]
            missing_keywords = [k for k in general_keywords if k not in text_lower]
            
            if missing_tech:
                recommendations.append(f"Highlight these relevant skills if you have them: {', '.join(missing_tech[:8])}")
            if req_score < 60:
                recommendations.append("Mirror wording from the job's requirements in your bullets where truthful.")
            if keyword_score < 60:
                recommendations.append("Add role/industry keywords from the job post (titles, domain terms).")
            
            job_match_summary = f"Tech skills match: {tech_score:.0f}%, Requirements match: {req_score:.0f}%, Keywords: {keyword_score:.0f}%"
            
            logger.info(
                "Heuristic job analysis completed",
                extra={"overall_score": overall, "tech_score": tech_score}
            )
            
            return {
                "word_count": len(resume_text.split()),
                "overall_score": overall,
                "formatting_score": formatting_score,
                "readability_score": readability_score,
                "keyword_score": keyword_score,
                "technical_skills_score": tech_score,
                "soft_skills_score": soft_score,
                "recommendations": recommendations,
                "missing_sections": [],
                "job_match_summary": job_match_summary,
                "keyword_analysis": {
                    "keywords_found": list({*found_extra}),
                    "keywords_missing": missing_keywords,
                    "keyword_density": {k: resume_text.lower().count(k) for k in set(found_extra)},
                },
                "tech_analysis": {"tech_found": found_tech, "tech_missing": missing_tech},
                "missing_skills": missing_tech,
                "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis({}),
                "section_quality": {},
            }
            
        except AnalysisValidationError:
            raise
        except Exception as e:
            logger.error(f"Job-specific analysis failed: {e}", exc_info=True)
            raise AnalysisError(f"Failed to analyze against job: {e}")
    
    def analyze_document_ats(
        self,
        db: Session,
        document_id: str,
        job_id: Optional[str],
        user_id: Optional[str],
        use_ai: bool = False,
    ) -> models.DocumentAnalysis:
        """
        Main entry point for document ATS analysis.
        
        Performs comprehensive ATS scoring with job-specific or general analysis.
        Leverages caching to avoid redundant LLM calls.
        
        Args:
            db: Database session
            document_id: Document UUID string
            job_id: Optional job UUID string for job-specific analysis
            user_id: Optional user UUID string for access control
            use_ai: Whether to use AI-powered analysis (vs heuristic)
        
        Returns:
            DocumentAnalysis model with ATS score and insights
        
        Raises:
            AnalysisValidationError: If inputs are invalid
            AnalysisError: If document not found or analysis fails
        
        Example:
            analysis = analyzer.analyze_document_ats(
                db=db,
                document_id="123e4567-e89b-12d3-a456-426614174000",
                job_id="987fcdeb-51a2-43f1-b2e3-123456789abc",
                user_id="456e7890-a12b-34c5-d678-901234567890",
                use_ai=True
            )
        """
        try:
            # Validate inputs
            if not document_id:
                raise AnalysisValidationError("document_id is required")
            
            try:
                uuid.UUID(document_id)
            except (ValueError, AttributeError) as e:
                raise AnalysisValidationError(f"Invalid document_id format: {e}")
            
            if job_id:
                try:
                    uuid.UUID(job_id)
                except (ValueError, AttributeError) as e:
                    raise AnalysisValidationError(f"Invalid job_id format: {e}")
            
            if user_id:
                try:
                    uuid.UUID(user_id)
                except (ValueError, AttributeError) as e:
                    raise AnalysisValidationError(f"Invalid user_id format: {e}")
            
            logger.info(
                f"Starting ATS analysis",
                extra={
                    "document_id": document_id,
                    "job_id": job_id,
                    "user_id": user_id,
                    "use_ai": use_ai
                }
            )
            
            # Query document
            try:
                q = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(document_id))
                if user_id:
                    q = q.filter(models.Resume.user_id == uuid.UUID(user_id))
                doc = q.first()
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"document_id": document_id},
                    exc_info=True
                )
                raise AnalysisError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found or access denied",
                    extra={"document_id": document_id, "user_id": user_id}
                )
                raise AnalysisError("Document not found or access denied")
            
            resume_text = doc.text or ""
            if len(resume_text) < MIN_RESUME_LENGTH:
                logger.warning(
                    f"Resume text too short for meaningful analysis: {len(resume_text)} chars",
                    extra={"document_id": document_id}
                )
            
            file_path = Path(doc.file_path)
            
            # Prepare job context for cache key (WITHOUT expensive LLM calls)
            job_context = ""
            job_keywords: List[str] = []
            required_tech: List[str] = []
            req_phrases: List[str] = []
            job = None
            
            if job_id:
                try:
                    job = db.query(models.Job).filter(models.Job.id == uuid.UUID(job_id)).first()
                    if job:
                        required_tech = [(s or "").strip().lower() for s in (job.skills or []) if s]
                        req_phrases = [(r or "").strip().lower() for r in (job.requirements or []) if r]
                        job_context = f"{job.title or ''}\n{job.description or ''}"
                        logger.debug(
                            f"Job loaded for analysis",
                            extra={
                                "job_id": job_id,
                                "skills_count": len(required_tech),
                                "requirements_count": len(req_phrases)
                            }
                        )
                    else:
                        logger.warning(f"Job not found: {job_id}")
                except SQLAlchemyError as e:
                    logger.error(f"Failed to load job: {e}", exc_info=True)
            
            # Check cache
            try:
                cache_key = self.cache.compute_cache_key(document_id, job_id, resume_text, job_context)
                cached = self.cache.read_analysis_cache(file_path, cache_key)
                
                if cached:
                    logger.info(
                        "Returning cached analysis",
                        extra={"document_id": document_id, "job_id": job_id}
                    )
                    # Reconstruct nested ATSScore model from dict
                    if isinstance(cached.get("ats_score"), dict):
                        cached["ats_score"] = ATSScore(**cached["ats_score"])
                    return DocumentAnalysisSchema(**cached)
            except Exception as e:
                logger.warning(f"Cache check failed, proceeding with analysis: {e}")
            
            # Cache miss - NOW extract keywords (after cache check to avoid unnecessary LLM calls)
            if job_id and job:
                try:
                    job_keywords = list({*required_tech, *self.extract_keywords_from_job(job)})
                    logger.debug(f"Extracted {len(job_keywords)} job keywords")
                except Exception as e:
                    logger.warning(f"Keyword extraction failed: {e}")
                    job_keywords = list(required_tech)
            
            # Perform analysis
            if job_id and job:
                job_title = job.title or ""
                job_location = getattr(job, "location", "") or ""
                company_name = None
                
                if job.company_id:
                    try:
                        comp = db.get(models.Company, job.company_id)
                        company_name = comp.name if comp else ""
                    except Exception as e:
                        logger.warning(f"Failed to load company: {e}")
                
                # Include full job description for comprehensive analysis
                job_description = job.description or ""
                job_meta = f"""TITLE: {job_title}
LOCATION: {job_location}
COMPANY: {company_name or ''}

FULL JOB DESCRIPTION:
{job_description}"""
                
                logger.debug("Performing job-specific analysis")
                analysis = self.analyze_against_job(
                    resume_text=resume_text,
                    required_tech=required_tech,
                    requirements=req_phrases,
                    extra_keywords=job_keywords,
                    use_ai=use_ai and self.utils._llm is not None,
                    job_meta=job_meta,
                    user_id=uuid.UUID(user_id) if user_id else None,
                )
                
                ats = ATSScore(
                    overall_score=analysis["overall_score"],
                    formatting_score=analysis["formatting_score"],
                    keyword_score=analysis["keyword_score"],
                    readability_score=analysis["readability_score"],
                    technical_skills_score=analysis["technical_skills_score"],
                    soft_skills_score=analysis["soft_skills_score"],
                    suggestions=analysis["recommendations"],
                )
                
                result = DocumentAnalysisSchema(
                    word_count=analysis["word_count"],
                    keyword_density=analysis.get("keyword_analysis", {}).get("keyword_density", {}),
                    readability_score=analysis["readability_score"],
                    ats_score=ats,
                    suggested_improvements=analysis["recommendations"],
                    missing_sections=analysis.get("missing_sections", []),
                    job_match_summary={"summary": analysis.get("job_match_summary", "")},
                    keyword_analysis=analysis.get("keyword_analysis"),
                    missing_skills={"skills": analysis.get("missing_skills", [])},
                    ai_detailed_analysis=analysis.get("ai_detailed_analysis"),
                    section_quality=analysis.get("section_quality"),
                    action_verb_count=None,
                )
            else:
                logger.debug("Performing general resume analysis")
                gen = self.perform_general_resume_analysis(
                    resume_text,
                    user_id=uuid.UUID(user_id) if user_id else None
                )
                
                ats = ATSScore(
                    overall_score=gen["overall_score"],
                    formatting_score=gen["formatting_score"],
                    keyword_score=gen.get("completeness_score", gen.get("readability_score", 0.0)),
                    readability_score=gen["readability_score"],
                    technical_skills_score=None,
                    soft_skills_score=None,
                    suggestions=gen["suggestions"],
                )
                
                result = DocumentAnalysisSchema(
                    word_count=gen["word_count"],
                    keyword_density={},
                    readability_score=gen["readability_score"],
                    ats_score=ats,
                    suggested_improvements=gen["suggestions"],
                    missing_sections=gen.get("missing_sections", []),
                    job_match_summary={"summary": "General resume analysis - select a job for detailed matching"},
                    keyword_analysis=None,
                    missing_skills={"skills": []},
                    ai_detailed_analysis=gen.get("ai_detailed_analysis", {}),
                    section_quality=gen.get("section_quality"),
                    action_verb_count=gen.get("action_verb_count"),
                )
            
            # Write to cache
            try:
                if hasattr(result, 'model_dump'):
                    result_dict = result.model_dump()
                else:
                    result_dict = result.dict()
                self.cache.write_analysis_cache(file_path, cache_key, result_dict)
                logger.debug("Analysis cached successfully")
            except Exception as e:
                logger.warning(f"Failed to cache analysis: {e}")
            
            logger.info(
                "ATS analysis completed",
                extra={
                    "document_id": document_id,
                    "job_id": job_id,
                    "overall_score": result.ats_score.overall_score
                }
            )
            return result
            
        except (AnalysisValidationError, AnalysisError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during ATS analysis: {e}",
                extra={"document_id": document_id, "job_id": job_id},
                exc_info=True
            )
            raise AnalysisError(f"Analysis failed unexpectedly: {e}")
