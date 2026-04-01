"""
Job service domain logic.

This module provides the core business logic for job management, coordinating
between repositories, search gateway, and domain helpers.

Features:
- Job creation with automatic company resolution
- Manual job creation with validation
- Job retrieval, listing, and search
- Job updates with company resolution
- Cascade deletion
- Search term suggestions

Exception Handling:
- JobNotFound: Raised when job doesn't exist or doesn't belong to user
- ValueError: Raised when job data validation fails
"""
from __future__ import annotations
from typing import Optional, Dict, List, Tuple
from uuid import UUID
from .dto import JobDTO, JobSearchDTO
from .repository import ICompanyRepository, IJobRepository, ISearchGateway
from .errors import JobNotFound
from .helpers import build_final_description
from ...infra.logging import get_logger

logger = get_logger(__name__)

# Configuration constants
MIN_DESCRIPTION_LENGTH = 10  # Minimum description length for warnings
MAX_PAGE_SIZE = 1000  # Maximum allowed page size
MIN_QUERY_LENGTH = 2  # Minimum search query length


class JobService:
    """
    Core job management service coordinating repositories and search.
    
    Attributes:
        jobs: Job repository for persistence
        companies: Company repository for company management
        search: Search gateway for full-text search
    """
    
    def __init__(self, jobs: IJobRepository, companies: ICompanyRepository, search: ISearchGateway):
        """
        Initialize job service with dependencies.
        
        Args:
            jobs: Job repository instance
            companies: Company repository instance
            search: Search gateway instance
        """
        if not jobs:
            raise ValueError("jobs repository is required")
        if not companies:
            raise ValueError("companies repository is required")
        if not search:
            raise ValueError("search gateway is required")
        
        self.jobs = jobs
        self.companies = companies
        self.search = search
        
        logger.debug("JobService initialized")

    def create_job(self, *, user_id: UUID, payload: Dict) -> JobDTO:
        """
        Create a job posting from extraction data.
        
        Automatically resolves or creates company if company_name is provided.
        
        Args:
            user_id: User ID creating the job
            payload: Job data dictionary with optional company_name
            
        Returns:
            Created JobDTO
            
        Raises:
            ValueError: If user_id or required payload fields are invalid
        """
        if not user_id:
            logger.error("create_job called with no user_id")
            raise ValueError("user_id is required")
        
        if not isinstance(payload, dict):
            logger.error("create_job called with non-dict payload", extra={
                "payload_type": type(payload).__name__
            })
            raise ValueError("payload must be a dictionary")
        
        logger.debug("Creating job", extra={
            "user_id": str(user_id),
            "has_company_id": bool(payload.get("company_id")),
            "has_company_name": bool(payload.get("company_name"))
        })
        
        company_id: Optional[UUID] = payload.get("company_id")
        if not company_id and payload.get("company_name"):
            try:
                company_id = self.companies.ensure_company(
                    name=payload["company_name"],
                    website=payload.get("website"),
                    location=payload.get("location"),
                )
                logger.debug("Company resolved/created", extra={
                    "company_id": str(company_id)
                })
            except Exception as e:
                logger.error("Failed to ensure company", extra={
                    "error": str(e),
                    "company_name": payload.get("company_name")
                }, exc_info=True)
                raise
        
        try:
            job = self.jobs.create(user_id=user_id, company_id=company_id, payload=payload)
            logger.info("Job created successfully", extra={
                "job_id": str(job.id),
                "user_id": str(user_id),
                "title": job.title
            })
            return job
        except Exception as e:
            logger.error("Failed to create job", extra={
                "error": str(e),
                "user_id": str(user_id)
            }, exc_info=True)
            raise

    def create_manual_job(self, *, user_id: UUID, payload: Dict) -> JobDTO:
        """
        Create a job from manually pasted text with validation.
        
        Validates job content and logs warnings for potential issues.
        
        Args:
            user_id: User ID creating the job
            payload: Job data dictionary with title, company_name, description
            
        Returns:
            Created JobDTO
            
        Raises:
            ValueError: If job lacks both title and company name, or validation fails
        """
        if not user_id:
            logger.error("create_manual_job called with no user_id")
            raise ValueError("user_id is required")
        
        if not isinstance(payload, dict):
            logger.error("create_manual_job called with non-dict payload", extra={
                "payload_type": type(payload).__name__
            })
            raise ValueError("payload must be a dictionary")
        
        logger.debug("Creating manual job", extra={"user_id": str(user_id)})
        
        # Validate that job has meaningful content
        title = (payload.get("title") or "").strip()
        company_name = (payload.get("company_name") or "").strip()
        description = (payload.get("description") or "").strip()
        
        if not title and not company_name:
            logger.error("Job creation failed - no title or company", extra={
                "user_id": str(user_id),
                "payload_keys": list(payload.keys())
            })
            raise ValueError("Job must have at least a title or company name")
        
        # Log warnings for potential content issues
        if not title:
            logger.warning("Job created without title", extra={
                "company": company_name,
                "user_id": str(user_id)
            })
        if not company_name:
            logger.warning("Job created without company", extra={
                "title": title[:50],
                "user_id": str(user_id)
            })
        if len(description) < MIN_DESCRIPTION_LENGTH:
            logger.warning("Job created with very short description", extra={
                "length": len(description),
                "user_id": str(user_id)
            })
        
        logger.info("Creating manual job", extra={
            "title": title[:50] if title else None,
            "company": company_name,
            "desc_len": len(description),
            "user_id": str(user_id)
        })
        
        try:
            company_id = self.companies.ensure_company(
                name=company_name,
                website=None,
                location=payload.get("location"),
            )
            logger.debug("Company ensured", extra={"company_id": str(company_id)})
        except Exception as e:
            logger.error("Failed to ensure company for manual job", extra={
                "error": str(e),
                "company_name": company_name
            }, exc_info=True)
            raise
        
        final_desc = build_final_description(payload.get("description"))
        data = {**payload, "description": final_desc}
        
        try:
            job = self.jobs.create(user_id=user_id, company_id=company_id, payload=data)
            logger.info("Manual job created successfully", extra={
                "job_id": str(job.id),
                "user_id": str(user_id)
            })
            return job
        except Exception as e:
            logger.error("Failed to create manual job", extra={
                "error": str(e),
                "user_id": str(user_id)
            }, exc_info=True)
            raise

    def get_job(self, *, user_id: UUID, job_id: UUID) -> JobDTO:
        """
        Get a single job by ID for a user.
        
        Args:
            user_id: User ID requesting the job
            job_id: Job ID to retrieve
            
        Returns:
            JobDTO with company information
            
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            ValueError: If user_id or job_id are invalid
        """
        if not user_id:
            logger.error("get_job called with no user_id")
            raise ValueError("user_id is required")
        
        if not job_id:
            logger.error("get_job called with no job_id")
            raise ValueError("job_id is required")
        
        logger.debug("Getting job", extra={
            "user_id": str(user_id),
            "job_id": str(job_id)
        })
        
        try:
            job = self.jobs.get_for_user_with_company(job_id, user_id)
            logger.debug("Job retrieved successfully", extra={
                "job_id": str(job_id),
                "title": job.title
            })
            return job
        except LookupError as e:
            logger.warning("Job not found or access denied", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            })
            raise JobNotFound from e
        except Exception as e:
            logger.error("Failed to get job", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            }, exc_info=True)
            raise

    def list_jobs(
        self,
        *,
        user_id: UUID,
        page: int,
        page_size: int,
        filters: Dict,
        sort: str,
        order: str,
        q: str = "",
    ) -> Tuple[List[JobDTO], int]:
        """
        List jobs for a user with optional search and filtering.
        
        Routes between search (if query provided) and regular listing.
        
        Args:
            user_id: User ID to list jobs for
            page: Page number (1-indexed)
            page_size: Number of items per page
            filters: Filter dictionary (location, remote_type, company)
            sort: Sort field
            order: Sort order (asc/desc)
            q: Optional search query
            
        Returns:
            Tuple of (job_list, total_count)
            
        Raises:
            ValueError: If parameters are invalid
        """
        if not user_id:
            logger.error("list_jobs called with no user_id")
            raise ValueError("user_id is required")
        
        if page < 1:
            logger.warning("Invalid page number, defaulting to 1", extra={"page": page})
            page = 1
        
        if page_size < 1:
            logger.warning("Invalid page_size, defaulting to 10", extra={"page_size": page_size})
            page_size = 10
        
        if page_size > MAX_PAGE_SIZE:
            logger.warning("page_size exceeds maximum, capping", extra={
                "requested": page_size,
                "max": MAX_PAGE_SIZE
            })
            page_size = MAX_PAGE_SIZE
        
        logger.debug("Listing jobs", extra={
            "user_id": str(user_id),
            "page": page,
            "page_size": page_size,
            "has_query": bool(q and q.strip()),
            "filters": filters
        })
        
        # Route to search if query provided
        if q and q.strip():
            logger.debug("Using search path for listing")
            
            if len(q.strip()) < MIN_QUERY_LENGTH:
                logger.warning("Search query too short", extra={
                    "query": q,
                    "min_length": MIN_QUERY_LENGTH
                })
            
            offset = (page - 1) * page_size
            search_filters = {"user_id": str(user_id)}
            
            # Apply filters
            if filters.get("location"):
                search_filters["location"] = filters["location"]
            if filters.get("remote_type"):
                search_filters["remote_type"] = filters["remote_type"]
            if filters.get("company"):
                search_filters["company"] = filters["company"]

            try:
                docs = self.search.search_jobs(
                    query_text=q, limit=page_size, offset=offset, filters=search_filters
                )
                total = self.search.count(q, search_filters)
                
                logger.debug("Search completed", extra={
                    "results": len(docs),
                    "total": total
                })
            except Exception as e:
                logger.error("Search failed", extra={
                    "error": str(e),
                    "query": q
                }, exc_info=True)
                raise

            items: List[JobDTO] = []
            for d in docs:
                try:
                    created = d.get("created_at")
                    # search returns ISO string; keep as-is (Pydantic will coerce downstream)
                    items.append(
                        JobDTO(
                            id=UUID(d["id"]),
                            title=d.get("title", ""),
                            company_id=None,
                            company_name=d.get("company_name"),
                            website=d.get("company_website"),
                            location=d.get("location"),
                            remote_type=d.get("remote_type"),
                            job_type=d.get("job_type", ""),
                            description=d.get("description"),
                            requirements=d.get("requirements", []) or [],
                            skills=d.get("skills", []) or [],
                            source_url=d.get("source_url"),
                            created_at=created,  # may be str; acceptable for our DTO usage
                        )
                    )
                except Exception as e:
                    logger.warning("Failed to parse search result, skipping", extra={
                        "error": str(e),
                        "doc_id": d.get("id")
                    })
                    continue
            
            logger.info("Search listing completed", extra={
                "user_id": str(user_id),
                "query": q,
                "results": len(items),
                "total": total
            })
            return items, total

        # Regular listing (no search)
        logger.debug("Using regular listing path")
        
        try:
            items, total = self.jobs.list_for_user(
                user_id=user_id,
                page=page,
                page_size=page_size,
                filters=filters,
                sort=sort,
                order=order,
            )
            
            logger.info("Regular listing completed", extra={
                "user_id": str(user_id),
                "results": len(items),
                "total": total
            })
            return items, total
        except Exception as e:
            logger.error("Failed to list jobs", extra={
                "user_id": str(user_id),
                "error": str(e)
            }, exc_info=True)
            raise

    def search_jobs(
        self,
        *,
        user_id: UUID,
        q: str,
        page: int,
        page_size: int,
        filters: Dict,
    ) -> Tuple[List[JobSearchDTO], int]:
        """
        Search jobs with full-text search.
        
        Args:
            user_id: User ID to search jobs for
            q: Search query string
            page: Page number (1-indexed)
            page_size: Number of items per page
            filters: Filter dictionary (location, remote_type, company)
            
        Returns:
            Tuple of (search_results, total_count)
            
        Raises:
            ValueError: If parameters are invalid
        """
        if not user_id:
            logger.error("search_jobs called with no user_id")
            raise ValueError("user_id is required")
        
        if not q or not q.strip():
            logger.warning("search_jobs called with empty query")
            return [], 0
        
        if len(q.strip()) < MIN_QUERY_LENGTH:
            logger.warning("Search query too short", extra={
                "query": q,
                "min_length": MIN_QUERY_LENGTH
            })
        
        if page < 1:
            logger.warning("Invalid page number, defaulting to 1", extra={"page": page})
            page = 1
        
        if page_size < 1:
            logger.warning("Invalid page_size, defaulting to 10", extra={"page_size": page_size})
            page_size = 10
        
        if page_size > MAX_PAGE_SIZE:
            logger.warning("page_size exceeds maximum, capping", extra={
                "requested": page_size,
                "max": MAX_PAGE_SIZE
            })
            page_size = MAX_PAGE_SIZE
        
        logger.debug("Searching jobs", extra={
            "user_id": str(user_id),
            "query": q,
            "page": page,
            "page_size": page_size,
            "filters": filters
        })
        
        offset = (page - 1) * page_size
        search_filters = {"user_id": str(user_id)}
        
        # Apply filters
        if filters.get("location"):
            search_filters["location"] = filters["location"]
        if filters.get("remote_type"):
            search_filters["remote_type"] = filters["remote_type"]
        if filters.get("company"):
            search_filters["company"] = filters["company"]

        try:
            docs = self.search.search_jobs(
                query_text=q, limit=page_size, offset=offset, filters=search_filters
            )
            total = self.search.count(q, search_filters)
            
            logger.debug("Search completed", extra={
                "results": len(docs),
                "total": total
            })
        except Exception as e:
            logger.error("Search failed", extra={
                "error": str(e),
                "query": q
            }, exc_info=True)
            raise

        items: List[JobSearchDTO] = []
        for d in docs:
            try:
                items.append(
                    JobSearchDTO(
                        id=d["id"],
                        title=d.get("title", ""),
                        description=d.get("description"),
                        location=d.get("location"),
                        remote_type=d.get("remote_type"),
                        source_url=d.get("source_url"),
                        created_at=d.get("created_at", ""),
                        company_name=d.get("company_name"),
                        company_website=d.get("company_website"),
                        relevance_score=float(d.get("relevance_score") or 0.0),
                    )
                )
            except Exception as e:
                logger.warning("Failed to parse search result, skipping", extra={
                    "error": str(e),
                    "doc_id": d.get("id")
                })
                continue
        
        logger.info("Job search completed", extra={
            "user_id": str(user_id),
            "query": q,
            "results": len(items),
            "total": total
        })
        return items, total

    def update_job(self, *, user_id: UUID, job_id: UUID, payload: Dict) -> JobDTO:
        """
        Update a job with new data.
        
        Automatically resolves company if company_name is provided.
        Cleans requirements and skills arrays.
        
        Args:
            user_id: User ID updating the job
            job_id: Job ID to update
            payload: Update data dictionary
            
        Returns:
            Updated JobDTO
            
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            ValueError: If parameters are invalid
        """
        if not user_id:
            logger.error("update_job called with no user_id")
            raise ValueError("user_id is required")
        
        if not job_id:
            logger.error("update_job called with no job_id")
            raise ValueError("job_id is required")
        
        if not isinstance(payload, dict):
            logger.error("update_job called with non-dict payload", extra={
                "payload_type": type(payload).__name__
            })
            raise ValueError("payload must be a dictionary")
        
        logger.debug("Updating job", extra={
            "user_id": str(user_id),
            "job_id": str(job_id),
            "payload_keys": list(payload.keys())
        })
        
        # Resolve company if company_name provided
        company_id = None
        try:
            if "company_name" in payload and payload["company_name"]:
                company_id = self.companies.ensure_company(
                    name=payload["company_name"],
                    website=None,
                    location=payload.get("location"),
                )
                logger.debug("Company resolved for update", extra={
                    "company_id": str(company_id) if company_id else None
                })
        except KeyError:
            logger.debug("No company_name in payload, skipping company resolution")
            pass
        except Exception as e:
            logger.error("Failed to resolve company", extra={
                "error": str(e),
                "company_name": payload.get("company_name")
            }, exc_info=True)
            raise

        # Build description
        final_desc = build_final_description(payload.get("description"))

        # Build update data
        data = {
            "company_id": company_id,
            "title": payload.get("title"),
            "location": payload.get("location"),
            "remote_type": payload.get("remote_type"),
            "source_url": payload.get("source_url"),
            "job_type": payload.get("job_type"),
            "description": final_desc,
        }
        
        # Clean requirements array
        if "requirements" in payload:
            reqs = payload.get("requirements") or []
            data["requirements"] = [r.strip() for r in reqs if r and str(r).strip()]
            logger.debug("Cleaned requirements", extra={
                "original_count": len(reqs),
                "cleaned_count": len(data["requirements"])
            })
        
        # Clean skills array
        if "skills" in payload:
            skills = payload.get("skills") or []
            data["skills"] = [s.strip() for s in skills if s and str(s).strip()]
            logger.debug("Cleaned skills", extra={
                "original_count": len(skills),
                "cleaned_count": len(data["skills"])
            })

        # Pass through is_archived flag
        if "is_archived" in payload:
            data["is_archived"] = bool(payload["is_archived"])

        # Remove None values to avoid overwriting existing data with null
        data = {k: v for k, v in data.items() if v is not None or k == "is_archived"}

        try:
            job = self.jobs.update_for_user(job_id, user_id, data)
            logger.info("Job updated successfully", extra={
                "job_id": str(job_id),
                "user_id": str(user_id)
            })
            return job
        except LookupError as e:
            logger.warning("Job not found or access denied for update", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            })
            raise JobNotFound from e
        except Exception as e:
            logger.error("Failed to update job", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            }, exc_info=True)
            raise

    def delete_job(self, *, user_id: UUID, job_id: UUID) -> None:
        """
        Delete a job with cascade to related entities.
        
        Args:
            user_id: User ID deleting the job
            job_id: Job ID to delete
            
        Raises:
            JobNotFound: If job doesn't exist or doesn't belong to user
            ValueError: If parameters are invalid
        """
        if not user_id:
            logger.error("delete_job called with no user_id")
            raise ValueError("user_id is required")
        
        if not job_id:
            logger.error("delete_job called with no job_id")
            raise ValueError("job_id is required")
        
        logger.debug("Deleting job", extra={
            "user_id": str(user_id),
            "job_id": str(job_id)
        })
        
        try:
            self.jobs.delete_for_user_cascade(job_id, user_id)
            logger.info("Job deleted successfully", extra={
                "job_id": str(job_id),
                "user_id": str(user_id)
            })
        except LookupError as e:
            logger.warning("Job not found or access denied for deletion", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            })
            raise JobNotFound from e
        except Exception as e:
            logger.error("Failed to delete job", extra={
                "user_id": str(user_id),
                "job_id": str(job_id),
                "error": str(e)
            }, exc_info=True)
            raise

    def suggest_terms(self, *, user_id: UUID, q: str) -> List[str]:
        """
        Get search term suggestions for autocomplete.
        
        Args:
            user_id: User ID to get suggestions for
            q: Partial query string
            
        Returns:
            List of suggested search terms
            
        Raises:
            ValueError: If parameters are invalid
        """
        if not user_id:
            logger.error("suggest_terms called with no user_id")
            raise ValueError("user_id is required")
        
        if not q:
            logger.debug("suggest_terms called with empty query")
            return []
        
        logger.debug("Getting term suggestions", extra={
            "user_id": str(user_id),
            "query": q
        })
        
        try:
            suggestions = self.search.suggest(q=q, user_id=str(user_id))
            logger.debug("Suggestions retrieved", extra={
                "count": len(suggestions),
                "query": q
            })
            return suggestions
        except Exception as e:
            logger.error("Failed to get suggestions", extra={
                "user_id": str(user_id),
                "query": q,
                "error": str(e)
            }, exc_info=True)
            raise
