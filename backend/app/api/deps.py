from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from typing import AsyncGenerator
from pathlib import Path
from ..db.session import get_db
from typing import AsyncGenerator
from ..domain.jobs.extraction.service import JobExtractionService
from ..infra.parsing.html_main_content import ReadabilityMainContent
from ..infra.parsing.structured_job import ExtructStructuredData
from ..infra.parsing.dom_title_company import GenericTitleCompany
try:
    from ..infra.external.openai_llm import OpenAILLMExtractor
except Exception:
    OpenAILLMExtractor = None  # optional
from ..infra.repositories.jobs_sqlalchemy import JobSQLARepository, CompanySQLARepository
from ..infra.search.search_gateway import SearchGateway
from ..domain.jobs.service import JobService
from ..infra.repositories.applications_sqlalchemy import (
    ApplicationSQLARepository, StageSQLARepository, NoteSQLARepository, AttachmentSQLARepository
)
from ..infra.files.attachment_store import AttachmentStore
from ..domain.applications.service import ApplicationService
from ..domain.documents.service import DocumentService
from ..domain.documents.ports import CoverLetterProvider, TextExtractor, DocumentStore as DocumentStorePort
from ..infra.external.ai_cover_letter_provider import AICoverLetterService
from ..infra.extractors.pdf_extractor import PDFExtractor
from ..infra.files.document_store import DocumentStore as FSDocumentStore
from ..domain.reminders.service import ReminderService
from ..infra.repositories.reminders_sqlalchemy import ReminderSQLARepository, ReminderNoteSQLARepository
from ..infra.external.google_calendar_gateway import GoogleCalendarGateway
from ..domain.analytics.service import AnalyticsService
from ..infra.repositories.analytics_sqlalchemy import AnalyticsSQLARepository
from ..config import settings as _settings
from ..domain.auth.oauth_service import OAuthService
from ..infra.repositories.oauth_sqlalchemy import OAuthTokenSQLARepo
from ..infra.http.requests_client import RequestsHTTPClient

def get_job_service(db: Session = Depends(get_db)) -> JobService:
    jobs = JobSQLARepository(db)
    companies = CompanySQLARepository(db)
    search = SearchGateway(db)
    return JobService(jobs=jobs, companies=companies, search=search)

async def get_document_service() -> AsyncGenerator[DocumentService, None]:
    provider: CoverLetterProvider | None = None
    try:
        provider = AICoverLetterService()  # may raise if no API key (that's fine)
    except Exception:
        provider = None

    extractor: TextExtractor = PDFExtractor()   # or a CompositeTextExtractor
    store: DocumentStorePort = FSDocumentStore(root=Path("/app/uploads/documents"))

    svc = DocumentService(store=store, extractor=extractor, cover_letter_provider=provider)
    try:
        yield svc
    finally:
        if provider and hasattr(provider, "aclose"):
            try:
                await provider.aclose()  # close httpx client
            except Exception:
                pass

def get_application_service(
    db: Session = Depends(get_db),
    doc_service: DocumentService = Depends(get_document_service),
) -> ApplicationService:
    apps = ApplicationSQLARepository(db)
    stages = StageSQLARepository(db)
    notes = NoteSQLARepository(db)
    atts = AttachmentSQLARepository(db)
    store = AttachmentStore()
    return ApplicationService(
        apps=apps, stages=stages, notes=notes, attachments=atts,
        attach_store=store, doc_service=doc_service, db_session=db
    )


def get_job_extraction_service() -> JobExtractionService:
    main = ReadabilityMainContent()
    struct = ExtructStructuredData()
    title_company = GenericTitleCompany()
    llm = None
    if OpenAILLMExtractor:
        try:
            llm = OpenAILLMExtractor()  # may raise if no key
        except Exception:
            llm = None
    return JobExtractionService(
        main_content=main,
        structured=struct,
        title_company=title_company,
        llm=llm,  # optional
    )

def get_reminder_service(db: Session = Depends(get_db)) -> ReminderService:
    reminders = ReminderSQLARepository(db)
    notes = ReminderNoteSQLARepository(db)
    # wrap gateway so it always receives db when called (currying)
    gateway = GoogleCalendarGateway()
    # tiny shim to inject db into gateway calls
    class _GatewayWithDB:
        async def is_connected(self, *, user_id): return await gateway.is_connected(user_id=user_id, db=db)
        async def create_event(self, **kw): kw["db"] = db; return await gateway.create_event(**kw)
        async def update_event(self, **kw): kw["db"] = db; return await gateway.update_event(**kw)
        async def delete_event(self, **kw): kw["db"] = db; return await gateway.delete_event(**kw)
        async def get_event(self, **kw): kw["db"] = db; return await gateway.get_event(**kw)
        async def list_events(self, **kw): kw["db"] = db; return await gateway.list_events(**kw)
    return ReminderService(reminders=reminders, notes=notes, calendar=_GatewayWithDB())


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    repo = AnalyticsSQLARepository(db)
    return AnalyticsService(repo=repo)

def get_oauth_service(db: Session = Depends(get_db)) -> OAuthService:
    repo = OAuthTokenSQLARepo(db)
    http = RequestsHTTPClient()
    return OAuthService(token_repo=repo, http=http, settings=_settings, db=db)