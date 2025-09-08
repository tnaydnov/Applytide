from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class DocumentType(str, Enum):
    """Document type options"""
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    PORTFOLIO = "portfolio"
    CERTIFICATE = "certificate"
    TRANSCRIPT = "transcript"
    REFERENCE = "reference"
    OTHER = "other"

class DocumentStatus(str, Enum):
    """Document status options"""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    TEMPLATE = "template"

class DocumentFormat(str, Enum):
    """Supported document formats"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    HTML = "html"

class ATSScore(BaseModel):
    """Enhanced ATS compatibility score"""
    overall_score: float = Field(..., ge=0, le=100)
    formatting_score: float = Field(..., ge=0, le=100)
    keyword_score: float = Field(..., ge=0, le=100)
    readability_score: float = Field(..., ge=0, le=100)
    technical_skills_score: Optional[float] = Field(None, ge=0, le=100)
    soft_skills_score: Optional[float] = Field(None, ge=0, le=100)
    suggestions: List[str] = Field(default_factory=list)


class DocumentTemplate(BaseModel):
    """Document template model"""
    id: str
    name: str
    description: str
    type: DocumentType
    category: str
    preview_url: Optional[str] = None
    template_data: Dict[str, Any] = Field(default_factory=dict)
    is_premium: bool = False

class DocumentAnalysis(BaseModel):
    """Enhanced document analysis results"""
    word_count: int
    keyword_density: Dict[str, float] = Field(default_factory=dict)
    readability_score: float
    ats_score: ATSScore
    suggested_improvements: List[str] = Field(default_factory=list)
    missing_sections: List[str] = Field(default_factory=list)
    # Enhanced fields for detailed analysis
    job_match_summary: Optional[Dict[str, Any]] = None
    keyword_analysis: Optional[Dict[str, Any]] = None
    missing_skills: Optional[Dict[str, Any]] = None

    ai_detailed_analysis: Optional[Dict[str, Any]] = None
    section_quality: Optional[Dict[str, Any]] = None
    action_verb_count: Optional[int] = None

class CoverLetterRequest(BaseModel):
    """Cover letter generation request"""
    job_id: str
    resume_id: Optional[str] = None
    tone: str = Field(default="professional", pattern="^(professional|enthusiastic|confident|creative)$")
    length: str = Field(default="medium", pattern="^(short|medium|long)$")
    focus_areas: List[str] = Field(default_factory=list)
    custom_intro: Optional[str] = None

class DocumentOptimizationRequest(BaseModel):
    """Document optimization request"""
    document_id: str
    job_id: Optional[str] = None
    target_keywords: List[str] = Field(default_factory=list)
    optimization_goals: List[str] = Field(default_factory=list)

class DocumentResponse(BaseModel):
    """Standard document response"""
    id: str
    type: DocumentType
    name: str
    status: DocumentStatus
    format: DocumentFormat
    file_size: int
    created_at: datetime
    updated_at: datetime
    ats_score: Optional[float] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool

class TemplateListResponse(BaseModel):
    """Template list response"""
    templates: List[DocumentTemplate]
    categories: List[str]
    total: int
