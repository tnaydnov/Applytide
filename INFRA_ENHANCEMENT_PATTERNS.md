# Infrastructure Enhancement Patterns - Quick Reference

This guide provides reusable patterns from the infrastructure module enhancement for future development.

---

## 📋 Table of Contents

1. [Module Structure Template](#module-structure-template)
2. [Exception Hierarchy](#exception-hierarchy)
3. [Input Validation Patterns](#input-validation-patterns)
4. [Atomic Write Operations](#atomic-write-operations)
5. [Graceful Degradation](#graceful-degradation)
6. [Structured Logging](#structured-logging)
7. [Resource Cleanup](#resource-cleanup)
8. [Docstring Format](#docstring-format)

---

## 1. Module Structure Template

Every module follows this consistent structure:

```python
"""
[Module Title] - One-line Description

This module provides [detailed description of purpose and features].

Configuration Constants:
    CONSTANT_NAME: Description (type, default value)
    ANOTHER_CONSTANT: Description

Exception Classes:
    CustomError: Description of when raised
    ValidationError: Description of validation errors

Example:
    >>> from module import Class
    >>> instance = Class()
    >>> result = instance.method(arg)
    >>> print(result)

Notes:
    - Thread-safety considerations
    - Performance characteristics
    - External dependencies
"""
from __future__ import annotations
from typing import Dict, Any, Optional
import time
from pathlib import Path

from ...infra.logging import get_logger

# Initialize logger
logger = get_logger(__name__)

# ==================== CONFIGURATION CONSTANTS ====================

# Group constants by category
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
DEFAULT_TIMEOUT = 30.0             # seconds
MIN_VALUE = 1
MAX_VALUE = 1000

# ==================== EXCEPTION CLASSES ====================

class ModuleError(Exception):
    """Base exception for module-specific errors."""
    pass

class ValidationError(ModuleError):
    """Exception raised for validation errors."""
    pass

# ==================== HELPER FUNCTIONS ====================

def _validate_input(value: Any, param_name: str = "value") -> None:
    """
    Validate input parameter.
    
    Args:
        value: Value to validate
        param_name: Name of parameter (for error messages)
    
    Raises:
        ValidationError: If validation fails
    """
    if value is None:
        raise ValidationError(f"{param_name} cannot be None")
    # ... more validation

# ==================== MAIN CLASSES ====================

class MainClass:
    """
    [Class description]
    
    This class provides [features].
    
    Attributes:
        attr1: Description of attr1
        attr2: Description of attr2
    
    Example:
        >>> obj = MainClass()
        >>> result = obj.method()
    """
    
    def __init__(self, param: type) -> None:
        """Initialize with validation."""
        _validate_input(param, "param")
        self.param = param
        logger.info("Initialized", extra={"param": param})
    
    def method(self, arg: type) -> return_type:
        """
        Method description.
        
        Args:
            arg: Description
        
        Returns:
            Description of return value
        
        Raises:
            ModuleError: When error occurs
        """
        try:
            # Implementation
            logger.info("Method completed", extra={"arg": arg})
            return result
        except Exception as e:
            logger.error("Method failed", extra={"error": str(e)})
            raise ModuleError(f"Operation failed: {e}") from e
```

---

## 2. Exception Hierarchy

Create a clear exception hierarchy for each module:

```python
# Base exception
class ModuleError(Exception):
    """Base exception for all module errors."""
    pass

# Specific exceptions (inherit from base)
class ValidationError(ModuleError):
    """Raised when input validation fails."""
    pass

class StorageError(ModuleError):
    """Raised when storage operations fail."""
    pass

class TimeoutError(ModuleError):
    """Raised when operation times out."""
    pass

class ConnectionError(ModuleError):
    """Raised when connection fails."""
    pass

# Usage
def process_file(file_path: Path) -> None:
    if not file_path.exists():
        raise ValidationError(f"File not found: {file_path}")
    
    try:
        data = file_path.read_bytes()
    except PermissionError as e:
        raise StorageError(f"Cannot read file: {e}") from e
```

**Benefits:**
- ✅ Callers can catch base exception for all errors
- ✅ Callers can catch specific exceptions for targeted handling
- ✅ Clear error categorization
- ✅ Preserves exception chain with `from e`

---

## 3. Input Validation Patterns

### Pattern 1: Type Validation

```python
def _validate_type(value: Any, expected_type: type, param_name: str) -> None:
    """Validate parameter type."""
    if not isinstance(value, expected_type):
        raise ValidationError(
            f"{param_name} must be {expected_type.__name__}, "
            f"got {type(value).__name__}"
        )

# Usage
_validate_type(file_path, Path, "file_path")
```

### Pattern 2: Empty/None Validation

```python
def _validate_not_empty(value: str, param_name: str) -> None:
    """Validate string is not empty."""
    if not value or not value.strip():
        raise ValidationError(f"{param_name} cannot be empty")

# Usage
_validate_not_empty(url, "url")
```

### Pattern 3: Range Validation

```python
def _validate_range(
    value: float,
    min_value: float,
    max_value: float,
    param_name: str
) -> None:
    """Validate value is within range."""
    if value < min_value:
        raise ValidationError(
            f"{param_name} must be >= {min_value}, got {value}"
        )
    if value > max_value:
        raise ValidationError(
            f"{param_name} must be <= {max_value}, got {value}"
        )

# Usage
_validate_range(timeout, MIN_TIMEOUT, MAX_TIMEOUT, "timeout")
```

### Pattern 4: Format Validation

```python
def _validate_url(url: str, param_name: str = "url") -> None:
    """Validate URL format."""
    if not url.startswith(("http://", "https://")):
        raise ValidationError(
            f"{param_name} must start with http:// or https://, got {url}"
        )

# Usage
_validate_url(endpoint, "endpoint")
```

### Pattern 5: Existence Validation

```python
def _validate_file_exists(file_path: Path, param_name: str) -> None:
    """Validate file exists."""
    if not file_path.exists():
        raise ValidationError(f"{param_name} does not exist: {file_path}")

# Usage
_validate_file_exists(config_path, "config_path")
```

---

## 4. Atomic Write Operations

Always use temp file + rename pattern for writes:

```python
def save_file(file_path: Path, data: bytes) -> None:
    """
    Save file atomically.
    
    Args:
        file_path: Target file path
        data: Data to write
    
    Raises:
        StorageError: If write fails
    """
    # Create temp file path
    temp_path = file_path.with_suffix(file_path.suffix + ".tmp")
    
    try:
        # Write to temp file
        temp_path.write_bytes(data)
        logger.debug("Wrote temp file", extra={"path": str(temp_path)})
        
        # Verify temp file exists
        if not temp_path.exists():
            raise StorageError("Temp file not created")
        
        # Atomic rename (filesystem atomic operation)
        temp_path.rename(file_path)
        logger.info(
            "File saved successfully",
            extra={"path": str(file_path), "size_bytes": len(data)}
        )
        
    except Exception as e:
        # Cleanup temp file on any failure
        if temp_path.exists():
            try:
                temp_path.unlink()
                logger.debug("Removed temp file", extra={"path": str(temp_path)})
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to remove temp file",
                    extra={"path": str(temp_path), "error": str(cleanup_error)}
                )
        
        # Re-raise original error
        if isinstance(e, StorageError):
            raise
        raise StorageError(f"Failed to save file: {e}") from e
```

**Why This Works:**
- ✅ `rename()` is atomic on most filesystems (POSIX, NTFS)
- ✅ Partial writes never visible to readers
- ✅ Temp file automatically cleaned up on failure
- ✅ Verification step catches write errors

---

## 5. Graceful Degradation

### Pattern 1: Fallback Chain

```python
def extract_text(file_path: Path) -> str:
    """
    Extract text with multiple fallback methods.
    
    Never raises exceptions - returns empty string on total failure.
    """
    # Try method 1 (best quality)
    try:
        return _extract_method1(file_path)
    except Exception as e:
        logger.warning("Method 1 failed, trying fallback", extra={"error": str(e)})
    
    # Try method 2 (fast fallback)
    try:
        return _extract_method2(file_path)
    except Exception as e:
        logger.warning("Method 2 failed, trying fallback", extra={"error": str(e)})
    
    # Try method 3 (basic fallback)
    try:
        return _extract_method3(file_path)
    except Exception as e:
        logger.warning("Method 3 failed", extra={"error": str(e)})
    
    # All methods failed - return empty string
    logger.error("All extraction methods failed", extra={"file": str(file_path)})
    return ""
```

### Pattern 2: Return Error Status

```python
def get_disk_usage(path: Path) -> dict:
    """
    Get disk usage with error status.
    
    Returns dict with 'error' field on failure instead of raising exception.
    """
    try:
        usage = shutil.disk_usage(path)
        return {
            "total_gb": usage.total / (1024**3),
            "used_gb": usage.used / (1024**3),
            "free_gb": usage.free / (1024**3),
            "status": "healthy"
        }
    except PermissionError as e:
        logger.error("Permission denied", extra={"path": str(path), "error": str(e)})
        return {
            "total_gb": 0.0,
            "used_gb": 0.0,
            "free_gb": 0.0,
            "status": "error",
            "error": f"Permission denied: {e}"
        }
```

### Pattern 3: Per-Item Error Handling

```python
def calculate_sizes(categories: list[str]) -> dict[str, float]:
    """
    Calculate sizes for each category independently.
    
    Failure in one category doesn't block others.
    """
    results = {}
    
    for category in categories:
        try:
            size = _calculate_size(category)
            results[category] = size
            logger.debug(f"{category}: {size:.2f} GB")
        except Exception as e:
            logger.warning(
                f"Failed to calculate {category} size",
                extra={"error": str(e)}
            )
            results[category] = 0.0  # Continue with other categories
    
    return results
```

---

## 6. Structured Logging

### Logging Levels

```python
# DEBUG: Detailed diagnostic information
logger.debug(
    "Processing started",
    extra={
        "file_path": str(file_path),
        "file_size_bytes": file_size,
        "method": "extract_with_pdfplumber"
    }
)

# INFO: Confirmation of successful operations
logger.info(
    "Processing completed",
    extra={
        "file_path": str(file_path),
        "elapsed_seconds": round(elapsed, 3),
        "result_size": len(result),
        "word_count": len(result.split())
    }
)

# WARNING: Recoverable errors (operation continues)
logger.warning(
    "Extraction method failed, trying fallback",
    extra={
        "file_path": str(file_path),
        "failed_method": "pdfplumber",
        "fallback_method": "pymupdf",
        "error": str(e)
    }
)

# ERROR: Unrecoverable errors (operation fails)
logger.error(
    "All extraction methods failed",
    extra={
        "file_path": str(file_path),
        "elapsed_seconds": round(elapsed, 3),
        "error": str(e),
        "error_type": type(e).__name__
    }
)
```

### Metrics Logging

```python
def process_request(url: str) -> Response:
    """Process request with metrics logging."""
    start_time = time.time()
    
    logger.debug(
        "Request started",
        extra={"url": url, "method": "GET"}
    )
    
    try:
        response = requests.get(url, timeout=30)
        elapsed = time.time() - start_time
        
        logger.info(
            "Request completed",
            extra={
                "url": url,
                "status_code": response.status_code,
                "elapsed_seconds": round(elapsed, 3),
                "content_length": len(response.content),
                "success": response.status_code < 400
            }
        )
        return response
        
    except requests.Timeout as e:
        elapsed = time.time() - start_time
        logger.error(
            "Request timed out",
            extra={
                "url": url,
                "elapsed_seconds": round(elapsed, 3),
                "timeout": 30,
                "error": str(e)
            }
        )
        raise
```

---

## 7. Resource Cleanup

### Pattern 1: Finally Block

```python
def process_pdf(file_path: Path) -> str:
    """Process PDF with guaranteed cleanup."""
    pdf_document = None
    try:
        pdf_document = fitz.open(file_path)
        text = ""
        for page in pdf_document:
            text += page.get_text()
        return text
    except Exception as e:
        logger.error("PDF processing failed", extra={"error": str(e)})
        raise
    finally:
        # Always cleanup, even on exception
        if pdf_document is not None:
            pdf_document.close()
            logger.debug("Closed PDF document", extra={"file": str(file_path)})
```

### Pattern 2: Context Manager

```python
from contextlib import contextmanager

@contextmanager
def open_pdf(file_path: Path):
    """Context manager for PDF handling."""
    pdf_document = None
    try:
        pdf_document = fitz.open(file_path)
        logger.debug("Opened PDF", extra={"file": str(file_path)})
        yield pdf_document
    finally:
        if pdf_document is not None:
            pdf_document.close()
            logger.debug("Closed PDF", extra={"file": str(file_path)})

# Usage
def extract_text(file_path: Path) -> str:
    with open_pdf(file_path) as pdf:
        return "\n".join(page.get_text() for page in pdf)
```

### Pattern 3: Cleanup on Failure

```python
def save_with_cleanup(file_path: Path, data: bytes) -> None:
    """Save file with automatic cleanup on failure."""
    temp_path = file_path.with_suffix(".tmp")
    
    try:
        # Operation that might fail
        temp_path.write_bytes(data)
        temp_path.rename(file_path)
        
    except Exception as e:
        # Cleanup temp file on any failure
        if temp_path.exists():
            try:
                temp_path.unlink()
                logger.debug("Cleaned up temp file", extra={"path": str(temp_path)})
            except Exception as cleanup_error:
                logger.warning(
                    "Cleanup failed",
                    extra={"path": str(temp_path), "error": str(cleanup_error)}
                )
        raise
```

---

## 8. Docstring Format

### Function Docstring Template

```python
def function_name(
    arg1: type1,
    arg2: type2,
    optional_arg: type3 = default_value
) -> return_type:
    """
    One-line summary (imperative mood, ends with period).
    
    Detailed description explaining:
    - What the function does
    - How it behaves
    - Important side effects
    - Thread-safety considerations
    
    Args:
        arg1: Description of arg1 (purpose, constraints, format)
        arg2: Description of arg2
        optional_arg: Description (default: default_value)
    
    Returns:
        Description of return value:
        - Structure for dict/list returns
        - Format for string returns
        - Meaning of numeric returns
    
    Raises:
        ExceptionType: When this exception is raised
        AnotherException: When this other exception is raised
    
    Examples:
        >>> result = function_name("value", 42)
        >>> print(result)
        expected_output
        
        >>> # Example with optional argument
        >>> result = function_name("value", 42, optional_arg=True)
    
    Notes:
        - Implementation detail worth mentioning
        - Performance characteristic (O(n) complexity)
        - Thread-safety guarantee
        - External dependencies
    """
    # Implementation
    pass
```

### Class Docstring Template

```python
class ClassName:
    """
    One-line summary (noun phrase, ends with period).
    
    Detailed description explaining:
    - Class purpose
    - Main features
    - Usage patterns
    
    This class provides [features] and supports [capabilities].
    
    Attributes:
        attr1: Description of attr1 (type, purpose)
        attr2: Description of attr2 (type, purpose)
        _private_attr: Description of private attribute (internal use only)
    
    Example:
        >>> obj = ClassName(param1, param2)
        >>> result = obj.method()
        >>> print(result)
        
        >>> # Example with context manager
        >>> with ClassName(param) as obj:
        ...     obj.method()
    
    Notes:
        - Thread-safety: This class is/is not thread-safe
        - Resource management: Resources are automatically cleaned up
        - Performance: O(n) initialization, O(1) lookups
    """
    
    def __init__(self, param1: type1, param2: type2) -> None:
        """
        Initialize instance with validation.
        
        Args:
            param1: Description of param1
            param2: Description of param2
        
        Raises:
            ValidationError: If parameters are invalid
        """
        self.attr1 = param1
        self.attr2 = param2
```

### Module Docstring Template

```python
"""
Module Title - One-line Description

This module provides [detailed description of purpose and features].

The module includes:
- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

Configuration Constants:
    CONSTANT_NAME: Description (type: value)
    ANOTHER_CONSTANT: Description (type: value)

Exception Classes:
    CustomError: Raised when [condition]
    ValidationError: Raised when [condition]

Example:
    >>> from module import ClassName
    >>> obj = ClassName(param)
    >>> result = obj.method()
    >>> print(result)

Notes:
    - Thread-safety: All functions are thread-safe
    - Dependencies: Requires library_name >= 1.0.0
    - Performance: Optimized for [use case]
    - Logging: All operations are logged at appropriate levels
"""
```

---

## 📚 Additional Resources

### When to Use Each Pattern

| Pattern | Use When | Example |
|---------|----------|---------|
| **Atomic Writes** | Writing files, updating state | save_file(), update_config() |
| **Fallback Chain** | Multiple methods available | extract_text(), parse_document() |
| **Return Error Status** | Caller needs to handle errors | get_disk_usage(), check_health() |
| **Per-Item Handling** | Processing collections | calculate_sizes(), process_batch() |
| **Finally Cleanup** | Managing resources | open_connection(), process_pdf() |
| **Context Manager** | Reusable resource pattern | @contextmanager for DB, files |

### Anti-Patterns to Avoid

❌ **Silent Failures** (bare except with pass)
```python
try:
    risky_operation()
except:
    pass  # ❌ Error silently swallowed
```

✅ **Logged Failures** (log and return default)
```python
try:
    return risky_operation()
except Exception as e:
    logger.error("Operation failed", extra={"error": str(e)})
    return default_value  # ✅ Error logged, graceful degradation
```

---

❌ **Generic Exceptions** (raise Exception)
```python
if not valid:
    raise Exception("Invalid input")  # ❌ Too generic
```

✅ **Specific Exceptions** (custom exception types)
```python
if not valid:
    raise ValidationError("Invalid input: expected format XYZ")  # ✅ Specific, actionable
```

---

❌ **Missing Validation** (assume input is valid)
```python
def process(file_path):
    return file_path.read_text()  # ❌ Assumes file exists
```

✅ **Input Validation** (validate early)
```python
def process(file_path: Path) -> str:
    if not file_path.exists():
        raise ValidationError(f"File not found: {file_path}")
    if not file_path.is_file():
        raise ValidationError(f"Path is not a file: {file_path}")
    return file_path.read_text()  # ✅ Validated
```

---

❌ **Direct Writes** (no atomicity)
```python
file_path.write_bytes(data)  # ❌ Partial writes visible on crash
```

✅ **Atomic Writes** (temp + rename)
```python
temp_path = file_path.with_suffix(".tmp")
temp_path.write_bytes(data)
temp_path.rename(file_path)  # ✅ Atomic operation
```

---

## 🎯 Summary

These patterns provide:
- ✅ **Robustness:** Handle all edge cases gracefully
- ✅ **Debuggability:** Structured logging for easy troubleshooting
- ✅ **Maintainability:** Consistent patterns across codebase
- ✅ **Production-Ready:** Atomic operations, resource cleanup, error handling

Apply these patterns consistently for high-quality, production-ready code.

---

**Last Updated:** 2024  
**Source:** Infrastructure Module Enhancement Project
