"""
Document Generation: Cover Letters, Optimization, Templates

Provides AI-powered and template-based document generation including:
- Cover letter generation (AI + template fallback)
- Document optimization with keyword enhancement
- Template management and filtering

Generation Strategy:
- Primary: AI-powered generation via OpenAI
- Fallback: Template-based generation with customization
- Always returns valid output even on failures

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional
import uuid

from ....db import models
from ....api.schemas.documents import CoverLetterRequest, DocumentOptimizationRequest
from ....infra.logging import get_logger
from ....infra.extractors.text_extractor import SAFE_BULLET

logger = get_logger(__name__)


class GenerationError(Exception):
    """Base exception for document generation."""
    pass


class GenerationValidationError(GenerationError):
    """Raised when generation validation fails."""
    pass


class DocumentNotFoundError(GenerationError):
    """Raised when document or job not found."""
    pass


# Generation parameters
MAX_KEYWORD_ADDITIONS = 10  # Maximum keywords to add during optimization
MAX_COVER_LETTER_WORDS = 1000  # Sanity check for cover letter length


class DocumentGeneration:
    """
    Handles document generation including cover letters and optimization.
    
    Provides AI-powered generation with template fallbacks to ensure
    reliable output even when AI services are unavailable.
    """
    
    def __init__(self, ai_cover_letter_service=None):
        """
        Initialize document generation handler.
        
        Args:
            ai_cover_letter_service: Optional AI service for cover letter generation
        """
        self.ai_cover_letter_service = ai_cover_letter_service
        
        logger.debug(
            "DocumentGeneration initialized",
            extra={"has_ai_service": ai_cover_letter_service is not None}
        )
    
    def optimize_document(self, db: Session, request: DocumentOptimizationRequest) -> str:
        """
        Optimize document by adding target keywords and goals.
        
        Enhances document content by intelligently adding missing keywords
        and appending optimization goals.
        
        Args:
            db: Database session
            request: Optimization request with document_id, keywords, goals
        
        Returns:
            Optimized document text
        
        Raises:
            GenerationValidationError: If request is invalid
            DocumentNotFoundError: If document not found
            GenerationError: If optimization fails
        
        Example:
            optimized = generation.optimize_document(
                db=db,
                request=DocumentOptimizationRequest(
                    document_id="123e4567-e89b-12d3-a456-426614174000",
                    target_keywords=["Python", "AWS", "Docker"],
                    optimization_goals=["Add cloud experience", "Highlight leadership"]
                )
            )
        """
        try:
            # Validate request
            if not request:
                raise GenerationValidationError("Request is required")
            
            if not request.document_id:
                raise GenerationValidationError("document_id is required")
            
            try:
                uuid.UUID(request.document_id)
            except (ValueError, AttributeError) as e:
                raise GenerationValidationError(f"Invalid document_id format: {e}")
            
            logger.debug(
                f"Optimizing document",
                extra={
                    "document_id": request.document_id,
                    "keywords_count": len(request.target_keywords or []),
                    "goals_count": len(request.optimization_goals or [])
                }
            )
            
            # Query document
            try:
                doc = db.query(models.Resume).filter(
                    models.Resume.id == uuid.UUID(request.document_id)
                ).first()
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"document_id": request.document_id},
                    exc_info=True
                )
                raise GenerationError(f"Failed to query document: {e}")
            
            if not doc:
                logger.warning(
                    f"Document not found for optimization",
                    extra={"document_id": request.document_id}
                )
                raise DocumentNotFoundError(f"Document {request.document_id} not found")
            
            optimized = doc.text or ""
            additions_count = 0
            
            # Add missing target keywords
            keywords = request.target_keywords or []
            if len(keywords) > MAX_KEYWORD_ADDITIONS:
                logger.warning(
                    f"Too many keywords requested, limiting to {MAX_KEYWORD_ADDITIONS}",
                    extra={"requested": len(keywords)}
                )
                keywords = keywords[:MAX_KEYWORD_ADDITIONS]
            
            for kw in keywords:
                if not kw or not isinstance(kw, str):
                    logger.debug(f"Skipping invalid keyword: {kw}")
                    continue
                
                if kw.lower() not in (optimized or "").lower():
                    optimized += f"\n{SAFE_BULLET} Experience with {kw}"
                    additions_count += 1
                    logger.debug(f"Added keyword: {kw}")
            
            # Append optimization goals
            goals = request.optimization_goals or []
            if goals:
                notes = "\n\n[Optimization goals]\n" + "\n".join(
                    f"{SAFE_BULLET} {g}" for g in goals if g
                )
                optimized += notes
                logger.debug(f"Added {len(goals)} optimization goals")
            
            logger.info(
                "Document optimized successfully",
                extra={
                    "document_id": request.document_id,
                    "keywords_added": additions_count,
                    "goals_added": len(goals),
                    "original_length": len(doc.text or ""),
                    "optimized_length": len(optimized)
                }
            )
            
            return optimized
            
        except (GenerationValidationError, DocumentNotFoundError, GenerationError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error optimizing document: {e}",
                extra={"document_id": request.document_id if request else None},
                exc_info=True
            )
            raise GenerationError(f"Failed to optimize document: {e}")
    
    async def generate_cover_letter(
        self, 
        db: Session, 
        user_id: str, 
        request: CoverLetterRequest
    ) -> dict:
        """
        Generate cover letter using AI with template fallback.
        
        Attempts AI generation first, falls back to template-based generation
        if AI fails or is unavailable. Always returns valid output.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            request: Cover letter request with job_id, resume_id, tone, length
        
        Returns:
            Dict with success, cover_letter text, word_count, reading_time, model_used
        
        Raises:
            GenerationValidationError: If request is invalid
            GenerationError: If both AI and template generation fail
        
        Example:
            result = await generation.generate_cover_letter(
                db=db,
                user_id="123e4567-e89b-12d3-a456-426614174000",
                request=CoverLetterRequest(
                    job_id="987fcdeb-51a2-43f1-b2e3-123456789abc",
                    tone="professional",
                    length="medium"
                )
            )
        """
        try:
            # Validate request
            if not request:
                raise GenerationValidationError("Request is required")
            
            if not user_id:
                raise GenerationValidationError("user_id is required")
            
            if not request.job_id:
                raise GenerationValidationError("job_id is required")
            
            logger.debug(
                f"Generating cover letter",
                extra={
                    "user_id": user_id,
                    "job_id": request.job_id,
                    "has_resume": bool(request.resume_id),
                    "tone": request.tone,
                    "length": request.length
                }
            )
            
            # Get resume content if provided
            resume_content = ""
            if request.resume_id:
                try:
                    r = db.query(models.Resume).filter(
                        models.Resume.id == uuid.UUID(request.resume_id)
                    ).first()
                    if r:
                        resume_content = r.text or ""
                        logger.debug(
                            f"Resume loaded for cover letter",
                            extra={"resume_id": request.resume_id, "text_length": len(resume_content)}
                        )
                    else:
                        logger.warning(
                            f"Resume not found, proceeding without resume content",
                            extra={"resume_id": request.resume_id}
                        )
                except Exception as e:
                    logger.warning(f"Failed to load resume, proceeding without: {e}")
            
            # Try AI generation first if available
            if self.ai_cover_letter_service is not None:
                try:
                    logger.debug("Attempting AI cover letter generation")
                    result = await self.ai_cover_letter_service.generate_intelligent_cover_letter(
                        db=db,
                        job_id=request.job_id,
                        resume_content=resume_content,
                        user_profile={},
                        tone=request.tone,
                        length=request.length,
                    )
                    if result.get("success"):
                        logger.info(
                            "AI cover letter generated successfully",
                            extra={
                                "job_id": request.job_id,
                                "model": result.get("model_used"),
                                "word_count": result.get("word_count")
                            }
                        )
                        return result
                    else:
                        logger.warning(
                            f"AI generation returned unsuccessfully: {result.get('error')}",
                            extra={"job_id": request.job_id}
                        )
                except Exception as e:
                    logger.warning(
                        f"AI cover letter generation failed, using template fallback: {e}",
                        extra={"job_id": request.job_id},
                        exc_info=True
                    )
            else:
                logger.debug("AI service not available, using template generation")
            
            # Fallback to template generation
            return self.generate_template_cover_letter(db, request, resume_content)
            
        except (GenerationValidationError, GenerationError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error generating cover letter: {e}",
                extra={"user_id": user_id, "job_id": request.job_id if request else None},
                exc_info=True
            )
            raise GenerationError(f"Failed to generate cover letter: {e}")
    
    def generate_template_cover_letter(
        self,
        db: Session,
        request: CoverLetterRequest,
        resume_content: str
    ) -> dict:
        """
        Generate template-based cover letter.
        
        Creates cover letter from template with job and company information.
        Guaranteed to return valid output.
        
        Args:
            db: Database session
            request: Cover letter request
            resume_content: Resume text (currently unused, for future enhancement)
        
        Returns:
            Dict with success=True, cover_letter text, metadata
        
        Raises:
            DocumentNotFoundError: If job not found
            GenerationError: If template generation fails
        """
        try:
            if not request or not request.job_id:
                raise GenerationValidationError("job_id is required")
            
            logger.debug(
                f"Generating template cover letter",
                extra={"job_id": request.job_id}
            )
            
            # Get job and company information
            try:
                q = (
                    db.query(models.Job, models.Company.name.label("company_name"))
                    .outerjoin(models.Company, models.Job.company_id == models.Company.id)
                    .filter(models.Job.id == uuid.UUID(request.job_id))
                )
                result = q.first()
            except SQLAlchemyError as e:
                logger.error(
                    f"Database query failed: {e}",
                    extra={"job_id": request.job_id},
                    exc_info=True
                )
                raise GenerationError(f"Failed to query job: {e}")
            
            if not result:
                logger.warning(
                    f"Job not found for cover letter",
                    extra={"job_id": request.job_id}
                )
                raise DocumentNotFoundError(f"Job {request.job_id} not found")
            
            job, company_name = result
            
            # Generate cover letter text
            try:
                cover_letter = self.cover_letter_text(
                    job_title=job.title or "this position",
                    company_name=company_name or "the company",
                    tone=request.tone or "professional",
                    length=request.length or "medium",
                    focus_areas=request.focus_areas or [],
                    custom_intro=request.custom_intro,
                )
            except Exception as e:
                logger.error(
                    f"Failed to generate cover letter text: {e}",
                    extra={"job_id": request.job_id},
                    exc_info=True
                )
                raise GenerationError(f"Failed to generate cover letter text: {e}")
            
            # Calculate metadata
            wc = len(cover_letter.split())
            
            if wc > MAX_COVER_LETTER_WORDS:
                logger.warning(
                    f"Cover letter unusually long: {wc} words",
                    extra={"job_id": request.job_id, "word_count": wc}
                )
            
            result = {
                "success": True,
                "cover_letter": cover_letter,
                "word_count": wc,
                "estimated_reading_time": f"{max(1, wc // 200)} minutes",
                "model_used": "template_fallback",
            }
            
            logger.info(
                "Template cover letter generated successfully",
                extra={
                    "job_id": request.job_id,
                    "word_count": wc,
                    "tone": request.tone
                }
            )
            
            return result
            
        except (GenerationValidationError, DocumentNotFoundError, GenerationError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in template generation: {e}",
                extra={"job_id": request.job_id if request else None},
                exc_info=True
            )
            raise GenerationError(f"Failed to generate template cover letter: {e}")
    
    def cover_letter_text(
        self,
        job_title: str,
        company_name: str,
        tone: str,
        length: str,
        focus_areas: List[str],
        custom_intro: Optional[str]
    ) -> str:
        """
        Generate cover letter text based on parameters.
        
        Creates formatted cover letter with customized tone, length, and content.
        
        Args:
            job_title: Job position title
            company_name: Company name
            tone: Tone style (professional, enthusiastic, confident)
            length: Length preference (short, medium, long)
            focus_areas: List of focus areas to highlight
            custom_intro: Optional custom introduction paragraph
        
        Returns:
            Formatted cover letter text
        
        Example:
            text = generation.cover_letter_text(
                job_title="Senior Engineer",
                company_name="ACME Corp",
                tone="professional",
                length="medium",
                focus_areas=["Python", "Cloud"],
                custom_intro=None
            )
        """
        # Validate and sanitize inputs
        job_title = (job_title or "this position").strip()
        company_name = (company_name or "the company").strip()
        tone = (tone or "professional").lower()
        length = (length or "medium").lower()
        focus_areas = [fa.strip() for fa in (focus_areas or []) if fa and fa.strip()]
        
        logger.debug(
            f"Building cover letter text",
            extra={
                "job_title": job_title,
                "company_name": company_name,
                "tone": tone,
                "length": length,
                "focus_count": len(focus_areas)
            }
        )
        
        # Build introduction
        intro = custom_intro or (
            f"I am writing to express my strong interest in the {job_title} "
            f"position at {company_name}."
        )
        
        # Adjust body based on tone
        if tone == "enthusiastic":
            body_tone = (
                "I am excited about the opportunity to contribute to your team "
                "and bring my passion to this role."
            )
        elif tone == "confident":
            body_tone = (
                "With my proven track record and expertise, I am confident I would "
                "be a valuable addition to your team."
            )
        else:  # professional
            body_tone = (
                "I believe my background and experience make me well-suited for "
                "this position."
            )
        
        # Add focus areas if provided
        focus = ""
        if focus_areas:
            focus_str = ", ".join(focus_areas[:5])  # Limit to 5 focus areas
            focus = (
                f"\n\nI am particularly drawn to this role because of my experience "
                f"in {focus_str}."
            )
            if len(focus_areas) > 5:
                logger.debug(f"Limited focus areas from {len(focus_areas)} to 5")
        
        # Build conclusion
        conclusion = (
            f"Thank you for considering my application. I look forward to the "
            f"opportunity to discuss how I can contribute to {company_name}'s success."
        )
        
        # Assemble complete cover letter
        cover_letter = f"""Dear Hiring Manager,

{intro}

{body_tone}{focus}

Based on the job requirements, I have relevant experience that aligns well with what you're looking for. My background includes the skills and qualifications mentioned in the job posting.

{conclusion}

Sincerely,
[Your Name]"""
        
        logger.debug(
            f"Cover letter text generated",
            extra={"length": len(cover_letter), "lines": cover_letter.count('\n')}
        )
        
        return cover_letter
    
    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get available document templates.
        
        Returns list of available templates, optionally filtered by category.
        
        Args:
            category: Optional category filter (resume, cover_letter)
        
        Returns:
            List of template dictionaries with id, name, description, etc.
        
        Example:
            templates = generation.get_document_templates(category="resume")
            for template in templates:
                print(f"{template['name']}: {template['description']}")
        """
        logger.debug(
            f"Getting document templates",
            extra={"category_filter": category}
        )
        
        templates = [
            {
                "id": "basic-resume-1",
                "name": "Clean Resume",
                "description": "Simple, ATS-friendly layout.",
                "type": "resume",
                "category": "resume",
                "preview_url": None,
                "is_premium": False
            },
            {
                "id": "modern-resume-1",
                "name": "Modern Resume",
                "description": "Subtle typography, clear sections.",
                "type": "resume",
                "category": "resume",
                "preview_url": None,
                "is_premium": True
            },
            {
                "id": "classic-cover-1",
                "name": "Classic Cover Letter",
                "description": "Professional tone and structure.",
                "type": "cover_letter",
                "category": "cover_letter",
                "preview_url": None,
                "is_premium": False
            },
        ]
        
        # Filter by category if specified
        if category:
            if not isinstance(category, str):
                logger.warning(f"Invalid category type: {type(category)}, returning all templates")
            else:
                category_lower = category.lower().strip()
                templates = [t for t in templates if t["category"] == category_lower]
                logger.debug(
                    f"Filtered templates by category",
                    extra={"category": category_lower, "count": len(templates)}
                )
        
        logger.debug(f"Returning {len(templates)} templates")
        return templates
