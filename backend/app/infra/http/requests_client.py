"""
HTTP Client with Retry Logic and Comprehensive Error Handling

This module provides a robust HTTP client implementation with:
- Automatic retry with exponential backoff
- Connection pooling and resource management
- Configurable timeouts with validation
- Comprehensive error handling and logging
- Request/response metrics tracking

Configuration Constants:
    DEFAULT_CONNECT_TIMEOUT: Default connect timeout (5 seconds)
    DEFAULT_READ_TIMEOUT: Default read timeout (10 seconds)
    MIN_TIMEOUT: Minimum valid timeout value (0.1 seconds)
    MAX_TIMEOUT: Maximum valid timeout value (300 seconds = 5 minutes)
    MAX_POOL_CONNECTIONS: Maximum number of connection pools
    MAX_POOL_SIZE: Maximum connections per pool
    DEFAULT_RETRY_TOTAL: Default total retry attempts
    DEFAULT_BACKOFF_FACTOR: Default exponential backoff multiplier

Example:
    >>> from infra.http.requests_client import RequestsHTTPClient
    >>> client = RequestsHTTPClient()
    >>> 
    >>> # GET request with default timeout
    >>> response = client.get("https://api.example.com/data")
    >>> 
    >>> # POST request with custom timeout
    >>> response = client.post(
    ...     "https://api.example.com/submit",
    ...     json={"key": "value"},
    ...     timeout=30.0
    ... )
    >>> 
    >>> # Request with custom headers
    >>> response = client.get(
    ...     "https://api.example.com/protected",
    ...     headers={"Authorization": "Bearer token123"},
    ...     timeout=(5, 15)
    ... )

Notes:
    - All requests automatically retry on transient failures (429, 500, 502, 503, 504)
    - Retry backoff: 0s, 0.2s, 0.4s (exponential with 0.2 factor)
    - Connection pooling reduces overhead for multiple requests
    - Timeouts can be: float (connect=read), tuple (connect, read), or None (default)
    - Session is reused across requests for efficiency
"""
from __future__ import annotations
from typing import Dict, Any, Optional
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from ...domain.auth.ports import IHTTPClient
from ...infra.logging import get_logger

# Initialize logger
logger = get_logger(__name__)

# ==================== CONFIGURATION CONSTANTS ====================

# Timeout configuration (seconds)
DEFAULT_CONNECT_TIMEOUT = 5     # Connect timeout
DEFAULT_READ_TIMEOUT = 10       # Read timeout
MIN_TIMEOUT = 0.1               # Minimum valid timeout
MAX_TIMEOUT = 300               # Maximum valid timeout (5 minutes)

# Connection pool configuration
MAX_POOL_CONNECTIONS = 20       # Maximum number of connection pools
MAX_POOL_SIZE = 50             # Maximum connections per pool

# Retry configuration
DEFAULT_RETRY_TOTAL = 3         # Total retry attempts
DEFAULT_BACKOFF_FACTOR = 0.2    # Exponential backoff multiplier (0s, 0.2s, 0.4s)

# ==================== EXCEPTION CLASSES ====================

class HTTPClientError(Exception):
    """Base exception for HTTP client errors."""
    pass

class HTTPTimeoutError(HTTPClientError):
    """Exception raised for timeout-related errors."""
    pass

class HTTPConnectionError(HTTPClientError):
    """Exception raised for connection-related errors."""
    pass

class HTTPValidationError(HTTPClientError):
    """Exception raised for validation errors."""
    pass

# ==================== HELPER FUNCTIONS ====================

def _validate_timeout(
    timeout: Optional[int | float | tuple[int, int]],
    param_name: str = "timeout"
) -> None:
    """
    Validate timeout parameter.
    
    Args:
        timeout: Timeout value to validate (float, tuple, or None)
        param_name: Name of the parameter (for error messages)
    
    Raises:
        HTTPValidationError: If timeout is invalid
    
    Examples:
        >>> _validate_timeout(5.0)          # Valid
        >>> _validate_timeout((5, 10))      # Valid
        >>> _validate_timeout(None)         # Valid (uses default)
        >>> _validate_timeout(-1)           # Raises HTTPValidationError
        >>> _validate_timeout((5, 400))     # Raises HTTPValidationError
    """
    if timeout is None:
        return  # None means use default
    
    if isinstance(timeout, (int, float)):
        if timeout < MIN_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} must be >= {MIN_TIMEOUT}s, got {timeout}"
            )
        if timeout > MAX_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} must be <= {MAX_TIMEOUT}s, got {timeout}"
            )
    elif isinstance(timeout, tuple):
        if len(timeout) != 2:
            raise HTTPValidationError(
                f"{param_name} tuple must have exactly 2 elements (connect, read), got {len(timeout)}"
            )
        connect_timeout, read_timeout = timeout
        if connect_timeout < MIN_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} connect timeout must be >= {MIN_TIMEOUT}s, got {connect_timeout}"
            )
        if connect_timeout > MAX_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} connect timeout must be <= {MAX_TIMEOUT}s, got {connect_timeout}"
            )
        if read_timeout < MIN_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} read timeout must be >= {MIN_TIMEOUT}s, got {read_timeout}"
            )
        if read_timeout > MAX_TIMEOUT:
            raise HTTPValidationError(
                f"{param_name} read timeout must be <= {MAX_TIMEOUT}s, got {read_timeout}"
            )
    else:
        raise HTTPValidationError(
            f"{param_name} must be None, number, or (connect, read) tuple, got {type(timeout).__name__}"
        )

def _validate_url(url: str, param_name: str = "url") -> None:
    """
    Validate URL parameter.
    
    Args:
        url: URL to validate
        param_name: Name of the parameter (for error messages)
    
    Raises:
        HTTPValidationError: If URL is invalid
    
    Examples:
        >>> _validate_url("https://example.com")        # Valid
        >>> _validate_url("http://api.example.com/v1")  # Valid
        >>> _validate_url("")                           # Raises HTTPValidationError
        >>> _validate_url("not-a-url")                  # Raises HTTPValidationError
    """
    if not url:
        raise HTTPValidationError(f"{param_name} cannot be empty")
    if not isinstance(url, str):
        raise HTTPValidationError(f"{param_name} must be string, got {type(url).__name__}")
    if not url.startswith(("http://", "https://")):
        raise HTTPValidationError(f"{param_name} must start with http:// or https://, got {url}")

# ==================== SESSION CLASSES ====================

class _TimeoutSession(requests.Session):
    """
    Custom requests.Session with automatic default timeout.
    
    This class extends requests.Session to automatically apply default timeouts
    to all requests if no timeout is explicitly specified.
    
    Args:
        timeout: Default timeout as (connect, read) tuple
    
    Notes:
        - If a request specifies its own timeout, that takes precedence
        - If timeout=None, the default timeout is used
        - Thread-safe for concurrent requests
    """
    def __init__(self, timeout: tuple[int, int] = (DEFAULT_CONNECT_TIMEOUT, DEFAULT_READ_TIMEOUT)) -> None:
        super().__init__()
        self._timeout = timeout
        logger.debug(
            "Initialized TimeoutSession",
            extra={
                "connect_timeout": timeout[0],
                "read_timeout": timeout[1]
            }
        )

    def request(self, *args, **kwargs):
        """
        Override request to inject default timeout if not specified.
        
        Args:
            *args: Positional arguments passed to parent request()
            **kwargs: Keyword arguments passed to parent request()
        
        Returns:
            requests.Response: Response object
        
        Raises:
            requests.exceptions.Timeout: If request times out
            requests.exceptions.ConnectionError: If connection fails
        """
        if "timeout" not in kwargs or kwargs["timeout"] is None:
            kwargs["timeout"] = self._timeout
            logger.debug(
                "Applied default timeout to request",
                extra={
                    "timeout": self._timeout,
                    "url": kwargs.get("url") or (args[1] if len(args) > 1 else "unknown")
                }
            )
        return super().request(*args, **kwargs)

# ==================== BUILDER FUNCTIONS ====================

def _build_session() -> requests.Session:
    """
    Build a configured requests.Session with retry logic and connection pooling.
    
    Creates a session with:
    - Automatic retry on transient failures (429, 500, 502, 503, 504)
    - Exponential backoff (0s, 0.2s, 0.4s with 0.2 factor)
    - Connection pooling (20 pools, 50 connections per pool)
    - Default timeout (5s connect, 10s read)
    
    Returns:
        requests.Session: Configured session instance
    
    Notes:
        - Session is reused across multiple requests for efficiency
        - Retry logic respects Retry-After header from server
        - Connection pooling reduces overhead for multiple requests to same host
    
    Example:
        >>> session = _build_session()
        >>> response = session.get("https://api.example.com")
    """
    logger.debug("Building HTTP session with retry and pooling configuration")
    
    # Create session with default timeout
    s = _TimeoutSession(timeout=(DEFAULT_CONNECT_TIMEOUT, DEFAULT_READ_TIMEOUT))
    
    # Configure retry strategy
    retry = Retry(
        total=DEFAULT_RETRY_TOTAL,
        backoff_factor=DEFAULT_BACKOFF_FACTOR,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    
    logger.debug(
        "Configured retry strategy",
        extra={
            "total_retries": DEFAULT_RETRY_TOTAL,
            "backoff_factor": DEFAULT_BACKOFF_FACTOR,
            "status_forcelist": [429, 500, 502, 503, 504]
        }
    )
    
    # Configure connection pooling adapter
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=MAX_POOL_CONNECTIONS,
        pool_maxsize=MAX_POOL_SIZE
    )
    
    logger.debug(
        "Configured connection pooling",
        extra={
            "pool_connections": MAX_POOL_CONNECTIONS,
            "pool_maxsize": MAX_POOL_SIZE
        }
    )
    
    # Mount adapter for both HTTP and HTTPS
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    
    logger.info("HTTP session built successfully")
    return s

# ==================== CLIENT CLASS ====================

class RequestsHTTPClient(IHTTPClient):
    """
    HTTP Client with retry logic, connection pooling, and comprehensive error handling.
    
    This class provides a robust HTTP client that:
    - Automatically retries failed requests (429, 500, 502, 503, 504)
    - Pools connections for efficiency
    - Validates all inputs
    - Logs detailed metrics for monitoring
    - Handles timeouts and connection errors gracefully
    
    Attributes:
        _session: Underlying requests.Session instance
    
    Example:
        >>> client = RequestsHTTPClient()
        >>> 
        >>> # Simple GET request
        >>> response = client.get("https://api.example.com/users")
        >>> print(response.json())
        >>> 
        >>> # POST with JSON body
        >>> response = client.post(
        ...     "https://api.example.com/users",
        ...     json={"name": "Alice", "email": "alice@example.com"}
        ... )
        >>> 
        >>> # Request with custom headers and timeout
        >>> response = client.get(
        ...     "https://api.example.com/protected",
        ...     headers={"Authorization": "Bearer token123"},
        ...     timeout=30.0
        ... )
    
    Notes:
        - Session is created once and reused for all requests
        - Automatically logs request/response metrics
        - Validates all parameters before making requests
        - Raises HTTPValidationError for invalid parameters
        - Raises HTTPTimeoutError for timeout failures
        - Raises HTTPConnectionError for connection failures
    """
    
    def __init__(self) -> None:
        """
        Initialize HTTP client with configured session.
        
        Creates a new session with retry logic and connection pooling.
        """
        logger.debug("Initializing RequestsHTTPClient")
        try:
            self._session = _build_session()
            logger.info("RequestsHTTPClient initialized successfully")
        except Exception as e:
            logger.error(
                "Failed to initialize RequestsHTTPClient",
                extra={"error": str(e), "error_type": type(e).__name__}
            )
            raise HTTPClientError(f"Failed to initialize HTTP client: {e}") from e

    def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        timeout: Optional[int | float | tuple[int, int]] = None,
    ):
        """
        Perform HTTP GET request with validation and error handling.
        
        Args:
            url: Target URL (must start with http:// or https://)
            headers: Optional request headers dict
            params: Optional query parameters dict
            timeout: Optional timeout (float, tuple, or None for default)
        
        Returns:
            requests.Response: Response object
        
        Raises:
            HTTPValidationError: If URL or timeout is invalid
            HTTPTimeoutError: If request times out
            HTTPConnectionError: If connection fails
            HTTPClientError: For other HTTP errors
        
        Examples:
            >>> client = RequestsHTTPClient()
            >>> 
            >>> # Basic GET
            >>> response = client.get("https://api.example.com/users")
            >>> 
            >>> # With query parameters
            >>> response = client.get(
            ...     "https://api.example.com/users",
            ...     params={"page": "2", "limit": "20"}
            ... )
            >>> 
            >>> # With custom timeout
            >>> response = client.get(
            ...     "https://api.example.com/slow-endpoint",
            ...     timeout=60.0
            ... )
        """
        # Validate inputs
        _validate_url(url, param_name="url")
        _validate_timeout(timeout, param_name="timeout")
        
        logger.debug(
            "Performing GET request",
            extra={
                "url": url,
                "has_headers": headers is not None,
                "has_params": params is not None,
                "timeout": timeout
            }
        )
        
        start_time = time.time()
        try:
            response = self._session.get(
                url,
                headers=headers,
                params=params,
                timeout=timeout
            )
            elapsed = time.time() - start_time
            
            logger.info(
                "GET request completed",
                extra={
                    "url": url,
                    "status_code": response.status_code,
                    "elapsed_seconds": round(elapsed, 3),
                    "content_length": len(response.content)
                }
            )
            return response
            
        except requests.exceptions.Timeout as e:
            elapsed = time.time() - start_time
            logger.error(
                "GET request timed out",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "timeout": timeout,
                    "error": str(e)
                }
            )
            raise HTTPTimeoutError(f"Request to {url} timed out after {elapsed:.2f}s") from e
            
        except requests.exceptions.ConnectionError as e:
            elapsed = time.time() - start_time
            logger.error(
                "GET request connection failed",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "error": str(e)
                }
            )
            raise HTTPConnectionError(f"Failed to connect to {url}: {e}") from e
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "GET request failed",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )
            raise HTTPClientError(f"Request to {url} failed: {e}") from e

    def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        timeout: Optional[int | float | tuple[int, int]] = None,
    ):
        """
        Perform HTTP POST request with validation and error handling.
        
        Args:
            url: Target URL (must start with http:// or https://)
            data: Optional form data dict
            json: Optional JSON body dict
            headers: Optional request headers dict
            params: Optional query parameters dict
            timeout: Optional timeout (float, tuple, or None for default)
        
        Returns:
            requests.Response: Response object
        
        Raises:
            HTTPValidationError: If URL or timeout is invalid
            HTTPTimeoutError: If request times out
            HTTPConnectionError: If connection fails
            HTTPClientError: For other HTTP errors
        
        Examples:
            >>> client = RequestsHTTPClient()
            >>> 
            >>> # POST with JSON body
            >>> response = client.post(
            ...     "https://api.example.com/users",
            ...     json={"name": "Bob", "email": "bob@example.com"}
            ... )
            >>> 
            >>> # POST with form data
            >>> response = client.post(
            ...     "https://api.example.com/submit",
            ...     data={"field1": "value1", "field2": "value2"}
            ... )
            >>> 
            >>> # POST with custom headers and timeout
            >>> response = client.post(
            ...     "https://api.example.com/auth/login",
            ...     json={"username": "user", "password": "pass"},
            ...     headers={"X-Client-Version": "1.0"},
            ...     timeout=(5, 30)
            ... )
        
        Notes:
            - Use `json` parameter for JSON body (automatically sets Content-Type: application/json)
            - Use `data` parameter for form-encoded body
            - Cannot use both `json` and `data` simultaneously
        """
        # Validate inputs
        _validate_url(url, param_name="url")
        _validate_timeout(timeout, param_name="timeout")
        
        logger.debug(
            "Performing POST request",
            extra={
                "url": url,
                "has_data": data is not None,
                "has_json": json is not None,
                "has_headers": headers is not None,
                "has_params": params is not None,
                "timeout": timeout
            }
        )
        
        start_time = time.time()
        try:
            response = self._session.post(
                url,
                data=data,
                json=json,
                headers=headers,
                params=params,
                timeout=timeout
            )
            elapsed = time.time() - start_time
            
            logger.info(
                "POST request completed",
                extra={
                    "url": url,
                    "status_code": response.status_code,
                    "elapsed_seconds": round(elapsed, 3),
                    "content_length": len(response.content)
                }
            )
            return response
            
        except requests.exceptions.Timeout as e:
            elapsed = time.time() - start_time
            logger.error(
                "POST request timed out",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "timeout": timeout,
                    "error": str(e)
                }
            )
            raise HTTPTimeoutError(f"Request to {url} timed out after {elapsed:.2f}s") from e
            
        except requests.exceptions.ConnectionError as e:
            elapsed = time.time() - start_time
            logger.error(
                "POST request connection failed",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "error": str(e)
                }
            )
            raise HTTPConnectionError(f"Failed to connect to {url}: {e}") from e
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "POST request failed",
                extra={
                    "url": url,
                    "elapsed_seconds": round(elapsed, 3),
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )
            raise HTTPClientError(f"Request to {url} failed: {e}") from e
