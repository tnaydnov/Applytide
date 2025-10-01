// background.js

const m = chrome.runtime.getManifest();
const DEV = (m.version_name && m.version_name.includes('dev')) || m.name.includes('(Dev)');
const API_HOST = DEV ? "http://localhost/api" : "https://applytide.com/api";
const RUNNING_BY_TAB = new Map(); // tabId -> boolean
const CAPTURE_CACHE = new Map();  // url -> { ts: number, capture }
const CAPTURE_TTL_MS = 60_000;

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
  console.log('[bg] apiExtract - Step 4: Making API call');
  console.log('[bg] DEBUG: API_HOST=', API_HOST);
  console.log('[bg] DEBUG: payload keys=', Object.keys(payload));
  console.log('[bg] DEBUG: payload summary=', {
    url: payload.url,
    html_len: (payload.html || '').length,
    manual_text_len: (payload.manual_text || '').length,
    screenshot_len: (payload.screenshot || '').length,
    jsonld_count: (payload.jsonld || []).length
  });

  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/ai/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  console.log('[bg] DEBUG: API response status=', res.status);

  if (!res.ok) {
    console.log('[bg] ERROR: API request failed, status=', res.status);
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errorData = await res.json();
      console.log('[bg] DEBUG: Error response data=', errorData);
      errorMsg = errorData?.detail || errorMsg;

      // Check if it's debug info from backend
      if (errorMsg.includes('DEBUG_INFO:')) {
        console.log('[bg] BACKEND DEBUG INFO RECEIVED:', errorMsg);
      }
    } catch (e) {
      console.log('[bg] ERROR: Failed to parse error response:', e);
      // Fallback to status text if JSON parsing fails
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  console.log('[bg] DEBUG: API request successful, parsing response');

  return res.json();
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

  console.log('[bg] DEBUG: API request successful, parsing response');
  const result = await res.json();
  console.log('[bg] DEBUG: API response parsed successfully');
  console.log('[bg] DEBUG: Response job summary=', {
    title: result.job?.title || 'None',
    company: result.job?.company_name || 'None',
    desc_len: (result.job?.description || '').length
  });
  return result;
}

// -------- HTML capture from the active tab --------
async function getRenderedCapture(tabId, {
  timeoutMs = 18000,
  scrollSteps = 10,
  pauseMs = 300
} = {}) {

  // This function is stringified & executed in the page context
  function INJECTED_CAPTURE() {
    /* ---------- helpers ---------- */

    // 1) Click real expanders (multi-strategy, no fake aria toggling)
    function tryExpandAll() {
      const candidates = Array.from(document.querySelectorAll([
        'button',
        'a[role="button"]',
        'div[role="button"]',
        '[data-testid*="expand"]',
        '[data-control-name*="expand"]',
        '[aria-controls]',
        '[aria-expanded="false"]'
      ].join(',')));

      const txtRe = /\b(show|see|read|view)\s+(more|details|all)|expand|more|\u2026|…/i;

      for (const el of candidates) {
        const label = (el.innerText || el.textContent || '').trim().toLowerCase();
        const isLikely = txtRe.test(label) || el.getAttribute('aria-expanded') === 'false';
        if (!isLikely) continue;
        try {
          // Try a few real interactions:
          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          el.click();
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        } catch { }
      }
    }

    // 2) Scroll/overscan (helps virtualized lists render)
    async function overscanScroll() {
      const target = document.scrollingElement || document.documentElement || document.body;
      const total = target.scrollHeight - target.clientHeight;
      if (total <= 0) return;
      const steps = Math.max(6, (window.__APPLYTIDE_SCROLL_STEPS__ || 10));
      for (let i = 1; i <= steps; i++) {
        target.scrollTo({ top: Math.round((i / steps) * total), behavior: 'instant' });
        tryExpandAll();
        await new Promise(r => setTimeout(r, (window.__APPLYTIDE_PAUSE_MS__ || 300)));
      }
      // Scroll back to top (some sites lazy-mount on reverse)
      for (let i = steps; i >= 0; i--) {
        target.scrollTo({ top: Math.round((i / steps) * total), behavior: 'instant' });
        await new Promise(r => setTimeout(r, (window.__APPLYTIDE_PAUSE_MS__ || 300)));
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
        await new Promise(r => s.onload = r);
        const article = new Readability(document.cloneNode(true)).parse();
        return article || null;
      } catch { return null; }
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

    /* ---------- main flow ---------- */
    window.__APPLYTIDE_SCROLL_STEPS__ = 12;
    window.__APPLYTIDE_PAUSE_MS__ = 300;

    // Start network hook immediately
    hookNetwork();

    // Expand & scroll to mount virtualized DOM
    tryExpandAll();
    // Overscan passes
    return (async () => {
      await overscanScroll();
      // One more expand pass after scroll
      tryExpandAll();
      const html = serializeWithShadow(document);
      const jsonld = harvestJSONLD();
      const metas = harvestMetas();
      const readable = await getReadable();
      const textLen = (document.body?.innerText || '').length;
      const xhrLogs = (window.__applytideLogs || []);
      return { html, jsonld, metas, readable, textLen, xhrLogs };
    })();
  } // end INJECTED_CAPTURE

  const start = Date.now();
  let last = null;
  notifyProgress('capture:start');

  while (Date.now() - start < timeoutMs) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',           // run in page world so hooks & clicks work
      func: INJECTED_CAPTURE
    });
    last = result;
    const jlCount = Array.isArray(result?.jsonld) ? result.jsonld.length : 0;
    notifyProgress('capture:pass', { textLen: result?.textLen || 0, jsonld: jlCount });
    // Heuristic: either enough text or we got JSON-LD JobPosting
    const hasJobPosting = Array.isArray(result?.jsonld) && result.jsonld.some(
      x => String(x?.['@type'] || '').toLowerCase().includes('jobposting')
    );
    const textEnough = (result?.textLen || 0) >= 1400; // a tad safer for SPAs
    const hasReadable = !!result?.readable?.textContent && result.readable.textContent.length > 800;
    if (hasJobPosting || hasReadable || textEnough) break;
    await new Promise(r => setTimeout(r, 600));
  }
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

// getSelectionText function removed - selection functionality no longer supported

// Screenshot of the visible area (user-initiated, requires activeTab/tabs)
async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    // Use JPEG with quality to reduce file size and visual noise for AI processing
    chrome.tabs.captureVisibleTab({
      format: 'jpeg',
      quality: 100  // Lower quality to reduce file size for better AI processing
    }, (dataUrl) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

      // Return the JPEG directly - the quality setting above already optimizes it
      resolve(dataUrl);
    });
  });
}

async function captureFullPageScreenshot(tabId) {
  console.log("[bg] Starting full-page screenshot capture");

  // Step 1: Get page dimensions and identify scrollable elements
  const [dimensionsResult] = await chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      // Find scrollable elements (including LinkedIn's hidden scrollers)
      function findScrollableElements() {
        const elements = [];
        // Common selectors for job description containers
        const selectors = [
          '.jobs-description-content',
          '.jobs-box__html-content',
          '.jobs-details__main-content',
          '.jobs-search__job-details--wrapper',
          '.jobs-search__job-details--container',
          '.jobs-details',
          // Generic selectors
          'div[role="region"]',
          'div[style*="overflow"]',
          'div[style*="scroll"]'
        ];

        setTimeout(() => { }, 300);

        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          found.forEach(el => {
            // Lower the threshold to catch more elements
            if (el.scrollHeight > el.clientHeight + 20) {
              elements.push({
                selector,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                overflow: el.scrollHeight - el.clientHeight
              });
              console.log(`Found scrollable: ${selector}, overflow=${el.scrollHeight - el.clientHeight}`);
            }
          });
        }
        return elements;
      }

      // Main document dimensions
      const docDimensions = {
        scrollHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
        scrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      };

      // Also find scrollable containers (LinkedIn uses these)
      const scrollableElements = findScrollableElements();

      return {
        document: docDimensions,
        scrollableElements
      };
    }
  });

  if (!dimensionsResult) {
    console.error("[bg] Failed to get page dimensions");
    throw new Error("Failed to get page dimensions");
  }

  const { document: docDimensions, scrollableElements } = dimensionsResult.result;
  console.log(`[bg] Page dimensions: documentScrollHeight=${docDimensions.scrollHeight}, viewportHeight=${docDimensions.viewportHeight}`);
  console.log(`[bg] Found ${scrollableElements.length} scrollable elements:`, scrollableElements);

  // If we found scrollable elements, use those for scrolling
  if (scrollableElements.length > 0) {
    return await captureScrollableElementScreenshots(tabId, scrollableElements);
  }

  // If no scrollable elements found, use traditional page scrolling
  const { scrollHeight, viewportHeight } = docDimensions;

  // If page isn't scrollable, just take one screenshot
  if (scrollHeight <= viewportHeight || Math.abs(scrollHeight - viewportHeight) < 50) {
    console.log("[bg] Page not scrollable, taking single screenshot");
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 85
      });
      return [dataUrl];
    } catch (error) {
      console.error("[bg] Error capturing screenshot:", error);
      throw error;
    }
  }

  // Calculate sections needed (add overlap to ensure nothing is missed)
  const overlap = Math.min(200, viewportHeight * 0.1); // 10% overlap, max 200px
  const effectiveViewportHeight = viewportHeight - overlap;
  const sectionsNeeded = Math.ceil(scrollHeight / effectiveViewportHeight);
  console.log(`[bg] Sections needed: ${sectionsNeeded} (with ${overlap}px overlap)`);

  const maxSections = 10; // Limit to avoid overwhelming the API
  const screenshots = [];

  // Step 2: Scroll and capture each section
  for (let i = 0; i < Math.min(sectionsNeeded, maxSections); i++) {
    // Calculate scroll position (with overlap)
    const scrollPosition = i * effectiveViewportHeight;

    // Scroll to position
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (position) => {
        window.scrollTo(0, position);
      },
      args: [scrollPosition]
    });

    // Wait for any lazy-loaded content and for the page to stabilize
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Capture visible portion
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 85  // Good balance between quality and size
      });

      screenshots.push(dataUrl);

      notifyProgress('capture:scroll', {
        current: i + 1,
        total: Math.min(sectionsNeeded, maxSections)
      });
    } catch (error) {
      console.error(`[bg] Error capturing screenshot at section ${i}:`, error);
      // Continue with other screenshots even if one fails
    }
  }

  // Return to the top of the page
  await chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      window.scrollTo(0, 0);
    }
  });

  console.log(`[bg] Captured ${screenshots.length} screenshots`);
  return screenshots;
}

// Replace the captureScrollableElementScreenshots function with this version:
async function captureScrollableElementScreenshots(tabId, scrollableElements) {
  console.log("[bg] Using scrollable elements capture strategy");

  // Find the largest scrollable element (likely the job container)
  const targetElement = scrollableElements.sort((a, b) => b.overflow - a.overflow)[0];
  console.log("[bg] Target scrollable element:", targetElement);

  const screenshots = [];
  const scrollHeight = targetElement.scrollHeight;
  const clientHeight = targetElement.clientHeight;
  const scrollSteps = Math.min(Math.ceil(scrollHeight / clientHeight) + 1, 5); // Limit to 5 screenshots

  console.log(`[bg] Will capture ${scrollSteps} screenshots of scrollable content (${scrollHeight}px in ${clientHeight}px container)`);

  // Add rate limiting - only 2 captures per second allowed
  for (let i = 0; i < scrollSteps; i++) {
    // Calculate scroll position as percentage of total scroll
    const scrollPercentage = i / Math.max(1, scrollSteps - 1);
    const scrollPosition = Math.floor(scrollPercentage * Math.max(0, scrollHeight - clientHeight));

    // Execute scroll on the element
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (selector, scrollPosition) => {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          // Find the one with the highest overflow
          let target = elements[0];
          let maxOverflow = 0;

          for (const el of elements) {
            const overflow = el.scrollHeight - el.clientHeight;
            if (overflow > maxOverflow) {
              maxOverflow = overflow;
              target = el;
            }
          }

          // Scroll the target element
          target.scrollTop = scrollPosition;
          console.log(`Scrolled element to position ${scrollPosition}/${target.scrollHeight}`);
          return true;
        }
        return false;
      },
      args: [targetElement.selector, scrollPosition]
    });

    // Wait for content to load after scroll - longer wait (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Capture visible portion
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 85
      });

      screenshots.push(dataUrl);

      notifyProgress('capture:scroll', {
        current: i + 1,
        total: scrollSteps
      });

      // IMPORTANT: Wait 750ms between captures to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 750));

    } catch (error) {
      console.error(`[bg] Error capturing screenshot at section ${i}:`, error);
      // Wait even longer after an error (might be rate limiting)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Reset scroll position
  await chrome.scripting.executeScript({
    target: { tabId },
    function: (selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        // Find the one with the highest overflow
        let target = elements[0];
        let maxOverflow = 0;

        for (const el of elements) {
          const overflow = el.scrollHeight - el.clientHeight;
          if (overflow > maxOverflow) {
            maxOverflow = overflow;
            target = el;
          }
        }

        target.scrollTop = 0;
      }
    },
    args: [targetElement.selector]
  });

  console.log(`[bg] Captured ${screenshots.length} screenshots from scrollable element`);
  return screenshots;
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
          sendResponse({ ok: true, authenticated: !!ok, mode });
          break;
        }

        // Selection mode removed - keeping only screenshot and paste methods

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
              throw new Error('Could not extract meaningful job details. Try screenshot or paste text instead.');
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

        // Assisted Mode: screenshot → OCR/LLM
        case 'APPLYTIDE_USE_SCREENSHOT': {
          try {
            await ensureAccessToken();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab');
            notifyProgress('flow:begin', { url: tab.url });

            try {
              notifyProgress('capture:start', { url: tab.url });

              // Use our scrolling capture function
              const screenshots = await captureFullPageScreenshot(tab.id);

              if (!screenshots || !screenshots.length) {
                throw new Error('Failed to capture screenshots');
              }

              notifyProgress('capture:done', { count: screenshots.length });
              console.log(`[bg] Captured ${screenshots.length} screenshots successfully`);

              // Extra validation to ensure we have proper data URLs
              for (let i = 0; i < screenshots.length; i++) {
                if (typeof screenshots[i] !== 'string' || !screenshots[i].startsWith('data:image/')) {
                  console.error(`[bg] Invalid screenshot format at index ${i}`);
                  throw new Error('Invalid screenshot format detected');
                }
              }

              // Send screenshots to backend - ensure we're sending strings
              notifyProgress('backend:extract');
              const payload = {
                url: tab.url,
                html: '',
                jsonld: [],
                metas: {},
                readable: {},
                xhrLogs: [],
                quick: { source: 'screenshot', sections: screenshots.length },
                screenshots: screenshots // These should be strings already
              };

              // Log payload structure before sending
              console.log(`[bg] Payload screenshots count: ${payload.screenshots.length}`);
              console.log(`[bg] First screenshot type: ${typeof payload.screenshots[0]}`);
              console.log(`[bg] First screenshot preview: ${payload.screenshots[0].substring(0, 50)}...`);

              const { job } = await apiExtract(payload);

              if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
                !((job?.description || '').trim().length >= 30)) {
                notifyProgress('backend:error');
                throw new Error('Could not extract meaningful job details');
              }

              notifyProgress('backend:save');
              const saved = await apiSaveJob(job);
              notifyProgress('flow:done', { savedId: saved?.id });
              sendResponse({ ok: true, saved });
            } catch (e) {
              notifyProgress('screenshot:failed', { error: String(e?.message || e) });
              throw e;
            }
          } catch (error) {
            notifyProgress('flow:error');
            const errorMsg = error?.message || String(error);
            console.error('Screenshot extraction failed:', error);
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
          console.log('[bg] APPLYTIDE_RUN_FLOW1 - Step 1: Starting regular extraction');
          await ensureAccessToken();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('No active tab');

          const url = tab.url;
          console.log('[bg] DEBUG: Regular flow URL=', url);
          console.log('[bg] DEBUG: Page classification=', classifyPage(url));

          if (classifyPage(url) !== 'allowed') {
            console.log('[bg] ERROR: Page not allowed for auto-save');
            sendResponse({ ok: false, error: 'Auto-save is disabled on this site. Use paste or screenshot instead.' });
            break;
          }
          if (RUNNING_BY_TAB.get(tab.id)) {
            sendResponse({ ok: false, error: 'Already working on this tab. Please wait.' });
            break;
          }

          try {
            RUNNING_BY_TAB.set(tab.id, true);
            notifyProgress('flow:begin', { url });

            // short-term cache
            const cached = CAPTURE_CACHE.get(url);
            if (cached && (Date.now() - cached.ts) < CAPTURE_TTL_MS) {
              console.log('[bg] DEBUG: Using cached capture data');
              notifyProgress('capture:cache_hit', { url });
              const payload = { url, ...cached.capture, quick: {} };
              console.log('[bg] DEBUG: Cached payload summary=', {
                html_len: (payload.html || '').length,
                jsonld_count: (payload.jsonld || []).length,
                readable: !!payload.readable
              });
              const { job } = await apiExtract(payload);
              if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
                !((job?.description || '').trim().length >= 30)) {
                notifyProgress('backend:error');
                throw new Error('Could not extract meaningful job details. Try screenshot or paste text instead.');
              }

              notifyProgress('backend:save');
              const saved = await apiSaveJob(job);
              notifyProgress('flow:done', { savedId: saved?.id });
              sendResponse({ ok: true, saved });
              break;
            }

            console.log('[bg] DEBUG: No cache, capturing page content');
            notifyProgress('capture:run');
            const capture = await getRenderedCapture(tab.id);
            CAPTURE_CACHE.set(url, { ts: Date.now(), capture });

            console.log('[bg] DEBUG: Page capture completed');
            console.log('[bg] DEBUG: Capture summary=', {
              html_len: (capture.html || '').length,
              jsonld_count: (capture.jsonld || []).length,
              readable: !!capture.readable,
              textLen: capture.textLen || 0
            });

            notifyProgress('backend:extract');
            const payload = { url, ...capture, quick: {} };
            console.log('[bg] DEBUG: Regular extraction payload summary=', {
              html_len: (payload.html || '').length,
              jsonld_count: (payload.jsonld || []).length,
              readable: !!payload.readable
            });
            const { job } = await apiExtract(payload);
            if (!(job?.title?.trim()) && !(job?.company_name?.trim()) &&
              !((job?.description || '').trim().length >= 30)) {
              notifyProgress('backend:error');
              throw new Error('Could not extract meaningful job details. Try screenshot or paste text instead.');
            }


            notifyProgress('backend:save');
            const saved = await apiSaveJob(job);

            notifyProgress('flow:done', { savedId: saved?.id });
            sendResponse({ ok: true, saved });
          } finally {
            RUNNING_BY_TAB.delete(tab.id);
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
              throw new Error('Could not extract meaningful job details. Try screenshot or paste text instead.');
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
