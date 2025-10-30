"""
Storage Usage Tracking and Monitoring Utility

This module provides comprehensive disk usage monitoring and directory
size tracking for application storage. Useful for monitoring storage
health, implementing quotas, and alerting on low disk space.

Features:
    - Disk usage statistics (total, used, free, percentage)
    - Directory size calculation (recursive)
    - Storage breakdown by category (documents, attachments, logs)
    - Health status indicators
    - Symlink and mount point handling
    - Permission error handling
    - Detailed logging

Use Cases:
    - Health checks (alert when disk >90% full)
    - Admin dashboards (show storage usage)
    - Quota enforcement (limit per-user storage)
    - Cleanup decisions (identify large directories)

Safety:
    - Never modifies files or directories
    - Read-only operations
    - Handles permission errors gracefully
    - Validates paths before accessing

Author: ApplyTide Team
Last Updated: 2025-01-18
"""
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from ..logging import get_logger

logger = get_logger(__name__)

# Configuration constants
DEFAULT_STORAGE_PATH = "/app/uploads"
HEALTHY_THRESHOLD_PERCENT = 90.0  # Warn if usage > 90%
MIN_FREE_SPACE_GB = 1.0  # Critical if < 1GB free


class StorageStatsError(Exception):
    """Raised when storage stats operations fail."""
    pass


def get_disk_usage(path: str = DEFAULT_STORAGE_PATH) -> Dict[str, Any]:
    """
    Get disk usage statistics for a given path.
    
    Returns total, used, and free disk space along with usage percentage
    and health status indicator.
    
    Args:
        path: Directory path to check (default: /app/uploads)
    
    Returns:
        Dict containing:
            - path (str): Checked path (may differ from input if fallback used)
            - total_gb (float): Total disk space in GB
            - used_gb (float): Used disk space in GB
            - free_gb (float): Free disk space in GB
            - usage_percent (float): Usage percentage (0-100)
            - status (str): "healthy", "warning", "critical", or "error"
            - error (str, optional): Error message if status is "error"
    
    Health Status:
        - healthy: usage < 90%
        - warning: usage >= 90% OR free < 1GB
        - critical: free < 100MB
        - error: Unable to get stats
    
    Example:
        >>> stats = get_disk_usage("/app/uploads")
        >>> if stats["status"] == "warning":
        ...     print(f"Low disk space: {stats['free_gb']}GB free")
    
    Notes:
        - Falls back to current directory if path doesn't exist
        - Handles permission errors gracefully
        - Returns error status (not exception) on failure
        - All sizes rounded to 2 decimal places
    """
    # Validate and normalize path
    if not path:
        logger.warning("get_disk_usage called with empty path, using default")
        path = DEFAULT_STORAGE_PATH
    
    if not isinstance(path, str):
        logger.warning(
            "Invalid path type",
            extra={"type": type(path).__name__}
        )
        path = str(path)
    
    try:
        # Ensure path exists
        path_obj = Path(path)
        
        if not path_obj.exists():
            logger.warning(
                f"Path does not exist: {path}, using current directory",
                extra={"original_path": path}
            )
            path_obj = Path.cwd()
            path = str(path_obj)
        
        # Get disk usage
        try:
            usage = shutil.disk_usage(path_obj)
        except PermissionError as e:
            logger.error(
                "Permission denied accessing path",
                extra={"path": path, "error": str(e)}
            )
            return {
                "path": path,
                "total_gb": 0.0,
                "used_gb": 0.0,
                "free_gb": 0.0,
                "usage_percent": 0.0,
                "status": "error",
                "error": f"Permission denied: {e}"
            }
        
        # Convert to GB
        total_gb = usage.total / (1024 ** 3)
        used_gb = usage.used / (1024 ** 3)
        free_gb = usage.free / (1024 ** 3)
        
        # Calculate percentage
        usage_percent = (usage.used / usage.total * 100) if usage.total > 0 else 0.0
        
        # Determine health status
        if free_gb < 0.1:  # < 100MB
            status = "critical"
        elif usage_percent >= HEALTHY_THRESHOLD_PERCENT or free_gb < MIN_FREE_SPACE_GB:
            status = "warning"
        else:
            status = "healthy"
        
        logger.debug(
            "Disk usage retrieved",
            extra={
                "path": path,
                "usage_percent": round(usage_percent, 2),
                "free_gb": round(free_gb, 2),
                "status": status
            }
        )
        
        return {
            "path": path,
            "total_gb": round(total_gb, 2),
            "used_gb": round(used_gb, 2),
            "free_gb": round(free_gb, 2),
            "usage_percent": round(usage_percent, 2),
            "status": status
        }
    
    except Exception as e:
        logger.error(
            "Failed to get disk usage",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "path": path
            },
            exc_info=True
        )
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
    Calculate total size of a directory and all its contents recursively.
    
    Walks entire directory tree and sums file sizes. Handles symlinks,
    permission errors, and missing files gracefully.
    
    Args:
        path: Directory path to measure
    
    Returns:
        float: Total size in MB (rounded to 2 decimals), or 0.0 on error
    
    Notes:
        - Recursive (includes all subdirectories)
        - Follows symlinks (may count same file multiple times)
        - Handles permission errors gracefully (skips inaccessible files)
        - Returns 0.0 if path doesn't exist
        - Never raises exceptions
    
    Example:
        >>> size_mb = get_directory_size("/app/uploads/documents")
        >>> print(f"Documents folder: {size_mb}MB")
    
    Performance:
        - May be slow for directories with many files
        - Consider caching results for large directories
        - I/O intensive operation
    """
    # Validate input
    if not path:
        logger.warning("get_directory_size called with empty path")
        return 0.0
    
    if not isinstance(path, str):
        logger.warning(
            "Invalid path type",
            extra={"type": type(path).__name__}
        )
        path = str(path)
    
    try:
        path_obj = Path(path)
        
        # Check path exists
        if not path_obj.exists():
            logger.debug(
                "Path does not exist",
                extra={"path": path}
            )
            return 0.0
        
        # Check it's a directory
        if not path_obj.is_dir():
            logger.warning(
                "Path is not a directory",
                extra={"path": path}
            )
            # Return file size if it's a file
            try:
                return round(path_obj.stat().st_size / (1024 ** 2), 2)
            except Exception:
                return 0.0
        
        total_size = 0
        file_count = 0
        error_count = 0
        
        # Walk directory tree
        try:
            for item in path_obj.rglob("*"):
                try:
                    if item.is_file():
                        total_size += item.stat().st_size
                        file_count += 1
                
                except PermissionError:
                    error_count += 1
                    logger.debug(
                        "Permission denied for file",
                        extra={"file": str(item)}
                    )
                    continue
                
                except FileNotFoundError:
                    # File disappeared during scan (race condition)
                    error_count += 1
                    continue
                
                except Exception as e:
                    error_count += 1
                    logger.debug(
                        "Error accessing file",
                        extra={
                            "file": str(item),
                            "error": str(e)
                        }
                    )
                    continue
        
        except PermissionError as e:
            logger.warning(
                "Permission denied accessing directory",
                extra={"path": path, "error": str(e)}
            )
            return 0.0
        
        # Convert to MB
        size_mb = total_size / (1024 ** 2)
        
        logger.debug(
            "Directory size calculated",
            extra={
                "path": path,
                "size_mb": round(size_mb, 2),
                "file_count": file_count,
                "errors": error_count
            }
        )
        
        return round(size_mb, 2)
    
    except Exception as e:
        logger.error(
            "Failed to calculate directory size",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "path": path
            },
            exc_info=True
        )
        return 0.0


def get_storage_breakdown() -> Dict[str, Any]:
    """
    Get comprehensive storage breakdown for key application directories.
    
    Calculates sizes for each storage category (documents, attachments, logs)
    and includes overall disk usage statistics.
    
    Returns:
        Dict containing:
            - documents_mb (float): Size of documents directory in MB
            - attachments_mb (float): Size of attachments directory in MB
            - logs_mb (float): Size of logs directory in MB
            - total_uploads_mb (float): Total size of uploads directory in MB
            - disk_total_gb (float): Total disk space in GB
            - disk_used_gb (float): Used disk space in GB
            - disk_free_gb (float): Free disk space in GB
            - disk_usage_percent (float): Disk usage percentage
            - error (str, optional): Error message if operation failed
    
    Example:
        >>> breakdown = get_storage_breakdown()
        >>> print(f"Documents: {breakdown['documents_mb']}MB")
        >>> print(f"Disk: {breakdown['disk_usage_percent']}% used")
    
    Notes:
        - Returns 0.0 for inaccessible directories
        - Never raises exceptions
        - All sizes rounded to 2 decimal places
        - May be slow (calculates multiple directory sizes)
    
    Use Cases:
        - Admin dashboard (show storage by category)
        - Health monitoring (alert on high usage)
        - Cleanup decisions (identify largest categories)
    """
    try:
        # Define paths to check
        paths = {
            "documents": "/app/uploads/documents",
            "attachments": "/app/uploads/attachments",
            "logs": "/app/logs",
            "total_uploads": "/app/uploads"
        }
        
        logger.debug("Calculating storage breakdown")
        
        breakdown: Dict[str, Any] = {}
        
        # Calculate size for each category
        for name, path in paths.items():
            try:
                size_mb = get_directory_size(path)
                breakdown[f"{name}_mb"] = size_mb
                
                logger.debug(
                    f"Category size calculated: {name}",
                    extra={"path": path, "size_mb": size_mb}
                )
            
            except Exception as e:
                logger.warning(
                    f"Failed to calculate size for {name}",
                    extra={
                        "path": path,
                        "error": str(e)
                    }
                )
                breakdown[f"{name}_mb"] = 0.0
        
        # Get overall disk usage
        try:
            disk = get_disk_usage("/app/uploads")
            breakdown["disk_total_gb"] = disk.get("total_gb", 0.0)
            breakdown["disk_used_gb"] = disk.get("used_gb", 0.0)
            breakdown["disk_free_gb"] = disk.get("free_gb", 0.0)
            breakdown["disk_usage_percent"] = disk.get("usage_percent", 0.0)
            breakdown["disk_status"] = disk.get("status", "unknown")
            
            if "error" in disk:
                breakdown["disk_error"] = disk["error"]
        
        except Exception as e:
            logger.warning(
                "Failed to get disk usage",
                extra={"error": str(e)}
            )
            breakdown["disk_total_gb"] = 0.0
            breakdown["disk_used_gb"] = 0.0
            breakdown["disk_free_gb"] = 0.0
            breakdown["disk_usage_percent"] = 0.0
            breakdown["disk_status"] = "error"
            breakdown["disk_error"] = str(e)
        
        logger.info(
            "Storage breakdown calculated",
            extra={
                "total_uploads_mb": breakdown.get("total_uploads_mb", 0.0),
                "disk_usage_percent": breakdown.get("disk_usage_percent", 0.0)
            }
        )
        
        return breakdown
    
    except Exception as e:
        logger.error(
            "Failed to get storage breakdown",
            extra={
                "error": str(e),
                "error_type": type(e).__name__
            },
            exc_info=True
        )
        return {
            "documents_mb": 0.0,
            "attachments_mb": 0.0,
            "logs_mb": 0.0,
            "total_uploads_mb": 0.0,
            "disk_total_gb": 0.0,
            "disk_used_gb": 0.0,
            "disk_free_gb": 0.0,
            "disk_usage_percent": 0.0,
            "disk_status": "error",
            "error": str(e)
        }
