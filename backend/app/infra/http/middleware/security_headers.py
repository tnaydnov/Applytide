from __future__ import annotations
import os
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.datastructures import MutableHeaders

def _split_env(value: str | None) -> list[str]:
    if not value: return []
    return [x.strip() for x in value.split(",") if x.strip()]

class SecurityHeadersMiddleware:
    """
    Lightweight ASGI middleware to append modern security headers.
    - Production: strict defaults + CSP + HSTS (HTTPS only) + COOP/CORP.
    - Dev: keep minimal to avoid breaking local tooling.
    Configure extras through env:
      CSP_CONNECT_SRC_EXTRA, CSP_IMG_SRC_EXTRA, CSP_SCRIPT_SRC_EXTRA, CSP_STYLE_SRC_EXTRA, CSP_FRAME_SRC_EXTRA
      ENABLE_CROSS_ORIGIN_ISOLATION=true  (adds COEP: require-corp; can break embeds)
    """
    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.env = os.getenv("ENVIRONMENT", "development").lower()
        self.enable_isolation = os.getenv("ENABLE_CROSS_ORIGIN_ISOLATION", "false").lower() == "true"

        # Allow extending CSP at runtime
        self.csp_connect_extra = _split_env(os.getenv("CSP_CONNECT_SRC_EXTRA"))
        self.csp_img_extra     = _split_env(os.getenv("CSP_IMG_SRC_EXTRA"))
        self.csp_script_extra  = _split_env(os.getenv("CSP_SCRIPT_SRC_EXTRA"))
        self.csp_style_extra   = _split_env(os.getenv("CSP_STYLE_SRC_EXTRA"))
        self.csp_frame_extra   = _split_env(os.getenv("CSP_FRAME_SRC_EXTRA"))

    def _build_csp(self, scheme_https: bool) -> str:
        # Conservative baseline; expand via *_EXTRA envs as needed.
        default_src = ["'self'"]
        script_src  = ["'self'"] + self.csp_script_extra
        style_src   = ["'self'", "'unsafe-inline'"] + self.csp_style_extra  # allow inline in UI frameworks; tighten if you add nonces
        img_src     = ["'self'", "data:"] + self.csp_img_extra
        font_src    = ["'self'"]
        connect_src = ["'self'"] + self.csp_connect_extra
        frame_src   = ["'self'"] + self.csp_frame_extra
        object_src  = ["'none'"]
        base_uri    = ["'self'"]
        frame_anc   = ["'none'"]  # replaces X-Frame-Options

        directives = {
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
        return "; ".join(f"{k} {' '.join(v)}" for k, v in directives.items())

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                mh = MutableHeaders(raw=message.get("headers", []))
                if self.env == "production":
                    scheme = (scope.get("scheme") or "http").lower()
                    is_https = scheme == "https"
                    # Modern core headers
                    mh.setdefault("X-Content-Type-Options", "nosniff")
                    mh.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
                    mh.setdefault("Cross-Origin-Opener-Policy", "same-origin")
                    mh.setdefault("Cross-Origin-Resource-Policy", "same-site")
                    mh.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
                    # CSP (customizable)
                    mh.setdefault("Content-Security-Policy", self._build_csp(is_https))
                    # HSTS (only if HTTPS)
                    if is_https:
                        mh.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
                    # Legacy fallback for very old clients (harmless otherwise)
                    mh.setdefault("X-Frame-Options", "DENY")
                else:
                    # Dev: keep minimal
                    mh.setdefault("X-Content-Type-Options", "nosniff")
                    mh.setdefault("X-Frame-Options", "SAMEORIGIN")

                # Optional: isolation (opt-in; can break embeds)
                if self.enable_isolation:
                    mh.setdefault("Cross-Origin-Embedder-Policy", "require-corp")

                message["headers"] = mh.raw
            await send(message)

        await self.app(scope, receive, send_with_headers)
