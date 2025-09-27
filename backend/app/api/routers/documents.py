from __future__ import annotations
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from fastapi.responses import FileResponse, PlainTextResponse, JSONResponse, HTMLResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...auth.deps import get_current_user
from ...db.models import User
from ..schemas.documents import (
    DocumentType, DocumentStatus, DocumentResponse, DocumentListResponse,
    CoverLetterRequest, DocumentOptimizationRequest, DocumentAnalysis,
    TemplateListResponse, DocumentTemplate
)
from ..deps import get_document_service
from ...domain.documents.service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["documents"], redirect_slashes=False)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    name: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    allowed = {".pdf", ".docx", ".doc", ".txt", ".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus"}
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    ext = "." + file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    meta_dict: Dict[str, Any] = {}
    if metadata:
        try:
            import json
            meta_dict = json.loads(metadata)
        except Exception:
            meta_dict = {}

    row = svc.upload_document(
        db=db,
        user_id=str(current_user.id),
        file_content=content,
        filename=file.filename,
        document_type=document_type,
        display_name=name,
        metadata=meta_dict,
    )
    return svc.resolve_document_response(row)

@router.get("/", response_model=DocumentListResponse)
def list_documents(
    document_type: Optional[DocumentType] = Query(None),
    status: Optional[DocumentStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    return svc.list_documents(
        db=db,
        user_id=str(current_user.id),
        page=page,
        page_size=page_size,
        filter_type=document_type,
        filter_status=status,
        query=query,
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    return svc.get_document(db=db, user_id=str(current_user.id), document_id=document_id)

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    svc.delete_document(db=db, user_id=str(current_user.id), document_id=document_id)
    return {"message": "Document deleted successfully"}

@router.put("/{document_id}/status", response_model=DocumentResponse)
def set_document_status(
    document_id: str,
    new_status: DocumentStatus = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    return svc.update_status(db=db, user_id=str(current_user.id), document_id=document_id, status=new_status)

@router.post("/{document_id}/analyze", response_model=DocumentAnalysis)
def analyze_document(
    document_id: str,
    job_id: Optional[str] = Query(None),
    use_ai: bool = Query(False, description="If true and OpenAI is configured, include AI suggestions."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    return svc.analyze_document_ats(db=db, document_id=document_id, job_id=job_id, user_id=str(current_user.id), use_ai=use_ai)

@router.post("/optimize")
def optimize_document(
    request: DocumentOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    optimized = svc.optimize_document(db=db, request=request)
    return {
        "optimized_content": optimized,
        "optimization_summary": "Document optimized for target keywords and ATS compatibility",
        "improvements_made": ["Enhanced keyword density", "Improved formatting for ATS scanning", "Added missing sections"],
    }

@router.get("/templates/", response_model=TemplateListResponse)
def list_templates(
    category: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    svc: DocumentService = Depends(get_document_service),
):
    templates = svc.get_document_templates(category=category)
    if document_type:
        templates = [t for t in templates if t["type"] == document_type.value]
    objects = [
        DocumentTemplate(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            type=document_type or DocumentType(t["type"]),
            category=t["category"],
            preview_url=t.get("preview_url"),
            template_data={},
            is_premium=t.get("is_premium", False),
        )
        for t in templates
    ]
    cats = list({t["category"] for t in templates})
    return TemplateListResponse(templates=objects, categories=cats, total=len(objects))

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    svc: DocumentService = Depends(get_document_service),
):
    file_path, filename, media_type = svc.resolve_download(db=db, user_id=str(current_user.id), document_id=document_id)
    return FileResponse(path=str(file_path), media_type=media_type, filename=filename)

@router.get("/{document_id}/preview")
async def preview_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    svc: DocumentService = Depends(get_document_service),
):
    mode, payload = svc.get_preview_payload(db, str(user.id), document_id)
    if mode == "inline_file":
        return FileResponse(path=payload["path"], media_type=payload["media"])
    if mode == "html":
        return HTMLResponse(content=payload["content"])
    return PlainTextResponse(payload["text"])
