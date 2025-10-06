// background.js

const m = chrome.runtime.getManifest();
const DEV = (m.version_name && m.version_name.includes('dev')) || m.name.includes('(Dev)');
const API_HOST = DEV ? "http://localhost/api" : "https://applytide.com/api";
const RUNNING_BY_TAB = new Map(); // tabId -> boolean
const CAPTURE_CACHE = new Map();  // url -> { ts: number, capture }
const CAPTURE_TTL_MS = 60_000;

// Production-safe console wrapper - disable logs in production builds
const originalConsoleLog = console.log;
if (!DEV) {
  console.log = function () { /* Production: logs disabled */ };
}

let ACCESS = null;   // short-lived extension access token (Authorization: Bearer …)

chrome.runtime.onStartup.addListener(() => {
  CAPTURE_CACHE.clear();
});

chrome.runtime.onInstalled.addListener(() => {
  CAPTURE_CACHE.clear();
});

// Keep service worker alive for message handling
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20000);
chrome.runtime.onStartup.addListener(keepAlive);
chrome.runtime.onInstalled.addListener(keepAlive);

// ---------------- Utilities ----------------
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (ACCESS) h["Authorization"] = `Bearer ${ACCESS}`;
  return h;
}

function notifyProgress(phase, meta = {}) {
  try {
    chrome.runtime.sendMessage({ type: 'APPLYTIDE_PROGRESS', phase, meta });
  } catch { }
}



// Convert current cookies (HttpOnly on applytide.com) into a fresh short-lived extension token
async function fetchExtensionToken() {
  try {
    const res = await fetch(`${API_HOST}/auth/extension-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.access_token) {
      ACCESS = data.access_token;
      return true;
    }
  } catch (e) { }
  return false;
}

async function ensureAccessToken() {
  // Try to get a new one; if it fails, try refreshing cookies, then retry.
  if (await fetchExtensionToken()) return true;

  try {
    const res = await fetch(`${API_HOST}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) return false;
  } catch { }
  return fetchExtensionToken();
}

// -------- API calls needed for Flow 1 --------
async function apiExtract(payload) {
  /* Production: console removed - API extract starting */

  await ensureAccessToken();

  const fetchStart = Date.now();
  const res = await fetch(`${API_HOST}/ai/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const fetchTime = Date.now() - fetchStart;
  /* Production: console removed - response details */

  if (!res.ok) {
    console.error('[API] ✗ API request failed!');
    console.error('[API] Status:', res.status, res.statusText);
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errorData = await res.json();
      console.error('[API] Error response body:', errorData);
      errorMsg = errorData?.detail || errorMsg;

      // Check if it's debug info from backend
      if (errorMsg.includes('DEBUG_INFO:')) {
        /* Production: console removed - debug info */
      }
    } catch (e) {
      console.error('[API] Failed to parse error response:', e);
      console.error('[API] Falling back to status text');
      errorMsg = res.statusText || errorMsg;
    }
    console.error('[API] Final error message:', errorMsg);
    /* Production: console removed - error section */
    throw new Error(errorMsg);
  }

  /* Production: console removed - API success */

  const responseData = await res.json();
  /* Production: console removed - response parsed */
  /* Production: console removed - API success complete */

  return responseData;
}

async function apiSaveJob(jobPayload) {
  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/jobs/extension`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(jobPayload)
  });

  if (!res.ok) {
    let errorMsg = `Save failed (${res.status})`;
    try {
      const errorData = await res.json();
      errorMsg = errorData?.detail || errorMsg;
    } catch {
      // Fallback to status text if JSON parsing fails
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  /* Production: console removed - save job success */
  const result = await res.json();
  /* Production: console removed - response summary */
  return result;
}

// -------- HTML capture from the active tab --------
async function getRenderedCapture(tabId, {
  timeoutMs = 18000,
  scrollSteps = 10,
  pauseMs = 300,
  initialDelayMs = 2000  // NEW: Wait for JS to load dynamic content
} = {}) {

  // Wait for initial page load and JavaScript execution
  /* Production: console removed - initial delay */
  await new Promise(r => setTimeout(r, initialDelayMs));
  /* Production: console removed - delay complete */

  // This function is stringified & executed in the page context
  function INJECTED_CAPTURE() {
    /* ---------- helpers ---------- */

    // 1) Click real expanders (multi-strategy, no fake aria toggling)
    function tryExpandAll() {
      const candidates = Array.from(document.querySelectorAll([
        'button',
        'summary',                   // for <details>
        'details:not([open])',
        // anchors that act like buttons, but we’ll filter them further
        'a[role="button"]',
        'div[role="button"]',
        // common expanders
        '[aria-controls]',
        '[aria-expanded="false"]',
        '[data-collapsible="false"]',
        '.mat-expansion-panel-header',
        '.mat-accordion button',
        '[data-toggle="collapse"]',
        '[data-bs-toggle="collapse"]',
        '.accordion-button.collapsed',
        '[class*="accordion"]',
        '[class*="collapse"]',
        '[class*="expand"]',
        // job-board-ish
        '[data-testid*="expand"]',
        '[data-control-name*="expand"]',
        '[data-testid*="overview"]',
        '[data-testid*="section"]'
      ].join(',')));

      const txtRe = /\b(show|see|read|view|open)\s+(more|details|all|description|requirements|responsibilities)|\bexpand\b|more|overview|description|requirements|responsibilities|\u2026|…/i;

      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };

      const inViewport = (el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.right > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
      };

      const shouldSkipAnchor = (a) => {
        const href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.startsWith('#')) return false; // local
        if (a.getAttribute('target') === '_blank') return true;
        const lower = href.toLowerCase();
        if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return true;
        if (/(privacy|cookie|policy|share|social)/i.test(lower)) return true;
        // external domain?
        try {
          const u = new URL(href, location.href);
          if (u.origin !== location.origin) return true;
        } catch { /* ignore */ }
        return false;
      };

      let expanded = 0;

      for (const el of candidates) {
        if (el.__applytideClicked) continue;               // click once
        if (!isVisible(el) || !inViewport(el)) continue;

        // eliminate anchors that are real links
        if (el.tagName === 'A' && shouldSkipAnchor(el)) continue;

        const label = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
        const dataAttrs = Array.from(el.attributes || []).map(a => `${a.name}=${a.value}`).join(' ');
        const isLikely =
          txtRe.test(label) ||
          txtRe.test(dataAttrs) ||
          el.getAttribute('aria-expanded') === 'false' ||
          el.getAttribute('data-collapsible') === 'false' ||
          el.tagName === 'SUMMARY' ||
          el.tagName === 'DETAILS';

        if (!isLikely) continue;

        try {
          if (el.tagName === 'DETAILS') {
            el.setAttribute('open', '');
            el.__applytideClicked = true;
            expanded++;
            continue;
          }
          if (el.tagName === 'SUMMARY') {
            el.parentElement?.setAttribute('open', '');
            el.__applytideClicked = true;
            expanded++;
            continue;
          }

          // favor safe interaction; avoid default navigation for anchors
          if (el.tagName === 'A') {
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            // synthesize a click but let page handlers toggle aria-expanded; default nav is already avoided by filter
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          } else {
            el.click();
          }

          // if it exposes aria-expanded, set true as a hint (no-op for anchors)
          if (el.getAttribute('aria-expanded') === 'false') {
            el.setAttribute('aria-expanded', 'true');
          }

          el.__applytideClicked = true;
          expanded++;
        } catch { /* ignore single element failures */ }
      }
      // optional: console.log('[INJECTED] tryExpandAll expanded', expanded);
    }


    // 2) Scroll/overscan (helps virtualized lists render)
    async function overscanScroll() {
      try {
        const target = document.scrollingElement || document.documentElement || document.body;
        if (!target) return; // No scrollable element

        const total = target.scrollHeight - target.clientHeight;
        if (total <= 0) return; // Nothing to scroll

        const steps = Math.max(6, (window.__APPLYTIDE_SCROLL_STEPS__ || 10));
        const pauseMs = window.__APPLYTIDE_PAUSE_MS__ || 300;

        // Scroll down
        for (let i = 1; i <= steps; i++) {
          try {
            target.scrollTo({ top: Math.round((i / steps) * total), behavior: 'instant' });
            tryExpandAll();
            await new Promise(r => setTimeout(r, pauseMs));
          } catch (e) {
            console.warn('Scroll step failed:', e);
            break; // Exit on error
          }
        }

        // Scroll back to top (some sites lazy-mount on reverse)
        for (let i = steps; i >= 0; i--) {
          try {
            target.scrollTo({ top: Math.round((i / steps) * total), behavior: 'instant' });
            await new Promise(r => setTimeout(r, pauseMs));
          } catch (e) {
            console.warn('Reverse scroll step failed:', e);
            break; // Exit on error
          }
        }
      } catch (error) {
        console.error('Overscan scroll failed:', error);
        // Continue anyway - don't block capture
      }
    }

    // 3) Shadow DOM serialization (open roots only)
    function serializeWithShadow(root) {
      try {
        const chunks = [];
        // Walk DOM and inline shadow roots we can access
        const nodeStack = [root];
        while (nodeStack.length) {
          const node = nodeStack.pop();
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.shadowRoot) {
              // Inline a marker + shadow DOM HTML
              try {
                chunks.push(`<!--SHADOW-START ${el.tagName}-->`);
                chunks.push(el.shadowRoot.innerHTML || '');
                chunks.push(`<!--SHADOW-END ${el.tagName}-->`);
              } catch { }
            }
            // Continue traversal
            nodeStack.push(...Array.from(el.children || []));
          }
        }

        // Try multiple methods to get HTML content
        let base = '';
        try {
          base = document.documentElement.outerHTML;
        } catch (e) {
          console.warn('Failed to get outerHTML:', e);
          try {
            base = document.documentElement.innerHTML;
            if (base) {
              base = `<html>${base}</html>`;
            }
          } catch (e2) {
            console.warn('Failed to get innerHTML:', e2);
            try {
              base = document.body ? document.body.outerHTML : '';
              if (base) {
                base = `<html><head><title>${document.title || ''}</title></head>${base}</html>`;
              }
            } catch (e3) {
              console.error('All HTML capture methods failed:', e3);
              base = `<html><head><title>${document.title || ''}</title></head><body>${document.body?.innerText || 'No content captured'}</body></html>`;
            }
          }
        }

        if (!base || base.trim().length === 0) {
          console.error('HTML capture resulted in empty content');
          base = `<html><head><title>${document.title || ''}</title></head><body>${document.body?.innerText || 'No content captured'}</body></html>`;
        }

        return base + '\n<!-- INLINED SHADOW DOM -->\n' + chunks.join('\n');
      } catch (error) {
        console.error('HTML serialization failed completely:', error);
        return `<html><head><title>${document.title || ''}</title></head><body>${document.body?.innerText || 'Serialization failed'}</body></html>`;
      }
    }

    // 4) JSON-LD (JobPosting & friends)
    function harvestJSONLD() {
      const out = [];
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        try {
          const data = JSON.parse(s.textContent || 'null');
          if (!data) return;
          const arr = Array.isArray(data) ? data : [data];
          for (const item of arr) out.push(item);
        } catch { }
      });
      return out;
    }

    // 5) metas / og / icons
    function harvestMetas() {
      const metas = {};
      document.querySelectorAll('meta[name],meta[property]').forEach(m => {
        const k = (m.getAttribute('name') || m.getAttribute('property') || '').toLowerCase();
        const v = m.getAttribute('content') || '';
        if (k) metas[k] = v;
      });
      const linkIcon = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
      if (linkIcon?.href) metas['icon'] = linkIcon.href;
      return metas;
    }

    // 6) Readability.js — load ad-hoc (lightweight loader)
    async function getReadable() {
      // If Readability already present (bundled), use it:
      if (window.Readability) {
        try {
          const article = new Readability(document.cloneNode(true)).parse();
          return article || null;
        } catch { }
      }
      // Otherwise try to inject from CDN (best effort; ignore if blocked)
      try {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js';
        s.crossOrigin = 'anonymous';
        document.documentElement.appendChild(s);

        // Add timeout to prevent hanging
        await Promise.race([
          new Promise(r => s.onload = r),
          new Promise(r => setTimeout(r, 3000)) // 3 second timeout
        ]);

        // Check if Readability loaded
        if (window.Readability) {
          const article = new Readability(document.cloneNode(true)).parse();
          return article || null;
        }
      } catch { return null; }
      return null;
    }

    // 7) Capture XHR/fetch responses (bodies) within page context
    // Note: Chrome extension APIs can't give response bodies; injecting into the page can. 
    // We capture only small JSON/text bodies to avoid bloat.
    function hookNetwork(maxItems = 20, maxBody = 200_000) {
      if (window.__applytideHooked) return window.__applytideLogs || [];
      window.__applytideHooked = true;
      window.__applytideLogs = [];

      const push = (entry) => {
        const now = Date.now();
        // basic time throttle: drop if last push was < 40ms ago
        if (!window.__applytideLastLogAt || now - window.__applytideLastLogAt > 40) {
          if (window.__applytideLogs.length >= maxItems) {
            // keep the newest 80%
            const keep = Math.max(1, Math.floor(maxItems * 0.8));
            window.__applytideLogs = window.__applytideLogs.slice(-keep);
          }
          window.__applytideLogs.push(entry);
          window.__applytideLastLogAt = now;
        }
      };
      const deny = ['image/', 'video/', 'audio/', 'font/', 'application/octet-stream'];
      // fetch
      const _fetch = window.fetch;
      window.fetch = async function (...args) {
        const t0 = Date.now();
        const res = await _fetch.apply(this, args);
        try {
          const clone = res.clone();
          const ct = (clone.headers.get('content-type') || '').toLowerCase();
          if (deny.some(p => ct.startsWith(p))) return res;
          if (ct.includes('json') || ct.includes('text')) {
            const body = await clone.text();
            push({
              type: 'fetch', url: String(args[0]), status: res.status, time: Date.now() - t0,
              contentType: ct.slice(0, 100), body: body.slice(0, maxBody)
            });
          }
        } catch { }
        return res;
      };

      // XHR
      const _xhrOpen = XMLHttpRequest.prototype.open;
      const _xhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this.___url = url;
        return _xhrOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function (body) {
        const start = Date.now();
        this.addEventListener('loadend', function () {
          try {
            const ct = (this.getResponseHeader('content-type') || '').toLowerCase();
            if (deny.some(p => ct.startsWith(p))) return;
            if (ct.includes('json') || ct.includes('text')) {
              const text = this.responseText || '';
              push({
                type: 'xhr', url: String(this.___url || ''), status: this.status, time: Date.now() - start,
                contentType: ct.slice(0, 100), body: text.slice(0, maxBody)
              });
            }
          } catch { }
        });
        return _xhrSend.apply(this, arguments);
      };

      return window.__applytideLogs;
    }

    /** Vendor adapters: tiny, optional helpers. **/
    function decodeChain(v) { let o = v; for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(o); if (d === o) break; o = d; } catch { break } } return o; }

    const VENDORS = [
      {
        name: 'comeet',
        test(u) { const h = u.hostname.replace(/^www\./, ''); return h.includes('comeet.co') || h.includes('comeet.com'); },
        normalizeUrl(u) {
          const sp = u.searchParams, p = u.pathname || '';
          const pageUrl = sp.get('pageUrl') || sp.get('pageurl') || sp.get('page_url');
          if (pageUrl) {
            const dec = decodeChain(pageUrl);
            if (/^https?:\/\//i.test(dec)) return dec;
          }
          const companyName = sp.get('company-name') || '';
          const companyUid = sp.get('company-uid') || (p.split('/')[2] || '');
          const positionUid = sp.get('position-uid') || (p.split('/')[3] || '');
          if (companyUid && positionUid) {
            const nameSeg = companyName ? `${companyName}/` : '';
            return `https://www.comeet.com/jobs/${nameSeg}${companyUid}/${positionUid}`;
          }
          return u.href;
        },
        /** Only flag real job iframes; ignore social/thankyou/privacy widgets */
        shouldFlagIframe(u) {
          const path = (u.pathname || '').toLowerCase();
          if (path.includes('/social') || path.includes('/thankyou') || path.includes('/privacy') || path.includes('/policy') || path.includes('/terms')) return false;
          const sp = u.searchParams;
          const hasIds = (sp.get('position-uid') && (sp.get('company-uid') || sp.get('company-name')))
            || /\/jobs\/[^/]+\/[^/]+/i.test(path);
          return !!hasIds;
        },
        /** Optional: add selectors and/or return a better readable object */
        extraSelectors: [
          '.userDesignedContent.company-description',
          '[ng-bind-html="position.description"]',
          '[ng-repeat^="field in position.customFields.details"]',
          '.positionInfo'
        ],
        enrichReadable(doc) {
          try {
            const root = doc.querySelector('[ng-controller="CareerPositionCtrl"]')
              || doc.querySelector('[ng-app="comeetCareers"]') || doc.body;
            const blocks = [];
            const extractedElements = new Set(); // Track extracted elements to avoid duplicates
            
            // Extract main description (only once)
            const desc = root.querySelector('.userDesignedContent.company-description, [ng-bind-html="position.description"]');
            if (desc) {
              const t = (desc.innerText || desc.textContent || '').trim();
              if (t) {
                blocks.push('Description\n' + t);
                extractedElements.add(desc);
              }
            }
            
            // Extract custom field details (but avoid re-extracting the description)
            root.querySelectorAll('[ng-repeat^="field in position.customFields.details"]').forEach(row => {
              const heading = row.querySelector('.positionSubtitle, .smallTitle, h2, h3, h4')?.innerText?.trim();
              const val = row.querySelector('[ng-bind-html="field.value"], .userDesignedContent.company-description');
              
              // Skip if we already extracted this element
              if (val && !extractedElements.has(val)) {
                const text = (val?.innerText || val?.textContent || '').trim();
                if (text) {
                  blocks.push((heading && heading.length < 120 ? heading + '\n' : '') + text);
                  extractedElements.add(val);
                }
              }
            });
            
            // Fallback: generic position info only if content is insufficient
            if (blocks.join('\n').length < 400) {
              const info = root.querySelector('.positionInfo, .careerCard .positionInfo');
              if (info && !extractedElements.has(info)) {
                const t = (info?.innerText || info?.textContent || '').trim();
                if (t) blocks.push(t);
              }
            }
            
            const combined = blocks.filter(Boolean).join('\n\n').trim();
            if (combined.length > 400) {
              const title = doc.querySelector('h1')?.innerText?.trim() || document.title || '';
              return { title, textContent: combined, excerpt: combined.slice(0, 200) };
            }
          } catch { }
          return null;
        }
      },

      // Example placeholder adapters you can fill later:
      { name: 'greenhouse', test: u => /greenhouse\.io$/.test(u.hostname), normalizeUrl: u => u.href, shouldFlagIframe: () => true, extraSelectors: [], enrichReadable: () => null },
      { name: 'lever', test: u => /jobs\.lever\.co$/.test(u.hostname), normalizeUrl: u => u.href, shouldFlagIframe: () => true, extraSelectors: [], enrichReadable: () => null },
      { name: 'workday', test: u => /myworkdayjobs\.com$/.test(u.hostname), normalizeUrl: u => u.href, shouldFlagIframe: () => true, extraSelectors: [], enrichReadable: () => null },
    ];

    function matchVendor(url) {
      try { const u = new URL(url, location.href); return VENDORS.find(v => v.test(u)) || null; } catch { return null; }
    }
    function normalizeByVendor(url) {
      try { const u = new URL(url, location.href); const v = VENDORS.find(v => v.test(u)); return v ? v.normalizeUrl(u) : u.href; } catch { return url; }
    }


    function detectContentAccessibility() {
      const issues = [];
      const hereNoQ = (() => { try { const u = new URL(location.href); return (u.origin + u.pathname).replace(/\/+$/, ''); } catch { return location.href; } })();

      // Iframes → normalize + vendor gating
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        const src = (iframe.getAttribute('src') || '').trim(); if (!src) continue;
        const v = matchVendor(src);
        let subtype = v?.name || null;

        // generic heuristics
        const isLarge = iframe.offsetHeight > 500 || iframe.offsetWidth > 500;
        const hasJobKeyword = /job|career|position/i.test(src + ' ' + (iframe.id || ''));

        // vendor-specific allow/skip
        if (v) {
          let u; try { u = new URL(src, location.href); } catch { }
          if (!u || (v.shouldFlagIframe && !v.shouldFlagIframe(u))) continue;
          const canon = normalizeByVendor(src);
          try {
            const cu = new URL(canon); const canonNoQ = (cu.origin + cu.pathname).replace(/\/+$/, '');
            if (canonNoQ === hereNoQ) continue; // already on canonical page
          } catch { }
          issues.push({ type: 'iframe', subtype, url: canon, rawUrl: src, action: 'redirect' });
          continue;
        }

        if (isLarge && hasJobKeyword) {
          issues.push({ type: 'iframe', subtype: 'generic', url: src, rawUrl: src, action: 'redirect' });
        }
      }

      // Shadow DOM
      let shadowCount = 0; document.querySelectorAll('*').forEach(el => { if (el.shadowRoot) shadowCount++; });
      if (shadowCount > 0) issues.push({ type: 'shadow-dom', count: shadowCount, hasClosed: false, action: 'auto-extract' });

      // PDF / Canvas / Auth
      const pdf = document.querySelector('embed[src*=".pdf"], object[data*=".pdf"], iframe[src*=".pdf"]');
      if (pdf) { const pdfUrl = pdf.src || pdf.getAttribute('data'); issues.push({ type: 'pdf', url: pdfUrl, action: 'paste-only' }); }
      const hasLargeCanvas = Array.from(document.querySelectorAll('canvas')).some(c => c.width > 500 && c.height > 500);
      if (hasLargeCanvas) issues.push({ type: 'canvas', action: 'paste-only' });

      const bodyText = (document.body?.innerText || '').toLowerCase();
      const hasAuth = /(login|sign-in|signin)\s+to\s+(view|see|access)|please\s+(login|sign-in)/.test(bodyText)
        || !!document.querySelector('form[action*="login"], input[type="password"]');
      const contentLen = (document.body?.innerText || '').trim().length;
      if (hasAuth && contentLen < 500) issues.push({ type: 'auth-wall', action: 'paste-only' });

      if (contentLen < 200 && !hasAuth && iframes.length === 0) issues.push({ type: 'minimal-content', length: contentLen, action: 'warn' });

      return issues.length ? issues : null;
    }





    // Extract content from open shadow DOMs
    function extractFromShadowDOM() {
      let shadowContent = '';
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          try {
            shadowContent += el.shadowRoot.textContent || '';
            shadowContent += '\n---\n';
          } catch (e) {
            console.warn('[INJECTED] Could not extract from shadow root:', e);
          }
        }
      });
      return shadowContent;
    }

    // Vendor-specific deep extraction (Comeet)
    function extractComeetRichText() {
      try {
        const host = location.hostname.replace(/^www\./, '');
        if (!(host.includes('comeet.com') || host.includes('comeet.co'))) return null;

        // Use the main position container
        const container =
          document.querySelector('[ng-controller="CareerPositionCtrl"]') ||
          document.querySelector('[ng-app="comeetCareers"]') ||
          document.body;

        const blocks = [];

        // 1) Primary description
        const desc =
          container.querySelector('.userDesignedContent.company-description') ||
          container.querySelector('[ng-bind-html="position.description"]') ||
          container.querySelector('.company-description');
        if (desc) {
          const t = (desc.innerText || desc.textContent || '').trim();
          if (t) blocks.push('Description\n' + t);
        }

        // 2) Dynamic sections (Requirements, What will you do, Advantages, etc.)
        const detailRows = container.querySelectorAll('[ng-repeat^="field in position.customFields.details"]');
        detailRows.forEach(row => {
          const heading =
            row.querySelector('.positionSubtitle, .smallTitle, h2, h3, h4')?.innerText?.trim();
          const val =
            row.querySelector('.userDesignedContent, .company-description, [ng-bind-html="field.value"]');
          const text = (val?.innerText || val?.textContent || '').trim();
          if (text) {
            blocks.push((heading && heading.length < 120 ? heading + '\n' : '') + text);
          }
        });

        // 3) Fallback: generic position info group
        if (blocks.join('\n').length < 600) {
          const info = container.querySelector('.positionInfo, .careerCard .positionInfo');
          if (info) {
            const t = (info.innerText || info.textContent || '').trim();
            if (t) blocks.push(t);
          }
        }

        const combined = blocks.filter(Boolean).join('\n\n').trim();
        if (combined.length > 400) {
          const title = document.querySelector('h1')?.innerText?.trim() || document.title || '';
          return { title, textContent: combined, excerpt: combined.slice(0, 200) };
        }
      } catch { /* ignore */ }
      return null;
    }


    /* ---------- main flow ---------- */
    window.__APPLYTIDE_SCROLL_STEPS__ = 12;
    window.__APPLYTIDE_PAUSE_MS__ = 300;

    // Start network hook immediately
    hookNetwork();

    // Detect all content accessibility issues
    const accessibilityIssues = detectContentAccessibility();

    // Extract shadow DOM content if available
    const shadowContent = extractFromShadowDOM();

    // Expand & scroll to mount virtualized DOM
    tryExpandAll();
    // Overscan passes with timeout protection
    return (async () => {
      try {
        console.log('[INJECTED] Starting overscan scroll...');
        await Promise.race([
          overscanScroll(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Scroll timeout')), 8000))
        ]);
        console.log('[INJECTED] Overscan scroll complete');
      } catch (e) {
        console.warn('[INJECTED] Overscan scroll failed or timed out:', e.message);
        // Continue anyway
      }

      // One more expand pass after scroll
      tryExpandAll();

      /* Production: console removed - serializing HTML */
      const html = serializeWithShadow(document);
      /* Production: console removed - HTML serialized */

      /* Production: console removed - harvesting JSON-LD */
      const jsonld = harvestJSONLD();
      /* Production: console removed - JSON-LD items */

      /* Production: console removed - harvesting metas */
      const metas = harvestMetas();
      /* Production: console removed - metas count */

      /* Production: console removed - getting Readability */
      let readable = null;
      try {
        readable = await Promise.race([
          getReadable(),
          new Promise(r => setTimeout(() => r(null), 5000)) // 5 second timeout
        ]);
        /* Production: console removed - Readability complete */
      } catch (e) {
        console.warn('[INJECTED] Readability failed:', e.message);
        readable = null;
      }

      // Clean common UI chrome from Readability output
      if (readable && readable.textContent) {
        const originalText = readable.textContent;
        let cleanedText = originalText;

        // Remove common job board UI patterns at the start
        // Pattern: Short lines (< 50 chars) at the very beginning that are likely UI elements
        const lines = cleanedText.split('\n');
        let firstContentIndex = 0;

        // Skip initial short lines that look like UI chrome
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i].trim();

          // Stop when we hit substantial content (descriptions usually start with longer text)
          if (line.length > 80) {
            firstContentIndex = i;
            break;
          }

          // Skip lines that are clearly UI chrome
          const isUIChrome =
            line.length === 0 || // Empty line
            /^(overview|application|description|requirements|benefits|apply|details|back|close|save|share)$/i.test(line) || // Tab/button names
            (line.length < 50 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+){0,5}$/.test(line) && i === 0) || // Title-case at very start (likely duplicate title)
            /^(posted|updated|created|expires|deadline|closing):/i.test(line); // Date labels

          if (!isUIChrome && line.length > 20) {
            // This looks like actual content, stop skipping
            firstContentIndex = i;
            break;
          }
        }

        // Remove lines from the end that are likely UI chrome
        let lastContentIndex = lines.length;
        for (let i = lines.length - 1; i >= 0 && i > lastContentIndex - 10; i--) {
          const line = lines[i].trim();

          const isUIChrome =
            line.length === 0 ||
            /^(apply|apply now|apply for this job|submit|submit application|easy apply|quick apply|learn more|view details|go back|back to|return to)$/i.test(line);

          if (!isUIChrome && line.length > 20) {
            lastContentIndex = i + 1;
            break;
          }
        }

        // Reconstruct the cleaned text
        if (firstContentIndex > 0 || lastContentIndex < lines.length) {
          cleanedText = lines.slice(firstContentIndex, lastContentIndex).join('\n').trim();
          console.log('[INJECTED] Cleaned UI chrome from Readability:');
          console.log('[INJECTED] - Removed', firstContentIndex, 'lines from start');
          console.log('[INJECTED] - Removed', lines.length - lastContentIndex, 'lines from end');
          console.log('[INJECTED] - Original length:', originalText.length);
          console.log('[INJECTED] - Cleaned length:', cleanedText.length);

          // Only use cleaned version if we didn't remove too much (safety check)
          if (cleanedText.length > originalText.length * 0.7) {
            readable.textContent = cleanedText;
          } else {
            console.warn('[INJECTED] Cleaning removed too much content, keeping original');
          }
        }
      }

      // Fallback: If Readability failed or returned minimal content, try direct extraction
      if (!readable || !readable.textContent || readable.textContent.length < 1000) {
        console.log('[INJECTED] Readability insufficient, trying direct content extraction...');

        // Try to find main content containers
        const vendorSelectors = (matchVendor(location.href)?.extraSelectors || []);
        const contentSelectors = [
          '[data-testid*="overview"]', '[data-testid*="section"]', '[data-testid*="description"]',
          '[data-testid*="requirement"]', '[data-testid*="responsibility"]', '[data-testid*="benefit"]',
          'main', 'article', '[role="main"]', '[class*="job-description"]', '[class*="job-detail"]',
          '[class*="requirements"]',
          '[class*="responsibilities"]',
          '[class*="qualifications"]',
          'h2, h3 ~ ul', // headers with following list
          '.job-description ul',
          '.job-content ul',
          '[class*="job-content"]', '[class*="content"]', '[id*="job"]', '[id*="description"]',
          ...vendorSelectors
        ];

        let directText = '';
        for (const selector of contentSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.innerText || el.textContent || '';
            if (text.length > 50) { // Only include substantial content
              directText += text + '\n\n';
            }
          }
          if (directText.length > 2000) break; // Stop when we have enough
        }

        console.log('[INJECTED] Direct extraction got:', directText.length, 'chars');

        // If direct extraction worked better, use it
        if (directText.length > (readable?.textContent?.length || 0)) {
          readable = {
            title: document.title || '',
            textContent: directText,
            excerpt: directText.substring(0, 200)
          };
          console.log('[INJECTED] Using direct extraction instead of Readability');
        }
      }

      const vend = matchVendor(location.href);
      if (vend && typeof vend.enrichReadable === 'function') {
        const better = vend.enrichReadable(document);
        if (better && better.textContent?.length > (readable?.textContent?.length || 0)) {
          readable = better;
        }
      }

      const textLen = (document.body?.innerText || '').length + shadowContent.length;
      const xhrLogs = (window.__applytideLogs || []);

      console.log('[INJECTED] Accessibility issues detected:', accessibilityIssues);
      console.log('[INJECTED] Capture complete, returning data');
      return {
        html,
        jsonld,
        metas,
        readable,
        textLen,
        xhrLogs,
        accessibilityIssues,
        shadowContent
      };
    })();
  } // end INJECTED_CAPTURE

  const start = Date.now();
  let last = null;
  let attempt = 0;
  notifyProgress('capture:start');

  while (Date.now() - start < timeoutMs) {
    attempt++;
    console.log(`[CAPTURE] Attempt ${attempt}...`);

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',           // run in page world so hooks & clicks work
      func: INJECTED_CAPTURE
    });
    last = result;

    // Check if we detected a job iframe
    if (result?.jobIframe) {
      console.log(`[CAPTURE] ⚠️  Detected job posting in iframe!`);
      console.log(`[CAPTURE] Iframe type: ${result.jobIframe.type}`);
      console.log(`[CAPTURE] Iframe URL: ${result.jobIframe.url}`);
      console.log(`[CAPTURE] Suggestion: Navigate directly to ${result.jobIframe.url} for better extraction`);

      // Store iframe info in result for potential use
      last.iframeDetected = true;
      last.iframeUrl = result.jobIframe.url;
      last.iframeType = result.jobIframe.type;
    }

    const jlCount = Array.isArray(result?.jsonld) ? result.jsonld.length : 0;
    notifyProgress('capture:pass', { textLen: result?.textLen || 0, jsonld: jlCount });

    // Heuristic: either enough text or we got JSON-LD JobPosting
    const hasJobPosting = Array.isArray(result?.jsonld) && result.jsonld.some(
      x => String(x?.['@type'] || '').toLowerCase().includes('jobposting')
    );
    const textEnough = (result?.textLen || 0) >= 1400; // a tad safer for SPAs
    const hasReadable = !!result?.readable?.textContent && result.readable.textContent.length > 800;

    console.log(`[CAPTURE] Attempt ${attempt} results:`);
    console.log(`  - Text length: ${result?.textLen || 0}`);
    console.log(`  - Readable text: ${result?.readable?.textContent?.length || 0}`);
    console.log(`  - JSON-LD count: ${jlCount}`);
    console.log(`  - Has JobPosting: ${hasJobPosting}`);
    console.log(`  - Text enough (≥1400): ${textEnough}`);
    console.log(`  - Readable enough (≥800): ${hasReadable}`);
    console.log(`  - Title: ${result?.readable?.title || 'none'}`);
    console.log(`  - Text preview: ${(result?.readable?.textContent || '').substring(0, 200)}...`);

    if (hasJobPosting || hasReadable || textEnough) {
      console.log(`[CAPTURE] ✓ Capture criteria met after ${attempt} attempts`);
      break;
    }

    console.log(`[CAPTURE] Criteria not met, waiting 600ms before retry...`);
    await new Promise(r => setTimeout(r, 600));
  }
  const elapsed = Date.now() - start;
  console.log(`[CAPTURE] Capture complete after ${elapsed}ms`);
  console.log(`[CAPTURE] Final content length: ${last?.textLen || 0}`);
  console.log(`[CAPTURE] Final readable length: ${last?.readable?.textContent?.length || 0}`);
  console.log(`[CAPTURE] Final title: ${last?.readable?.title || 'none'}`);

  notifyProgress('capture:done', { ok: !!last, textLen: last?.textLen || 0 });
  return last || { html: '', jsonld: [], metas: {}, readable: null, textLen: 0, xhrLogs: [] };
}


// -------- Auth: email/password --------
async function loginWithEmail({ email, password }) {
  // Try direct (may fail to set cookies in some Chrome configs)
  try {
    const res = await fetch(`${API_HOST}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember_me: true })
    });
    if (res.ok && await fetchExtensionToken()) return { ok: true };
  } catch { }

  // Fallback: open a small window to your first-party login page and let the bridge do the rest
  const base = DEV ? "http://localhost:3000" : "https://applytide.com";
  const popup = await chrome.windows.create({
    url: `${base}/login?ext=1`,
    type: "popup", width: 480, height: 640
  });

  const bridged = await new Promise((resolve) => {
    const listener = (msg) => {
      if (msg?.type === "APPLYTIDE_BRIDGE_AUTH" && msg?.access_token) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(true);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    setTimeout(() => resolve(false), 90000);
  });

  if (popup?.id) try { chrome.windows.remove(popup.id); } catch { }
  if (!bridged) return { ok: false, error: "Login timed out" };
  ACCESS = null; // force fresh pull
  await fetchExtensionToken();
  return { ok: true };
}


// -------- Auth: Google OAuth via small window + polling --------
async function loginWithGoogle() {
  const backendBase = API_HOST.replace(/\/api$/, "");   // -> http://localhost  or  https://applytide.com
  const loginUrl = `${backendBase}/api/auth/google/login?ext=1`; // go through NGINX
  const popup = await chrome.windows.create({ url: loginUrl, type: "popup", width: 480, height: 640 });
  const winId = popup.id;

  // Promise that resolves when the site-bridge hands us the token
  const tokenFromBridge = new Promise((resolve) => {
    const listener = (msg) => {
      if (msg?.type === "APPLYTIDE_BRIDGE_AUTH" && msg?.access_token) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg.access_token);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });

  // Also keep a timeout fallback (in case user closes window)
  const TIMEOUT = 90_000;
  let access = null;
  try {
    access = await Promise.race([
      tokenFromBridge,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT))
    ]);
  } catch (e) {
    try { if (winId) chrome.windows.remove(winId); } catch { }
    return { ok: false, error: "Timed out waiting for Google sign-in" };
  }

  // Store the short-lived extension access token
  ACCESS = access;
  try { if (winId) chrome.windows.remove(winId); } catch { }
  return { ok: true };
}


async function logoutEverywhere() {
  try {
    await fetch(`${API_HOST}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch { }
  ACCESS = null;
  return { ok: true };
}

// --------- Compliance Gate ----------
const RESTRICTED_HOSTS = new Set([
  'linkedin.com', 'www.linkedin.com',
  'glassdoor.com', 'www.glassdoor.com',
  'indeed.com', 'www.indeed.com',
  'wellfound.com', 'angel.co', 'www.angel.co', 'www.wellfound.com'
]);
function classifyPage(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (RESTRICTED_HOSTS.has(host)) return 'restricted';
    if (/(login|signin|account|auth)/i.test(u.pathname)) return 'restricted';
    return 'allowed';
  } catch { return 'restricted'; }
}

// -------- Message bus for popup --------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Return true to keep message channel open for async response
  (async () => {
    try {
      switch (message.type) {
        case 'APPLYTIDE_GET_STATUS': {
          const ok = await ensureAccessToken();
          // Tell popup which mode to show
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const mode = tab?.url ? classifyPage(tab.url) : 'restricted';

          // Run comprehensive accessibility check on current page
          let accessibilityIssues = null;
          if (tab?.id && mode === 'allowed') {
            try {
              const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  function decodeChain(v) { let o = v; for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(o); if (d === o) break; o = d; } catch { break } } return o; }
                  const ADAPTERS = [{
                    name: 'comeet', test: u => u.hostname.replace(/^www\./, '').includes('comeet'),
                    normalize(u) {
                      const sp = u.searchParams, p = u.pathname || ''; const pageUrl = sp.get('pageUrl') || sp.get('pageurl') || sp.get('page_url');
                      if (pageUrl) { const d = decodeChain(pageUrl); if (/^https?:\/\//i.test(d)) return d; }
                      const companyName = sp.get('company-name') || '', companyUid = sp.get('company-uid') || (p.split('/')[2] || ''), positionUid = sp.get('position-uid') || (p.split('/')[3] || '');
                      if (companyUid && positionUid) { const nameSeg = companyName ? `${companyName}/` : ''; return `https://www.comeet.com/jobs/${nameSeg}${companyUid}/${positionUid}`; }
                      return u.href;
                    },
                    shouldFlag(u) {
                      const path = (u.pathname || '').toLowerCase(); if (path.includes('/social') || path.includes('/thankyou') || path.includes('/privacy') || path.includes('/policy') || path.includes('/terms')) return false;
                      const sp = u.searchParams; return !!((sp.get('position-uid') && (sp.get('company-uid') || sp.get('company-name'))) || /\/jobs\/[^/]+\/[^/]+/i.test(path));
                    }
                  }];
                  const hereNoQ = (() => { try { const u = new URL(location.href); return (u.origin + u.pathname).replace(/\/+$/, '') } catch { return location.href } })();
                  const issues = [];

                  Array.from(document.querySelectorAll('iframe')).forEach(f => {
                    const src = (f.getAttribute('src') || '').trim(); if (!src) return;
                    let u; try { u = new URL(src, location.href); } catch { return; }
                    const a = ADAPTERS.find(x => x.test(u));
                    if (a) {
                      if (!a.shouldFlag(u)) return;
                      const canon = a.normalize(u);
                      try { const cu = new URL(canon); if ((cu.origin + cu.pathname).replace(/\/+$/, '') === hereNoQ) return; } catch { }
                      issues.push({ type: 'iframe', subtype: a.name, url: canon, rawUrl: src, action: 'redirect' });
                    } else {
                      const big = f.offsetHeight > 500 || f.offsetWidth > 500;
                      const hasJob = /job|career|position/i.test(src + ' ' + (f.id || ''));
                      if (big && hasJob) issues.push({ type: 'iframe', subtype: 'generic', url: src, rawUrl: src, action: 'redirect' });
                    }
                  });

                  // pdf/canvas/auth checks kept minimal
                  const pdf = document.querySelector('embed[src*=".pdf"], object[data*=".pdf"], iframe[src*=".pdf"]');
                  if (pdf) { const pdfUrl = pdf.src || pdf.getAttribute('data'); issues.push({ type: 'pdf', url: pdfUrl, action: 'paste-only' }); }
                  const hasLargeCanvas = Array.from(document.querySelectorAll('canvas')).some(c => c.width > 500 && c.height > 500);
                  if (hasLargeCanvas) issues.push({ type: 'canvas', action: 'paste-only' });

                  const body = (document.body?.innerText || '').toLowerCase();
                  const hasAuth = /(login|sign-in|signin)\s+to\s+(view|see|access)|please\s+(login|sign-in)/.test(body)
                    || !!document.querySelector('form[action*="login"], input[type="password"]');
                  const len = (document.body?.innerText || '').trim().length;
                  if (hasAuth && len < 500) issues.push({ type: 'auth-wall', action: 'paste-only' });

                  return issues.length ? issues : null;
                }


              });

              if (result?.[0]?.result) {
                accessibilityIssues = result[0].result;
                console.log('[bg] Detected accessibility issues:', accessibilityIssues);
              }
            } catch (err) {
              console.log('[bg] Could not run accessibility check:', err);
            }
          }

          sendResponse({ ok: true, authenticated: !!ok, mode, accessibilityIssues });
          break;
        }

        // Selection mode and screenshot removed - keeping only paste method

        // Assisted Mode: pasted text → LLM
        case 'APPLYTIDE_USE_PASTED': {
          try {
            await ensureAccessToken();
            const { url, text } = message;
            console.log('[bg] APPLYTIDE_USE_PASTED - Step 1: Received text');
            console.log('[bg] DEBUG: text length=', (text || '').length);
            console.log('[bg] DEBUG: url=', url);
            console.log('[bg] DEBUG: text preview=', (text || '').substring(0, 200));

            if (!text || !text.trim()) {
              console.log('[bg] ERROR: No text provided');
              throw new Error('Please paste some text first');
            }
            if (text.trim().length < 20) {
              console.log('[bg] ERROR: Text too short, length=', text.trim().length);
              throw new Error('Please paste more text including job title, company, and description');
            }

            console.log('[bg] Step 2: Validation passed, calling API');
            notifyProgress('flow:begin', { url });
            notifyProgress('backend:extract');

            const payload = { url, html: '', jsonld: [], metas: {}, readable: {}, xhrLogs: [], quick: {}, manual_text: text };
            console.log('[bg] DEBUG: API payload=', JSON.stringify({ ...payload, manual_text: payload.manual_text.substring(0, 100) + '...' }));

            const { job } = await apiExtract(payload);

            if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
              !((job?.description || '').trim().length >= 30)) {
              notifyProgress('backend:error');
              throw new Error('Could not extract meaningful job details. Try paste text instead.');
            }

            notifyProgress('backend:save');
            const saved = await apiSaveJob(job);
            notifyProgress('flow:done', { savedId: saved?.id });
            sendResponse({ ok: true, saved });
          } catch (error) {
            notifyProgress('flow:error');
            const errorMsg = error?.message || String(error);
            console.error('Pasted text extraction failed:', error);
            sendResponse({ ok: false, error: errorMsg });
          }
          break;
        }

        case 'APPLYTIDE_LOGIN_EMAIL': {
          const { email, password, remember } = message;
          const resp = await loginWithEmail({ email, password, remember });
          sendResponse(resp);
          break;
        }

        case 'APPLYTIDE_LOGIN_GOOGLE': {
          const resp = await loginWithGoogle();
          sendResponse(resp);
          break;
        }

        case 'APPLYTIDE_LOGOUT': {
          const resp = await logoutEverywhere();
          sendResponse(resp);
          break;
        }

        // Flow 1: Save job only
        case 'APPLYTIDE_RUN_FLOW1': {
          console.log('\n========================================');
          console.log('[BACKGROUND] FLOW START - APPLYTIDE_RUN_FLOW1');
          console.log('[BACKGROUND] Timestamp:', new Date().toISOString());
          console.log('========================================');

          console.log('[BACKGROUND] Step 1: Ensuring access token...');
          await ensureAccessToken();
          console.log('[BACKGROUND] Step 1: Access token ready');

          console.log('[BACKGROUND] Step 2: Getting active tab...');
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) {
            console.error('[BACKGROUND] ERROR: No active tab found');
            throw new Error('No active tab');
          }

          const url = tab.url;
          const pageType = classifyPage(url);
          console.log('[BACKGROUND] Step 2: Tab info:', {
            tabId: tab.id,
            url: url,
            title: tab.title,
            pageType: pageType
          });

          if (pageType !== 'allowed') {
            console.error('[BACKGROUND] ERROR: Page classification check failed');
            console.error('[BACKGROUND] Page type:', pageType, 'Expected: allowed');
            console.error('[BACKGROUND] URL:', url);
            sendResponse({ ok: false, error: 'Auto-save is disabled on this site. Use paste instead.' });
            break;
          }

          if (RUNNING_BY_TAB.get(tab.id)) {
            console.warn('[BACKGROUND] WARNING: Already processing this tab');
            sendResponse({ ok: false, error: 'Already working on this tab. Please wait.' });
            break;
          }

          try {
            RUNNING_BY_TAB.set(tab.id, true);
            console.log('[BACKGROUND] Step 3: Tab marked as processing');
            notifyProgress('flow:begin', { url });

            // short-term cache
            console.log('[BACKGROUND] Step 4: Checking capture cache...');
            const cached = CAPTURE_CACHE.get(url);
            const cacheAge = cached ? Date.now() - cached.ts : null;
            console.log('[BACKGROUND] Cache status:', {
              hasCached: !!cached,
              cacheAge: cacheAge,
              ttl: CAPTURE_TTL_MS,
              isValid: cached && cacheAge < CAPTURE_TTL_MS
            });

            if (cached && cacheAge < CAPTURE_TTL_MS) {
              console.log('[BACKGROUND] Step 4: ✓ Using cached capture (age: ' + cacheAge + 'ms)');
              console.log('[BACKGROUND] Cached data summary:', {
                htmlLength: cached.capture?.html?.length,
                jsonldCount: cached.capture?.jsonld?.length,
                hasReadable: !!cached.capture?.readable,
                textLen: cached.capture?.textLen,
                accessibilityIssues: cached.capture?.accessibilityIssues,
                shadowContent_len: (cached.capture?.shadowContent || '').length
              });
              notifyProgress('capture:cache_hit', { url });

              // Prepare payload with shadow DOM content if available
              const payload = {
                url,
                ...cached.capture,
                quick: {},
                // Append shadow DOM content to readable if available
                readable: cached.capture.shadowContent && cached.capture.shadowContent.length > 100 ? {
                  ...cached.capture.readable,
                  textContent: (cached.capture.readable?.textContent || '') + '\n\n--- Shadow DOM Content ---\n' + cached.capture.shadowContent
                } : cached.capture.readable
              };

              console.log('[BACKGROUND] Step 5: Preparing payload from cache:', {
                url: payload.url,
                html_len: (payload.html || '').length,
                jsonld_count: (payload.jsonld || []).length,
                readable: !!payload.readable,
                readable_textLen: (payload.readable?.textContent || '').length,
                metas_keys: Object.keys(payload.metas || {}),
                xhrLogs_count: (payload.xhrLogs || []).length,
                shadowContent_included: !!(cached.capture.shadowContent && cached.capture.shadowContent.length > 100)
              });

              console.log('[BACKGROUND] Step 6: Calling apiExtract with cached data...');
              const { job } = await apiExtract(payload);
              console.log('[BACKGROUND] Step 7: apiExtract returned:', {
                hasJob: !!job,
                title: job?.title,
                company: job?.company_name,
                descriptionLength: job?.description?.length,
                requirementsCount: job?.requirements?.length,
                skillsCount: job?.skills?.length
              });

              if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
                !((job?.description || '').trim().length >= 30)) {

                // Provide context based on cached accessibility issues
                let errorMsg = 'Could not extract meaningful job details.';
                if (cached.capture.accessibilityIssues && cached.capture.accessibilityIssues.length > 0) {
                  const issues = cached.capture.accessibilityIssues.map(i => i.type).join(', ');
                  errorMsg += ` Detected issues: ${issues}. Try paste mode instead.`;
                } else {
                  errorMsg += ' Try paste text instead.';
                }

                notifyProgress('backend:error');
                throw new Error(errorMsg);
              }

              notifyProgress('backend:save');
              const saved = await apiSaveJob(job);
              notifyProgress('flow:done', { savedId: saved?.id });
              sendResponse({
                ok: true,
                saved,
                accessibilityIssues: cached.capture.accessibilityIssues || null
              });
              break;
            }

            console.log('[BACKGROUND] Step 4: ✗ No valid cache, starting fresh capture');
            notifyProgress('capture:run');

            console.log('[BACKGROUND] Step 5: Calling getRenderedCapture for tab', tab.id);
            const captureStart = Date.now();
            const capture = await getRenderedCapture(tab.id);
            const captureTime = Date.now() - captureStart;

            console.log('[BACKGROUND] Step 6: ✓ Capture completed in', captureTime + 'ms');
            console.log('[BACKGROUND] Capture data summary:', {
              html_len: (capture.html || '').length,
              html_preview: (capture.html || '').substring(0, 200),
              jsonld_count: (capture.jsonld || []).length,
              jsonld_types: (capture.jsonld || []).map(j => j?.['@type']).filter(Boolean),
              readable: !!capture.readable,
              readable_title: capture.readable?.title,
              readable_textLen: (capture.readable?.textContent || '').length,
              textLen: capture.textLen,
              metas_count: Object.keys(capture.metas || {}).length,
              xhrLogs_count: (capture.xhrLogs || []).length,
              iframe_detected: capture.iframeDetected,
              iframe_url: capture.iframeUrl,
              iframe_type: capture.iframeType,
              accessibilityIssues: capture.accessibilityIssues,
              shadowContent_len: (capture.shadowContent || '').length
            });

            // Check for accessibility issues that require special handling
            if (capture.accessibilityIssues && capture.accessibilityIssues.length > 0) {
              console.log('[BACKGROUND] ⚠️ Accessibility issues detected:', capture.accessibilityIssues);

              // If iframe detected, check if we should redirect
              const iframeIssue = capture.accessibilityIssues.find(i => i.type === 'iframe');
              if (iframeIssue && iframeIssue.url) {
                console.log('[BACKGROUND] ⚠️ Job posting detected in iframe');
                console.log('[BACKGROUND] For better extraction, user should navigate to:', iframeIssue.url);

                // If content is minimal, suggest iframe URL
                const hasMinimalContent = (capture.textLen || 0) < 2000 ||
                  !(capture.readable?.textContent || '').length > 1000;

                if (hasMinimalContent) {
                  console.log('[BACKGROUND] ⚠️ Content appears minimal, iframe URL recommended');
                  sendResponse({
                    ok: false,
                    error: 'Job posting is in an iframe and cannot be extracted from this page.',
                    iframeDetected: true,
                    iframeUrl: iframeIssue.url,
                    iframeType: iframeIssue.subtype || 'generic',
                    suggestion: `This job is embedded in an iframe. For better results, navigate directly to: ${iframeIssue.url}`
                  });
                  return;
                }
              }

              // Check for other blocking issues
              const pdfIssue = capture.accessibilityIssues.find(i => i.type === 'pdf');
              const authIssue = capture.accessibilityIssues.find(i => i.type === 'auth-wall');
              const canvasIssue = capture.accessibilityIssues.find(i => i.type === 'canvas');

              if (pdfIssue || authIssue || canvasIssue) {
                const issueType = pdfIssue ? 'PDF document' : authIssue ? 'authentication wall' : 'canvas rendering';
                console.log(`[BACKGROUND] ⚠️ ${issueType} detected - auto-extraction may fail`);

                // Continue with extraction attempt, but log the limitation
                console.log('[BACKGROUND] Attempting extraction despite accessibility issues...');
              }

              // If shadow DOM content available, include it
              if (capture.shadowContent && capture.shadowContent.length > 100) {
                console.log('[BACKGROUND] ✓ Including shadow DOM content:', capture.shadowContent.length, 'chars');
              }
            }

            console.log('[BACKGROUND] Step 7: Capture cached for future use');
            CAPTURE_CACHE.set(url, { ts: Date.now(), capture });

            notifyProgress('backend:extract');

            // Prepare payload with shadow DOM content if available
            const payload = {
              url,
              ...capture,
              quick: {},
              // Append shadow DOM content to readable if available
              readable: capture.shadowContent && capture.shadowContent.length > 100 ? {
                ...capture.readable,
                textContent: (capture.readable?.textContent || '') + '\n\n--- Shadow DOM Content ---\n' + capture.shadowContent
              } : capture.readable
            };

            console.log('[BACKGROUND] Step 8: Preparing payload for backend:', {
              url: payload.url,
              html_len: (payload.html || '').length,
              jsonld_count: (payload.jsonld || []).length,
              readable: !!payload.readable,
              readable_textLen: (payload.readable?.textContent || '').length,
              shadowContent_included: !!(capture.shadowContent && capture.shadowContent.length > 100)
            });
            console.log('[BACKGROUND] Step 9: Calling apiExtract...');
            const extractStart = Date.now();
            const { job } = await apiExtract(payload);
            const extractTime = Date.now() - extractStart;

            console.log('[BACKGROUND] Step 10: ✓ apiExtract completed in', extractTime + 'ms');
            console.log('[BACKGROUND] Extracted job data:', {
              title: job?.title,
              company_name: job?.company_name,
              location: job?.location,
              remote_type: job?.remote_type,
              job_type: job?.job_type,
              description_length: (job?.description || '').length,
              description_preview: (job?.description || '').substring(0, 200),
              requirements_count: (job?.requirements || []).length,
              skills_count: (job?.skills || []).length,
              skills: job?.skills
            });

            // Validate extraction quality
            const hasTitle = !!(job?.title?.trim());
            const hasCompany = !!(job?.company_name?.trim());
            const hasDescription = ((job?.description || '').trim().length >= 30);

            console.log('[BACKGROUND] Validation check:', {
              hasTitle,
              hasCompany,
              hasDescription,
              isValid: hasTitle || hasCompany || hasDescription
            });

            if (!hasTitle && !hasCompany && !hasDescription) {
              console.error('[BACKGROUND] ERROR: Extraction validation failed - insufficient data');

              // Provide more context based on detected issues
              let errorMsg = 'Could not extract meaningful job details.';

              if (capture.accessibilityIssues && capture.accessibilityIssues.length > 0) {
                const issues = capture.accessibilityIssues.map(i => i.type).join(', ');
                console.error('[BACKGROUND] Detected issues may have affected extraction:', issues);

                const pdfIssue = capture.accessibilityIssues.find(i => i.type === 'pdf');
                const authIssue = capture.accessibilityIssues.find(i => i.type === 'auth-wall');
                const canvasIssue = capture.accessibilityIssues.find(i => i.type === 'canvas');

                if (pdfIssue) {
                  errorMsg = 'This appears to be a PDF document. Please copy the text and use paste mode.';
                } else if (authIssue) {
                  errorMsg = 'This page requires login. Please log in and try again, or use paste mode.';
                } else if (canvasIssue) {
                  errorMsg = 'This page uses canvas rendering. Please copy the text and use paste mode.';
                } else {
                  errorMsg += ` Detected issues: ${issues}. Try paste mode instead.`;
                }
              } else {
                errorMsg += ' Try paste text instead.';
              }

              notifyProgress('backend:error');
              throw new Error(errorMsg);
            }

            console.log('[BACKGROUND] Step 11: ✓ Validation passed, saving job...');
            notifyProgress('backend:save');
            const saveStart = Date.now();
            const saved = await apiSaveJob(job);
            const saveTime = Date.now() - saveStart;

            console.log('[BACKGROUND] Step 12: ✓ Job saved successfully in', saveTime + 'ms');
            console.log('[BACKGROUND] Saved job info:', {
              id: saved?.id,
              title: saved?.title,
              company_name: saved?.company_name
            });

            notifyProgress('flow:done', { savedId: saved?.id });
            console.log('[BACKGROUND] Step 13: ✓✓✓ FLOW COMPLETE - SUCCESS ✓✓✓');
            console.log('[BACKGROUND] Total flow time:', Date.now() - new Date(console.log.timestamp || Date.now()).getTime());
            console.log('[BACKGROUND] Sending success response to popup');
            console.log('========================================\n');
            sendResponse({
              ok: true,
              saved,
              iframeDetected: !!(capture.accessibilityIssues?.find(i => i.type === 'iframe')),
              iframeUrl: capture.accessibilityIssues?.find(i => i.type === 'iframe')?.url || null,
              iframeType: capture.accessibilityIssues?.find(i => i.type === 'iframe')?.subtype || null,
              accessibilityIssues: capture.accessibilityIssues || null
            });
          } finally {
            RUNNING_BY_TAB.delete(tab.id);
            console.log('[BACKGROUND] Tab processing flag cleared');
          }
          break;
        }


        case 'APPLYTIDE_RUN_FLOW1_WITH_CONFIRMATION': {
          await ensureAccessToken();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('No active tab');

          const url = tab.url;
          if (RUNNING_BY_TAB.get(tab.id)) {
            sendResponse({ ok: false, error: 'Already working on this tab. Please wait.' });
            break;
          }

          try {
            RUNNING_BY_TAB.set(tab.id, true);
            notifyProgress('flow:begin', { url });

            const cached = CAPTURE_CACHE.get(url);
            let capture;
            if (cached && (Date.now() - cached.ts) < CAPTURE_TTL_MS) {
              notifyProgress('capture:cache_hit', { url });
              capture = cached.capture;
            } else {
              notifyProgress('capture:run');
              capture = await getRenderedCapture(tab.id);
              CAPTURE_CACHE.set(url, { ts: Date.now(), capture });
            }

            notifyProgress('backend:extract');
            const { job } = await apiExtract({ url, ...capture, quick: {} });
            if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
              !((job?.description || '').trim().length >= 30)) {
              notifyProgress('backend:error');
              throw new Error('Could not extract meaningful job details. Try paste text instead.');
            }

            notifyProgress('flow:ready_for_confirm', { title: job?.title, company: job?.company_name });
            sendResponse({ ok: true, job });
          } finally {
            RUNNING_BY_TAB.delete(tab.id);
          }
          break;
        }


        // Save confirmed job
        case 'APPLYTIDE_SAVE_CONFIRMED_JOB': {
          await ensureAccessToken();
          const { job } = message;
          const saved = await apiSaveJob(job);
          sendResponse({ ok: true, saved });
          break;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (e) {
      console.error('[Applytide bg] error:', e);
      try { notifyProgress('flow:error', { error: String(e?.message || e) }); } catch { }
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});

// -------- Periodic token maintenance --------
chrome.alarms.create('applytide_refresh', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'applytide_refresh') {
    try { await ensureAccessToken(); } catch { }
  }
});
