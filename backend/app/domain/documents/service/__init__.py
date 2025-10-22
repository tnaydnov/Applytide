"""Refactored DocumentService - barrel export for backward compatibility."""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import os

from ....infra.files.document_store import DocumentStore
from ....infra.extractors.text_extractor import TextExtractor
from ....infra.logging import get_logger
from ....db import models
from ....api.schemas.documents import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentAnalysis, ATSScore, CoverLetterRequest, DocumentOptimizationRequest,
    DocumentResponse, DocumentListResponse
)

from .utils import DocumentUtils
from .cache import AnalysisCache
from .crud import DocumentCRUD
from .preview import DocumentPreview
from .analysis import DocumentAnalysisModule
from .generation import DocumentGeneration

logger = get_logger(__name__)

# Optional OpenAI for resume analysis
try:
    from openai import OpenAI
    # ADMIN CLEANUP: Removed llm_tracker import
    _OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
except Exception:
    OpenAI = None
    _OPENAI_API_KEY = ""


class DocumentService:
    """
    Unified DocumentService maintaining full backward compatibility.
    Delegates to specialized modules: utils, cache, crud, preview, analysis, generation.
    """
    
    def __init__(self, store: DocumentStore, extractor: TextExtractor, db_session=None):
        self.store = store
        self.extractor = extractor
        self.db_session = db_session
        
        # Initialize LLM for AI analysis (ADMIN CLEANUP: removed tracking wrapper)
        self._llm = None
        if OpenAI and _OPENAI_API_KEY:
            try:
                self._llm = OpenAI(api_key=_OPENAI_API_KEY)
                logger.info("OpenAI LLM initialized for document service")
            except Exception as e:
                logger.warning("OpenAI LLM initialization failed", extra={"error": str(e)})
        
        # Initialize AI cover letter service (optional)
        ai_cover_letter_service = None
        try:
            from ....infra.external.ai_cover_letter_provider import AICoverLetterService
            ai_cover_letter_service = AICoverLetterService(db_session=db_session)
            logger.info("AI cover letter service initialized")
        except Exception as e:
            logger.warning("AI cover letter service unavailable", extra={"error": str(e)})
        
        # Initialize specialized modules
        self.utils = DocumentUtils(store=store, llm=self._llm)
        self.cache = AnalysisCache(utils=self.utils)
        self.crud = DocumentCRUD(store=store, extractor=extractor, utils=self.utils)
        self.preview = DocumentPreview(utils=self.utils)
        self.analysis_module = DocumentAnalysisModule(utils=self.utils, cache=self.cache)
        self.generation = DocumentGeneration(ai_cover_letter_service=ai_cover_letter_service)
    
    # ============================================================================
    # CRUD OPERATIONS - Delegate to crud module
    # ============================================================================
    
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
        """Upload a new document."""
        return self.crud.upload_document(
            db, user_id, file_content, filename, document_type, display_name, metadata
        )
    
    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        """Convert Resume model to DocumentResponse."""
        return self.crud.resolve_document_response(row)
    
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
        return self.crud.list_documents(
            db, user_id, page, page_size, filter_type, filter_status, query
        )
    
    def get_document(self, db: Session, user_id: str, document_id: str) -> DocumentResponse:
        """Get single document by ID."""
        return self.crud.get_document(db, user_id, document_id)
    
    def delete_document(self, db: Session, user_id: str, document_id: str) -> None:
        """Delete document and associated files."""
        return self.crud.delete_document(db, user_id, document_id)
    
    def update_status(
        self, db: Session, user_id: str, document_id: str, status: DocumentStatus
    ) -> DocumentResponse:
        """Update document status."""
        return self.crud.update_status(db, user_id, document_id, status)
    
    # ============================================================================
    # PREVIEW & DOWNLOAD - Delegate to preview module
    # ============================================================================
    
    def resolve_download(
        self, db: Session, user_id: str, document_id: str
    ) -> Tuple[Path, str, str]:
        """Prepare document for download."""
        return self.preview.resolve_download(db, user_id, document_id)
    
    def get_preview_payload(
        self, db: Session, user_id: str, document_id: str
    ) -> Dict[str, Any]:
        """Get document preview payload."""
        return self.preview.get_preview_payload(db, user_id, document_id)
    
    # ============================================================================
    # ANALYSIS - Delegate to analysis module
    # ============================================================================
    
    def analyze_document_ats(
        self,
        db: Session,
        document_id: str,
        job_id: Optional[str],
        user_id: Optional[str],
        use_ai: bool = False,
    ) -> DocumentAnalysis:
        """Perform ATS analysis on document."""
        return self.analysis_module.analyze_document_ats(
            db, document_id, job_id, user_id, use_ai
        )
    
    # ============================================================================
    # GENERATION - Delegate to generation module
    # ============================================================================
    
    def optimize_document(self, db: Session, request: DocumentOptimizationRequest) -> str:
        """Optimize document with target keywords."""
        return self.generation.optimize_document(db, request)
    
    async def generate_cover_letter(
        self, db: Session, user_id: str, request: CoverLetterRequest
    ) -> dict:
        """Generate cover letter (AI or template)."""
        return await self.generation.generate_cover_letter(db, user_id, request)
    
    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available document templates."""
        return self.generation.get_document_templates(category)
    
    # ============================================================================
    # INTERNAL HELPERS - Expose for backward compatibility
    # ============================================================================
    
    def _sidecar(self, file_path: Path) -> Dict[str, Any]:
        """Read sidecar metadata file."""
        return self.utils.sidecar(file_path)
    
    def _write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Write sidecar metadata file."""
        return self.utils.write_sidecar(file_path, data)


# Export for backward compatibility
__all__ = ["DocumentService"]
