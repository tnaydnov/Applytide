from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Dict, Any, Optional, Tuple
import os
import uuid
import shutil
from datetime import datetime
import json
import re
from pathlib import Path

from ..db import models
from ..services.pdf_extractor import PDFExtractor
from ..services.ats_analyzer import ATSAnalyzer
from ..services.ai_cover_letter import AICoverLetterService
from .models import (
    DocumentType, DocumentStatus, DocumentFormat, ATSScore, 
    DocumentAnalysis, CoverLetterRequest, DocumentOptimizationRequest
)


class DocumentService:
    """Advanced document management service with AI capabilities"""
    
    def __init__(self):
        self.upload_dir = Path("/app/uploads/documents")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize enhanced services
        self.pdf_extractor = PDFExtractor()
        self.ats_analyzer = ATSAnalyzer()
        
        # Initialize AI service for cover letters
        self.ai_cover_letter_service = None
        try:
            self.ai_cover_letter_service = AICoverLetterService()
        except ValueError as e:
            print(f"AI service not available: {e}. Using template fallback.")
        
        # ATS-friendly keywords and patterns
        self.ats_keywords = {
            'technical': ['python', 'javascript', 'react', 'node.js', 'sql', 'aws', 'docker', 'kubernetes'],
            'soft_skills': ['leadership', 'communication', 'teamwork', 'problem-solving', 'analytical'],
            'experience': ['years', 'experience', 'developed', 'managed', 'led', 'implemented'],
            'education': ['degree', 'bachelor', 'master', 'certification', 'training']
        }
    
    def upload_document(
        self,
        db: Session,
        user_id: str,
        file_content: bytes,
        filename: str,
        document_type: DocumentType,
        metadata: Dict[str, Any] = None
    ) -> models.Resume:  # Using existing Resume model for now
        """Upload and process a new document"""
        
        # Generate unique filename
        file_extension = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = self.upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Extract text content
        text_content = self._extract_text(file_path, file_extension)
        
        # Create document record (using Resume model for compatibility)
        document = models.Resume(
            user_id=uuid.UUID(user_id) if user_id else None,
            label=Path(filename).stem,
            file_path=str(file_path),
            text=text_content
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Perform initial analysis
        self._analyze_document(db, document.id, text_content)
        
        return document
    
    async def generate_cover_letter(
        self,
        db: Session,
        user_id: str,
        request: CoverLetterRequest
    ) -> dict:
        """Generate AI-powered cover letter with intelligent analysis"""
        
        # Get resume content if provided
        resume_content = ""
        if request.resume_id:
            resume = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.resume_id)).first()
            if resume:
                resume_content = resume.text or ""
        
        # Get user profile information
        user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        user_profile = {
            "email": user.email if user else None,
            "name": getattr(user, 'full_name', None) if user else None
        }
        
        # Use AI service if available, otherwise fallback to template
        if self.ai_cover_letter_service:
            try:
                result = await self.ai_cover_letter_service.generate_intelligent_cover_letter(
                    db=db,
                    job_id=request.job_id,
                    resume_content=resume_content,
                    user_profile=user_profile,
                    tone=request.tone,
                    length=request.length
                )
                return result
            except Exception as e:
                print(f"AI generation failed, using fallback: {e}")
        
        # Fallback to template-based generation
        return self._generate_template_cover_letter(db, request, resume_content)
    
    def _generate_template_cover_letter(
        self,
        db: Session, 
        request: CoverLetterRequest,
        resume_content: str
    ) -> dict:
        """Fallback template-based cover letter generation"""
        
        # Get job details with company name
        job_query = select(models.Job, models.Company.name.label('company_name')).join(
            models.Company, models.Job.company_id == models.Company.id, isouter=True
        ).where(models.Job.id == uuid.UUID(request.job_id))
        
        result = db.execute(job_query).first()
        if not result:
            raise ValueError("Job not found")
        
        job, company_name = result
        
        # Generate cover letter content using template
        cover_letter = self._generate_cover_letter_content(
            job=job,
            company_name=company_name or "the company",
            resume_content=resume_content,
            tone=request.tone,
            length=request.length,
            focus_areas=request.focus_areas,
            custom_intro=request.custom_intro
        )
        
        word_count = len(cover_letter.split())
        return {
            "cover_letter": cover_letter,
            "word_count": word_count,
            "estimated_reading_time": f"{word_count // 200 + 1} minutes",
            "ai_model_used": "template_fallback"
        }
    
    def analyze_document_ats(
        self,
        db: Session,
        document_id: str,
        job_id: Optional[str] = None
    ) -> DocumentAnalysis:
        """Analyze document for ATS compatibility"""
        
        # Get document
        document = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(document_id)).first()
        if not document:
            raise ValueError("Document not found")
        
        text_content = document.text or ""
        
        # Get job keywords if job provided
        job_keywords = []
        if job_id:
            job = db.query(models.Job).filter(models.Job.id == uuid.UUID(job_id)).first()
            if job:
                job_keywords = self._extract_keywords_from_job(job)
        
        # Perform analysis
        analysis = self._perform_ats_analysis(text_content, job_keywords)
        return analysis
    
    def optimize_document(
        self,
        db: Session,
        request: DocumentOptimizationRequest
    ) -> str:
        """Optimize document for better ATS scores"""
        
        # Get document
        document = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.document_id)).first()
        if not document:
            raise ValueError("Document not found")
        
        # Get job context if provided
        job_context = None
        if request.job_id:
            job_context = db.query(models.Job).filter(models.Job.id == uuid.UUID(request.job_id)).first()
        
        # Generate optimized version
        optimized_content = self._optimize_document_content(
            original_content=document.text or "",
            job_context=job_context,
            target_keywords=request.target_keywords,
            optimization_goals=request.optimization_goals
        )
        
        return optimized_content
    
    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available document templates"""
        
        templates = [
            {
                "id": "modern-resume-1",
                "name": "Modern Professional Resume",
                "description": "Clean, ATS-friendly resume template with modern design",
                "type": "resume",
                "category": "professional",
                "is_premium": False,
                "preview_url": "/templates/previews/modern-resume-1.png"
            },
            {
                "id": "tech-resume-1", 
                "name": "Tech Industry Resume",
                "description": "Optimized for software engineering and tech roles",
                "type": "resume",
                "category": "technology",
                "is_premium": False,
                "preview_url": "/templates/previews/tech-resume-1.png"
            },
            {
                "id": "cover-letter-professional",
                "name": "Professional Cover Letter",
                "description": "Standard professional cover letter template",
                "type": "cover_letter",
                "category": "professional",
                "is_premium": False,
                "preview_url": "/templates/previews/cover-letter-professional.png"
            }
        ]
        
        if category:
            templates = [t for t in templates if t["category"] == category]
        
        return templates
    
    def _extract_text(self, file_path: Path, file_extension: str) -> str:
        """Extract text content from uploaded file using enhanced PDF extractor"""
        try:
            if file_extension.lower() == '.txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif file_extension.lower() == '.pdf':
                # Use our enhanced PDF extractor
                with open(file_path, 'rb') as f:
                    pdf_content = f.read()
                extraction_result = self.pdf_extractor.extract_text(pdf_content)
                return extraction_result.get("text", "Failed to extract PDF text")
            elif file_extension.lower() in ['.doc', '.docx']:
                # Placeholder for Word document extraction (can be enhanced later)
                return "Word document text extraction not implemented yet"
            else:
                return "Unsupported file format"
        except Exception as e:
            return f"Error extracting text: {str(e)}"
    
    def _analyze_document(self, db: Session, document_id: uuid.UUID, text_content: str):
        """Perform initial document analysis"""
        # Placeholder for document analysis
        pass
    
    def _generate_cover_letter_content(
        self,
        job,
        company_name: str,
        resume_content: str,
        tone: str,
        length: str,
        focus_areas: List[str],
        custom_intro: Optional[str]
    ) -> str:
        """Generate cover letter content using AI templates"""
        
        # Extract key information
        job_title = job.title
        
        # Generate intro
        intro = custom_intro or f"I am writing to express my strong interest in the {job_title} position at {company_name}."
        
        # Generate body based on tone and focus areas
        if tone == "enthusiastic":
            body_tone = "I am excited about the opportunity to contribute to your team and bring my passion for technology to this role."
        elif tone == "confident":
            body_tone = "With my proven track record and expertise, I am confident I would be a valuable addition to your team."
        else:  # professional
            body_tone = "I believe my background and experience make me well-suited for this position."
        
        # Build focus areas content
        focus_content = ""
        if focus_areas:
            focus_content = f"\\n\\nI am particularly drawn to this role because of my experience in {', '.join(focus_areas)}."
        
        # Generate conclusion
        conclusion = f"Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to {company_name}'s success."
        
        # Combine all parts
        cover_letter = f"""Dear Hiring Manager,

{intro}

{body_tone}{focus_content}

Based on the job requirements, I have relevant experience that aligns well with what you're looking for. My background includes the skills and qualifications mentioned in the job posting.

{conclusion}

Sincerely,
[Your Name]"""
        
        return cover_letter
    
    def _extract_keywords_from_job(self, job) -> List[str]:
        """Extract relevant keywords from job posting"""
        keywords = []
        
        # Extract from title
        if job.title:
            keywords.extend(job.title.lower().split())
        
        # Extract from description
        if job.description:
            # Simple keyword extraction - in production, use NLP
            description_words = re.findall(r'\\b\\w+\\b', job.description.lower())
            # Filter for relevant technical terms (simplified)
            tech_words = [w for w in description_words if len(w) > 3 and w in ' '.join(self.ats_keywords.values())]
            keywords.extend(tech_words)
        
        return list(set(keywords))
    
    def _perform_ats_analysis(self, text_content: str, job_keywords: List[str]) -> DocumentAnalysis:
        """Perform enhanced ATS compatibility analysis using advanced analyzer"""
        
        # If we have job keywords, use our enhanced analyzer
        if job_keywords:
            # Create a pseudo job description from keywords for the analyzer
            job_description = f"Required skills and qualifications: {', '.join(job_keywords)}"
            
            # Use enhanced ATS analyzer
            enhanced_analysis = self.ats_analyzer.analyze_resume_for_job(
                resume_text=text_content,
                job_description=job_description
            )
            
            # Extract enhanced data
            ats_score = ATSScore(
                overall_score=enhanced_analysis.get('overall_score', 0),
                formatting_score=enhanced_analysis.get('formatting_score', 0),
                keyword_score=enhanced_analysis.get('keyword_score', 0),
                readability_score=enhanced_analysis.get('readability_score', 0),
                technical_skills_score=enhanced_analysis.get('technical_skills_score', 0),
                soft_skills_score=enhanced_analysis.get('soft_skills_score', 0),
                suggestions=enhanced_analysis.get('recommendations', [])
            )
            
            return DocumentAnalysis(
                word_count=enhanced_analysis.get('word_count', len(text_content.split())),
                keyword_density=enhanced_analysis.get('keyword_analysis', {}).get('keyword_density', {}),
                readability_score=enhanced_analysis.get('readability_score', 0),
                ats_score=ats_score,
                suggested_improvements=enhanced_analysis.get('recommendations', []),
                missing_sections=enhanced_analysis.get('missing_sections', []),
                # Enhanced fields for frontend
                job_match_summary=enhanced_analysis.get('job_match_summary'),
                keyword_analysis=enhanced_analysis.get('keyword_analysis'),
                missing_skills=enhanced_analysis.get('missing_skills')
            )
        else:
            # Fallback to basic analysis when no job context
            word_count = len(text_content.split())
            
            # Basic keyword analysis
            text_lower = text_content.lower()
            
            # Calculate basic scores
            formatting_score = 85.0  # Assume good formatting for now
            readability_score = 75.0  # Simplified readability
            keyword_score = 50.0  # Default when no job keywords
            overall_score = (keyword_score + formatting_score + readability_score) / 3
            
            # Generate basic suggestions
            suggestions = []
            if word_count < 200:
                suggestions.append("Consider expanding your resume with more detailed descriptions")
            suggestions.append("To get better analysis, select a specific job for comparison")
            
            # Basic missing sections analysis
            missing_sections = []
            if "experience" not in text_lower:
                missing_sections.append("Work Experience section")
            if "education" not in text_lower:
                missing_sections.append("Education section")
            if "skill" not in text_lower:
                missing_sections.append("Skills section")
            
            ats_score = ATSScore(
                overall_score=overall_score,
                formatting_score=formatting_score,
                keyword_score=keyword_score,
                readability_score=readability_score,
                suggestions=suggestions
            )
            
            return DocumentAnalysis(
                word_count=word_count,
                keyword_density={},
                readability_score=readability_score,
                ats_score=ats_score,
                suggested_improvements=suggestions,
                missing_sections=missing_sections
            )
    
    def _optimize_document_content(
        self,
        original_content: str,
        job_context,
        target_keywords: List[str],
        optimization_goals: List[str]
    ) -> str:
        """Generate optimized document content"""
        
        # This is a simplified version - in production, use advanced NLP/AI
        optimized_content = original_content
        
        # Add target keywords if missing
        for keyword in target_keywords:
            if keyword.lower() not in original_content.lower():
                # Insert keyword naturally (simplified approach)
                optimized_content += f"\\n• Experience with {keyword}"
        
        # Add optimization notes
        optimization_notes = "\\n\\n[AI Optimization Notes:]\\n"
        for goal in optimization_goals:
            optimization_notes += f"• Optimized for: {goal}\\n"
        
        return optimized_content + optimization_notes
