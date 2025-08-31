"""Full-text search service using PostgreSQL's built-in capabilities"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from ..db.models import Job


class FullTextSearchService:
    """Service for performing full-text search operations"""
    
    @staticmethod
    def search_jobs(
        db: Session, 
        query_text: str, 
        limit: int = 20, 
        offset: int = 0,
        filters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform full-text search on jobs using PostgreSQL's tsvector.
        
        Args:
            db: Database session
            query_text: Search query text
            limit: Maximum number of results
            offset: Offset for pagination
            filters: Additional filters (location, remote_type, etc.)
        
        Returns:
            List of job dictionaries with relevance scores
        """
        if not query_text.strip():
            return []
        
        # Clean and prepare search query
        search_query = query_text.strip().replace("'", "''")  # Escape single quotes
        
        # Build the base query with ranking
        base_query = """
            SELECT 
                j.id,
                j.title,
                j.description,
                j.location,
                j.remote_type,
                j.salary_min,
                j.salary_max,
                j.source_url,
                j.created_at,
                c.name as company_name,
                c.website as company_website,
                ts_rank(
                    to_tsvector('english', j.title || ' ' || COALESCE(j.description, '')), 
                    plainto_tsquery('english', :query)
                ) as relevance_score
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, '')) 
                  @@ plainto_tsquery('english', :query)
        """
        
        # Add filters
        params = {"query": search_query}
        
        if filters:
            if filters.get("location"):
                base_query += " AND j.location ILIKE :location"
                params["location"] = f"%{filters['location']}%"
            
            if filters.get("remote_type"):
                base_query += " AND j.remote_type = :remote_type"
                params["remote_type"] = filters["remote_type"]
            
            if filters.get("salary_min"):
                base_query += " AND (j.salary_min >= :salary_min OR j.salary_min IS NULL)"
                params["salary_min"] = filters["salary_min"]
            
            if filters.get("company"):
                base_query += " AND c.name ILIKE :company"
                params["company"] = f"%{filters['company']}%"
        
        # Add ordering and pagination
        base_query += """
            ORDER BY relevance_score DESC, j.created_at DESC
            LIMIT :limit OFFSET :offset
        """
        
        params.update({"limit": limit, "offset": offset})
        
        # Execute query
        result = db.execute(text(base_query), params)
        
        return [
            {
                "id": str(row.id),
                "title": row.title,
                "description": row.description,
                "location": row.location,
                "remote_type": row.remote_type,
                "salary_min": row.salary_min,
                "salary_max": row.salary_max,
                "source_url": row.source_url,
                "created_at": row.created_at.isoformat(),
                "company_name": row.company_name,
                "company_website": row.company_website,
                "relevance_score": float(row.relevance_score or 0)
            }
            for row in result
        ]
    
    @staticmethod
    def count_search_results(
        db: Session, 
        query_text: str, 
        filters: Dict[str, Any] = None
    ) -> int:
        """
        Count total number of search results.
        
        Args:
            db: Database session
            query_text: Search query text
            filters: Additional filters
        
        Returns:
            Total count of matching jobs
        """
        if not query_text.strip():
            return 0
        
        search_query = query_text.strip().replace("'", "''")
        
        base_query = """
            SELECT COUNT(*)
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.description, '')) 
                  @@ plainto_tsquery('english', :query)
        """
        
        params = {"query": search_query}
        
        if filters:
            if filters.get("location"):
                base_query += " AND j.location ILIKE :location"
                params["location"] = f"%{filters['location']}%"
            
            if filters.get("remote_type"):
                base_query += " AND j.remote_type = :remote_type"
                params["remote_type"] = filters["remote_type"]
            
            if filters.get("salary_min"):
                base_query += " AND (j.salary_min >= :salary_min OR j.salary_min IS NULL)"
                params["salary_min"] = filters["salary_min"]
            
            if filters.get("company"):
                base_query += " AND c.name ILIKE :company"
                params["company"] = f"%{filters['company']}%"
        
        result = db.execute(text(base_query), params)
        return result.scalar() or 0
    
    @staticmethod
    def suggest_search_terms(db: Session, partial_query: str, limit: int = 5) -> List[str]:
        """
        Suggest search terms based on partial input.
        
        Args:
            db: Database session
            partial_query: Partial search query
            limit: Maximum number of suggestions
        
        Returns:
            List of suggested search terms
        """
        if len(partial_query) < 2:
            return []
        
        # Get common terms from job titles
        query = """
            SELECT DISTINCT 
                word,
                COUNT(*) as frequency
            FROM (
                SELECT unnest(string_to_array(lower(title), ' ')) as word
                FROM jobs
                WHERE title ILIKE :partial
            ) words
            WHERE length(word) >= 3
            AND word NOT IN ('and', 'the', 'for', 'with', 'from', 'this', 'that', 'you', 'are', 'not')
            GROUP BY word
            ORDER BY frequency DESC, word
            LIMIT :limit
        """
        
        result = db.execute(text(query), {
            "partial": f"%{partial_query}%",
            "limit": limit
        })
        
        return [row.word for row in result]


# Global instance
search_service = FullTextSearchService()
