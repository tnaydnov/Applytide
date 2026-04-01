# Frontend Code Quality Audit Report

**Scope:** `newfront/` - React 18, TypeScript 5.7, Vite, TailwindCSS 4, React Router 6, Radix UI/shadcn, Sonner, motion/react  
**Date:** 2026-02-21  
**Type:** Read-only static analysis  
**Files scanned:** 183 `.tsx` + 41 `.ts` files  

---

## Summary

| Category | HIGH | MEDIUM | LOW | Total |
|----------|------|--------|-----|-------|
| A: React Performance | 3 | 6 | 4 | 13 |
| B: useEffect Issues | 3 | 3 | 1 | 7 |
| C: Error Handling | 0 | 3 | 2 | 5 |
| D: Accessibility | 2 | 3 | 0 | 5 |
| E: Hardcoded Values | 1 | 3 | 1 | 5 |
| F: Console.log | 0 | 0 | 0 | 0 |
| **Total** | **9** | **18** | **8** | **35** |

---

## Category A: React Performance Issues

### A-1 - Inline `style={{}}` object literals on every render (Pricing pages)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/pricing/PricingHero.tsx` (lines 64–181), `pages/pricing/PricingFeatures.tsx` (lines 70–202), `pages/pricing/PricingCards.tsx` (lines 164–282), `pages/pricing/PricingComparison.tsx` (lines 53–234) |
| **Description** | These four files contain **60+ inline `style={{}}` object literals** with static values (e.g., `style={{ color: "#d1d5db", fontWeight: 500 }}`). Each render allocates new objects, defeating React's shallow-compare optimization. |
| **Suggested fix** | Extract static style objects to module-level `const`, or convert to Tailwind utility classes (e.g., `text-gray-300 font-medium`). For dynamic style values, use `useMemo`. |

### A-2 - Inline `style={{}}` in HeroSection with static values

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/home/HeroSection.tsx` (lines 180–625) |
| **Description** | 20+ inline style objects with constant color/gradient values. The `FloatingJobCard` sub-component (line 138) also creates new style objects per render inside the returned JSX. |
| **Suggested fix** | Move constant style objects to module scope. Use Tailwind classes where possible. |

### A-3 - Inline `style={{}}` in Annotation components

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `pages/reminders/components/RemindersAnnotations.tsx`, `pages/pipeline/components/PipelineAnnotations.tsx`, `pages/documents/components/DocumentsAnnotations.tsx`, `pages/dashboard/components/DashboardAnnotations.tsx` |
| **Description** | Annotation components use dynamic positioning via inline styles. This is mostly justified for dynamic rect positioning, but the tooltip container styles are recalculated on every frame by `requestAnimationFrame` which is fine for animation but the static sub-styles (border-color, background-color) can be extracted. |
| **Suggested fix** | Extract the static portions of tooltip styles into constants; leave only the truly dynamic `left`/`top`/`width`/`height` as inline. |

### A-4 - Index as `key` in lists with potentially reorderable/dynamic items

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files & Lines** | See below |

| File | Line | Pattern |
|------|------|---------|
| `pages/reminders/components/EventsList.tsx` | 86 | `key={idx}` - reminders can be added/deleted |
| `pages/dashboard/DashboardPage.tsx` | 156, 189, 257, 467, 506 | `key={index}` - activity/events lists from API |
| `pages/dashboard/components/ActivePipeline.tsx` | 104 | `key={idx}` - applications list |
| `pages/dashboard/components/MetricsGrid.tsx` | 181 | `key={idx}` - metrics from API |
| `pages/dashboard/components/QuickActionsGrid.tsx` | 162 | `key={idx}` - action items |
| `pages/dashboard/components/AIInsightsBar.tsx` | 65 | `key={idx}` - insights from API |
| `pages/pipeline/components/PipelineAnalytics.tsx` | 122 | `key={index}` - KPIs |
| `pages/pipeline/components/KanbanBoard.tsx` | 127 | `key={idx}` - stages (reorderable) |

| **Description** | Using array index as `key` in lists where items can be added, removed, or reordered causes incorrect DOM recycling, state bugs, and animation glitches. Especially problematic for `KanbanBoard` stages (reorderable) and dynamic lists from API data. |
| **Suggested fix** | Use a stable unique identifier: `key={item.id}`, `key={reminder.id}`, `key={kpi.label}`, etc. Where items already have IDs from the backend, use those. |

### A-5 - Index as `key` in static/decorative lists (low risk)

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `pages/home/HeroSection.tsx` (L285, 380), `pages/home/ReviewsSection.tsx` (L104 - star icons), `pages/home/NavigationDots.tsx` (L35), `pages/home/StatsSection.tsx` (L45), `pages/home/FeaturesSection.tsx` (L68), `pages/home/CTASection.tsx` (L135, 164), `pages/auth/ResetPasswordPage.tsx` (L194), `pages/auth/ForgotPasswordPage.tsx` (L139), `pages/admin/AdminDashboardPage.tsx` (L63) |
| **Description** | Index keys on static/never-reordered arrays like decorative particles, star ratings, skeleton loaders. |
| **Suggested fix** | Acceptable for purely static renders. Consider using `key={`star-${i}`}` for clarity but not required. |

### A-6 - Large components (>200 lines) that would benefit from splitting

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Top offenders** | |

| File | Lines | Concern |
|------|-------|---------|
| `pages/documents/components/AnalysisModal.tsx` | 876 | Massive single component with complex conditional rendering |
| `pages/reminders/components/CreateReminderModal.tsx` | 812 | Multi-step form in one component |
| `pages/HowItWorksPage.tsx` | 756 | Tutorial page with inline content |
| `pages/documents/components/CoverLetterGeneratorModal.tsx` | 730 | Multi-step generation wizard |
| `pages/home/HeroSection.tsx` | 625 | Already partially split (FloatingJobCard, AnimatedStat, ParticleField extracted inline) but still massive |
| `pages/jobs/JobsPage.tsx` | 630 | Page with filtering, bulk actions, modals |
| `pages/dashboard/DashboardPage.tsx` | 619 | Dashboard with many sections |
| `pages/pipeline/components/DocumentsManager.tsx` | 659 | Document management with multiple sub-features |

| **Description** | These files exceed 600 lines each. They're harder to test, reason about, and cause larger re-renders. |
| **Suggested fix** | Extract logical sub-sections into separate components. For modals, extract form body from modal chrome. For pages, extract sections into sub-components (some already partially done). |

### A-7 - `onClick` arrow functions in `.map()` creating new function per item

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `pages/pipeline/components/CardsView.tsx` (L75), `pages/pipeline/components/KanbanColumn.tsx` (L77), `pages/reminders/components/MonthView.tsx` (L117), `pages/reminders/components/EventsList.tsx` (L92) |
| **Description** | `onClick={() => onApplicationClick(app)}` inside `.map()` creates a new closure per item per render. |
| **Suggested fix** | For small lists (<50 items), this is acceptable. For larger lists, use `useCallback` with `data-id` attributes or event delegation. Not critical given current list sizes. |

---

## Category B: useEffect Issues

### B-1 - `useEffect(…, [])` accessing `checkAuthStatus` and `navigate` (stale closure)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `contexts/AuthContext.tsx`, line 88–97 |
| **Description** | `useEffect(() => { checkAuthStatus(); }, [])` - the empty dependency array means `checkAuthStatus` and `location.pathname` are captured at mount time. If the function identity changes (e.g., due to context re-renders), the effect uses a stale reference. |
| **Suggested fix** | Either add `checkAuthStatus` and `location.pathname` to the dependency array, or wrap `checkAuthStatus` in `useCallback` and use `useRef` for the latest value pattern. |

### B-2 - `useEffect(…, [])` accessing `navigate` and `checkAuthStatus` in GoogleCallbackPage

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `pages/auth/GoogleCallbackPage.tsx`, lines 19–51 |
| **Description** | Empty dependency array while accessing `checkAuthStatus` and `navigate` from hooks. The cleanup is well-done (cancellation flag + timer cleanup), but the stale closure risk exists for `checkAuthStatus`. |
| **Suggested fix** | Add `checkAuthStatus, navigate` to deps, or use refs. Since this runs only once on callback, the practical risk is low. |

### B-3 - `SystemPage` interval with empty deps accesses `loadSystemHealth`

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `pages/admin/SystemPage.tsx`, lines 17–21 |
| **Description** | `useEffect(() => { loadSystemHealth(); const interval = setInterval(loadSystemHealth, 30000); return () => clearInterval(interval); }, [])` - `loadSystemHealth` is defined after the effect and captures `setHealth`/`setLoading` via closure. The function is not stable (recreated each render), but the effect only sees the initial version. If the component re-renders with new props/state, the interval's `loadSystemHealth` is stale. |
| **Suggested fix** | Wrap `loadSystemHealth` in `useCallback` and add it to the dependency array, or use a ref to always call the latest version. |

### B-4 - `AdminDashboardPage` useEffect with empty deps

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `pages/admin/AdminDashboardPage.tsx`, lines 21–23 |
| **Description** | `useEffect(() => { loadDashboardData(); }, [])` - `loadDashboardData` is not in deps. Similar stale closure risk but less critical since the data is loaded once. |
| **Suggested fix** | Wrap `loadDashboardData` in `useCallback` and add to deps. |

### B-5 - `NotificationsSection` and `DocumentsManager` useEffect with empty deps

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `pages/profile/components/NotificationsSection.tsx` (L36), `pages/pipeline/components/DocumentsManager.tsx` (L385) |
| **Description** | `useEffect(() => { loadSettings(); }, [])` - same pattern of calling a function not in deps. |
| **Suggested fix** | Add function to deps or use `useCallback`. |

### B-6 - `DevTools` second `useEffect` references `handleResetOnboarding` (stale closure)

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `components/dev/DevTools.tsx`, lines 47–54 |
| **Description** | Empty dep array effect that calls `handleResetOnboarding()` which itself references the current component state indirectly. Low risk since this is a dev-only tool. |
| **Suggested fix** | Add deps or move logic inline. Low priority since dev-only. |

### B-7 - Annotation `requestAnimationFrame` loops depend on `annotations` array not in deps

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files** | `pages/reminders/components/RemindersAnnotations.tsx` (L277–315), `pages/pipeline/components/PipelineAnnotations.tsx` (L365–410), `pages/documents/components/DocumentsAnnotations.tsx` (L304–346), `pages/dashboard/components/DashboardAnnotations.tsx` (L253–294) |
| **Description** | The RAF loop effects iterate over `annotations` (or `filteredAnnotations`) inside the loop, but `annotations` is not in the dependency array - only `[isActive, isRTL, viewMode]`. If annotations change while the effect is running, the loop uses stale data. The cleanup properly cancels the RAF and removes the resize listener. |
| **Suggested fix** | Add `annotations` (or its length/identity) to the dependency array, or use a ref to always access the current annotations. |

---

## Category C: Error Handling in Data Fetching

### C-1 - `ApplicationTimeline` silently swallows fetch failures

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `pages/pipeline/components/ApplicationTimeline.tsx`, lines 45–96 |
| **Description** | When the `/applications/{id}/stages` fetch fails (`!response.ok`), the component silently falls back to a basic timeline without notifying the user. The `catch` block also silently falls back. No `toast.error` or error state is shown. |
| **Suggested fix** | Add a subtle error indicator or toast. At minimum, log the error for debugging. |

### C-2 - `NotesPanel` and `RemindersPanel` inconsistent error handling

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/pipeline/components/NotesPanel.tsx` (L48–65), `pages/pipeline/components/RemindersPanel.tsx` (L65–97) |
| **Description** | `loadNotes` and `loadReminders` catch errors with `logger.error` but don't show any user-facing error. If the fetch fails, the user sees an empty list with no indication something went wrong. Contrast with `RemindersPage.tsx` which shows `toast.error`. |
| **Suggested fix** | Add `toast.error` in the catch block, or set an error state and display an inline error message. |

### C-3 - `ProfilePage` and `DocumentsPage` - no cancellation guard on data fetching

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `pages/profile/ProfilePage.tsx` (L42–47), `pages/documents/DocumentsPage.tsx` (L68–73) |
| **Description** | These pages call `loadProfile()`/`loadDocuments()` in `useEffect` without a cancellation flag. If the user navigates away before the fetch resolves, `setState` is called on an unmounted component. While React 18 suppresses the warning, it's still a wasted operation. Compare with `JobsPage.tsx` and admin pages which implement proper cancellation. |
| **Suggested fix** | Add a `cancelled` flag pattern consistent with the rest of the codebase. |

### C-4 - `HowItWorksPage` setTimeout without cleanup

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `pages/HowItWorksPage.tsx`, line 64 |
| **Description** | `setTimeout(() => { contentRef.current?.scrollIntoView(...) }, 100)` inside `handleSectionChange` (not a useEffect, but an event handler). The timer is not cleaned up if the component unmounts during the 100ms. |
| **Suggested fix** | Since it's a trivial 100ms timer in an event handler with optional chaining (`?.`), the risk is very low. No action needed unless this causes test issues. |

### C-5 - Help components `setTimeout` without cleanup

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `components/help/DashboardHelp.tsx` (L48), `components/help/DocumentsHelp.tsx` (L46), `components/help/PipelineHelp.tsx` (L50), `components/help/RemindersHelp.tsx` (L50), `components/help/JobsHelp.tsx` (L51), `components/help/AnalyticsHelp.tsx` (L50) |
| **Description** | All six help components use `setTimeout(() => { onShowVisualGuide?.() }, 300)` inside event handlers without storing and clearing the timer. If the sheet closes and the component unmounts within 300ms, the callback fires on a stale reference. |
| **Suggested fix** | Use a `useRef` to store the timer ID and clear it in a `useEffect` cleanup, or use `requestAnimationFrame` instead. |

---

## Category D: Accessibility Issues

### D-1 - Clickable `<div>`s and `<motion.div>`s without `role`, `tabIndex`, or keyboard handling

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files & Lines** | |

| File | Line | Element |
|------|------|---------|
| `pages/pipeline/components/CardsView.tsx` | 75 | `<motion.div onClick={() => onApplicationClick(app)}` - card as click target with no `role="button"`, `tabIndex`, or `onKeyDown` |
| `pages/pipeline/components/KanbanColumn.tsx` | 77 | Same pattern - `<motion.div onClick={() => onApplicationClick(app)}>` |
| `pages/reminders/components/EventsList.tsx` | 92 | `onClick` on a styled div for reminder items |
| `pages/reminders/components/MonthView.tsx` | 117 | `onClick` on reminder div in calendar |
| `pages/reminders/components/WeekView.tsx` | 125 | `onClick` on reminder div |
| `pages/reminders/components/DayView.tsx` | 57, 101 | `onClick` on reminder divs |
| `pages/dashboard/DashboardPage.tsx` | 469 | Activity list items with `cursor-pointer` class but rendered as divs |
| `pages/documents/components/DocumentsAnnotations.tsx` et al. | 409+ | Annotation overlay divs with `onClick` |

| **Description** | Keyboard-only users and screen readers cannot interact with these elements. `<div>` is not focusable by default and doesn't respond to Enter/Space. |
| **Suggested fix** | Either: (a) change to `<button>` with appropriate styling, or (b) add `role="button"`, `tabIndex={0}`, and `onKeyDown` handling for Enter/Space keys. |

### D-2 - Profile page tab buttons are proper `<button>`s ✓ but annotation overlays lack keyboard access

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | All 4 annotation components (Reminders, Pipeline, Documents, Dashboard) |
| **Description** | The annotation overlay system uses clickable `<motion.div>` elements for the number badges but doesn't provide keyboard navigation through annotations. Users can only interact via mouse/touch. |
| **Suggested fix** | Add focus management: make annotation badges focusable, add keyboard navigation arrows, and announce the current annotation to screen readers. |

### D-3 - Missing `aria-label` on icon-only buttons

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/reminders/components/CalendarView.tsx` (L93, L100 - prev/next arrows), `pages/reminders/components/WeekView.tsx` (L206, L222), `pages/pipeline/components/PipelineFilters.tsx` (L233 - clear search X button) |
| **Description** | Buttons containing only an icon (`<ChevronLeft>`, `<X>`, etc.) without `aria-label` or visible text. Screen readers will announce them as unlabeled buttons. |
| **Suggested fix** | Add `aria-label="Previous month"`, `aria-label="Clear search"`, etc. |

### D-4 - Forms with implicit labels only

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/pipeline/components/PipelineFilters.tsx` (L87) - search form uses `placeholder` as the only label; `pages/jobs/components/JobFilters.tsx` (L71) - same pattern |
| **Description** | Search inputs rely on `placeholder` text instead of `<label>` or `aria-label`. Placeholders disappear when the user types, and are not announced by all screen readers as labels. |
| **Suggested fix** | Add `aria-label` to the input or a visually-hidden `<Label>`. |

### D-5 - All `<img>` elements have `alt` text ✅

| Field | Value |
|-------|-------|
| **Severity** | - |
| **Description** | All 6 `<img>` elements across the codebase have proper `alt` attributes (`alt="Applytide"` or `alt="Applytide Logo"`). No issues found. |

---

## Category E: Hardcoded Values & Magic Numbers

### E-1 - Extensive hardcoded hex colors in `style={{}}` instead of Tailwind/CSS variables

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files** | `pages/pricing/PricingHero.tsx`, `pages/pricing/PricingFeatures.tsx`, `pages/pricing/PricingCards.tsx`, `pages/pricing/PricingComparison.tsx`, `pages/pricing/PricingFAQ.tsx`, `pages/home/HeroSection.tsx`, `pages/home/ReviewsSection.tsx`, `pages/admin/SystemPage.tsx`, `pages/admin/AdminDashboardPage.tsx`, `pages/pipeline/PipelinePage.tsx` |
| **Description** | Over 100 instances of hardcoded hex colors in `style={{ color: "#d1d5db" }}`, `style={{ color: "#ffffff" }}`, `style={{ backgroundColor: "#9F5F80" }}`, etc. The brand color `#9F5F80` appears approximately 50+ times across the codebase as a literal value. Other repeated colors: `#383e4e`, `#5a5e6a`, `#b6bac5`, `#e0e7ff`, `#d1d5db`. This makes theme changes, dark mode, and design-system consistency very difficult. |
| **Suggested fix** | Define CSS custom properties (e.g., `--color-brand: #9F5F80`) or Tailwind theme extensions, then use `text-brand`, `bg-brand`, etc. For truly dynamic colors (annotation-specific), keep inline styles but reference a theme token. |

### E-2 - Hardcoded pipeline status colors

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/pipeline/PipelinePage.tsx` (L57–61), `pages/pipeline/components/ApplicationTimeline.tsx` (L276 - `'#3b82f6'`), `pages/pipeline/constants/statuses.ts` |
| **Description** | Status colors (`#3b82f6`, `#8b5cf6`, `#f59e0b`, `#10b981`, `#ef4444`) are duplicated across multiple files. The same colors appear in `PipelinePage.tsx` default stages, the `statuses.ts` constants, and `ApplicationTimeline.tsx`. |
| **Suggested fix** | Centralize status color mapping in `statuses.ts` and import from there everywhere. |

### E-3 - Hardcoded Chrome Web Store URL

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `pages/jobs/JobsPage.tsx` (L434, L585), `pages/HowItWorksPage.tsx` (L88), `pages/jobs/components/ChromeExtensionBanner.tsx` (L22), `components/help/JobsHelp.tsx` (L591) |
| **Description** | The Chrome Web Store URL appears in 5 different files. `JobsPage.tsx` lines 434 and 585 use a generic `https://chrome.google.com/webstore` (not the actual extension link), while `HowItWorksPage.tsx` and `ChromeExtensionBanner.tsx` use the specific extension URL. |
| **Suggested fix** | Define a single constant `CHROME_EXTENSION_URL` in `constants/` and import everywhere. Fix the generic URLs in `JobsPage.tsx` to use the specific extension link. |

### E-4 - Magic number timeouts without explanation

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `pages/HowItWorksPage.tsx` (L64 - `100`ms), `components/help/*.tsx` (6 files - `300`ms), `components/dev/DevTools.tsx` (L37 - `1000`ms), `pages/auth/GoogleCallbackPage.tsx` (L34, L39 - `3000`ms), `features/documents/api.ts` (L463 - `60_000`ms) |
| **Description** | `setTimeout` calls with raw numeric durations. Most are short animation delays. The `3000`ms in GoogleCallbackPage is the most significant - it's the error redirect delay. The `60_000`ms in documents API is for URL revocation. |
| **Suggested fix** | Define named constants: `const REDIRECT_DELAY_MS = 3000`, `const SHEET_CLOSE_ANIMATION_MS = 300`, `const URL_REVOKE_DELAY_MS = 60_000`. |

### E-5 - No hardcoded API base URLs (all use centralized config) ✅

| Field | Value |
|-------|-------|
| **Severity** | - |
| **Description** | API calls all go through `apiFetch()` from `lib/api/core.ts` or feature-specific API modules. The only `http://localhost` reference is in `vite.config.ts` (proxy config) and a fallback in `lib/routes.ts` which is correct. No hardcoded API base URLs in components. |

---

## Category F: Console.log Statements

### F-1 - No `console.log` statements found ✅

| Field | Value |
|-------|-------|
| **Severity** | - |
| **Description** | Zero `console.log` statements found in the `newfront/` source tree. The codebase uses a centralized `logger` utility (`lib/logger.ts`) with `logger.error()` for error logging. This is an excellent practice. |

---

## Positive Findings

The codebase demonstrates several strong patterns:

1. **Centralized API layer** - All API calls go through `apiFetch()` with feature-specific modules (`features/*/api.ts`). No raw `fetch()` calls in components.
2. **Consistent cancellation pattern** - Most data-fetching pages (Jobs, Pipeline, Admin pages) implement the `let cancelled = false` pattern to prevent state updates on unmounted components.
3. **Proper cleanup in most effects** - Intervals (`setInterval`) are cleaned up in `SystemPage`, `HeroSection`. Event listeners are cleaned up in `useIsMobile`, `HomePage`, `DevTools`.
4. **All images have `alt` text**.
5. **No `console.log` in production code** - Uses structured `logger` utility.
6. **Error boundaries** - `ErrorBoundary` component exists for crash recovery.
7. **Good use of `toast.error`/`toast.success`** for user feedback on async operations.
8. **Forms use `<form onSubmit>` properly** with `noValidate` where custom validation exists.
9. **Cancellation guards in admin pages** - Security, Sessions, Errors, LLM, Users pages all have proper `isCancelled` callback patterns.

---

## Priority Recommendations

### Immediate (HIGH severity)

1. **Fix index keys in dynamic lists** (A-4) - Especially `KanbanBoard` stages and API-sourced lists. This can cause state corruption.
2. **Fix `SystemPage` stale closure** (B-3) - The 30-second interval calls a stale `loadSystemHealth` reference.
3. **Add keyboard accessibility to clickable divs** (D-1) - CardsView and KanbanColumn are primary interaction surfaces.
4. **Centralize brand colors** (E-1) - 100+ hardcoded hex values make theme changes nearly impossible.

### Short-term (MEDIUM severity)

5. **Extract static inline styles** (A-1, A-2) - Especially in pricing pages with 60+ inline style objects.
6. **Fix empty-dep useEffects** (B-4, B-5) - Add missing dependencies or use `useCallback`.
7. **Add error states to sub-panels** (C-2) - Notes and Reminders panels in Pipeline drawer.
8. **Add aria-labels to icon-only buttons** (D-3).
9. **Centralize Chrome extension URL** (E-3).
10. **Fix annotation RAF loops** (B-7) - Add `annotations` to dependency arrays.

### Long-term (LOW severity)

11. **Split large components** (A-6) - Focus on AnalysisModal (876 lines) and CreateReminderModal (812 lines).
12. **Name magic number timeouts** (E-4).
13. **Add cancellation to remaining pages** (C-3).
