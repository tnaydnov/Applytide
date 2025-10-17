"""Document generation: cover letters, optimization, templates."""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import uuid

from ....db import models
from ....api.schemas.documents import CoverLetterRequest, DocumentOptimizationRequest
from ....infra.logging import get_logger
from ....infra.extractors.text_extractor import SAFE_BULLET

logger = get_logger(__name__)


class DocumentGeneration:
    """Handles document generation: cover letters, optimization, templates."""
    
    def __init__(self, ai_cover_letter_service=None):
        self.ai_cover_letter_service = ai_cover_letter_service
    
    def optimize_document(self, db: Session, request: DocumentOptimizationRequest) -> str:
        """Optimize document by adding target keywords and goals."""
        doc = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.document_id)).first()
        if not doc:
            raise ValueError("Document not found")
        
        optimized = doc.text or ""
        
        # Add missing target keywords
        for kw in request.target_keywords or []:
            if kw.lower() not in (optimized or "").lower():
                optimized += f"\n{SAFE_BULLET} Experience with {kw}"
        
        # Append optimization goals
        notes = "\n\n[Optimization goals]\n" + "\n".join(
            f"{SAFE_BULLET} {g}" for g in (request.optimization_goals or [])
        )
        
        return (optimized or "") + notes
    
    async def generate_cover_letter(
        self, 
        db: Session, 
        user_id: str, 
        request: CoverLetterRequest
    ) -> dict:
        """Generate cover letter using AI or template fallback."""
        # Get resume content if provided
        resume_content = ""
        if request.resume_id:
            r = db.query(models.Resume).filter(
                models.Resume.id == uuid.UUID(request.resume_id)
            ).first()
            if r:
                resume_content = r.text or ""
        
        # Try AI generation first if available
        if self.ai_cover_letter_service is not None:
            try:
                result = await self.ai_cover_letter_service.generate_intelligent_cover_letter(
                    db=db,
                    job_id=request.job_id,
                    resume_content=resume_content,
                    user_profile={},
                    tone=request.tone,
                    length=request.length,
                )
                if result.get("success"):
                    return result
            except Exception as e:
                logger.warning(
                    "AI cover letter generation failed, using template fallback",
                    extra={"job_id": request.job_id, "error": str(e)}
                )
        
        # Fallback to template generation
        return self.generate_template_cover_letter(db, request, resume_content)
    
    def generate_template_cover_letter(
        self,
        db: Session,
        request: CoverLetterRequest,
        resume_content: str
    ) -> dict:
        """Generate template-based cover letter."""
        # Get job and company information
        q = (
            db.query(models.Job, models.Company.name.label("company_name"))
            .outerjoin(models.Company, models.Job.company_id == models.Company.id)
            .filter(models.Job.id == uuid.UUID(request.job_id))
        )
        result = q.first()
        if not result:
            raise ValueError("Job not found")
        
        job, company_name = result
        
        # Generate cover letter text
        cover_letter = self.cover_letter_text(
            job_title=job.title,
            company_name=company_name or "the company",
            tone=request.tone,
            length=request.length,
            focus_areas=request.focus_areas,
            custom_intro=request.custom_intro,
        )
        
        # Calculate metadata
        wc = len(cover_letter.split())
        return {
            "success": True,
            "cover_letter": cover_letter,
            "word_count": wc,
            "estimated_reading_time": f"{max(1, wc // 200)} minutes",
            "model_used": "template_fallback",
        }
    
    def cover_letter_text(
        self,
        job_title: str,
        company_name: str,
        tone: str,
        length: str,
        focus_areas: List[str],
        custom_intro: Optional[str]
    ) -> str:
        """Generate cover letter text based on parameters."""
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
        else:
            body_tone = (
                "I believe my background and experience make me well-suited for "
                "this position."
            )
        
        # Add focus areas if provided
        focus = ""
        if focus_areas:
            focus = (
                f"\n\nI am particularly drawn to this role because of my experience "
                f"in {', '.join(focus_areas)}."
            )
        
        # Build conclusion
        conclusion = (
            f"Thank you for considering my application. I look forward to the "
            f"opportunity to discuss how I can contribute to {company_name}'s success."
        )
        
        # Assemble complete cover letter
        return f"""Dear Hiring Manager,

{intro}

{body_tone}{focus}

Based on the job requirements, I have relevant experience that aligns well with what you're looking for. My background includes the skills and qualifications mentioned in the job posting.

{conclusion}

Sincerely,
[Your Name]"""
    
    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available document templates."""
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
            templates = [t for t in templates if t["category"] == category]
        
        return templates
