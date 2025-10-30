"""
Caching Utilities for Document Analysis Results

Provides efficient caching of document analysis results using sidecar files.
Implements cache key generation, validation, and expiration handling to reduce
redundant AI analysis operations.

Cache Strategy:
- Cache key combines: document_id, job_id, resume_text hash, job_context hash
- Stored in document sidecar files (.meta.json)
- Includes timestamp and data validation
- Graceful degradation on cache failures

All operations include comprehensive error handling, validation, and logging.
"""
from __future__ import annotations

from typing import Dict, Any, Optional
from pathlib import Path
import hashlib
from datetime import datetime, timedelta

from ....infra.logging import get_logger

logger = get_logger(__name__)


class CacheError(Exception):
    """Base exception for cache operations."""
    pass


class CacheValidationError(CacheError):
    """Raised when cache validation fails."""
    pass


class CacheStorageError(CacheError):
    """Raised when cache storage operations fail."""
    pass


# Cache configuration
MAX_CACHE_AGE_DAYS = 30  # Invalidate cache older than 30 days
MIN_TEXT_LENGTH = 10  # Minimum text length for valid cache key


class AnalysisCache:
    """
    Handles caching of document analysis results in sidecar files.
    
    Provides efficient caching to avoid redundant AI analysis operations.
    Cache keys are generated from document content and job context hashes.
    """
    
    def __init__(self, utils):
        """
        Initialize cache handler with document utilities.
        
        Args:
            utils: DocumentUtils instance for sidecar access
        
        Raises:
            CacheValidationError: If utils is None
        """
        if not utils:
            logger.error("AnalysisCache initialized with None utils")
            raise CacheValidationError("DocumentUtils instance is required")
        
        self.utils = utils
        logger.debug("AnalysisCache initialized successfully")
    
    def compute_cache_key(self, document_id: str, job_id: Optional[str], 
                         resume_text: str, job_context: str = "") -> str:
        """
        Generate cache key from document and job context.
        
        Creates a unique cache key by combining document_id, job_id, and
        content hashes. This ensures cache invalidation when content changes.
        
        Args:
            document_id: Document UUID string
            job_id: Optional job UUID string (None for general analysis)
            resume_text: Resume text content for hashing
            job_context: Optional job context text for hashing
        
        Returns:
            Cache key string in format: {doc_id}_{job_key}_{resume_hash}_{job_hash}
        
        Raises:
            CacheValidationError: If required inputs are invalid
        
        Example:
            key = cache.compute_cache_key(
                document_id="123e4567-e89b-12d3-a456-426614174000",
                job_id="987fcdeb-51a2-43f1-b2e3-123456789abc",
                resume_text="My resume content...",
                job_context="Job description..."
            )
        """
        try:
            # Validate inputs
            if not document_id:
                raise CacheValidationError("document_id is required")
            
            if not isinstance(document_id, str):
                raise CacheValidationError(f"document_id must be string, got {type(document_id)}")
            
            if not resume_text:
                logger.warning(
                    "Empty resume text for cache key",
                    extra={"document_id": document_id}
                )
                raise CacheValidationError("resume_text cannot be empty")
            
            if len(resume_text) < MIN_TEXT_LENGTH:
                logger.warning(
                    f"Resume text too short for reliable caching: {len(resume_text)} chars",
                    extra={"document_id": document_id, "text_length": len(resume_text)}
                )
            
            # Generate hashes
            try:
                resume_hash = hashlib.sha256(resume_text.encode('utf-8')).hexdigest()[:16]
            except Exception as e:
                logger.error(f"Failed to hash resume text: {e}", exc_info=True)
                raise CacheValidationError(f"Failed to hash resume text: {e}")
            
            try:
                job_hash = hashlib.sha256(job_context.encode('utf-8')).hexdigest()[:16] if job_context else "none"
            except Exception as e:
                logger.error(f"Failed to hash job context: {e}", exc_info=True)
                raise CacheValidationError(f"Failed to hash job context: {e}")
            
            job_key = job_id or "general"
            cache_key = f"{document_id}_{job_key}_{resume_hash}_{job_hash}"
            
            logger.debug(
                f"Cache key computed",
                extra={
                    "document_id": document_id,
                    "job_key": job_key,
                    "cache_key_preview": cache_key[:50]
                }
            )
            
            return cache_key
            
        except CacheValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error computing cache key: {e}",
                extra={"document_id": document_id},
                exc_info=True
            )
            raise CacheError(f"Failed to compute cache key: {e}")
    
    def read_analysis_cache(self, file_path: Path, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Read cached analysis from sidecar file if valid.
        
        Retrieves cached analysis data, validates cache key match, checks data
        structure, and verifies cache age. Returns None on any validation failure.
        
        Args:
            file_path: Path to document file (sidecar will be derived)
            cache_key: Expected cache key for validation
        
        Returns:
            Cached analysis data dict if valid, None otherwise
        
        Raises:
            CacheValidationError: If inputs are invalid
        
        Example:
            cached = cache.read_analysis_cache(
                file_path=Path("/path/to/resume.pdf"),
                cache_key="doc123_job456_abc123_def456"
            )
            if cached:
                ats_score = cached["ats_score"]
        """
        try:
            # Validate inputs
            if not file_path:
                raise CacheValidationError("file_path is required")
            
            if not isinstance(file_path, Path):
                raise CacheValidationError(f"file_path must be Path, got {type(file_path)}")
            
            if not cache_key:
                raise CacheValidationError("cache_key is required")
            
            logger.debug(
                f"Reading cache",
                extra={
                    "file": file_path.name,
                    "cache_key_preview": cache_key[:50]
                }
            )
            
            # Read sidecar
            try:
                side = self.utils.sidecar(file_path)
            except Exception as e:
                logger.debug(
                    f"Could not read sidecar for cache: {e}",
                    extra={"file": file_path.name}
                )
                return None
            
            cache = side.get("analysis_cache", {})
            
            if not cache:
                logger.debug("Cache miss: No cache found", extra={"file": file_path.name})
                return None
            
            # Validate cache key
            stored_key = cache.get("cache_key")
            if stored_key != cache_key:
                logger.debug("Cache miss: Key mismatch", extra={
                    "file": file_path.name,
                    "expected_key": cache_key[:50],
                    "found_key": stored_key[:50] if stored_key else None
                })
                return None
            
            # Check cache age
            cached_at_str = cache.get("cached_at")
            if cached_at_str:
                try:
                    cached_at = datetime.fromisoformat(cached_at_str)
                    age = datetime.now() - cached_at
                    
                    if age > timedelta(days=MAX_CACHE_AGE_DAYS):
                        logger.debug(
                            f"Cache miss: Too old ({age.days} days)",
                            extra={"file": file_path.name, "age_days": age.days}
                        )
                        return None
                    
                    logger.debug(
                        f"Cache age: {age.days} days",
                        extra={"file": file_path.name, "age_days": age.days}
                    )
                except Exception as e:
                    logger.debug(f"Invalid cached_at timestamp: {e}")
            
            # Validate cached data
            cached_data = cache.get("data")
            if not cached_data:
                logger.debug("Cache miss: No data", extra={"file": file_path.name})
                return None
            
            if not isinstance(cached_data, dict):
                logger.debug(
                    "Cache miss: Invalid data type",
                    extra={"file": file_path.name, "type": type(cached_data).__name__}
                )
                return None
            
            if "ats_score" not in cached_data:
                logger.debug("Cache miss: Missing ats_score", extra={"file": file_path.name})
                return None
            
            logger.info(
                "Cache hit",
                extra={
                    "file": file_path.name,
                    "cached_at": cached_at_str,
                    "has_score": "ats_score" in cached_data
                }
            )
            return cached_data
            
        except CacheValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Cache read failed: {e}",
                extra={"file": file_path.name if file_path else None},
                exc_info=True
            )
            return None
    
    def write_analysis_cache(self, file_path: Path, cache_key: str, 
                            analysis_data: Dict[str, Any]) -> None:
        """
        Write analysis data to sidecar cache.
        
        Stores analysis results in document sidecar file with timestamp
        and cache key for future retrieval and validation.
        
        Args:
            file_path: Path to document file (sidecar will be derived)
            cache_key: Cache key for validation
            analysis_data: Analysis results to cache
        
        Raises:
            CacheValidationError: If inputs are invalid
            CacheStorageError: If write operation fails
        
        Example:
            cache.write_analysis_cache(
                file_path=Path("/path/to/resume.pdf"),
                cache_key="doc123_job456_abc123_def456",
                analysis_data={
                    "ats_score": 85,
                    "strengths": [...],
                    "improvements": [...]
                }
            )
        """
        try:
            # Validate inputs
            if not file_path:
                raise CacheValidationError("file_path is required")
            
            if not isinstance(file_path, Path):
                raise CacheValidationError(f"file_path must be Path, got {type(file_path)}")
            
            if not cache_key:
                raise CacheValidationError("cache_key is required")
            
            if not analysis_data:
                raise CacheValidationError("analysis_data is required")
            
            if not isinstance(analysis_data, dict):
                raise CacheValidationError(
                    f"analysis_data must be dict, got {type(analysis_data)}"
                )
            
            if "ats_score" not in analysis_data:
                logger.warning(
                    "Caching analysis without ats_score",
                    extra={"file": file_path.name, "keys": list(analysis_data.keys())}
                )
            
            logger.debug(
                f"Writing cache",
                extra={
                    "file": file_path.name,
                    "cache_key_preview": cache_key[:50],
                    "data_keys": list(analysis_data.keys())
                }
            )
            
            # Read existing sidecar
            try:
                side = self.utils.sidecar(file_path)
            except Exception as e:
                logger.debug(f"Could not read existing sidecar, creating new: {e}")
                side = {}
            
            # Update cache section
            side["analysis_cache"] = {
                "cache_key": cache_key,
                "data": analysis_data,
                "cached_at": datetime.now().isoformat()
            }
            
            # Write sidecar
            try:
                self.utils.write_sidecar(file_path, side)
                logger.info(
                    "Cache write successful",
                    extra={
                        "file": file_path.name,
                        "cache_key_preview": cache_key[:50],
                        "has_score": "ats_score" in analysis_data
                    }
                )
            except Exception as e:
                logger.error(
                    f"Failed to write sidecar: {e}",
                    extra={"file": file_path.name},
                    exc_info=True
                )
                raise CacheStorageError(f"Failed to write cache to sidecar: {e}")
            
        except (CacheValidationError, CacheStorageError):
            raise
        except Exception as e:
            logger.error(
                f"Cache write failed: {e}",
                extra={"file": file_path.name if file_path else None},
                exc_info=True
            )
            raise CacheStorageError(f"Failed to write cache: {e}")
