from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class SearchScope(str, Enum):
    """Search scope options"""
    ALL = "all"
    JOBS = "jobs"
    APPLICATIONS = "applications"
    COMPANIES = "companies"
    INTERVIEWS = "interviews"

class SortOption(str, Enum):
    """Sort options for search results"""
    RELEVANCE = "relevance"
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    SALARY_DESC = "salary_desc"
    SALARY_ASC = "salary_asc"
    TITLE_ASC = "title_asc"
    COMPANY_ASC = "company_asc"

class DateRange(BaseModel):
    """Date range filter"""
    start: Optional[datetime] = None
    end: Optional[datetime] = None

class SalaryRange(BaseModel):
    """Salary range filter"""
    min: Optional[int] = None
    max: Optional[int] = None

class SearchFilters(BaseModel):
    """Advanced search filters"""
    location: Optional[str] = None
    remote_type: Optional[str] = None
    company: Optional[str] = None
    salary_range: Optional[SalaryRange] = None
    date_range: Optional[DateRange] = None
    job_titles: Optional[List[str]] = None
    experience_levels: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    application_status: Optional[List[str]] = None
    interview_status: Optional[List[str]] = None
    has_cover_letter: Optional[bool] = None
    has_salary_info: Optional[bool] = None
    tags: Optional[List[str]] = None

class SearchRequest(BaseModel):
    """Advanced search request"""
    query: str = Field(..., min_length=1, description="Search query")
    scope: SearchScope = SearchScope.ALL
    filters: Optional[SearchFilters] = None
    sort: SortOption = SortOption.RELEVANCE
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

class SearchResult(BaseModel):
    """Individual search result"""
    id: str
    type: str  # job, application, company, interview
    title: str
    description: Optional[str]
    score: float
    metadata: Dict[str, Any]
    highlight: Optional[Dict[str, List[str]]] = None

class SearchResponse(BaseModel):
    """Search response with results and metadata"""
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    pages: int
    has_next: bool
    has_prev: bool
    aggregations: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    query_time_ms: int

class SavedSearch(BaseModel):
    """Saved search configuration"""
    name: str
    query: str
    scope: SearchScope
    filters: Optional[SearchFilters]
    sort: SortOption
    alert_enabled: bool = False
    alert_frequency: str = "daily"  # daily, weekly, immediate

class SearchSuggestion(BaseModel):
    """Search suggestion"""
    text: str
    type: str  # query, filter, completion
    score: float
    metadata: Optional[Dict[str, Any]] = None
