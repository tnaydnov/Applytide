"""Caching utilities for document analysis results."""
from __future__ import annotations

from typing import Dict, Any, Optional
from pathlib import Path
import hashlib
from datetime import datetime

from ....infra.logging import get_logger

logger = get_logger(__name__)


class AnalysisCache:
    """Handles caching of document analysis results in sidecar files."""
    
    def __init__(self, utils):
        """Initialize with DocumentUtils instance for sidecar access."""
        self.utils = utils
    
    def compute_cache_key(self, document_id: str, job_id: Optional[str], 
                         resume_text: str, job_context: str = "") -> str:
        """
        Generate cache key: (document_id, job_id or "general", sha256(resume_text), sha256(job_context))
        """
        resume_hash = hashlib.sha256(resume_text.encode('utf-8')).hexdigest()[:16]
        job_hash = hashlib.sha256(job_context.encode('utf-8')).hexdigest()[:16] if job_context else "none"
        job_key = job_id or "general"
        return f"{document_id}_{job_key}_{resume_hash}_{job_hash}"
    
    def read_analysis_cache(self, file_path: Path, cache_key: str) -> Optional[Dict[str, Any]]:
        """Read cached analysis from sidecar if exists and matches key."""
        try:
            side = self.utils.sidecar(file_path)
            cache = side.get("analysis_cache", {})
            
            if not cache:
                logger.debug("Cache miss: No cache found", extra={"file": file_path.name})
                return None
                
            stored_key = cache.get("cache_key")
            if stored_key != cache_key:
                logger.debug("Cache miss: Key mismatch", extra={
                    "file": file_path.name,
                    "expected_key": cache_key[:50],
                    "found_key": stored_key[:50] if stored_key else None
                })
                return None
            
            cached_data = cache.get("data")
            if not cached_data:
                logger.debug("Cache miss: No data", extra={"file": file_path.name})
                return None
                
            # Validate it has minimum required structure
            if not isinstance(cached_data, dict):
                logger.debug("Cache miss: Invalid data type", extra={"file": file_path.name})
                return None
                
            if "ats_score" not in cached_data:
                logger.debug("Cache miss: Missing ats_score", extra={"file": file_path.name})
                return None
            
            cached_at = cache.get("cached_at")
            logger.debug("Cache hit", extra={
                "file": file_path.name,
                "cached_at": cached_at
            })
            return cached_data
            
        except Exception as e:
            logger.error("Cache read failed", extra={
                "file": file_path.name,
                "error": str(e)
            }, exc_info=True)
            return None
    
    def write_analysis_cache(self, file_path: Path, cache_key: str, 
                            analysis_data: Dict[str, Any]) -> None:
        """Write analysis to sidecar cache."""
        try:
            side = self.utils.sidecar(file_path)
            side["analysis_cache"] = {
                "cache_key": cache_key,
                "data": analysis_data,
                "cached_at": datetime.now().isoformat()
            }
            self.utils.write_sidecar(file_path, side)
            logger.debug("Cache write successful", extra={
                "file": file_path.name,
                "cache_key": cache_key[:50]
            })
        except Exception as e:
            logger.error("Cache write failed", extra={
                "file": file_path.name,
                "error": str(e)
            }, exc_info=True)
