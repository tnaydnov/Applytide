"""Full-text search service using PostgreSQL's capabilities"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

class FullTextSearchService:
    @staticmethod
    def search_jobs(
        db: Session,
        query_text: str,
        limit: int = 20,
        offset: int = 0,
        filters: Dict[str, Any] | None = None,
    ) -> List[Dict[str, Any]]:
        if not query_text.strip():
            return []
        base_query = """
            SELECT
                j.id, j.title, j.description, j.location, j.remote_type, j.source_url, j.created_at,
                c.name AS company_name, c.website AS company_website,
                ts_rank(
                    to_tsvector('english', j.title || ' ' || COALESCE(j.description, '')),
                    plainto_tsquery('english', :query)
                ) AS relevance_score
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, ''))
                  @@ plainto_tsquery('english', :query)
        """
        params: Dict[str, Any] = {"query": query_text.strip()}
        if filters:
            if filters.get("user_id"):
                base_query += " AND j.user_id = :user_id"
                params["user_id"] = filters["user_id"]
            if filters.get("location"):
                base_query += " AND j.location ILIKE :location"
                params["location"] = f"%{filters['location']}%"
            if filters.get("remote_type"):
                base_query += " AND j.remote_type = :remote_type"
                params["remote_type"] = filters["remote_type"]
            if filters.get("company"):
                base_query += " AND c.name ILIKE :company"
                params["company"] = f"%{filters['company']}%"
        base_query += " ORDER BY relevance_score DESC, j.created_at DESC LIMIT :limit OFFSET :offset"
        params.update({"limit": limit, "offset": offset})
        result = db.execute(text(base_query), params)
        return [
            {
                "id": str(row.id),
                "title": row.title,
                "description": row.description,
                "location": row.location,
                "remote_type": row.remote_type,
                "source_url": row.source_url,
                "created_at": row.created_at.isoformat(),
                "company_name": row.company_name,
                "company_website": row.company_website,
                "relevance_score": float(row.relevance_score or 0),
            }
            for row in result
        ]

    @staticmethod
    def count_search_results(db: Session, query_text: str, filters: Dict[str, Any] | None = None) -> int:
        if not query_text.strip():
            return 0
        base_query = """
            SELECT COUNT(*)
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, ''))
                  @@ plainto_tsquery('english', :query)
        """
        params: Dict[str, Any] = {"query": query_text.strip()}
        if filters:
            if filters.get("user_id"):
                base_query += " AND j.user_id = :user_id"
                params["user_id"] = filters["user_id"]
            if filters.get("location"):
                base_query += " AND j.location ILIKE :location"
                params["location"] = f"%{filters['location']}%"
            if filters.get("remote_type"):
                base_query += " AND j.remote_type = :remote_type"
                params["remote_type"] = filters["remote_type"]
            if filters.get("company"):
                base_query += " AND c.name ILIKE :company"
                params["company"] = f"%{filters['company']}%"
        result = db.execute(text(base_query), params)
        return int(result.scalar() or 0)

    @staticmethod
    def suggest_search_terms(db: Session, partial_query: str, limit: int = 5, user_id: Optional[str] = None) -> List[str]:
        if len(partial_query or "") < 2:
            return []
        query = """
            SELECT DISTINCT word, COUNT(*) AS frequency
            FROM (
                SELECT unnest(string_to_array(lower(j.title), ' ')) AS word
                FROM jobs j
                WHERE j.title ILIKE :partial
                {user_clause}
            ) words
            WHERE length(word) >= 3
              AND word NOT IN ('and','the','for','with','from','this','that','you','are','not')
            GROUP BY word
            ORDER BY frequency DESC, word
            LIMIT :limit
        """.format(user_clause="AND j.user_id = :user_id" if user_id else "")
        params: Dict[str, Any] = {"partial": f"%{partial_query}%", "limit": limit}
        if user_id:
            params["user_id"] = user_id
        result = db.execute(text(query), params)
        return [row.word for row in result]

search_service = FullTextSearchService()
