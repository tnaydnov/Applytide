from sqlalchemy import and_, or_, func, text, desc, asc
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
import time
import re
from datetime import datetime, timedelta

from ..db import models
from .models import SearchFilters, SearchResult, SearchScope, SortOption, SearchSuggestion


class AdvancedSearchService:
    """Advanced search service with full-text search, filtering, and relevance scoring"""
    
    def __init__(self):
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
            'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if'
        }
    
    def search(
        self,
        db: Session,
        query: str,
        scope: SearchScope = SearchScope.ALL,
        filters: Optional[SearchFilters] = None,
        sort: SortOption = SortOption.RELEVANCE,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[SearchResult], int, Dict[str, Any]]:
        """
        Perform advanced search across multiple entity types
        """
        start_time = time.time()
        
        # Clean and prepare query
        clean_query = self._clean_query(query)
        search_terms = self._extract_search_terms(clean_query)
        
        results = []
        total = 0
        aggregations = {}
        
        # Search based on scope
        if scope == SearchScope.ALL or scope == SearchScope.JOBS:
            job_results, job_total = self._search_jobs(db, search_terms, filters, sort, page, page_size)
            results.extend(job_results)
            total += job_total
            
        if scope == SearchScope.ALL or scope == SearchScope.APPLICATIONS:
            app_results, app_total = self._search_applications(db, search_terms, filters, sort, page, page_size)
            results.extend(app_results)
            total += app_total
            
        if scope == SearchScope.ALL or scope == SearchScope.COMPANIES:
            company_results, company_total = self._search_companies(db, search_terms, filters, sort, page, page_size)
            results.extend(company_results)
            total += company_total
            
        if scope == SearchScope.ALL or scope == SearchScope.INTERVIEWS:
            interview_results, interview_total = self._search_interviews(db, search_terms, filters, sort, page, page_size)
            results.extend(interview_results)
            total += interview_total
        
        # Sort results by relevance if mixed scope
        if scope == SearchScope.ALL and sort == SortOption.RELEVANCE:
            results.sort(key=lambda x: x.score, reverse=True)
        
        # Apply pagination for mixed results
        if scope == SearchScope.ALL:
            offset = (page - 1) * page_size
            results = results[offset:offset + page_size]
        
        # Generate aggregations
        aggregations = self._generate_aggregations(db, search_terms, filters)
        
        query_time = int((time.time() - start_time) * 1000)
        
        return results, total, {
            "aggregations": aggregations,
            "query_time_ms": query_time
        }
    
    def _clean_query(self, query: str) -> str:
        """Clean and normalize search query"""
        # Remove special characters but keep basic ones
        query = re.sub(r'[^\w\s\-\+\.]', ' ', query)
        # Normalize whitespace
        query = re.sub(r'\s+', ' ', query.strip())
        return query.lower()
    
    def _extract_search_terms(self, query: str) -> List[str]:
        """Extract meaningful search terms from query"""
        terms = [term.strip() for term in query.split() if term.strip()]
        # Remove stop words but keep important terms
        filtered_terms = []
        for term in terms:
            # Keep terms that are longer than 1 char or are important technical terms
            if len(term) > 1 and term not in self.stop_words:
                filtered_terms.append(term)
            # Always keep technical terms even if short
            elif term.lower() in ['ai', 'ui', 'ux', 'qa', 'js', 'py', 'go', 'c++', 'c#']:
                filtered_terms.append(term)
        
        # If all terms were filtered out, return original terms (except stop words)
        if not filtered_terms:
            filtered_terms = [term for term in terms if term not in self.stop_words]
        
        return filtered_terms
    
    def _search_jobs(
        self,
        db: Session,
        search_terms: List[str],
        filters: Optional[SearchFilters],
        sort: SortOption,
        page: int,
        page_size: int
    ) -> Tuple[List[SearchResult], int]:
        """Search jobs with advanced filtering and scoring"""
        
        # Base query - get both Job and Company data
        query = db.query(models.Job, models.Company).join(
            models.Company, models.Job.company_id == models.Company.id, isouter=True
        )
        
        # Apply text search with scoring
        if search_terms:
            search_conditions = []
            for term in search_terms:
                term_pattern = f"%{term}%"
                search_conditions.append(
                    or_(
                        models.Job.title.ilike(term_pattern),
                        models.Job.description.ilike(term_pattern),
                        models.Company.name.ilike(term_pattern),
                        models.Job.location.ilike(term_pattern)
                    )
                )
            
            if search_conditions:
                query = query.filter(and_(*search_conditions))
        
        # Apply filters
        if filters:
            query = self._apply_job_filters(query, filters)
        
        # Count total results
        total = query.count()
        
        # Apply sorting
        query = self._apply_job_sorting(query, sort, search_terms)
        
        # Apply pagination
        offset = (page - 1) * page_size
        job_company_pairs = query.offset(offset).limit(page_size).all()
        
        # Convert to search results with scoring
        results = []
        for job, company in job_company_pairs:
            score = self._calculate_job_score(job, company, search_terms)
            
            result = SearchResult(
                id=str(job.id),
                type="job",
                title=job.title,
                description=job.description[:200] + "..." if job.description and len(job.description) > 200 else job.description,
                score=score,
                metadata={
                    "company_name": company.name if company else None,
                    "location": job.location,
                    "remote_type": job.remote_type,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "created_at": job.created_at.isoformat() if job.created_at else None
                }
            )
            results.append(result)
        
        return results, total

    def _calculate_job_score(self, job, company, search_terms: List[str]) -> float:
        """Calculate relevance score for a job"""
        score = 0.0
        
        if not search_terms:
            return 1.0
        
        # Title matches (highest weight)
        for term in search_terms:
            if term in job.title.lower():
                score += 5.0
        
        # Company matches
        if company:
            for term in search_terms:
                if term in company.name.lower():
                    score += 2.0
        
        # Description matches
        if job.description:
            for term in search_terms:
                if term in job.description.lower():
                    score += 1.0
        
        # Location matches
        if job.location:
            for term in search_terms:
                if term in job.location.lower():
                    score += 1.5
        
        return max(score, 0.1)  # Minimum score
    
    # Placeholder methods for other search types
    def _search_applications(self, db, search_terms, filters, sort, page, page_size):
        return [], 0
    
    def _search_companies(self, db, search_terms, filters, sort, page, page_size):
        return [], 0
    
    def _search_interviews(self, db, search_terms, filters, sort, page, page_size):
        return [], 0
    
    def _apply_job_filters(self, query, filters):
        return query
    
    def _apply_job_sorting(self, query, sort, search_terms):
        if sort == SortOption.DATE_DESC:
            return query.order_by(desc(models.Job.created_at))
        elif sort == SortOption.DATE_ASC:
            return query.order_by(asc(models.Job.created_at))
        elif sort == SortOption.TITLE_ASC:
            return query.order_by(asc(models.Job.title))
        else:  # RELEVANCE
            return query.order_by(desc(models.Job.created_at))
    
    def _generate_aggregations(self, db, search_terms, filters):
        return {}
    
    def get_search_suggestions(self, db: Session, query: str, limit: int = 10) -> List[SearchSuggestion]:
        """Get search suggestions for autocomplete"""
        return []
