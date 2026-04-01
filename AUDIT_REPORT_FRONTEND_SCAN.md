# Frontend Security & Quality Audit Report

**Scope:** `newfront/` (React/TypeScript)  
**Date:** 2026-02-21  
**Type:** Research-only scan

---

## 1. XSS via `dangerouslySetInnerHTML`

**Status: ✅ PASS - All instances are sanitized**

4 source-code instances found (excluding `dist/` build artifacts). All use `DOMPurify.sanitize()`:

| # | File | Line | Snippet |
|---|------|------|---------|
| 1 | `newfront/pages/documents/components/DocumentPreviewModal.tsx` | 206 | `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}` |
| 2 | `newfront/components/legal/LegalSection.tsx` | 28 | `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}` |
| 3 | `newfront/components/legal/LegalSection.tsx` | 46 | `<li key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }} />` |
| 4 | `newfront/components/legal/LegalSection.tsx` | 75 | `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }}` |

**Verdict:** No unsanitized `dangerouslySetInnerHTML` usage. DOMPurify v3.3.1 is installed and consistently applied.

---

## 2. Hardcoded Secrets / API Keys

**Status: ✅ PASS - No hardcoded secrets found**

Search patterns checked: `sk-`, `pk_live`, `pk_test`, `sk_live`, `sk_test`, `api_key =`, `STRIPE_PUBLIC`, `GOOGLE_MAPS_API`, `publishableKey`, `FIREBASE`.

- All `password` references are UI labels/translations (`auth.ts`) or validator logic (`validators.ts`).
- No `import.meta.env` references contain embedded secrets - only `import.meta.env.DEV` (build-time boolean) is used.
- No Stripe publishable keys, Google API keys, or Firebase config found inlined in source.

**Verdict:** Clean. API communication goes through `/api/v1` reverse proxy with httpOnly cookies - no client-side tokens stored.

---

## 3. Error Boundaries

**Status: ✅ PASS - Properly implemented**

| File | Details |
|------|---------|
| `newfront/components/shared/ErrorBoundary.tsx` | Full class component with `getDerivedStateFromError`, `componentDidCatch`, reset/reload buttons, dev-only error display |
| `newfront/App.tsx` (line 121) | `<ErrorBoundary>` wraps the entire `<Suspense>` / `<Routes>` tree |

**Verdict:** A single top-level `ErrorBoundary` wraps all routes. Any component render crash will be caught and shown a recovery UI. Consider adding granular boundaries around individual feature sections (dashboard, pipeline, etc.) so one section crashing doesn't blank the entire app, but current coverage is adequate.

---

## 4. Unused Imports

**Status: ✅ PASS - No unused imports found**

| File | Imported | Used? |
|------|----------|-------|
| **App.tsx** | `lazy, Suspense, useState` | ✅ All used (lazy pages, Suspense fallback, navigation state) |
| **App.tsx** | `BrowserRouter, Routes, Route, Navigate` | ✅ All used in routing |
| **App.tsx** | `ErrorBoundary, PageLoader, useScrollToTop, PageTransition, DevTools` | ✅ All referenced in JSX |
| **main.tsx** | `React, ReactDOM, App, globals.css` | ✅ All used |
| **AuthContext.tsx** | `createContext, useContext, useState, useEffect, ReactNode` | ✅ All used |
| **AuthContext.tsx** | `api, login as apiLogin` | ✅ `apiLogin` used in `login()` function |
| **AuthContext.tsx** | `useNavigate, useLocation` | ✅ Both used in effects/handlers |
| **AuthContext.tsx** | `isPublicRoute, safeGetItem, safeRemoveItem, logger` | ✅ All used |

**Verdict:** No dead imports in the three main files.

---

## 5. Missing Loading States

**Severity: 🟡 LOW**

Most pages properly implement loading states. One case found:

| # | File | Line | Severity | Issue |
|---|------|------|----------|-------|
| 1 | `newfront/pages/reminders/components/GoogleCalendarButton.tsx` | 23 | LOW | `remindersApi.checkGoogleConnection().then(setConnected)` fires in `useEffect` without a loading indicator. The `connected` state starts as `null` and the component renders conditionally based on it, but there's no spinner/skeleton while the API call is in-flight. |

**Files with proper loading states (no issues):**
- `PipelinePage.tsx` - uses `useState(true)` for loading, shows `<LoadingSpinner />`
- `DocumentPreviewModal.tsx` - has `isLoading` state with spinner
- `AuthContext.tsx` - has `loading` state that gates child rendering
- `SignUpPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` - all have loading state for form submissions

---

## 6. Uncaught Promise Rejections

**Severity: 🟡 MEDIUM**

### 6a. `.then()` without `.catch()` (fire-and-forget)

| # | File | Line | Snippet | Severity |
|---|------|------|---------|----------|
| 1 | `newfront/pages/reminders/components/GoogleCalendarButton.tsx` | 23 | `remindersApi.checkGoogleConnection().then(setConnected);` | **MEDIUM** - No `.catch()`, will produce unhandled rejection if API fails |
| 2 | `newfront/pages/pipeline/PipelinePage.tsx` | 120 | `loadData().then(() => { if (cancelled) return; });` | LOW - `loadData` itself has try/catch, so parent promise won't reject. Safe. |

### 6b. API layer `.then()` chains

The API modules (`features/jobs/api.ts`, `features/applications/api.ts`, `features/dashboard/api.ts`) use `.then()` chains extensively but **do not add `.catch()` at the API layer** - they rely on callers to handle errors. This is an intentional pattern (promise propagation), not a bug. However:

| # | File | Lines | Note |
|---|------|-------|------|
| 1 | `features/jobs/api.ts` | 93–136 | 12 `.then()` chains without `.catch()` - only `getSearchSuggestions` (line 158) has a `.catch(() => [])` |
| 2 | `features/applications/api.ts` | 116–232 | 15 `.then()` chains without `.catch()` - relies entirely on caller error handling |
| 3 | `features/dashboard/api.ts` | 93–134 | 5 `.then()` chains - only `getWeeklyGoal` has `.catch(() => 5)` |

**Risk:** If any page calls these APIs without try/catch, it will produce an unhandled promise rejection. The `apiFetch` wrapper doesn't throw structured errors for non-2xx responses (it returns the Response object), so callers that don't check `response.ok` may silently process error bodies.

**Verdict:** Most page-level callers use `try/catch` properly. The one confirmed issue is `GoogleCalendarButton.tsx` line 23.

---

## 7. Accessibility Issues

### 7a. Buttons without `type` attribute

**Severity: 🟠 MEDIUM - 283 instances found**

The custom `<Button>` component (`components/ui/button.tsx`) does **not** set a default `type` attribute. Per HTML spec, buttons without `type` default to `type="submit"`, which can cause unintended form submissions.

**Representative samples of native `<button>` elements missing `type`:**

| # | File | Line | Snippet |
|---|------|------|---------|
| 1 | `components/auth/SignInForm.tsx` | 251 | `<button onClick={onToggleMode} style={{ color: "#BF7FA0" }}>` |
| 2 | `components/auth/SignUpForm.tsx` | 333 | `<button ...>` (toggle to sign-in) |
| 3 | `components/layout/Sidebar.tsx` | ~various | Multiple nav `<button>` elements |
| 4 | `pages/profile/components/ActivityLogSection.tsx` | 137 | `<button className="text-[#9F5F80] hover:underline font-medium">` (Load More) |
| 5 | `pages/profile/components/ProfileHeader.tsx` | 76, 90, 101 | Multiple `<button>` elements for avatar/edit actions |
| 6 | `pages/reminders/components/ReminderDetailsModal.tsx` | 257 | `<button onClick={onClose} ...>` (close button) |
| 7 | `pages/reminders/components/WeekView.tsx` | 124, 165 | Calendar navigation buttons |
| 8 | `pages/pricing/PricingHero.tsx` | 120, 149 | CTA buttons |
| 9 | `pages/pricing/PricingFAQ.tsx` | 135 | FAQ accordion toggle |
| 10 | `components/admin/BanUserModal.tsx` | 98 | Ban reason selector |

**Note:** The `SignInForm.tsx` line 102 `<button type="button" onClick={onForgotPassword}>` is correctly typed - this is a positive example.

**Recommendation:** Add `type="button"` as default in the `<Button>` component, or add it explicitly to all non-submit buttons.

### 7b. Images without `alt` attribute

**Status: ✅ PASS**

All 6 `<img>` elements found have proper `alt` attributes:
- `HeroSection.tsx:427` - `alt="Applytide"`
- `Header.tsx:105` - `alt="Applytide"`
- `Sidebar.tsx:83` - `alt="Applytide"`
- `AuthCard.tsx:82` - `alt="Applytide Logo"`
- `ResetPasswordPage.tsx:119` - `alt="Applytide Logo"`
- `ForgotPasswordPage.tsx:64` - `alt="Applytide Logo"`

### 7c. Form inputs without labels or aria-label

**Severity: 🟡 LOW**

Most form inputs use proper `<label>` elements or are wrapped in labeled containers. A few cases use `placeholder` as the only accessible name:

| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `pages/profile/components/ProfileSidebar.tsx` | 194 | `<input type="file">` for avatar upload - hidden but no aria-label |
| 2 | `pages/profile/components/ProfileHeader.tsx` | 115 | `<input type="file">` for avatar - hidden, no aria-label |
| 3 | `pages/pipeline/components/DocumentsManager.tsx` | 572 | `<input type="file">` for document upload - likely hidden |
| 4 | `pages/reminders/components/TimeInput.tsx` | 57 | `<input>` for time - may rely on parent label |

**Note:** Hidden file inputs (triggered via button click) are low-severity since they're not keyboard-navigable by default, but adding `aria-label` is still best practice.

---

## Summary

| Category | Status | Severity | Count |
|----------|--------|----------|-------|
| XSS via dangerouslySetInnerHTML | ✅ PASS | - | 0 issues |
| Hardcoded secrets | ✅ PASS | - | 0 issues |
| Error boundaries | ✅ PASS | - | 0 issues |
| Unused imports | ✅ PASS | - | 0 issues |
| Missing loading states | 🟡 | LOW | 1 instance |
| Uncaught promise rejections | 🟡 | MEDIUM | 1 confirmed, pattern risk in API layer |
| Buttons without `type` | 🟠 | MEDIUM | ~283 instances |
| Images without `alt` | ✅ PASS | - | 0 issues |
| Inputs without labels | 🟡 | LOW | ~4 instances |

### Priority Fixes
1. **Button component default type** - Add `type="button"` as default prop in `components/ui/button.tsx` to prevent accidental form submissions across all 283+ usages.
2. **GoogleCalendarButton.tsx line 23** - Add `.catch()` handler to prevent unhandled rejection.
3. **File inputs** - Add `aria-label` to hidden file upload inputs for screen reader support.
