"""
Enhanced Document Management API with Intelligent ATS Analysis
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import json
from datetime import datetime

# Import our enhanced services
from ..services.pdf_extractor import PDFExtractor
from ..services.ats_analyzer import ATSAnalyzer
from ..db.session import get_db
from ..auth.deps import get_current_user
from ..db.models import User

# Download NLTK data if needed
try:
    import nltk
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

router = APIRouter(prefix="/api/documents", tags=["enhanced-documents"])

# Initialize services
pdf_extractor = PDFExtractor()
ats_analyzer = ATSAnalyzer()

# Store for documents (in production, use database)
documents_store = {}
jobs_store = {
    "1": {
        "id": "1",
        "title": "Senior Software Engineer",
        "company": "TechCorp",
        "description": """We are seeking a Senior Software Engineer with 5+ years of experience in Python, React, and AWS. 
        The ideal candidate should have experience with microservices architecture, Docker, Kubernetes, and CI/CD pipelines. 
        Strong communication skills and leadership experience required. Experience with machine learning and data science is a plus.
        
        Key Requirements:
        - 5+ years of software development experience
        - Proficiency in Python, JavaScript, React
        - Experience with AWS cloud services
        - Knowledge of containerization (Docker, Kubernetes)
        - Understanding of microservices architecture
        - Strong problem-solving and analytical skills
        - Excellent communication and teamwork abilities
        - Experience with agile development methodologies"""
    },
    "2": {
        "id": "2", 
        "title": "Data Scientist",
        "company": "DataFlow Inc",
        "description": """Looking for a Data Scientist with expertise in machine learning, Python, SQL, and statistical analysis. 
        Experience with TensorFlow, PyTorch, pandas, numpy, and data visualization tools like Tableau or PowerBI required.
        PhD or Master's degree in related field preferred. Strong analytical and problem-solving skills required.
        
        Key Requirements:
        - Master's or PhD in Data Science, Statistics, or related field
        - 3+ years of experience in machine learning and data analysis
        - Proficiency in Python, R, SQL
        - Experience with TensorFlow, PyTorch, scikit-learn
        - Knowledge of data visualization tools (Tableau, PowerBI, matplotlib)
        - Strong statistical analysis and modeling skills
        - Experience with big data technologies (Spark, Hadoop)
        - Excellent presentation and communication skills"""
    },
    "3": {
        "id": "3",
        "title": "Frontend Developer",
        "company": "WebDesign Pro",
        "description": """Frontend Developer position requiring expertise in React, JavaScript, TypeScript, HTML5, CSS3, 
        and modern web development practices. Experience with Redux, Next.js, and responsive design required.
        Knowledge of UI/UX principles and collaboration with design teams essential.
        
        Key Requirements:
        - 3+ years of frontend development experience
        - Expertise in React, JavaScript, TypeScript
        - Proficiency in HTML5, CSS3, SASS/SCSS
        - Experience with state management (Redux, Context API)
        - Knowledge of modern build tools (Webpack, Vite)
        - Understanding of responsive design principles
        - Experience with version control (Git)
        - Familiarity with testing frameworks (Jest, Cypress)
        - Strong attention to detail and design sensibility"""
    }
}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document with enhanced PDF processing"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Generate unique document ID
        document_id = str(uuid.uuid4())
        
        # Create uploads directory if it doesn't exist
        upload_dir = "/app/uploads/documents"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, f"{document_id}_{file.filename}")
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Extract text content using our enhanced PDF extractor
        try:
            # Read PDF file content
            with open(file_path, "rb") as f:
                pdf_content = f.read()
            
            # Use the correct method name and pass bytes
            extraction_result = pdf_extractor.extract_text(pdf_content)
            extracted_text = extraction_result.get("text", "")
            extraction_success = extraction_result.get("success", False)
            extraction_error = None
            text_preview = extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
        except Exception as e:
            extracted_text = f"Error extracting text: {str(e)}"
            extraction_success = False
            extraction_error = str(e)
            text_preview = ""
        
        # Store document in database using Resume model (same as regular documents)
        from ..db import models
        from sqlalchemy import text
        
        # Create resume entry in database
        resume = models.Resume(
            user_id=current_user.id,
            label=file.filename,
            text=extracted_text,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        # Also store in our enhanced documents store for additional metadata
        document_data = {
            "id": str(resume.id),
            "database_id": resume.id,
            "filename": file.filename,
            "type": document_type,
            "upload_date": datetime.now().isoformat(),
            "file_path": file_path,
            "file_size": len(content),
            "text_content": extracted_text,
            "extraction_success": extraction_success,
            "extraction_error": extraction_error,
            "text_preview": text_preview,
            "user_id": current_user.id
        }
        
        documents_store[str(resume.id)] = document_data
        
        return {
            "success": True,
            "document_id": str(resume.id),
            "filename": file.filename,
            "type": document_type,
            "extraction_success": extraction_success,
            "text_length": len(extracted_text),
            "text_preview": text_preview,
            "extraction_error": extraction_error
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/")
async def get_documents():
    """Get all uploaded documents"""
    documents = []
    for doc_id, doc_data in documents_store.items():
        documents.append({
            "id": doc_data["id"],
            "filename": doc_data["filename"],
            "type": doc_data["type"],
            "upload_date": doc_data["upload_date"],
            "file_size": doc_data["file_size"],
            "extraction_success": doc_data.get("extraction_success", False),
            "text_length": len(doc_data.get("text_content", "")),
            "text_preview": doc_data.get("text_preview", "")
        })
    
    return {"documents": documents}

@router.get("/jobs")
async def get_jobs():
    """Get available job positions for analysis"""
    return {"jobs": list(jobs_store.values())}

@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: str,
    job_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze document with enhanced job-specific ATS analysis"""
    try:
        # First check enhanced documents store
        document_data = documents_store.get(document_id)
        
        # If not in enhanced store, get from database
        if not document_data:
            from ..db import models
            import uuid
            
            try:
                # Get document from database
                resume = db.query(models.Resume).filter(
                    models.Resume.id == uuid.UUID(document_id),
                    models.Resume.user_id == current_user.id
                ).first()
                
                if not resume:
                    raise HTTPException(status_code=404, detail="Document not found")
                
                # Create document_data structure for analysis
                document_data = {
                    "text_content": resume.text or "",
                    "extraction_success": bool(resume.text),
                    "extraction_error": None if resume.text else "No text content in database"
                }
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Check if text was extracted successfully
        if not document_data.get("extraction_success", False):
            return {
                "success": False,
                "error": "Document text could not be extracted",
                "extraction_error": document_data.get("extraction_error"),
                "ats_score": {
                    "overall_score": 0,
                    "technical_skills_score": 0,
                    "soft_skills_score": 0,
                    "keyword_score": 0,
                    "experience_score": 0,
                    "formatting_score": 0
                },
                "suggested_improvements": ["Please upload a clearer PDF document"],
                "missing_sections": [],
                "word_count": 0,
                "readability_score": 0,
                "keyword_density": {}
            }
        
        resume_text = document_data.get("text_content", "")
        
        if not resume_text.strip():
            return {
                "success": False,
                "error": "No text content found in document",
                "ats_score": {
                    "overall_score": 0,
                    "technical_skills_score": 0,
                    "soft_skills_score": 0,
                    "keyword_score": 0,
                    "experience_score": 0,
                    "formatting_score": 0
                },
                "suggested_improvements": ["Document appears to be empty or unreadable"],
                "missing_sections": [],
                "word_count": 0,
                "readability_score": 0,
                "keyword_density": {}
            }
        
        # Get job description for targeted analysis
        job_description = ""
        job_context = {}
        
        if job_id and job_id in jobs_store:
            job = jobs_store[job_id]
            job_description = job["description"]
            job_context = {
                "job_id": job_id,
                "title": job["title"],
                "company": job["company"]
            }
        else:
            # Default generic analysis without specific job
            job_description = """Software development position requiring programming skills, problem-solving abilities, and teamwork. 
            Experience with modern technologies and development practices preferred. Strong communication skills and 
            analytical thinking required. Bachelor's degree in Computer Science or related field preferred."""
            job_context = {
                "job_id": None,
                "title": "Generic Software Position",
                "company": "Various"
            }
        
        # Perform enhanced ATS analysis
        analysis_result = ats_analyzer.analyze_resume_for_job(
            resume_text, 
            job_description,
            document_metadata={
                "filename": document_data.get("filename", "Document"),
                "upload_date": document_data.get("upload_date", datetime.now().isoformat()),
                "file_size": document_data.get("file_size", 0)
            }
        )
        
        # Add job context to response
        analysis_result["job_context"] = job_context
        
        # Store analysis result for future reference (only if in enhanced store)
        if document_id in documents_store:
            documents_store[document_id]["last_analysis"] = {
                "job_id": job_id,
                "analysis_date": datetime.now().isoformat(),
                "result": analysis_result
            }
        
        return analysis_result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Analysis failed: {str(e)}",
            "ats_score": {
                "overall_score": 0,
                "technical_skills_score": 0,
                "soft_skills_score": 0,
                "keyword_score": 0,
                "experience_score": 0,
                "formatting_score": 0
            },
            "suggested_improvements": [f"Analysis error: {str(e)}"],
            "missing_sections": [],
            "word_count": 0,
            "readability_score": 0,
            "keyword_density": {}
        }

@router.post("/{document_id}/generate-cover-letter")
async def generate_cover_letter(
    document_id: str,
    job_id: str,
    user_name: str = Form(...),
    company_name: str = Form(...),
    additional_notes: str = Form("")
):
    """Generate an intelligent cover letter based on resume and job analysis"""
    try:
        # Get document
        if document_id not in documents_store:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get job
        if job_id not in jobs_store:
            raise HTTPException(status_code=404, detail="Job not found")
        
        document = documents_store[document_id]
        job = jobs_store[job_id]
        
        # Extract key skills from resume for cover letter
        resume_text = document.get("text_content", "")
        
        # Analyze resume against job for personalized cover letter
        if resume_text:
            analysis = ats_analyzer.analyze_resume_for_job(resume_text, job["description"])
            matched_keywords = analysis.get("keyword_analysis", {}).get("matched_keywords", [])
            missing_skills = analysis.get("missing_skills", {}).get("technical", [])
        else:
            matched_keywords = []
            missing_skills = []
        
        # Generate intelligent cover letter
        skills_highlight = ", ".join(matched_keywords[:5]) if matched_keywords else "relevant technical skills"
        
        cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job['title']} position at {company_name}. After reviewing the job requirements, I am confident that my background and experience make me an ideal candidate for this role.

My experience in {skills_highlight} aligns perfectly with your requirements. In my previous roles, I have successfully applied these technologies to deliver impactful solutions and drive business results.

{additional_notes if additional_notes else f"I am particularly excited about the opportunity to contribute to {company_name}'s continued success and growth. The {job['title']} role represents an excellent opportunity for me to leverage my skills while continuing to learn and grow in a dynamic environment."}

I have attached my resume for your review and would welcome the opportunity to discuss how my background and enthusiasm can benefit your team. Thank you for considering my application.

Best regards,
{user_name}"""
        
        # Store generated cover letter
        cover_letter_id = str(uuid.uuid4())
        cover_letter_data = {
            "id": cover_letter_id,
            "document_id": document_id,
            "job_id": job_id,
            "user_name": user_name,
            "company_name": company_name,
            "content": cover_letter,
            "created_date": datetime.now().isoformat(),
            "skills_highlighted": matched_keywords[:5],
            "job_title": job["title"]
        }
        
        # Store in document for later retrieval
        if "cover_letters" not in document:
            document["cover_letters"] = {}
        document["cover_letters"][cover_letter_id] = cover_letter_data
        
        return {
            "success": True,
            "cover_letter_id": cover_letter_id,
            "content": cover_letter,
            "job_title": job["title"],
            "company": company_name,
            "skills_highlighted": matched_keywords[:5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    try:
        if document_id not in documents_store:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = documents_store[document_id]
        
        # Delete file from disk
        file_path = document.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from store
        del documents_store[document_id]
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get document details with analysis history"""
    if document_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = documents_store[document_id]
    
    return {
        "id": document["id"],
        "filename": document["filename"],
        "type": document["type"],
        "upload_date": document["upload_date"],
        "file_size": document["file_size"],
        "extraction_success": document.get("extraction_success", False),
        "text_length": len(document.get("text_content", "")),
        "text_preview": document.get("text_preview", ""),
        "last_analysis": document.get("last_analysis"),
        "cover_letters": list(document.get("cover_letters", {}).keys())
    }

@router.get("/{document_id}/text")
async def get_document_text(document_id: str):
    """Get full extracted text from document"""
    if document_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = documents_store[document_id]
    
    return {
        "document_id": document_id,
        "filename": document["filename"],
        "extraction_success": document.get("extraction_success", False),
        "text_content": document.get("text_content", ""),
        "extraction_error": document.get("extraction_error")
    }
