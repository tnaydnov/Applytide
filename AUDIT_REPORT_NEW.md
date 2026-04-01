# Backend Security & Architecture Audit Report (New Findings)

**Scope:** `backend/app/` - routers, deps, infra, config, main  
**Date:** 2025  
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW → INFO  
**Exclusions:** Error detail leaks (str(e) in HTTPException), `datetime.utcnow()`, pagination bounds, bare except in `exception_handlers.py`, auth on AI extract, Redis namespacing, WebSocket auth, sessions SECRET_KEY, FK/unique constraints, rate limiter hardening.

---

## Finding 1 - HTML Injection in Feedback Email

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **File** | `backend/app/api/routers/feedback.py` |
| **Lines** | 53–55 |
| **Category** | Injection / XSS |

**Description:**  
User-supplied `name`, `email`, and `message` are interpolated directly into an HTML email body via f-string without any escaping. An attacker can inject arbitrary HTML/JavaScript into the support team's email client.

**Code:**
```python
# feedback.py lines 53-55 inside _feedback_html()
<p><b>From:</b> {name or 'Anonymous'}</p>
<p><b>Email:</b> {email or 'Not provided'}</p>
<div><b>Message:</b>...<div style="...">{message}</div></div>
```

**Impact:**  
Stored XSS in email - phishing links, credential harvesting payloads, or scripts rendered in the admin's mail client.

**Fix:**
```python
from html import escape

def _feedback_html(name: str, email: str, feedback_type: str, message: str, has_screenshot: bool) -> str:
    safe_name    = escape(name or "Anonymous")
    safe_email   = escape(email or "Not provided")
    safe_message = escape(message)
    # ... use safe_* values in the template
```

---

## Finding 2 - User Enumeration via Password Reset

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `backend/app/api/routers/auth/password.py` |
| **Lines** | 132–138 |
| **Category** | Information Disclosure |

**Description:**  
When a non-existent email requests a password reset, the endpoint returns HTTP 404 with `"This email address is not registered."` This lets attackers enumerate valid accounts.

**Code:**
```python
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="This email address is not registered. Please check your email or create an account."
    )
```

**Fix:**  
Always return the same 200 response with a generic message regardless of whether the email exists:
```python
if not user:
    logger.warning("Password reset for non-existent email", extra={"email": payload.email})
    return schemas.MessageResponse(
        message="If that email is registered, a password reset link has been sent."
    )
```

---

## Finding 3 - Unsanitised Filename in Avatar URL (Path Traversal)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `backend/app/api/routers/auth/avatar.py` |
| **Lines** | 142 |
| **Category** | Path Traversal / Injection |

**Description:**  
`file.filename` is taken directly from the client and embedded in the stored `avatar_url`. Filenames like `../../etc/passwd` or `<img onerror=...>` are never sanitised. Even though no file is actually written to disk today, the stored URL could be used by a frontend or future CDN integration to serve or traverse paths.

**Code:**
```python
avatar_url = f"/avatars/{current_user.id}/{file.filename}"
current_user.avatar_url = avatar_url
```

**Fix:**
```python
import os, uuid

safe_ext = os.path.splitext(file.filename or "")[1].lower()
if safe_ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
    raise HTTPException(status_code=400, detail="Invalid image format")
safe_name = f"{uuid.uuid4().hex}{safe_ext}"
avatar_url = f"/avatars/{current_user.id}/{safe_name}"
```

---

## Finding 4 - Feedback Endpoint Has No Authentication

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `backend/app/api/routers/feedback.py` |
| **Lines** | 68 (`@router.post("")`) |
| **Category** | Missing Auth / Abuse |

**Description:**  
The `submit_feedback` endpoint is fully unauthenticated. Combined with rate limiting only at the global middleware level, an attacker can flood the support inbox with spam feedback and trigger unbounded email sends.

**Fix:**  
Either add `Depends(get_current_user)` or add a dedicated per-IP rate limiter similar to the one on login/registration:
```python
@router.post("")
async def submit_feedback(
    ...,
    current_user: models.User = Depends(get_current_user),  # option A
):
```
Or, if anonymous feedback is intentional, add a tighter rate limiter + CAPTCHA validation.

---

## Finding 5 - Untyped `dict` Payload (No Validation)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `backend/app/api/routers/applications/attachments.py` |
| **Lines** | 35 |
| **Category** | Input Validation |

**Description:**  
`attach_from_document` accepts `payload: dict` - a raw dictionary with no schema validation. Any JSON body is accepted; missing or malformed `document_id` / `document_type` keys will only fail deep inside the service layer with opaque errors.

**Code:**
```python
@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: dict,   # ← no validation
    ...
):
```

**Fix:**  
Define a Pydantic model:
```python
from pydantic import BaseModel
from uuid import UUID

class AttachFromDocumentPayload(BaseModel):
    document_id: UUID
    document_type: str  # consider an enum constraint

@router.post("/{app_id}/attachments/from-document", response_model=AttachmentOut)
def attach_from_document(
    app_id: uuid.UUID,
    payload: AttachFromDocumentPayload,
    ...
):
```

---

## Finding 6 - Temp File Leak in Analytics Export

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `backend/app/api/routers/analytics.py` |
| **Lines** | 189, 433 |
| **Category** | Resource Leak |

**Description:**  
Both the CSV export and the PDF-text-fallback use `tempfile.NamedTemporaryFile(delete=False)` and pass the path to `FileResponse`. After the response is streamed, the temp file is **never deleted**. Over time this fills `/tmp` with user data.

**Code:**
```python
temp_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", newline="")
# ... write data ...
return FileResponse(temp_file.name, ...)
# ← no cleanup callback
```

**Fix:**  
Use Starlette's `background` parameter to clean up after streaming:
```python
from starlette.background import BackgroundTask

return FileResponse(
    temp_file.name,
    media_type="text/csv",
    filename=f"analytics-data-{range_param}.csv",
    background=BackgroundTask(os.unlink, temp_file.name),
)
```

---

## Finding 7 - Entire File Read Into Memory Before Size Check

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `backend/app/api/routers/documents/upload.py` |
| **Lines** | ~173 |
| **Category** | Denial of Service |

**Description:**  
`content = await file.read()` ingests the entire upload into memory before any size validation. A client can send a very large file and consume server RAM. The size is only checked implicitly downstream in the document store.

**Code:**
```python
content = await file.read()
if not content:
    raise HTTPException(status_code=400, detail="Empty file")
# No explicit size check on len(content) here
```

**Fix:**  
Add an explicit size guard immediately after reading (or better, stream in chunks):
```python
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

content = await file.read()
if not content:
    raise HTTPException(status_code=400, detail="Empty file")
if len(content) > MAX_UPLOAD_BYTES:
    raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
```
For production hardening, also set `client_max_body_size` at the reverse-proxy (nginx) level.

---

## Finding 8 - Duplicate CryptContext in `disable_2fa`

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `backend/app/api/routers/auth/twofa.py` |
| **Lines** | 178–179 |
| **Category** | Code Quality / Security Consistency |

**Description:**  
`disable_2fa` creates a fresh `CryptContext` at call time (`from passlib.context import CryptContext`) instead of using the shared `verify_password` function from `infra.security.passwords`. This duplicates hashing config and risks drift (e.g. if bcrypt rounds are changed centrally).

**Code:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
if not pwd_context.verify(body.password, current_user.password_hash):
```

**Fix:**
```python
from ....infra.security.passwords import verify_password

if not verify_password(body.password, current_user.password_hash):
    raise HTTPException(status_code=401, detail="Incorrect password")
```

---

## Finding 9 - No Validation on Preference Key

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `backend/app/api/routers/preferences.py` |
| **Lines** | 113 (GET `/{preference_key}`) and all CRUD endpoints |
| **Category** | Input Validation |

**Description:**  
`preference_key` is an unconstrained `str` path/body parameter. There is no length limit, character whitelist, or regex pattern. Users can store keys with arbitrary length, special characters, or empty strings.

**Fix:**  
Add constraints in both the Pydantic schema and the path parameter:
```python
from pydantic import Field

class PreferenceCreate(BaseModel):
    preference_key: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    preference_value: Any
```
```python
from fastapi import Path

@router.get("/{preference_key}")
def get_user_preference(
    preference_key: str = Path(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$"),
    ...
):
```

---

## Finding 10 - `response_model=dict` on Dashboard Endpoints

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `backend/app/api/routers/dashboard.py` |
| **Lines** | 40 |
| **Category** | API Contract / Type Safety |

**Description:**  
Both dashboard endpoints use `response_model=dict` instead of a typed Pydantic response model. This means:
- No automatic response validation or filtering of extra fields
- OpenAPI docs show an unconstrained `object` with no schema
- Any internal data accidentally added to the dict leaks to clients

**Code:**
```python
@router.get("/metrics", response_model=dict)
def metrics(...):
```

**Fix:**  
Define explicit response models:
```python
from pydantic import BaseModel

class DashboardMetrics(BaseModel):
    total_jobs: int
    total_resumes: int
    total_applications: int
    status_breakdown: dict[str, int]

@router.get("/metrics", response_model=DashboardMetrics)
```

---

## Finding 11 - Dev CORS Allows All Methods & Headers

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `backend/app/main.py` |
| **Lines** | ~108–112 |
| **Category** | CORS Misconfiguration |

**Description:**  
In non-production mode, CORS uses `allow_methods=["*"]` and `allow_headers=["*"]`. While gated to dev, if the `ENVIRONMENT` env var is ever misconfigured in staging/production, this opens the API to cross-origin requests with any method or header.

**Fix:**  
Explicitly list allowed methods and headers even in dev:
```python
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
```

---

## Finding 12 - Fragile `.format()` SQL Construction in Fulltext Search

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `backend/app/infra/search/fulltext.py` |
| **Lines** | 403–411 |
| **Category** | SQL Injection (Latent) |

**Description:**  
`suggest_search_terms` builds a SQL query using Python `.format()` to inject a stop-words list and an optional `user_clause`. The stop words come from a hardcoded constant set (`STOP_WORDS`), so this is **not currently exploitable**. However, if `STOP_WORDS` ever becomes configurable or includes apostrophes, this becomes a direct SQL injection vector.

**Code:**
```python
stop_words_list = "','".join(STOP_WORDS)

query = """
    ...
    AND word NOT IN ('{stop_words}')
    ...
""".format(
    user_clause="AND j.user_id = :user_id" if user_id else "",
    stop_words=stop_words_list
)
```

**Fix:**  
Use a parameterised array comparison:
```python
query = """
    ...
    AND word != ALL(:stop_words)
    ...
"""
params["stop_words"] = list(STOP_WORDS)
```

---

## Finding 13 - LIKE Wildcard Injection in Admin Error Filter

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `backend/app/api/routers/admin/errors.py` |
| **Lines** | 122 |
| **Category** | Input Sanitisation |

**Description:**  
The `endpoint` query parameter is inserted into an `ilike(f"%{endpoint}%")` filter. While SQLAlchemy parameterises the value (no SQL injection), an admin user can inject LIKE metacharacters (`%`, `_`) to craft broader-than-intended matches. Risk is low since the endpoint is admin-only.

**Code:**
```python
stmt = stmt.where(models.ApplicationLog.endpoint.ilike(f"%{endpoint}%"))
```

**Fix:**  
Escape LIKE metacharacters:
```python
def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

stmt = stmt.where(
    models.ApplicationLog.endpoint.ilike(f"%{escape_like(endpoint)}%", escape="\\")
)
```

---

## Finding 14 - Deprecated `@app.on_event` Lifecycle Pattern

| Field | Value |
|-------|-------|
| **Severity** | INFO |
| **File** | `backend/app/main.py` |
| **Lines** | Startup/shutdown event handlers |
| **Category** | Deprecation |

**Description:**  
The app uses `@app.on_event("startup")` and `@app.on_event("shutdown")` which are deprecated in FastAPI ≥ 0.93 in favour of the `lifespan` async context manager.

**Fix:**
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup logic
    yield
    # shutdown logic

app = FastAPI(lifespan=lifespan)
```

---

## Summary Table

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | CRITICAL | HTML injection in feedback email | `feedback.py:53` |
| 2 | HIGH | User enumeration via password reset 404 | `auth/password.py:132` |
| 3 | HIGH | Unsanitised filename in avatar URL | `auth/avatar.py:142` |
| 4 | HIGH | No auth on feedback endpoint | `feedback.py:68` |
| 5 | HIGH | Untyped `dict` payload - no validation | `applications/attachments.py:35` |
| 6 | MEDIUM | Temp file leak in analytics export | `analytics.py:189,433` |
| 7 | MEDIUM | Full file read into memory before size check | `documents/upload.py:173` |
| 8 | MEDIUM | Duplicate CryptContext in `disable_2fa` | `auth/twofa.py:178` |
| 9 | MEDIUM | No validation on preference key | `preferences.py` (all CRUD) |
| 10 | MEDIUM | `response_model=dict` - no typed contract | `dashboard.py:40` |
| 11 | LOW | Dev CORS allows all methods/headers | `main.py:108` |
| 12 | LOW | Fragile `.format()` SQL (latent injection) | `fulltext.py:403` |
| 13 | LOW | LIKE wildcard injection in admin filter | `admin/errors.py:122` |
| 14 | INFO | Deprecated `@app.on_event` lifecycle | `main.py` |
