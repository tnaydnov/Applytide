"""
Enhanced Security Headers Middleware

This module implements production-grade HTTP security headers middleware to protect
against common web vulnerabilities and attacks.

Features:
    - Content Security Policy (CSP) with customizable directives
    - HTTP Strict Transport Security (HSTS) for HTTPS enforcement
    - Cross-Origin policies (COOP, CORP, COEP)
    - Clickjacking protection (X-Frame-Options)
    - MIME-sniffing protection (X-Content-Type-Options)
    - Referrer policy configuration
    - Permissions policy for browser features
    - Environment-specific configurations (production vs development)
    - Runtime CSP extension via environment variables

Security Headers Applied:
    Core Headers (All Environments):
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY (production) / SAMEORIGIN (dev)
    - Referrer-Policy: strict-origin-when-cross-origin
    
    Production-Only Headers:
    - Content-Security-Policy: Configurable CSP directives
    - Strict-Transport-Security: HSTS with 2-year max-age
    - Cross-Origin-Opener-Policy: same-origin
    - Cross-Origin-Resource-Policy: same-site
    - Permissions-Policy: Restricts browser features
    
    Optional Headers (Opt-in):
    - Cross-Origin-Embedder-Policy: require-corp (if ENABLE_CROSS_ORIGIN_ISOLATION=true)

Content Security Policy (CSP):
    Default directives:
    - default-src: 'self'
    - script-src: 'self' + CSP_SCRIPT_SRC_EXTRA
    - style-src: 'self' 'unsafe-inline' + CSP_STYLE_SRC_EXTRA
    - img-src: 'self' data: + CSP_IMG_SRC_EXTRA
    - font-src: 'self'
    - connect-src: 'self' + CSP_CONNECT_SRC_EXTRA
    - frame-src: 'self' + CSP_FRAME_SRC_EXTRA
    - object-src: 'none'
    - base-uri: 'self'
    - frame-ancestors: 'none'

Configuration Constants:
    HSTS_MAX_AGE: 63072000 (2 years in seconds)
    CSP_MAX_SOURCES: 20 (per directive, prevent abuse)
    MAX_HEADER_VALUE_LENGTH: 8192 (prevent header overflow)
    DEFAULT_FRAME_OPTION_PROD: "DENY"
    DEFAULT_FRAME_OPTION_DEV: "SAMEORIGIN"

Environment Variables:
    Core Configuration:
    - ENVIRONMENT: "production" or "development" (default: development)
    - ENABLE_CROSS_ORIGIN_ISOLATION: "true" or "false" (default: false)
    
    CSP Extensions (comma-separated):
    - CSP_CONNECT_SRC_EXTRA: Additional connect-src sources
    - CSP_IMG_SRC_EXTRA: Additional img-src sources
    - CSP_SCRIPT_SRC_EXTRA: Additional script-src sources
    - CSP_STYLE_SRC_EXTRA: Additional style-src sources
    - CSP_FRAME_SRC_EXTRA: Additional frame-src sources

Usage:
    # Basic usage
    from app.infra.http.middleware.security_headers import SecurityHeadersMiddleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # With environment configuration
    # Set in .env file:
    # ENVIRONMENT=production
    # CSP_CONNECT_SRC_EXTRA=https://api.example.com,https://cdn.example.com
    # CSP_IMG_SRC_EXTRA=https://images.example.com
    # ENABLE_CROSS_ORIGIN_ISOLATION=true

Security Notes:
    - HSTS only applied on HTTPS connections (prevents lockout)
    - CSP 'unsafe-inline' for styles (required by many UI frameworks)
    - frame-ancestors replaces X-Frame-Options in modern browsers
    - Cross-origin isolation can break third-party embeds (opt-in)
    - X-Forwarded-Proto header checked for proxy/load balancer support
    - Development mode uses relaxed headers to avoid breaking local dev

OWASP Security Headers Compliance:
    ✅ X-Content-Type-Options (prevents MIME sniffing)
    ✅ X-Frame-Options (clickjacking protection)
    ✅ Content-Security-Policy (XSS protection)
    ✅ Strict-Transport-Security (HTTPS enforcement)
    ✅ Referrer-Policy (privacy protection)
    ✅ Permissions-Policy (feature access control)

Performance:
    - Header building cached per request
    - Minimal string operations
    - No external dependencies or I/O
    - Async/non-blocking implementation
"""
from __future__ import annotations
import os
from typing import List, Dict, Set
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.datastructures import MutableHeaders

from ...logging import get_logger


# Initialize logger
logger = get_logger(__name__)


# ===== CONFIGURATION CONSTANTS =====

# HSTS configuration
HSTS_MAX_AGE = 63072000  # 2 years in seconds
HSTS_INCLUDE_SUBDOMAINS = True  # Apply to all subdomains
HSTS_PRELOAD = True  # Enable HSTS preload list submission

# CSP limits
CSP_MAX_SOURCES = 20  # Maximum sources per CSP directive
MAX_HEADER_VALUE_LENGTH = 8192  # Maximum header value length (prevent overflow)

# Frame options
DEFAULT_FRAME_OPTION_PROD = "DENY"  # Production: no framing
DEFAULT_FRAME_OPTION_DEV = "SAMEORIGIN"  # Dev: allow same-origin frames

# Default exempt paths (no custom headers needed)
DEFAULT_EXEMPT_PATHS: Set[str] = {
    "/health",
    "/metrics",
}

# Valid CSP directives
VALID_CSP_DIRECTIVES = {
    "default-src", "script-src", "style-src", "img-src", "font-src",
    "connect-src", "frame-src", "object-src", "base-uri", "frame-ancestors",
    "form-action", "media-src", "worker-src", "manifest-src"
}

# Valid schemes for CSP sources
VALID_CSP_SCHEMES = {"https", "http", "data", "blob", "wss", "ws"}


# ===== CUSTOM EXCEPTIONS =====

class SecurityHeadersError(Exception):
    """Base exception for security headers errors"""
    pass


class CSPValidationError(SecurityHeadersError):
    """Raised when CSP directive validation fails"""
    pass


class ConfigurationError(SecurityHeadersError):
    """Raised when middleware configuration is invalid"""
    pass


class HeaderBuildError(SecurityHeadersError):
    """Raised when header building fails"""
    pass


# ===== VALIDATION FUNCTIONS =====

def _validate_csp_source(source: str) -> None:
    """
    Validate Content Security Policy source.
    
    Args:
        source: CSP source string (e.g., "'self'", "https://example.com")
        
    Raises:
        CSPValidationError: If source is invalid
    """
    if not source:
        raise CSPValidationError("CSP source cannot be empty")
    
    if len(source) > 500:
        raise CSPValidationError(f"CSP source too long: {len(source)} chars")
    
    # Check for special keywords (must be single-quoted)
    keywords = {"'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'"}
    if source.lower() in [k.strip("'") for k in keywords]:
        if not (source.startswith("'") and source.endswith("'")):
            raise CSPValidationError(f"CSP keyword must be quoted: {source}")
    
    # Check URL sources
    if ":" in source and not source.startswith("'"):
        scheme = source.split(":", 1)[0].lower()
        if scheme not in VALID_CSP_SCHEMES:
            logger.warning(
                "Potentially invalid CSP scheme",
                extra={"source": source, "scheme": scheme}
            )


def _validate_csp_directive(directive: str, sources: List[str]) -> None:
    """
    Validate CSP directive and its sources.
    
    Args:
        directive: CSP directive name
        sources: List of sources for directive
        
    Raises:
        CSPValidationError: If directive or sources are invalid
    """
    if directive not in VALID_CSP_DIRECTIVES:
        logger.warning(
            "Unknown CSP directive",
            extra={"directive": directive}
        )
    
    if not sources:
        raise CSPValidationError(f"CSP directive '{directive}' has no sources")
    
    if len(sources) > CSP_MAX_SOURCES:
        raise CSPValidationError(
            f"Too many sources for '{directive}': {len(sources)} (max {CSP_MAX_SOURCES})"
        )
    
    # Validate each source
    for source in sources:
        _validate_csp_source(source)


def _validate_environment(env: str) -> None:
    """
    Validate environment setting.
    
    Args:
        env: Environment string
        
    Raises:
        ConfigurationError: If environment is invalid
    """
    valid_envs = {"production", "development", "staging", "test"}
    
    if not env:
        raise ConfigurationError("Environment cannot be empty")
    
    if env.lower() not in valid_envs:
        logger.warning(
            "Unknown environment, treating as development",
            extra={"environment": env, "valid_environments": list(valid_envs)}
        )


def _validate_header_value(value: str, header_name: str) -> None:
    """
    Validate HTTP header value.
    
    Args:
        value: Header value string
        header_name: Name of header (for logging)
        
    Raises:
        HeaderBuildError: If header value is invalid
    """
    if not value:
        raise HeaderBuildError(f"Header value cannot be empty for {header_name}")
    
    if len(value) > MAX_HEADER_VALUE_LENGTH:
        raise HeaderBuildError(
            f"Header '{header_name}' too long: {len(value)} bytes (max {MAX_HEADER_VALUE_LENGTH})"
        )
    
    # Check for invalid characters (CR/LF injection)
    if '\r' in value or '\n' in value:
        raise HeaderBuildError(f"Header '{header_name}' contains invalid line breaks")


# ===== HELPER FUNCTIONS =====

def _split_env(value: str | None) -> list[str]:
    """
    Parse comma-separated environment variable into list.
    
    Args:
        value: Comma-separated string
        
    Returns:
        List of trimmed non-empty strings
        
    Example:
        >>> _split_env("https://api.com, https://cdn.com")
        ['https://api.com', 'https://cdn.com']
    """
    if not value:
        return []
    return [x.strip() for x in value.split(",") if x.strip()]


def _build_hsts_header(include_subdomains: bool = True, preload: bool = True) -> str:
    """
    Build HTTP Strict Transport Security header value.
    
    Args:
        include_subdomains: Include subdomains in HSTS
        preload: Enable HSTS preload list
        
    Returns:
        HSTS header value string
    """
    parts = [f"max-age={HSTS_MAX_AGE}"]
    
    if include_subdomains:
        parts.append("includeSubDomains")
    
    if preload:
        parts.append("preload")
    
    return "; ".join(parts)



# ===== MIDDLEWARE CLASS =====

class SecurityHeadersMiddleware:
    """
    ASGI middleware for applying modern HTTP security headers.
    
    Protects against:
        - Cross-Site Scripting (XSS) via CSP
        - Clickjacking via X-Frame-Options and frame-ancestors
        - MIME-sniffing attacks via X-Content-Type-Options
        - Information leakage via Referrer-Policy
        - Man-in-the-middle attacks via HSTS
        - Cross-origin attacks via COOP/CORP
        
    Features:
        - Environment-specific configuration (prod vs dev)
        - Runtime CSP extension via environment variables
        - HTTPS detection (direct and behind proxy)
        - Optional cross-origin isolation
        - Comprehensive validation
        - Fail-safe header application
        
    Attributes:
        app: ASGI application to wrap
        env: Environment mode ("production" or "development")
        enable_isolation: Enable cross-origin isolation (COEP)
        csp_*_extra: Additional CSP sources from environment
        
    Example:
        app.add_middleware(SecurityHeadersMiddleware)
    """

    def __init__(self, app: ASGIApp) -> None:
        """
        Initialize security headers middleware.
        
        Args:
            app: ASGI application
            
        Raises:
            ConfigurationError: If configuration is invalid
        """
        self.app = app
        
        # Get and validate environment
        self.env = os.getenv("ENVIRONMENT", "development").lower()
        try:
            _validate_environment(self.env)
        except ConfigurationError as e:
            logger.warning(
                "Environment validation failed, using development",
                extra={"error": str(e)}
            )
            self.env = "development"
        
        # Cross-origin isolation (opt-in)
        isolation_env = os.getenv("ENABLE_CROSS_ORIGIN_ISOLATION", "false").lower()
        self.enable_isolation = isolation_env == "true"
        
        # Load CSP extensions from environment
        try:
            self.csp_connect_extra = _split_env(os.getenv("CSP_CONNECT_SRC_EXTRA"))
            self.csp_img_extra = _split_env(os.getenv("CSP_IMG_SRC_EXTRA"))
            self.csp_script_extra = _split_env(os.getenv("CSP_SCRIPT_SRC_EXTRA"))
            self.csp_style_extra = _split_env(os.getenv("CSP_STYLE_SRC_EXTRA"))
            self.csp_frame_extra = _split_env(os.getenv("CSP_FRAME_SRC_EXTRA"))
            
            # Validate CSP sources
            for source in (self.csp_connect_extra + self.csp_img_extra + 
                          self.csp_script_extra + self.csp_style_extra + 
                          self.csp_frame_extra):
                _validate_csp_source(source)
                
        except CSPValidationError as e:
            logger.error(
                "CSP configuration validation failed",
                extra={"error": str(e)},
                exc_info=True
            )
            raise ConfigurationError(f"Invalid CSP configuration: {str(e)}")
        
        logger.info(
            "Security headers middleware initialized",
            extra={
                "environment": self.env,
                "cross_origin_isolation": self.enable_isolation,
                "csp_extensions": {
                    "connect": len(self.csp_connect_extra),
                    "img": len(self.csp_img_extra),
                    "script": len(self.csp_script_extra),
                    "style": len(self.csp_style_extra),
                    "frame": len(self.csp_frame_extra)
                }
            }
        )

    def _build_csp(self, scheme_https: bool) -> str:
        """
        Build Content Security Policy header value.
        
        Args:
            scheme_https: Whether request is over HTTPS
            
        Returns:
            CSP header value string
            
        Raises:
            CSPValidationError: If CSP building fails
            HeaderBuildError: If header value is invalid
            
        Notes:
            - Baseline directives use 'self'
            - Extended with environment-specific sources
            - 'unsafe-inline' allowed for styles (UI frameworks)
            - upgrade-insecure-requests added for HTTPS
        """
        try:
            # Build directive sources
            default_src = ["'self'"]
            script_src = ["'self'"] + self.csp_script_extra
            style_src = ["'self'", "'unsafe-inline'"] + self.csp_style_extra
            img_src = ["'self'", "data:"] + self.csp_img_extra
            font_src = ["'self'"]
            connect_src = ["'self'"] + self.csp_connect_extra
            frame_src = ["'self'"] + self.csp_frame_extra
            object_src = ["'none'"]
            base_uri = ["'self'"]
            frame_anc = ["'none'"]  # Replaces X-Frame-Options
            
            # Build directives dict
            directives: Dict[str, List[str]] = {
                "default-src": default_src,
                "script-src": script_src,
                "style-src": style_src,
                "img-src": img_src,
                "font-src": font_src,
                "connect-src": connect_src,
                "frame-src": frame_src,
                "object-src": object_src,
                "base-uri": base_uri,
                "frame-ancestors": frame_anc,
            }
            
            # Validate all directives
            for directive, sources in directives.items():
                _validate_csp_directive(directive, sources)
            
            # Build CSP string
            csp_parts = [f"{k} {' '.join(v)}" for k, v in directives.items()]
            
            # Add upgrade-insecure-requests for HTTPS
            if scheme_https:
                csp_parts.append("upgrade-insecure-requests")
            
            csp_value = "; ".join(csp_parts)
            
            # Validate final header value
            _validate_header_value(csp_value, "Content-Security-Policy")
            
            logger.debug(
                "CSP header built",
                extra={
                    "https": scheme_https,
                    "directive_count": len(directives),
                    "csp_length": len(csp_value)
                }
            )
            
            return csp_value
            
        except (CSPValidationError, HeaderBuildError) as e:
            logger.error(
                "Failed to build CSP header",
                extra={"error": str(e)},
                exc_info=True
            )
            raise

    def _detect_https(self, scope: Scope) -> bool:
        """
        Detect if request is over HTTPS.
        
        Args:
            scope: ASGI scope
            
        Returns:
            True if HTTPS, False otherwise
            
        Notes:
            Checks multiple sources:
            1. scope['scheme']
            2. X-Forwarded-Proto header (proxy/load balancer)
            3. X-Forwarded-Ssl header (some proxies)
        """
        # Check scope scheme
        scheme = (scope.get("scheme") or "http").lower()
        if scheme == "https":
            return True
        
        # Check X-Forwarded-Proto header (common behind proxies)
        try:
            headers = dict(scope.get("headers", []))
            forwarded_proto = headers.get(b"x-forwarded-proto", b"").decode("latin1").lower()
            
            if forwarded_proto == "https":
                logger.debug("HTTPS detected via X-Forwarded-Proto")
                return True
            
            # Check X-Forwarded-Ssl header (some proxies use this)
            forwarded_ssl = headers.get(b"x-forwarded-ssl", b"").decode("latin1").lower()
            if forwarded_ssl == "on":
                logger.debug("HTTPS detected via X-Forwarded-Ssl")
                return True
                
        except Exception as e:
            logger.warning(
                "Error detecting HTTPS from headers",
                extra={"error": str(e)}
            )
        
        return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Process request and apply security headers.
        
        Args:
            scope: ASGI scope
            receive: ASGI receive callable
            send: ASGI send callable
            
        Notes:
            - Only processes HTTP requests (skips websockets)
            - Applies headers to response start message
            - Fails safe (continues on errors)
            - Logs all header application
        """
        # Skip non-HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            """Add security headers to response"""
            if message["type"] == "http.response.start":
                try:
                    mh = MutableHeaders(raw=message.get("headers", []))
                    
                    # Detect HTTPS
                    is_https = self._detect_https(scope)
                    
                    # ===== CORE SECURITY HEADERS (ALWAYS APPLIED) =====
                    
                    # Prevent MIME-sniffing
                    mh.setdefault("X-Content-Type-Options", "nosniff")
                    
                    # Referrer policy (privacy)
                    mh.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
                    
                    # ===== ENVIRONMENT-SPECIFIC HEADERS =====
                    
                    if self.env == "production":
                        # Clickjacking protection (strict)
                        mh.setdefault("X-Frame-Options", DEFAULT_FRAME_OPTION_PROD)
                        
                        # Cross-origin policies
                        mh.setdefault("Cross-Origin-Opener-Policy", "same-origin")
                        mh.setdefault("Cross-Origin-Resource-Policy", "same-site")
                        
                        # Permissions policy (restrict features)
                        mh.setdefault(
                            "Permissions-Policy",
                            "geolocation=(), microphone=(), camera=()"
                        )
                        
                        # Content Security Policy
                        try:
                            csp_value = self._build_csp(is_https)
                            mh.setdefault("Content-Security-Policy", csp_value)
                        except (CSPValidationError, HeaderBuildError) as e:
                            logger.error(
                                "Failed to apply CSP header",
                                extra={"error": str(e)}
                            )
                        
                        # HSTS (only on HTTPS)
                        if is_https:
                            hsts_value = _build_hsts_header(
                                include_subdomains=HSTS_INCLUDE_SUBDOMAINS,
                                preload=HSTS_PRELOAD
                            )
                            mh.setdefault("Strict-Transport-Security", hsts_value)
                            
                            logger.debug(
                                "HSTS header applied",
                                extra={"max_age": HSTS_MAX_AGE}
                            )
                    else:
                        # Development: relaxed framing for debugging
                        mh.setdefault("X-Frame-Options", DEFAULT_FRAME_OPTION_DEV)
                        
                        logger.debug(
                            "Development security headers applied",
                            extra={"environment": self.env}
                        )
                    
                    # ===== OPTIONAL: CROSS-ORIGIN ISOLATION =====
                    
                    if self.enable_isolation:
                        # Enable cross-origin isolation (can break embeds)
                        mh.setdefault("Cross-Origin-Embedder-Policy", "require-corp")
                        
                        logger.debug("Cross-origin isolation enabled")
                    
                    message["headers"] = mh.raw
                    
                    logger.debug(
                        "Security headers applied",
                        extra={
                            "path": scope.get("path"),
                            "https": is_https,
                            "environment": self.env
                        }
                    )
                    
                except Exception as e:
                    # Log error but don't break response
                    logger.error(
                        "Error applying security headers",
                        extra={
                            "error": str(e),
                            "path": scope.get("path")
                        },
                        exc_info=True
                    )
            
            await send(message)

        await self.app(scope, receive, send_with_headers)
