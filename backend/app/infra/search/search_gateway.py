from __future__ import annotations
from typing import List, Dict
from sqlalchemy.orm import Session

# reuse your existing module
from ...infra.search.fulltext import search_service
from ...domain.jobs.repository import ISearchGateway

class SearchGateway(ISearchGateway):
    def __init__(self, db: Session):
        self.db = db

    def search_jobs(self, *, query_text: str, limit: int, offset: int, filters: Dict) -> List[dict]:
        return search_service.search_jobs(db=self.db, query_text=query_text, limit=limit, offset=offset, filters=filters)

    def count(self, query_text: str, filters: Dict) -> int:
        return search_service.count_search_results(self.db, query_text, filters)

    def suggest(self, q: str, user_id: str) -> List[str]:
        return search_service.suggest_search_terms(self.db, q, user_id=user_id)
