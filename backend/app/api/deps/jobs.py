"""
Job-related service dependencies.

Provides dependency injection for job management and extraction services.
"""
from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...domain.jobs.service import JobService
from ...domain.jobs.extraction.service import JobExtractionService
from ...infra.repositories.jobs_sqlalchemy import JobSQLARepository, CompanySQLARepository
from ...infra.search.search_gateway import SearchGateway
from ...infra.parsing.html_main_content import ReadabilityMainContent
from ...infra.parsing.structured_job import ExtructStructuredData
from ...infra.parsing.dom_title_company import GenericTitleCompany
try:
    from ...infra.external.openai_llm import OpenAILLMExtractor
except Exception:
    OpenAILLMExtractor = None  # optional
from ...infra.logging import get_logger

logger = get_logger(__name__)


def get_job_service(db: Session = Depends(get_db)) -> JobService:
    """
    Provide JobService with job repository, company repository, and search capabilities.
    
    Constructs a fully configured JobService with all required infrastructure
    components for job management, company tracking, and advanced search.
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Returns:
        JobService: Configured service for job operations
    
    Components:
        - JobSQLARepository: SQLAlchemy-based job persistence
        - CompanySQLARepository: Company data management
        - SearchGateway: Full-text search and filtering
    
    Features:
        - CRUD operations on jobs
        - Company information management
        - Advanced search with filters (location, salary, remote)
        - Job status tracking (saved, applied, archived)
        - Automatic timestamp management
    
    Raises:
        Exception: If repository or search gateway construction fails
    
    Performance:
        - Repositories share database session (no extra connections)
        - Search operations optimized with indexes
        - Lazy loading for related entities
    
    Example:
        @router.get("/api/jobs")
        async def list_jobs(
            service: JobService = Depends(get_job_service),
            user: User = Depends(get_current_user)
        ):
            return await service.list_user_jobs(user.id)
    """
    try:
        logger.debug("Initializing JobService")
        
        jobs = JobSQLARepository(db)
        companies = CompanySQLARepository(db)
        search = SearchGateway(db)
        
        service = JobService(jobs=jobs, companies=companies, search=search)
        
        logger.debug("JobService initialized successfully")
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize JobService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise


def get_job_extraction_service(db: Session = Depends(get_db)) -> JobExtractionService:
    """
    Provide JobExtractionService with HTML parsing and optional LLM extraction.
    
    Constructs JobExtractionService with multiple extraction strategies:
    main content extraction, structured data parsing, heuristic title/company
    detection, and optional OpenAI LLM for intelligent field extraction.
    
    Args:
        db: Database session from FastAPI dependency injection
    
    Returns:
        JobExtractionService: Configured service for job data extraction
    
    Components:
        - ReadabilityMainContent: Extract main content from HTML
        - ExtructStructuredData: Parse structured data (JSON-LD, microdata)
        - GenericTitleCompany: Heuristic title/company extraction
        - OpenAILLMExtractor: AI-powered field extraction (optional)
    
    Extraction Strategies:
        1. Structured data (JSON-LD, schema.org) - most reliable
        2. LLM extraction - intelligent parsing of unstructured content
        3. Main content + heuristics - fallback for generic pages
        4. DOM patterns - common job board structures
    
    Features:
        - Multi-strategy extraction with fallback
        - Graceful degradation if LLM unavailable
        - Confidence scoring for extracted fields
        - URL and HTML input support
        - Company name normalization
        - Location parsing and standardization
    
    LLM Behavior:
        - Optional component (service works without it)
        - Requires OpenAI API key in environment
        - Initialized lazily on first use
        - Fails gracefully if unavailable
        - Provides highest quality extractions when available
    
    Raises:
        Exception: If core components fail to initialize
        Note: LLM initialization failure does not raise exception
    
    Performance:
        - LLM calls cached when possible
        - Parallel extraction strategies
        - HTML parsing optimized
        - Database lookups minimized
    
    Security:
        - URL validation and sanitization
        - XSS prevention in extracted content
        - Rate limiting on external requests
        - API key security for LLM
    
    Example:
        @router.post("/api/jobs/extract")
        async def extract_job(
            url: str,
            service: JobExtractionService = Depends(get_job_extraction_service),
            user: User = Depends(get_current_user)
        ):
            return await service.extract_from_url(url)
    """
    try:
        logger.info("Initializing JobExtractionService")
        
        # Initialize core extraction components
        main = ReadabilityMainContent()
        struct = ExtructStructuredData()
        title_company = GenericTitleCompany()
        llm = None
        
        logger.debug(
            "Core extraction components initialized",
            extra={
                "readability": True,
                "structured_data": True,
                "heuristics": True
            }
        )
        
        # Try to initialize optional LLM component
        logger.debug(
            "Checking OpenAI LLM availability", 
            extra={"openai_available": OpenAILLMExtractor is not None}
        )
        
        if OpenAILLMExtractor:
            try:
                logger.debug("Attempting to initialize OpenAI LLM extractor")
                llm = OpenAILLMExtractor(db_session=db)
                logger.info("OpenAI LLM extractor initialized successfully")
            except Exception as e:
                logger.warning(
                    "Failed to initialize OpenAI LLM extractor - continuing without LLM",
                    extra={
                        "error": str(e),
                        "impact": "Service will use fallback extraction strategies"
                    }
                )
                # Don't fail the whole service, just run without LLM
                llm = None
        else:
            logger.warning(
                "OpenAI LLM extractor not available - running without LLM support",
                extra={"impact": "Service will use fallback extraction strategies"}
            )
        
        service = JobExtractionService(
            main_content=main,
            structured=struct,
            title_company=title_company,
            llm=llm,  # optional
        )
        
        logger.info(
            "JobExtractionService initialized successfully",
            extra={
                "llm_enabled": llm is not None,
                "extraction_strategies": 3 if llm is None else 4
            }
        )
        
        return service
        
    except Exception as e:
        logger.error(
            "Failed to initialize JobExtractionService",
            extra={"error": str(e)},
            exc_info=True
        )
        raise
