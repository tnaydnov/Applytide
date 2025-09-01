from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json

from ..db.session import get_db
from ..auth.deps import get_current_user
from ..db.models import User
from .service import DocumentService
from .models import (
    DocumentType, DocumentStatus, DocumentResponse, DocumentListResponse,
    CoverLetterRequest, DocumentOptimizationRequest, DocumentAnalysis,
    TemplateListResponse, DocumentTemplate
)

router = APIRouter(prefix="/documents", tags=["documents"])
document_service = DocumentService()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    metadata: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a new document"""
    try:
        # Validate file type
        allowed_extensions = {'.pdf', '.docx', '.doc', '.txt'}
        file_extension = '.' + file.filename.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Read file content
        file_content = await file.read()
        
        # Parse metadata if provided
        metadata_dict = {}
        if metadata:
            try:
                metadata_dict = json.loads(metadata)
            except json.JSONDecodeError:
                pass
        
        # Upload document
        document = document_service.upload_document(
            db=db,
            user_id=str(current_user.id),
            file_content=file_content,
            filename=file.filename,
            document_type=document_type,
            metadata=metadata_dict
        )
        
        # Return response
        return DocumentResponse(
            id=str(document.id),
            type=document_type,
            name=document.label,
            status=DocumentStatus.ACTIVE,
            format="pdf",  # Simplified
            file_size=len(file_content),
            created_at=document.created_at,
            updated_at=document.created_at,
            version_count=1,
            current_version=1,
            tags=[],
            metadata=metadata_dict
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/", response_model=DocumentListResponse)
def list_documents(
    document_type: Optional[DocumentType] = Query(None),
    status: Optional[DocumentStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's documents with filtering and pagination"""
    
    # For now, return resumes as documents (using existing model)
    from ..db import models
    
    query = db.query(models.Resume).filter(models.Resume.user_id == current_user.id)
    
    total = query.count()
    offset = (page - 1) * page_size
    documents = query.offset(offset).limit(page_size).all()
    
    document_responses = []
    for doc in documents:
        document_responses.append(DocumentResponse(
            id=str(doc.id),
            type=DocumentType.RESUME,
            name=doc.label,
            status=DocumentStatus.ACTIVE,
            format="pdf",
            file_size=1024,  # Placeholder
            created_at=doc.created_at,
            updated_at=doc.created_at,
            version_count=1,
            current_version=1,
            tags=[],
            metadata={}
        ))
    
    pages = (total + page_size - 1) // page_size
    
    return DocumentListResponse(
        documents=document_responses,
        total=total,
        page=page,
        page_size=page_size,
        has_next=page < pages,
        has_prev=page > 1
    )

@router.get("/{document_id}")
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document details"""
    from ..db import models
    
    try:
        document = db.query(models.Resume).filter(
            models.Resume.id == uuid.UUID(document_id),
            models.Resume.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=str(document.id),
            type=DocumentType.RESUME,
            name=document.label,
            status=DocumentStatus.ACTIVE,
            format="pdf",
            file_size=len(document.text) if document.text else 0,
            created_at=document.created_at,
            updated_at=document.created_at,
            version_count=1,
            current_version=1,
            tags=[],
            metadata={}
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    from ..db import models
    
    try:
        document = db.query(models.Resume).filter(
            models.Resume.id == uuid.UUID(document_id),
            models.Resume.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        db.delete(document)
        db.commit()
        
        return {"message": "Document deleted successfully"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

@router.post("/cover-letter/generate")
def generate_cover_letter(
    request: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered cover letter"""
    try:
        cover_letter = document_service.generate_cover_letter(
            db=db,
            user_id=str(current_user.id),
            request=request
        )
        
        return {
            "cover_letter": cover_letter,
            "word_count": len(cover_letter.split()),
            "estimated_reading_time": f"{len(cover_letter.split()) // 200 + 1} minutes"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/{document_id}/analyze", response_model=DocumentAnalysis)
def analyze_document(
    document_id: str,
    job_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze document for ATS compatibility and optimization suggestions"""
    try:
        analysis = document_service.analyze_document_ats(
            db=db,
            document_id=document_id,
            job_id=job_id
        )
        return analysis
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/optimize")
def optimize_document(
    request: DocumentOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Optimize document for better ATS scores"""
    try:
        optimized_content = document_service.optimize_document(db=db, request=request)
        
        return {
            "optimized_content": optimized_content,
            "optimization_summary": "Document optimized for target keywords and ATS compatibility",
            "improvements_made": [
                "Enhanced keyword density",
                "Improved formatting for ATS scanning",
                "Added missing sections"
            ]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.get("/templates/", response_model=TemplateListResponse)
def list_templates(
    category: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None)
):
    """Get available document templates"""
    
    templates = document_service.get_document_templates(category=category)
    
    if document_type:
        templates = [t for t in templates if t["type"] == document_type.value]
    
    # Convert to DocumentTemplate objects
    template_objects = []
    for template in templates:
        template_objects.append(DocumentTemplate(
            id=template["id"],
            name=template["name"],
            description=template["description"],
            type=DocumentType(template["type"]),
            category=template["category"],
            preview_url=template.get("preview_url"),
            template_data={},
            is_premium=template.get("is_premium", False)
        ))
    
    categories = list(set(t["category"] for t in templates))
    
    return TemplateListResponse(
        templates=template_objects,
        categories=categories,
        total=len(template_objects)
    )

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download document file"""
    from ..db import models
    
    try:
        document = db.query(models.Resume).filter(
            models.Resume.id == uuid.UUID(document_id),
            models.Resume.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # For now, return text content as response
        # In production, return actual file
        return {
            "content": document.text or "No content available",
            "filename": f"{document.label}.txt",
            "content_type": "text/plain"
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")
