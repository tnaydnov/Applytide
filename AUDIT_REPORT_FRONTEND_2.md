# Frontend Audit Report — New Issues

**Date:** 2026-02-21  
**Scope:** `newfront/` — React/TypeScript frontend  
**Excludes:** Previously fixed issues (dangerouslySetInnerHTML XSS, ErrorBoundary, React.lazy, window.open noopener, JSON.parse localStorage, raw fetch in DocumentPreviewModal, hardcoded API paths, timer leaks, font loading)

---

## 1 — CRITICAL: Cache `forEach` + `delete` Mutates Map During Iteration

**Severity:** CRITICAL  
**File:** [lib/api/core.ts](newfront/lib/api/core.ts#L150-L154)

```ts
cache.forEach((_, key) => {
  if (key.includes(basePath)) {
    cache.delete(key);
  }
});
```

**What's wrong:** Deleting entries from a `Map` while iterating it with `forEach` is spec-legal in JS but leads to **unpredictable iteration order**: the spec says "If a Map entry that has not yet been visited is removed during iteration, then it will not be visited." This means some matching keys may be skipped and stale data served after mutations.

**Fix:**
```ts
const keysToDelete: string[] = [];
cache.forEach((_, key) => {
  if (key.includes(basePath)) {
    keysToDelete.push(key);
  }
});
keysToDelete.forEach((key) => cache.delete(key));
```

---

## 2 — CRITICAL: Unbounded In-Memory Cache Growth

**Severity:** CRITICAL  
**File:** [lib/api/core.ts](newfront/lib/api/core.ts#L29-L53)

```ts
const cache = new Map<string, CacheEntry>();
// ...entries are added but never evicted based on size
```

**What's wrong:** The module-level `Map` grows without bound. Every unique GET URL (including query-string variations like pagination, search filters) adds an entry. Over a long session this can consume significant memory. The TTL check only happens on *read*, so expired entries are never proactively cleaned.

**Fix:** Add a max-size cap and/or periodic cleanup:
```ts
const MAX_CACHE_SIZE = 200;

function setCache(key: string, data: any): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}
```

---

## 3 — HIGH: Duplicate Token Refresh Logic (Race Condition)

**Severity:** HIGH  
**File:** [lib/api/core.ts](newfront/lib/api/core.ts#L156-L170) and [contexts/AuthContext.tsx](newfront/contexts/AuthContext.tsx#L96-L143)

```ts
// core.ts — standalone refresh (no single-flight guard)
if (!interceptorActive && response.status === 401 ...) {
  const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, ...);
  if (refreshResponse.ok) {
    return await fetch(`${API_BASE}${endpoint}`, fetchOptions);
  }
}
```

**What's wrong:** There are **two independent 401-refresh paths**: the fetch interceptor in `AuthContext` (which has single-flight protection via `refreshInFlightRef`) and the fallback in `apiFetch` core.ts (which has **no** single-flight guard). When the interceptor is not active (SSR, tests, or during initialization), concurrent 401 responses will fire multiple simultaneous refresh requests — a race condition that can invalidate refresh tokens.

**Fix:** Move the single-flight guard into `core.ts` or remove the duplicate refresh from `core.ts` entirely, since the interceptor handles it:
```ts
// core.ts — remove the redundant refresh block or add single-flight:
let refreshPromise: Promise<Response> | null = null;

// Inside apiFetch, when 401:
if (!refreshPromise) {
  refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST', credentials: 'include'
  }).finally(() => { refreshPromise = null; });
}
const refreshResponse = await refreshPromise;
```

---

## 4 — HIGH: `LoginResponse.user` Typed as `any`

**Severity:** HIGH  
**File:** [lib/api/core.ts](newfront/lib/api/core.ts#L192)

```ts
interface LoginResponse {
  user: any;
  expires_in?: number;
}
```

**What's wrong:** The `user` field is `any`, which disables type checking for the most security-sensitive payload in the app. Any typo on `user.is_admin`, `user.is_banned`, etc. will silently pass.

**Fix:**
```ts
import type { User } from '../../contexts/AuthContext';

interface LoginResponse {
  user: User;
  expires_in?: number;
}
```

---

## 5 — HIGH: Index Signatures `[key: string]: any` Defeat Type Safety

**Severity:** HIGH  
**Files:**
- [features/applications/api.ts](newfront/features/applications/api.ts#L51) — `Application`
- [features/applications/api.ts](newfront/features/applications/api.ts#L85) — `UpdateApplicationPayload`
- [features/jobs/api.ts](newfront/features/jobs/api.ts#L28) — `Job`
- [features/jobs/api.ts](newfront/features/jobs/api.ts#L41) — `JobPayload`
- [features/dashboard/api.ts](newfront/features/dashboard/api.ts#L22) — `DashboardMetrics`
- [features/dashboard/api.ts](newfront/features/dashboard/api.ts#L55) — `ApplicationCard`

```ts
export interface Application {
  // ... typed fields ...
  [key: string]: any;   // ← escapes all type checking
}
```

**What's wrong:** These index signatures allow any arbitrary property access without type errors. A typo like `app.comapny_name` compiles silently. They also make refactoring hazardous.

**Fix:** Remove the index signatures and add specific optional fields as needed:
```ts
export interface Application {
  id: number | string;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  // ... add any missing fields explicitly ...
  // Remove: [key: string]: any;
}
```

---

## 6 — HIGH: `useEffect` Async Calls Without Cancellation (State Updates After Unmount)

**Severity:** HIGH  
**Files (representative set — same pattern throughout):**
- [pages/pipeline/components/NotesPanel.tsx](newfront/pages/pipeline/components/NotesPanel.tsx#L48-L64)
- [pages/pipeline/components/RemindersPanel.tsx](newfront/pages/pipeline/components/RemindersPanel.tsx#L65-L100)
- [pages/pipeline/components/ApplicationTimeline.tsx](newfront/pages/pipeline/components/ApplicationTimeline.tsx#L44-L104)
- [pages/reminders/components/ReminderDetailsModal.tsx](newfront/pages/reminders/components/ReminderDetailsModal.tsx#L83-L107)
- [pages/reminders/components/CreateReminderModal.tsx](newfront/pages/reminders/components/CreateReminderModal.tsx#L96-L110)
- [pages/pipeline/components/DocumentsManager.tsx](newfront/pages/pipeline/components/DocumentsManager.tsx#L119-L133)
- [pages/dashboard/DashboardPage.tsx](newfront/pages/dashboard/DashboardPage.tsx#L72-L105)

```ts
// Example from NotesPanel.tsx
useEffect(() => {
  loadNotes();          // async — no cancellation
}, [applicationId]);    // no cleanup return
```

**What's wrong:** These `useEffect` hooks fire async operations (fetch calls) without returning a cleanup function that sets a `cancelled` flag or uses an `AbortController`. If the component unmounts or `applicationId` changes before the fetch completes, React will attempt to `setState` on an unmounted component. While React 18 no longer warns in the console, this still wastes network requests and can cause stale data overwrites.

**Fix pattern:**
```ts
useEffect(() => {
  let cancelled = false;
  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/applications/${applicationId}/notes`);
      if (cancelled) return;
      if (response.ok) {
        const data = await response.json();
        setNotes(Array.isArray(data) ? data : data.notes || []);
      }
    } catch (error) {
      if (!cancelled) console.error('Failed to load notes:', error);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  loadNotes();
  return () => { cancelled = true; };
}, [applicationId]);
```

---

## 7 — HIGH: Raw `fetch()` in Auth Pages Bypasses API Infrastructure

**Severity:** HIGH  
**Files:**
- [pages/auth/SignUpPage.tsx](newfront/pages/auth/SignUpPage.tsx#L57-L75)
- [pages/auth/ResetPasswordPage.tsx](newfront/pages/auth/ResetPasswordPage.tsx#L65-L82)
- [pages/auth/ForgotPasswordPage.tsx](newfront/pages/auth/ForgotPasswordPage.tsx#L27-L35)

```ts
// SignUpPage.tsx line 57
const res = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ ... }),
});
```

**What's wrong:** These pages use raw `fetch()` instead of `apiFetch()`. While these are auth endpoints, bypassing `apiFetch` means:
1. No structured `ApiError` thrown — error handling is ad-hoc `.json().catch(() => ({}))`.
2. No caching side-effects (cache isn't cleared after registration).
3. Inconsistent error response parsing across the app.

**Fix:** Use `apiFetch` (which already skips token refresh for auth endpoints):
```ts
import { apiFetch, ApiError } from '../../lib/api';

const res = await apiFetch('/auth/register', {
  method: 'POST',
  body: JSON.stringify({ ... }),
});
if (!res.ok) {
  const body = await res.json().catch(() => ({ detail: 'Registration failed' }));
  throw new ApiError(res.status, body.detail || 'Registration failed', body);
}
```

---

## 8 — MEDIUM: `catch (e: any)` — Unsafe Error Type Assertion

**Severity:** MEDIUM  
**File:** [pages/documents/components/DocumentPreviewModal.tsx](newfront/pages/documents/components/DocumentPreviewModal.tsx#L77) and [line 97](newfront/pages/documents/components/DocumentPreviewModal.tsx#L97)

```ts
} catch (e: any) {
  console.error('Preview failed:', e);
  setError(e.message || ...);
}
```

**What's wrong:** `catch (e: any)` bypasses TypeScript's type narrowing. If `e` is not an `Error` (e.g., a string or number), accessing `.message` returns `undefined` silently.

**Fix:**
```ts
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('Preview failed:', e);
  setError(message || (isRTL ? 'שגיאה בתצוגה מקדימה' : 'Failed to load preview'));
}
```

---

## 9 — MEDIUM: Profile API Methods Return `Promise<unknown>` — Lost Type Safety

**Severity:** MEDIUM  
**File:** [features/profile/api.ts](newfront/features/profile/api.ts#L174-L199)

```ts
async getJobPreferences(): Promise<unknown> { ... }
async updateJobPreferences(data: Record<string, unknown>): Promise<unknown> { ... }
async getCareerGoals(): Promise<unknown> { ... }
async updateCareerGoals(data: Record<string, unknown>): Promise<unknown> { ... }
```

**What's wrong:** Four API methods return `Promise<unknown>`, forcing callers to cast or use `as any`. This defeats TypeScript's role in preventing runtime errors.

**Fix:** Define proper interfaces:
```ts
export interface JobPreferences {
  desired_roles?: string[];
  desired_locations?: string[];
  remote_preference?: string;
  salary_range?: { min: number; max: number };
}

async getJobPreferences(): Promise<JobPreferences> { ... }
async updateJobPreferences(data: Partial<JobPreferences>): Promise<JobPreferences> { ... }
```

---

## 10 — MEDIUM: `Reminder.notification_schedule` Typed as `Record<string, any> | null`

**Severity:** MEDIUM  
**File:** [features/reminders/api.ts](newfront/features/reminders/api.ts#L36)

```ts
notification_schedule?: Record<string, any> | null;
```

**What's wrong:** `Record<string, any>` is effectively untyped. Any property access is legal with no compiler help.

**Fix:**
```ts
export interface NotificationSchedule {
  before_minutes?: number[];
  email?: boolean;
  push?: boolean;
}
notification_schedule?: NotificationSchedule | null;
```

---

## 11 — MEDIUM: `DocumentAnalysis.ai_detailed_analysis` Typed as `any`

**Severity:** MEDIUM  
**File:** [features/documents/api.ts](newfront/features/documents/api.ts#L47)

```ts
ai_detailed_analysis?: any;
```

**What's wrong:** This field is used extensively in `normalizeAnalysis()` to access `.formatting`, `.keywords`, `.technical_skills`, `.soft_skills`, `.overall_suggestions` etc. — all without type checking.

**Fix:**
```ts
export interface AIDetailedAnalysis {
  formatting?: AISection;
  keywords?: AISection;
  technical_skills?: AISection;
  soft_skills?: { relevant_skills?: string[]; missing_elements?: string[] };
  overall_suggestions?: string[];
}

export interface AISection {
  strengths?: string[];
  weaknesses?: string[];
  improvements?: Array<string | { suggestion: string; example_before?: string; example_after?: string; example?: string }>;
  missing_elements?: string[];
}

ai_detailed_analysis?: AIDetailedAnalysis;
```

---

## 12 — MEDIUM: `CacheEntry.data` Typed as `any`

**Severity:** MEDIUM  
**File:** [lib/api/core.ts](newfront/lib/api/core.ts#L23-L26)

```ts
interface CacheEntry {
  data: any;
  timestamp: number;
}
```

**What's wrong:** All cached data loses its type. `getCached()` returns `any`, so consumers get no type safety from the cache layer.

**Fix:** Make it generic:
```ts
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}
```

---

## 13 — MEDIUM: Admin `getSystemHealth` Swallows Errors and Returns Fabricated Data

**Severity:** MEDIUM  
**File:** [features/admin/api.ts](newfront/features/admin/api.ts#L208-L222)

```ts
getSystemHealth: async (): Promise<SystemHealth> => {
  const [database, storage, apiHealth] = await Promise.all([
    api.get<SystemHealth['database']>('/admin/system/database').catch(() => ({
      status: 'down' as const, connections: 0, size_mb: 0, response_time_ms: 0,
    })),
    api.get('/admin/system/storage').catch(() => ({})),
    api.get('/admin/system/api').catch(() => ({})),
  ]);
  return {
    database,
    redis: { status: 'healthy', memory_used_mb: 0, memory_total_mb: 0, keys: 0 },
    // ...
  } as SystemHealth;
},
```

**What's wrong:** When endpoints fail, the function returns faked "healthy" data (e.g., `redis: { status: 'healthy' }`). The admin dashboard will show healthy status even when services are down. The `as SystemHealth` cast hides shape mismatches from spread of `storage`/`apiHealth`.

**Fix:** Assign `'unknown'` status when data can't be fetched, and don't hardcode "healthy" for services with no actual health check:
```ts
redis: { status: 'unknown' as const, ... },
```
And remove the `as SystemHealth` cast — fix the type instead.

---

## 14 — MEDIUM: `UsersPage` / `JobsPage` Fire API on Every Keystroke (No Debounce)

**Severity:** MEDIUM  
**Files:** 
- [pages/admin/UsersPage.tsx](newfront/pages/admin/UsersPage.tsx#L24-L36)
- [pages/jobs/JobsPage.tsx](newfront/pages/jobs/JobsPage.tsx#L178-L183)

```ts
useEffect(() => {
  loadUsers();
}, [page, search, roleFilter]);
```

**What's wrong:** `search` is bound to an input's `onChange`. Every keystroke triggers `loadUsers()`, causing a flood of API requests.

**Fix:** Debounce the search term:
```ts
const [debouncedSearch] = useState(() => {
  let timer: ReturnType<typeof setTimeout>;
  return (value: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => setSearchQuery(value), 300);
  };
});
```
Or use a `useDebouncedValue` hook.

---

## 15 — MEDIUM: `window.confirm()` Used for Destructive Action in Admin

**Severity:** MEDIUM  
**File:** [pages/admin/SessionsPage.tsx](newfront/pages/admin/SessionsPage.tsx#L38)

```ts
if (!confirm(t("Are you sure you want to terminate this session?", ...))) {
  return;
}
```

**What's wrong:** `window.confirm()` is a blocking browser dialog that:
- Cannot be styled to match the app theme
- Breaks the UX on mobile
- Is inconsistent with the rest of the app (which uses `AlertDialog` from shadcn)

**Fix:** Use the same `AlertDialog` pattern used elsewhere in the app (e.g., `ApplicationDrawer.tsx`).

---

## 16 — MEDIUM: `applications/api.ts` — Missing Error Handling on `.then(r => r.json())`

**Severity:** MEDIUM  
**File:** [features/applications/api.ts](newfront/features/applications/api.ts#L113-L146) (multiple methods)

```ts
createApplication: (payload) =>
  apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.json()),  // ← no ok check
```

**What's wrong:** Many methods call `.then(r => r.json())` without checking `r.ok`. If the server returns a 4xx/5xx with JSON error body, these silently parse the error as if it were a success response. The promise resolves with an error object instead of the expected type.

Affected methods: `createApplication`, `getApplicationDetail`, `updateApplication`, `moveApplication`, `addStage`, `getStages`, `addNote`, `getNotes`, `getUsedStatuses`.

**Fix:** Add response validation:
```ts
createApplication: async (payload) => {
  const r = await apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${r.status}`);
  }
  return r.json();
},
```

---

## 17 — LOW: `Reminders.createReminder` Accepts `Record<string, any>` Instead of a Typed Payload

**Severity:** LOW  
**File:** [features/reminders/api.ts](newfront/features/reminders/api.ts#L93)

```ts
async createReminder(data: Record<string, any>): Promise<Reminder> {
```

**What's wrong:** The parameter type doesn't enforce what fields constitute a valid reminder creation payload.

**Fix:**
```ts
export interface CreateReminderPayload {
  title: string;
  due_date: string;
  type: ReminderType;
  description?: string;
  application_id?: number | string;
  location?: string;
  email_notifications_enabled?: boolean;
}

async createReminder(data: CreateReminderPayload): Promise<Reminder> {
```

---

## 18 — LOW: `LanguageContext` Reads `localStorage` Synchronously in `useState` Initializer Without Try/Catch

**Severity:** LOW  
**File:** [contexts/LanguageContext.tsx](newfront/contexts/LanguageContext.tsx#L16)

```ts
const [language, setLanguageState] = useState<Language>(() => {
  const saved = localStorage.getItem("applytide-language");
  return (saved as Language) || "en";
});
```

**What's wrong:** In environments where `localStorage` is unavailable (private browsing in some older browsers, SSR), this will throw. Also, `saved as Language` doesn't validate the value — a corrupted value like `"fr"` would be accepted.

**Fix:**
```ts
const [language, setLanguageState] = useState<Language>(() => {
  try {
    const saved = localStorage.getItem("applytide-language");
    if (saved === "en" || saved === "he") return saved;
  } catch {}
  return "en";
});
```

---

## 19 — LOW: `WebSocket.onmessage` Silently Swallows JSON Parse Errors

**Severity:** LOW  
**File:** [lib/api/websocket.ts](newfront/lib/api/websocket.ts#L97-L100)

```ts
ws.onmessage = (e) => { 
  try { 
    onMsg(JSON.parse(e.data)); 
  } catch {} 
};
```

**What's wrong:** If the server sends malformed JSON, the error is silently swallowed. In development, this makes debugging WebSocket issues very difficult.

**Fix:**
```ts
ws.onmessage = (e) => {
  try {
    onMsg(JSON.parse(e.data));
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[WebSocket] Failed to parse message:', e.data, err);
    }
  }
};
```

---

## 20 — LOW: Proactive Token Refresh Timer May Infinite-Loop

**Severity:** LOW  
**File:** [contexts/AuthContext.tsx](newfront/contexts/AuthContext.tsx#L173-L185)

```ts
useEffect(() => {
  if (!tokenExpiry || !user) return;
  const refreshTime = tokenExpiry - 2 * 60 * 1000;
  const now = Date.now();
  const timeUntilRefresh = Math.max(0, refreshTime - now);
  const timer = setTimeout(() => {
    silentRefresh();
  }, timeUntilRefresh);
  return () => clearTimeout(timer);
}, [tokenExpiry, user]);
```

**What's wrong:** `silentRefresh` itself calls `setTokenExpiry`, which triggers this effect again, which schedules a new timer, which calls `silentRefresh` again — creating a potential infinite loop. If the server returns the same `expires_in` value, the effect re-fires with a `timeUntilRefresh` of 0, causing an immediate re-refresh.

**Fix:** Add a guard to prevent scheduling if `timeUntilRefresh` is too small:
```ts
const timeUntilRefresh = Math.max(0, refreshTime - now);
if (timeUntilRefresh < 10_000) return; // Don't schedule if <10s away — already refreshing
```

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 5     |
| MEDIUM   | 8     |
| LOW      | 5     |
| **Total**| **20**|

### Priority Order:
1. Fix cache mutation during iteration (#1)
2. Add cache size limit (#2)
3. Deduplicate token refresh logic (#3)
4. Type `LoginResponse.user` (#4)
5. Remove `[key: string]: any` index signatures (#5)
6. Add useEffect cancellation (#6)
7. Use `apiFetch` in auth pages (#7)
8. Fix remaining `any` types (#8-12, 17)
9. Add missing error handling on `.then(r.json())` (#16)
10. Debounce search inputs (#14)
