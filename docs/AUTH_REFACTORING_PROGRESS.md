# Auth.py Refactoring Progress Tracker

## Overview
- **Original File:** `backend/app/api/routers/auth.py` (1,336 lines)
- **Target:** 8 focused modules (150-200 lines each)
- **Status:** 🔄 IN PROGRESS

---

## File Split Plan

### ✅ **1. tokens.py** (COMPLETED)
**Lines:** ~90 lines  
**Endpoints:**
- ✅ `POST /extension-token` - Browser extension auth token
- ✅ `POST /ws-ticket` - WebSocket authentication ticket

**Dependencies:**
- `create_access_token` from infra.security.tokens
- `get_current_user` dep
- `schemas.ExtensionTokenOut`

---

### 🔄 **2. registration.py** (NEXT)
**Lines:** ~250 lines  
**Endpoints:**
- `POST /register` - User registration
- `POST /send_verification` - Resend verification email
- `POST /verify_email` - Verify email with token

**Dependencies:**
- `hash_password` from infra.security.passwords
- `create_access_token`, `create_refresh_token`, `create_email_token`
- `login_limiter`, `email_limiter`
- `email_service`
- `get_client_info` helper function

---

### ⏳ **3. core.py** (PENDING)
**Lines:** ~350 lines  
**Endpoints:**
- `POST /login` - Email/password authentication
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout current session
- `POST /logout_all` - Logout all sessions

**Dependencies:**
- `verify_password`
- `create_access_token`, `create_refresh_token`, `decode_refresh`
- `revoke_refresh_token`, `revoke_all_user_tokens`
- `login_limiter`, `refresh_limiter`
- `get_client_info` helper

---

### ⏳ **4. password.py** (PENDING)
**Lines:** ~150 lines  
**Endpoints:**
- `POST /password_reset_request` - Request password reset
- `POST /password_reset` - Reset password with token

**Dependencies:**
- `hash_password`, `verify_password`
- `create_email_token`, `verify_email_token`
- `email_limiter`
- `email_service`

---

### ⏳ **5. profile.py** (PENDING)
**Lines:** ~200 lines  
**Endpoints:**
- `GET /me` - Get current user info
- `PUT /profile` - Update user profile
- `PUT /preferences` - Update user preferences

**Dependencies:**
- `get_current_user` dep
- `schemas.UserInfo`, `schemas.ProfileUpdateIn`, `schemas.PreferencesUpdateIn`

---

### ⏳ **6. avatar.py** (PENDING)
**Lines:** ~100 lines  
**Endpoints:**
- `POST /upload-avatar` - Upload user avatar

**Dependencies:**
- `get_current_user` dep
- File upload handling
- Avatar storage logic

---

### ⏳ **7. oauth.py** (PENDING)
**Lines:** ~200 lines  
**Endpoints:**
- `GET /google/login` - Initiate Google OAuth flow
- `GET /google/callback` - Handle Google OAuth callback

**Dependencies:**
- `GoogleOAuthService`
- `create_access_token`, `create_refresh_token`
- Cookie handling

---

### ⏳ **8. __init__.py** (FINAL)
**Lines:** ~50 lines  
**Purpose:** Combine all routers into single router for backward compatibility

**Pattern:**
```python
from fastapi import APIRouter
from . import tokens, registration, core, password, profile, avatar, oauth

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Include all sub-routers
router.include_router(tokens.router)
router.include_router(registration.router)
router.include_router(core.router)
router.include_router(password.router)
router.include_router(profile.router)
router.include_router(avatar.router)
router.include_router(oauth.router)
```

---

## Shared Utilities

### `utils.py` (Helper Functions)
**Functions:**
- `get_client_info(request)` - Extract user agent and IP
- Shared between multiple modules

---

## Import Updates Required

### Files that import auth router:
1. ✅ `backend/app/main.py` - `from .api.routers.auth import router as auth_router`
   - Will work automatically after __init__.py created

---

## Testing Checklist

After refactoring completion:
- [ ] Registration flow works
- [ ] Login/logout works
- [ ] Token refresh works
- [ ] Email verification works
- [ ] Password reset works
- [ ] Profile updates work
- [ ] Avatar upload works
- [ ] Google OAuth works
- [ ] Extension token generation works
- [ ] WebSocket ticket generation works

---

## Progress
- [x] Phase 1: Create directory structure
- [x] Phase 2: Extract tokens.py (2/17 endpoints)
- [ ] Phase 3: Extract registration.py (3/17 endpoints)
- [ ] Phase 4: Extract core.py (4/17 endpoints)
- [ ] Phase 5: Extract password.py (2/17 endpoints)
- [ ] Phase 6: Extract profile.py (3/17 endpoints)
- [ ] Phase 7: Extract avatar.py (1/17 endpoints)
- [ ] Phase 8: Extract oauth.py (2/17 endpoints)
- [ ] Phase 9: Create utils.py (shared helpers)
- [ ] Phase 10: Create __init__.py (barrel export)
- [ ] Phase 11: Test all endpoints
- [ ] Phase 12: Update documentation

**Current Status:** 2/17 endpoints extracted (12% complete)
