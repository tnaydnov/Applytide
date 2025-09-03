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
from ..services.ai_cover_letter import AICoverLetterService
from .models import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentAnalysis, ATSScore, CoverLetterRequest, DocumentOptimizationRequest
)


def _sanitize_display_name(name: Optional[str]) -> str:
    """
    Keep a safe base name (no extension, simple chars).
    """
    if not name:
        return ""
    # drop extension if user typed one
    base = re.sub(r"\.[^./\\]+$", "", name).strip()
    # keep letters, numbers, spaces, _, -
    base = re.sub(r"[^a-zA-Z0-9 _-]+", "", base).strip()
    return base



class DocumentService:
    """Advanced document management service with AI capabilities"""
    
    def __init__(self):
        self.upload_dir = Path("/app/uploads/documents")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize core services
        self.pdf_extractor = PDFExtractor()
        
        # Initialize AI service for cover letters (future feature)
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
        display_name: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> models.Resume:  # Using existing Resume model for now
        """Upload and process a new document"""

        # Resolve extension from the original upload
        p = Path(filename)
        ext = p.suffix.lower()  # e.g. ".pdf", ".docx"
        if not ext:
            ext = ".bin"

        # Generate unique storage name
        file_id = uuid.uuid4()
        unique_filename = f"{file_id}{ext}"
        file_path = self.upload_dir / unique_filename

        # Save the raw file bytes
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Extract text (best effort)
        text_content = self._extract_text(file_path, ext)

        # Compute display label (DB label) – prefer user-supplied, sanitize, no extension
        safe_display = _sanitize_display_name(display_name) or p.stem or "document"
        print(f"[UPLOAD] display_name={display_name} sanitized={safe_display} original_filename={filename}")

        # Create DB row — label is the user-facing name (no extension)
        document = models.Resume(
            id=file_id,
            user_id=uuid.UUID(user_id) if user_id else None,
            label=safe_display,
            file_path=str(file_path),
            text=text_content
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        print(f"[UPLOAD] DB label={document.label} file_path={document.file_path}")

        # Sidecar meta used by list/get/download to resolve type, name, and extension
        meta = {
            "document_id": str(document.id),
            "type": document_type.value,                    # exact chosen type from the UI
            "name": safe_display,                           # display name (no extension)
            "original_filename": filename,                  # full original name from user upload
            "original_extension": ext,                      # ".pdf", ".docx", etc
            "metadata": metadata or {},
            "created_at": document.created_at.isoformat(),
        }
        meta_path = Path(document.file_path).with_suffix(Path(document.file_path).suffix + ".meta.json")
        try:
            meta_path.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"Failed to write document meta: {e}")

        # Optional: initial analysis hook
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
        
        # Use template-based cover letter generation only
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
        job_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> DocumentAnalysis:
        """Analyze document for ATS compatibility"""
        
        # Get document with user authorization check
        query = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(document_id))
        if user_id:
            query = query.filter(models.Resume.user_id == uuid.UUID(user_id))
        
        document = query.first()
        if not document:
            raise ValueError("Document not found or access denied")
        
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
        """Extract relevant keywords from job posting using NLP techniques"""
        import re
        
        keywords = set()
        
        # Extract from title - often contains key role keywords
        if job.title:
            title_words = re.findall(r'\b[A-Za-z]{3,}\b', job.title)
            keywords.update(word.lower() for word in title_words)
        
        # Extract from description with improved logic
        if job.description:
            description = job.description.lower()
            
            # Technical skills patterns
            tech_patterns = [
                r'\b(python|javascript|java|c\+\+|c#|php|ruby|go|rust|swift)\b',
                r'\b(react|angular|vue|node\.?js|express|django|flask|spring)\b',
                r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch)\b',
                r'\b(aws|azure|gcp|docker|kubernetes|jenkins|git)\b',
                r'\b(html|css|scss|sass|bootstrap|tailwind)\b',
                r'\b(api|rest|graphql|microservices|devops|ci/cd)\b'
            ]
            
            for pattern in tech_patterns:
                matches = re.findall(pattern, description)
                keywords.update(matches)
            
            # Soft skills and qualifications
            soft_patterns = [
                r'\b(leadership|management|communication|teamwork|collaboration)\b',
                r'\b(problem.solving|analytical|critical.thinking|creative)\b',
                r'\b(agile|scrum|project.management|mentoring)\b'
            ]
            
            for pattern in soft_patterns:
                matches = re.findall(pattern, description)
                keywords.update(match.replace('.', ' ') for match in matches)
            
            # Years of experience
            exp_pattern = r'(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)'
            exp_matches = re.findall(exp_pattern, description)
            if exp_matches:
                years = exp_matches[0][0]
                keywords.add(f"{years} years experience")
            
            # Education requirements
            edu_patterns = [
                r'\b(bachelor|master|phd|degree|diploma|certificate)\b',
                r'\b(computer science|engineering|mathematics|business)\b'
            ]
            
            for pattern in edu_patterns:
                matches = re.findall(pattern, description)
                keywords.update(matches)
            
            # Common job requirement phrases
            requirement_phrases = [
                'required', 'preferred', 'must have', 'should have',
                'experience with', 'knowledge of', 'proficient in',
                'familiar with', 'skilled in'
            ]
            
            # Extract context around requirement phrases
            for phrase in requirement_phrases:
                pattern = f'{phrase}[^.]*'
                matches = re.findall(pattern, description)
                for match in matches:
                    # Extract meaningful words from the requirement
                    words = re.findall(r'\b[A-Za-z]{3,}\b', match)
                    keywords.update(word.lower() for word in words[-5:])  # Take last 5 words
        
        # Filter out common stop words and very generic terms
        stop_words = {
            'required', 'preferred', 'experience', 'knowledge', 'skills',
            'ability', 'strong', 'excellent', 'good', 'work', 'working',
            'team', 'environment', 'company', 'position', 'role', 'job',
            'candidate', 'applicant', 'person', 'individual', 'professional'
        }
        
        filtered_keywords = [kw for kw in keywords if len(kw) > 2 and kw not in stop_words]
        
        return list(filtered_keywords)
    
    def _perform_ats_analysis(self, text_content: str, job_keywords: List[str]) -> DocumentAnalysis:
        """Perform enhanced ATS compatibility analysis using advanced analyzer"""
        
        # If we have job keywords, use our enhanced analyzer
        if job_keywords:
            # Create a pseudo job description from keywords for the analyzer
            job_description = f"Required skills and qualifications: {', '.join(job_keywords)}"
            
            # Use basic analysis since ATS analyzer was removed
            basic_analysis = self._analyze_document_basic(text_content, job_description)
            
            # Extract basic data
            ats_score = ATSScore(
                overall_score=basic_analysis.get('overall_score', 0),
                formatting_score=basic_analysis.get('formatting_score', 0),
                keyword_score=basic_analysis.get('keyword_score', 0),
                readability_score=basic_analysis.get('readability_score', 0),
                technical_skills_score=basic_analysis.get('technical_skills_score', 0),
                soft_skills_score=basic_analysis.get('soft_skills_score', 0),
                suggestions=basic_analysis.get('recommendations', [])
            )
            
            return DocumentAnalysis(
                word_count=basic_analysis.get('word_count', len(text_content.split())),
                keyword_density=basic_analysis.get('keyword_analysis', {}).get('keyword_density', {}),
                readability_score=basic_analysis.get('readability_score', 0),
                ats_score=ats_score,
                suggested_improvements=basic_analysis.get('recommendations', []),
                missing_sections=basic_analysis.get('missing_sections', []),
                # Fixed fields for frontend - ensure proper types
                job_match_summary={"summary": basic_analysis.get('job_match_summary', '')},
                keyword_analysis=basic_analysis.get('keyword_analysis'),
                missing_skills={"skills": basic_analysis.get('missing_skills', [])}
            )
        else:
            # General resume analysis focused on structure and completeness
            general_analysis = self._perform_general_resume_analysis(text_content)
            
            # Extract scores from general analysis
            formatting_score = general_analysis['formatting_score']
            readability_score = general_analysis['readability_score']
            keyword_score = general_analysis['completeness_score']  # Use completeness instead of keywords
            overall_score = general_analysis['overall_score']
            word_count = general_analysis['word_count']
            
            suggestions = general_analysis['suggestions']
            missing_sections = general_analysis['missing_sections']
            
            ats_score = ATSScore(
                overall_score=overall_score,
                formatting_score=formatting_score,
                keyword_score=keyword_score,
                readability_score=readability_score,
                technical_skills_score=None,  # Don't show for general analysis
                soft_skills_score=None,  # Don't show for general analysis
                suggestions=suggestions
            )
            
            return DocumentAnalysis(
                word_count=word_count,
                keyword_density={},  # Not applicable for general analysis
                readability_score=readability_score,
                ats_score=ats_score,
                suggested_improvements=suggestions,
                missing_sections=missing_sections,
                # General analysis doesn't match against job
                job_match_summary={"summary": "General resume analysis - select a job for detailed matching"},
                keyword_analysis={"keywords_found": [], "keywords_missing": []},
                missing_skills={"skills": []}
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

    def _perform_general_resume_analysis(self, text_content: str) -> dict:
        """Perform general resume analysis focused on structure and completeness"""
        import re
        
        text_lower = text_content.lower()
        lines = text_content.split('\n')
        words = text_content.split()
        word_count = len(words)
        
        # 1. CONTACT INFORMATION ANALYSIS
        contact_score = 0
        contact_issues = []
        
        # Check for name (usually in first few lines)
        name_patterns = [
            r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # First Last
            r'\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b'  # First M. Last
        ]
        has_name = any(re.search(pattern, text_content) for pattern in name_patterns)
        if has_name:
            contact_score += 25
        else:
            contact_issues.append("Full name not clearly identified")
        
        # Check for email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        has_email = bool(re.search(email_pattern, text_content))
        if has_email:
            contact_score += 25
        else:
            contact_issues.append("Email address missing")
        
        # Check for phone - improved patterns for international formats
        phone_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # US format (xxx-xxx-xxxx)
            r'\(\d{3}\)\s?\d{3}[-.]?\d{4}',   # (xxx) xxx-xxxx
            r'\+\d{1,4}[-.\s]\d{2,3}[-.\s]\d{7,10}',  # International (+972-50-5752650)
            r'\b\d{3}[-.]?\d{5,6}\b',         # International (972-52650)
            r'\b\d{10,15}\b',                 # Simple long number
            r'\b972[-.\s]?\d{2}[-.\s]?\d{7}\b',  # Israeli format specifically (972-50-5752650)
            r'\+972[-.\s]?\d{2}[-.\s]?\d{7}',    # +972-50-5752650 format
            r'Phone[-:\s]*\+?\d+[-.\s\d]+',    # "Phone: +xxx-xxx-xxxxxxx"
        ]
        
        has_phone = False
        for pattern in phone_patterns:
            if re.search(pattern, text_content, re.IGNORECASE):
                has_phone = True
                break
        
        if has_phone:
            contact_score += 25
        else:
            contact_issues.append("Phone number missing or not in standard format")
        
        # Check for location (city, state or country)
        location_keywords = ['city', 'state', 'country', 'address', 'location']
        location_patterns = [
            r'\b[A-Z][a-z]+,\s*[A-Z]{2}\b',  # City, ST
            r'\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b'  # City, Country
        ]
        has_location = (any(keyword in text_lower for keyword in location_keywords) or 
                       any(re.search(pattern, text_content) for pattern in location_patterns))
        if has_location:
            contact_score += 25
        else:
            contact_issues.append("Location information unclear")
        
        # 2. SECTION STRUCTURE ANALYSIS
        structure_score = 0
        required_sections = {
            'experience': ['experience', 'work history', 'employment', 'professional experience'],
            'education': ['education', 'academic', 'degree', 'university', 'college'],
            'skills': ['skills', 'technical skills', 'competencies', 'abilities'],
        }
        
        important_sections = {
            'summary': ['summary', 'objective', 'profile', 'about'],
            'projects': ['projects', 'portfolio', 'accomplishments'],
            'certifications': ['certifications', 'certificates', 'licenses']
        }
        
        missing_sections = []
        found_sections = []
        
        # Check required sections
        for section, keywords in required_sections.items():
            if any(keyword in text_lower for keyword in keywords):
                structure_score += 33.33
                found_sections.append(section)
            else:
                missing_sections.append(f"{section.title()} section")
        
        # Check important sections (bonus points)
        bonus_score = 0
        for section, keywords in important_sections.items():
            if any(keyword in text_lower for keyword in keywords):
                bonus_score += 10
                found_sections.append(section)
        
        structure_score = min(100, structure_score + bonus_score)
        
        # 3. CONTENT QUALITY ANALYSIS
        content_score = 0
        content_issues = []
        
        # Word count assessment
        if word_count < 200:
            content_issues.append("Resume appears too short (under 200 words)")
        elif word_count > 1000:
            content_issues.append("Resume might be too long (over 1000 words)")
        else:
            content_score += 30
        
        # Check for bullet points or structured content
        bullet_patterns = [r'•', r'\*', r'-\s', r'\d+\.']
        has_bullets = any(re.search(pattern, text_content) for pattern in bullet_patterns)
        if has_bullets:
            content_score += 25
        else:
            content_issues.append("Consider using bullet points for better readability")
        
        # Check for dates (indicating experience timeline)
        date_patterns = [
            r'\b\d{4}\b',  # Years
            r'\b\d{1,2}/\d{4}\b',  # MM/YYYY
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b'  # Month Year
        ]
        date_count = sum(len(re.findall(pattern, text_content)) for pattern in date_patterns)
        if date_count >= 2:
            content_score += 25
        else:
            content_issues.append("Include dates for experience and education")
        
        # Check for action verbs
        action_verbs = ['managed', 'developed', 'created', 'implemented', 'designed', 'led', 
                       'built', 'improved', 'increased', 'achieved', 'delivered', 'collaborated']
        found_verbs = sum(1 for verb in action_verbs if verb in text_lower)
        if found_verbs >= 3:
            content_score += 20
        else:
            content_issues.append("Use more action verbs to describe achievements")
        
        # 4. FORMATTING ASSESSMENT
        formatting_score = 0
        formatting_issues = []
        
        # Check line length variation (indicates structure)
        line_lengths = [len(line) for line in lines if line.strip()]
        if line_lengths:
            avg_length = sum(line_lengths) / len(line_lengths)
            length_variance = sum((l - avg_length) ** 2 for l in line_lengths) / len(line_lengths)
            
            if length_variance > 100:  # Good variance indicates structure
                formatting_score += 30
            else:
                formatting_issues.append("Consider improving document structure and formatting")
        
        # Check for excessive whitespace or formatting issues
        empty_lines = sum(1 for line in lines if not line.strip())
        if empty_lines / max(len(lines), 1) < 0.3:  # Not too many empty lines
            formatting_score += 35
        else:
            formatting_issues.append("Reduce excessive whitespace")
        
        # Check for consistent formatting (allow common resume characters)
        # Allow: letters, numbers, spaces, punctuation, common symbols used in resumes
        valid_chars_pattern = r'[^\w\s\.\-,()@/:|+#&;\'"•–\[\]{}=<>%*~`]'
        special_chars = re.findall(valid_chars_pattern, text_content)
        
        # Accept en dash (–) and bullet (•) as normal
        import unicodedata
        allowed_resume_chars = {
            '|', '+', '#', '&',
            '•',        # U+2022 bullet
            '●',        # U+25CF black circle  <-- your PDF uses this
            '◦',        # U+25E6 white bullet
            '▪', '▫',   # U+25AA, U+25AB small squares
            '–', '—',   # U+2013 en dash, U+2014 em dash
            '·',        # U+00B7 middle dot (often used as bullets)
            '‣', '▪', '►'  # other common resume bullets
        }
        def is_allowed(char):
            norm = unicodedata.normalize('NFKC', char)
            return norm in allowed_resume_chars
        if not special_chars:
            formatting_score += 35
        else:
            problematic_chars = [char for char in set(special_chars) if not is_allowed(char)]
            if problematic_chars:
                formatting_issues.append(f"Document may contain unusual characters: {', '.join(set(problematic_chars[:5]))}")
            else:
                formatting_score += 35  # All found characters are normal for resumes
        
        # 5. CALCULATE OVERALL SCORES
        overall_score = (contact_score + structure_score + content_score + formatting_score) / 4
        
        # Generate comprehensive suggestions
        suggestions = []
        suggestions.extend(contact_issues)
        suggestions.extend(content_issues)
        suggestions.extend(formatting_issues)
        
        if not suggestions:
            suggestions.append("Great! Your resume structure looks solid. Select a specific job to get targeted analysis.")
        
        return {
            'word_count': word_count,
            'overall_score': overall_score,
            'formatting_score': formatting_score,
            'readability_score': content_score,  # Use content score as readability
            'completeness_score': (contact_score + structure_score) / 2,
            'contact_score': contact_score,
            'structure_score': structure_score,
            'content_score': content_score,
            'suggestions': suggestions,
            'missing_sections': missing_sections,
            'found_sections': found_sections
        }

    def _analyze_document_basic(self, text_content: str, job_description: str = None) -> dict:
        """Enhanced document analysis with job-specific matching"""
        import re
        
        words = text_content.split()
        word_count = len(words)
        text_lower = text_content.lower()
        
        if job_description:
            # JOB-SPECIFIC ANALYSIS
            job_desc_lower = job_description.lower()
            
            # Extract technical skills from job description
            tech_skills = [
                'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
                'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask',
                'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
                'html', 'css', 'bootstrap', 'api', 'rest', 'graphql', 'microservices'
            ]
            
            soft_skills = [
                'leadership', 'management', 'communication', 'teamwork', 'collaboration',
                'problem solving', 'analytical', 'critical thinking', 'creative',
                'agile', 'scrum', 'project management', 'mentoring'
            ]
            
            # Find required skills in job description
            required_tech = [skill for skill in tech_skills if skill in job_desc_lower]
            required_soft = [skill for skill in soft_skills if skill in job_desc_lower]
            
            # Find matching skills in resume
            found_tech = [skill for skill in required_tech if skill in text_lower]
            found_soft = [skill for skill in required_soft if skill in text_lower]
            
            # Calculate specific scores
            tech_score = (len(found_tech) / max(len(required_tech), 1)) * 100
            soft_score = (len(found_soft) / max(len(required_soft), 1)) * 100
            
            # Overall keyword matching
            job_keywords = re.findall(r'\b\w{4,}\b', job_desc_lower)
            resume_keywords = re.findall(r'\b\w{4,}\b', text_lower)
            
            keyword_matches = len(set(job_keywords) & set(resume_keywords))
            keyword_score = min(100, (keyword_matches / max(len(set(job_keywords)), 1)) * 100)
            
            overall_score = (tech_score + soft_score + keyword_score) / 3
            
            # Generate specific recommendations with keyword details
            recommendations = []
            missing_tech = [skill for skill in required_tech if skill not in text_lower]
            missing_soft = [skill for skill in required_soft if skill not in text_lower]
            
            if missing_tech:
                recommendations.append(f"Consider highlighting these technical skills: {', '.join(missing_tech[:5])}")
            
            if missing_soft:
                recommendations.append(f"Consider emphasizing these soft skills: {', '.join(missing_soft[:3])}")
            
            if keyword_score < 60:
                recommendations.append("Include more keywords from the job description")
            
            if tech_score > 80 and soft_score > 80:
                recommendations.append("Excellent skill match! Consider highlighting specific achievements.")
            
            job_match_summary = f"Technical skills match: {tech_score:.0f}%, Soft skills match: {soft_score:.0f}%, Overall keyword relevance: {keyword_score:.0f}%"
            
            # Detailed keyword analysis for frontend
            keyword_analysis = {
                'keywords_found': found_tech + found_soft,
                'keywords_missing': missing_tech + missing_soft,
                'technical_skills': {
                    'required': required_tech,
                    'found': found_tech,
                    'missing': missing_tech
                },
                'soft_skills': {
                    'required': required_soft,
                    'found': found_soft,
                    'missing': missing_soft
                },
                'keyword_density': {skill: text_lower.count(skill) for skill in found_tech + found_soft},
                'total_job_keywords': len(required_tech) + len(required_soft),
                'matched_keywords': found_tech + found_soft
            }
            
            return {
                'word_count': word_count,
                'overall_score': overall_score,
                'formatting_score': 80,  # Assume good formatting for job-specific
                'keyword_score': keyword_score,
                'readability_score': 85,  # Focus on matching rather than readability
                'technical_skills_score': tech_score,
                'soft_skills_score': soft_score,
                'recommendations': recommendations,
                'missing_sections': [],
                'job_match_summary': job_match_summary,
                'keyword_analysis': keyword_analysis,
                'missing_skills': missing_tech + missing_soft
            }
        else:
            # GENERAL ANALYSIS (fallback)
            return {
                'word_count': word_count,
                'overall_score': 75,
                'formatting_score': 75,
                'keyword_score': 50,
                'readability_score': 80,
                'technical_skills_score': 0,
                'soft_skills_score': 0,
                'recommendations': ['Select a specific job for detailed analysis'],
                'missing_sections': [],
                'job_match_summary': 'General analysis performed',
                'keyword_analysis': {'keyword_density': {}},
                'missing_skills': []
            }
