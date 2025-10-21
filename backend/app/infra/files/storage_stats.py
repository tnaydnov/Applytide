"""
Storage usage tracking utility
"""
import shutil
from pathlib import Path
from typing import Dict, Any
from ..logging import get_logger

logger = get_logger(__name__)


def get_disk_usage(path: str = "/app/uploads") -> Dict[str, Any]:
    """
    Get disk usage statistics for a given path
    
    Args:
        path: Directory path to check (default: /app/uploads)
    
    Returns:
        Dict with total, used, free space in GB and usage percentage
    """
    try:
        # Ensure path exists
        path_obj = Path(path)
        if not path_obj.exists():
            logger.warning(f"Path does not exist: {path}, using current directory")
            path_obj = Path.cwd()
        
        # Get disk usage
        usage = shutil.disk_usage(path_obj)
        
        # Convert to GB
        total_gb = usage.total / (1024 ** 3)
        used_gb = usage.used / (1024 ** 3)
        free_gb = usage.free / (1024 ** 3)
        
        # Calculate percentage
        usage_percent = (usage.used / usage.total * 100) if usage.total > 0 else 0.0
        
        return {
            "path": str(path_obj),
            "total_gb": round(total_gb, 2),
            "used_gb": round(used_gb, 2),
            "free_gb": round(free_gb, 2),
            "usage_percent": round(usage_percent, 2),
            "status": "healthy" if usage_percent < 90 else "warning"
        }
    
    except Exception as e:
        logger.error("Failed to get disk usage", extra={"error": str(e), "path": path})
        return {
            "path": path,
            "total_gb": 0.0,
            "used_gb": 0.0,
            "free_gb": 0.0,
            "usage_percent": 0.0,
            "status": "error",
            "error": str(e)
        }


def get_directory_size(path: str) -> float:
    """
    Calculate total size of a directory and all its contents
    
    Args:
        path: Directory path to measure
    
    Returns:
        Size in MB
    """
    try:
        path_obj = Path(path)
        if not path_obj.exists():
            return 0.0
        
        total_size = 0
        for item in path_obj.rglob("*"):
            if item.is_file():
                total_size += item.stat().st_size
        
        # Convert to MB
        size_mb = total_size / (1024 ** 2)
        return round(size_mb, 2)
    
    except Exception as e:
        logger.error("Failed to calculate directory size", extra={"error": str(e), "path": path})
        return 0.0


def get_storage_breakdown() -> Dict[str, Any]:
    """
    Get storage breakdown for key application directories
    
    Returns:
        Dict with sizes for documents, uploads, logs, etc.
    """
    try:
        # Common paths
        paths = {
            "documents": "/app/uploads/documents",
            "attachments": "/app/uploads/attachments",
            "logs": "/app/logs",
            "total_uploads": "/app/uploads"
        }
        
        breakdown = {}
        for name, path in paths.items():
            breakdown[f"{name}_mb"] = get_directory_size(path)
        
        # Get overall disk usage
        disk = get_disk_usage("/app/uploads")
        breakdown["disk_total_gb"] = disk["total_gb"]
        breakdown["disk_used_gb"] = disk["used_gb"]
        breakdown["disk_free_gb"] = disk["free_gb"]
        breakdown["disk_usage_percent"] = disk["usage_percent"]
        
        return breakdown
    
    except Exception as e:
        logger.error("Failed to get storage breakdown", extra={"error": str(e)})
        return {
            "documents_mb": 0.0,
            "attachments_mb": 0.0,
            "logs_mb": 0.0,
            "total_uploads_mb": 0.0,
            "disk_total_gb": 0.0,
            "disk_used_gb": 0.0,
            "disk_free_gb": 0.0,
            "disk_usage_percent": 0.0,
            "error": str(e)
        }
