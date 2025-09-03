from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
import mimetypes
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
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
    name: Optional[str] = Form(None),          # 👈 NEW
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

        # Upload document (we now pass the user-provided display name)
        print(f"[UPLOAD ENDPOINT] name={name} file.filename={file.filename}")
        document = document_service.upload_document(
            db=db,
            user_id=str(current_user.id),
            file_content=file_content,
            filename=file.filename,
            document_type=document_type,
            display_name=name,                # 👈 NEW
            metadata=metadata_dict
        )
        print(f"[UPLOAD ENDPOINT] DB label={document.label}")

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
    from ..db import models
    from pathlib import Path

    query = db.query(models.Resume).filter(models.Resume.user_id == current_user.id)

    total = query.count()
    offset = (page - 1) * page_size
    documents = query.offset(offset).limit(page_size).all()

    document_responses = []
    for doc in documents:
        print(f"[LIST] DB label={doc.label} file_path={doc.file_path}")
        # Default values if no sidecar exists (backward compatibility)
        resolved_type = DocumentType.RESUME
        resolved_name = doc.label
        resolved_metadata = {}

        # Try to read sidecar metadata we saved on upload
        try:
            meta_path = Path(doc.file_path).with_suffix(Path(doc.file_path).suffix + ".meta.json")
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                if meta.get("type"):
                    resolved_type = DocumentType(meta["type"])
                if meta.get("name"):
                    resolved_name = meta["name"]
                resolved_metadata = meta.get("metadata") or {}
        except Exception as e:
            print(f"Failed reading meta for document {doc.id}: {e}")

        # Apply optional filter by type
        if document_type and resolved_type != document_type:
            continue

        document_responses.append(DocumentResponse(
            id=str(doc.id),
            type=resolved_type,
            name=resolved_name,
            status=DocumentStatus.ACTIVE,
            format="pdf",
            file_size=1024,  # Placeholder
            created_at=doc.created_at,
            updated_at=doc.created_at,
            version_count=1,
            current_version=1,
            tags=[],
            metadata=resolved_metadata
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


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single document, resolved with sidecar metadata (type/name)."""
    from ..db import models
    from pathlib import Path
    import json

    try:
        doc = db.query(models.Resume).filter(
            models.Resume.id == uuid.UUID(document_id),
            models.Resume.user_id == current_user.id
        ).first()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Defaults
    resolved_type = DocumentType.RESUME
    resolved_name = doc.label
    resolved_metadata = {}
    print(f"[GET] DB label={doc.label} file_path={doc.file_path}")

    # Try sidecar (.meta.json) to override type/name/metadata
    file_path = Path(doc.file_path) if getattr(doc, "file_path", None) else None
    if file_path:
        try:
            meta_path = file_path.with_suffix(file_path.suffix + ".meta.json")
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                if meta.get("type"):
                    resolved_type = DocumentType(meta["type"])
                if meta.get("name"):
                    resolved_name = meta["name"]
                resolved_metadata = meta.get("metadata") or {}
        except Exception as e:
            print(f"[get_document] meta read failed for {doc.id}: {e}")

    ext = (file_path.suffix[1:] if file_path and file_path.suffix else "bin")
    size = 0
    try:
        if file_path and file_path.exists():
            size = file_path.stat().st_size
        elif doc.text:
            size = len(doc.text.encode("utf-8"))
    except Exception:
        pass

    return DocumentResponse(
        id=str(doc.id),
        type=resolved_type,
        name=resolved_name,
        status=DocumentStatus.ACTIVE,
        format=ext,  # e.g. 'pdf'
        file_size=size,
        created_at=doc.created_at,
        updated_at=doc.created_at,
        version_count=1,
        current_version=1,
        tags=[],
        metadata=resolved_metadata,
    )



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
async def generate_cover_letter(
    request: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered cover letter with intelligent analysis"""
    try:
        result = await document_service.generate_cover_letter(
            db=db,
            user_id=str(current_user.id),
            request=request
        )
        
        return result
        
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
            job_id=job_id,
            user_id=str(current_user.id)
        )
        return analysis
        
    except ValueError as e:
        print(f"ValueError in analyze_document: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Exception in analyze_document: {str(e)}")
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
    """Download the original stored file, with the correct name and extension."""
    from ..db import models

    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    document = (
        db.query(models.Resume)
        .filter(models.Resume.id == doc_uuid, models.Resume.user_id == current_user.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored file missing")

    # Always use the label from the database for the download filename
    print(f"[DOWNLOAD] DB label={document.label} file_path={file_path}")
    display_name = document.label or file_path.stem
    ext = file_path.suffix or ""
    safe_name = "".join(c for c in display_name if c.isalnum() or c in " _-").strip() or "document"
    download_filename = f"{safe_name}{ext}"
    print(f"[DOWNLOAD] download_filename={download_filename}")

    # set the media type
    media_type, _ = mimetypes.guess_type(str(file_path))
    if not media_type:
        media_type = "application/octet-stream"

    # IMPORTANT: FileResponse(filename=...) sets Content-Disposition correctly
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=download_filename
    )

