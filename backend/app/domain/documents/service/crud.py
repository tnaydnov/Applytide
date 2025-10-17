"""CRUD operations for documents."""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import json
from fastapi import HTTPException

from ....db import models
from ....infra.files.document_store import DocumentStore, sanitize_display_name
from ....infra.extractors.text_extractor import TextExtractor
from ....api.schemas.documents import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentResponse, DocumentListResponse
)
from ....infra.logging import get_logger

logger = get_logger(__name__)


class DocumentCRUD:
    """Handles basic CRUD operations for documents."""
    
    def __init__(self, store: DocumentStore, extractor: TextExtractor, utils):
        self.store = store
        self.extractor = extractor
        self.utils = utils
    
    def upload_document(
        self,
        db: Session,
        user_id: str,
        file_content: bytes,
        filename: str,
        document_type: DocumentType,
        display_name: Optional[str] = None,
        metadata: Dict[str, Any] | None = None,
    ) -> models.Resume:
        """Upload and store a new document."""
        ext = Path(filename).suffix.lower() or ".bin"
        file_id = uuid.uuid4()
        
        # Save content
        file_path = self.store.save_bytes(file_content, filename)
        
        # Extract text
        text_content = self.extractor.extract_text(file_path)
        safe_label = sanitize_display_name(display_name or Path(filename).stem)
        
        # Create database record
        row = models.Resume(
            id=file_id,
            user_id=uuid.UUID(user_id) if user_id else None,
            label=safe_label,
            file_path=str(file_path),
            text=text_content,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        
        # Write sidecar metadata
        side = {
            "document_id": str(row.id),
            "type": document_type.value,
            "name": safe_label,
            "original_filename": filename,
            "original_extension": ext,
            "status": DocumentStatus.ACTIVE.value,
            "metadata": metadata or {},
            "created_at": row.created_at.isoformat(),
        }
        self.utils.write_sidecar(file_path, side)
        
        logger.info("Document uploaded", extra={
            "document_id": str(file_id),
            "user_id": user_id,
            "type": document_type.value,
            "filename": filename
        })
        
        return row
    
    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        """Build DocumentResponse from database row and sidecar."""
        p = Path(row.file_path)
        side = self.utils.sidecar(p)
        
        resolved_type = DocumentType(side.get("type", "resume"))
        resolved_name = side.get("name", row.label)
        resolved_meta = side.get("metadata", {})
        resolved_status = DocumentStatus(side.get("status", DocumentStatus.ACTIVE.value))
        
        # Determine format
        raw_ext = (p.suffix[1:] if p.suffix else "txt").lower()
        ext = {"doc": "docx"}.get(raw_ext, raw_ext)
        audio_exts = {"mp3", "m4a", "aac", "wav", "flac", "ogg", "opus"}
        
        if ext in {"pdf", "docx", "txt", "html"}:
            fmt = DocumentFormat(ext)
        elif ext in audio_exts:
            fmt = DocumentFormat.AUDIO
        else:
            fmt = DocumentFormat.TXT
        
        # Get file size
        size = 0
        try:
            size = p.stat().st_size
        except Exception:
            if row.text:
                size = len(row.text.encode("utf-8"))
        
        return DocumentResponse(
            id=str(row.id),
            type=resolved_type,
            name=resolved_name,
            status=resolved_status,
            format=fmt,
            file_size=size,
            created_at=row.created_at,
            updated_at=row.created_at,
            tags=[],
            metadata=resolved_meta,
            ats_score=None,
        )
    
    def list_documents(
        self,
        db: Session,
        user_id: str,
        page: int,
        page_size: int,
        filter_type: Optional[DocumentType],
        filter_status: Optional[DocumentStatus],
        query: Optional[str] = None,
    ) -> DocumentListResponse:
        """List documents with filtering and pagination."""
        rows = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == uuid.UUID(user_id))
            .order_by(models.Resume.created_at.desc())
            .all()
        )
        
        q_lower = (query or "").strip().lower()
        items: List[DocumentResponse] = []
        
        for r in rows:
            resp = self.resolve_document_response(r)
            
            # Apply filters
            if filter_type and resp.type != filter_type:
                continue
            if filter_status and resp.status != filter_status:
                continue
            
            # Apply search query
            if q_lower:
                side = self.utils.sidecar(Path(r.file_path))
                haystack = " ".join([
                    resp.name or "",
                    r.label or "",
                    r.text or "",
                    json.dumps(side.get("metadata", {}), ensure_ascii=False),
                ]).lower()
                if q_lower not in haystack:
                    continue
            
            items.append(resp)
        
        # Pagination
        total = len(items)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        pages = max(1, (total + page_size - 1) // page_size)
        
        return DocumentListResponse(
            documents=items[start:end],
            total=total,
            page=page,
            page_size=page_size,
            has_next=page < pages,
            has_prev=page > 1,
        )
    
    def get_document(self, db: Session, user_id: str, document_id: str) -> DocumentResponse:
        """Get a single document by ID."""
        try:
            doc = (
                db.query(models.Resume)
                .filter(
                    models.Resume.id == uuid.UUID(document_id),
                    models.Resume.user_id == uuid.UUID(user_id)
                )
                .first()
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return self.resolve_document_response(doc)
    
    def delete_document(self, db: Session, user_id: str, document_id: str) -> None:
        """Delete a document and its files."""
        doc = (
            db.query(models.Resume)
            .filter(
                models.Resume.id == uuid.UUID(document_id),
                models.Resume.user_id == uuid.UUID(user_id)
            )
            .first()
        )
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete files
        try:
            Path(doc.file_path).unlink(missing_ok=True)
            Path(doc.file_path).with_suffix(Path(doc.file_path).suffix + ".meta.json").unlink(missing_ok=True)
        except Exception as e:
            logger.warning("Failed to delete document files", extra={
                "document_id": document_id,
                "error": str(e)
            })
        
        # Delete database record
        db.delete(doc)
        db.commit()
        
        logger.info("Document deleted", extra={
            "document_id": document_id,
            "user_id": user_id
        })
    
    def update_status(
        self, 
        db: Session, 
        user_id: str, 
        document_id: str, 
        status: DocumentStatus
    ) -> DocumentResponse:
        """Update document status."""
        doc = (
            db.query(models.Resume)
            .filter(
                models.Resume.id == uuid.UUID(document_id),
                models.Resume.user_id == uuid.UUID(user_id)
            )
            .first()
        )
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        p = Path(doc.file_path)
        side = self.utils.sidecar(p)
        side["status"] = status.value
        self.utils.write_sidecar(p, side)
        
        logger.info("Document status updated", extra={
            "document_id": document_id,
            "user_id": user_id,
            "new_status": status.value
        })
        
        return self.resolve_document_response(doc)
