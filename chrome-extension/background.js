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
  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/ai/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errorData = await res.json();
      errorMsg = errorData?.detail || errorMsg;
    } catch {
      // Fallback to status text if JSON parsing fails
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  
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
  
  return res.json();
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

// Small helper to read current selection as text (user-initiated)
async function getSelectionText(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId }, world: 'MAIN',
    func: () => (window.getSelection?.().toString() || '').trim()
  });
  return result || '';
}

// Screenshot of the visible area (user-initiated, requires activeTab/tabs)
async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(dataUrl); // "data:image/png;base64,...."
    });
  });
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

        // Assisted Mode: selection → LLM
        case 'APPLYTIDE_USE_SELECTION': {
          try {
            await ensureAccessToken();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab');

            notifyProgress('flow:begin', { url: tab.url });

            // Clear any previous selection state
            await chrome.storage.local.remove(['selectionState']);
            
            // Set up selection state
            await chrome.storage.local.set({
              selectionState: {
                waiting: true,
                timestamp: Date.now(),
                tabUrl: tab.url
              }
            });
            
            // Inject the overlay
            await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: false },
              files: ['selector-overlay.js']
            });
            
            // Poll for selection result
            const result = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Selection timed out - please try again'));
              }, 30000);
              
              const checkSelection = async () => {
                try {
                  const state = await chrome.storage.local.get(['selectionState']);
                  if (state.selectionState?.completed) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    resolve(state.selectionState);
                  }
                } catch (e) {
                  console.error('Error checking selection state:', e);
                }
              };
              
              const interval = setInterval(checkSelection, 500);
            });

            if (!result.text || result.text.length < 10) {
              throw new Error('Please select more text including job title, company, and description');
            }

            notifyProgress('backend:extract');
            const { job } = await apiExtract({
              url: tab.url, html: '', jsonld: [], metas: {}, readable: {}, xhrLogs: [], quick: {},
              manual_text: result.text
            });
            notifyProgress('backend:save');
            const saved = await apiSaveJob(job);
            notifyProgress('flow:done', { savedId: saved?.id });
            sendResponse({ ok: true, saved });
            
          } catch (error) {
            notifyProgress('flow:error');
            const errorMsg = error?.message || String(error);
            console.error('Selection extraction failed:', error);
            sendResponse({ ok: false, error: errorMsg });
          } finally {
            // Clean up selection state
            await chrome.storage.local.remove(['selectionState']);
          }
          break;
        }


        // Assisted Mode: pasted text → LLM
        case 'APPLYTIDE_USE_PASTED': {
          try {
            await ensureAccessToken();
            const { url, text } = message;
            if (!text || !text.trim()) {
              throw new Error('Please paste some text first');
            }
            if (text.trim().length < 20) {
              throw new Error('Please paste more text including job title, company, and description');
            }
            notifyProgress('flow:begin', { url });
            notifyProgress('backend:extract');
            const { job } = await apiExtract({ url, html: '', jsonld: [], metas: {}, readable: {}, xhrLogs: [], quick: {}, manual_text: text });
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
            
            let dataUrl;
            try {
              dataUrl = await captureScreenshot();
            } catch (e) {
              notifyProgress('screenshot:failed', { error: String(e?.message || e) });
              throw new Error('Failed to capture screenshot - please try text selection instead');
            }
            
            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
              throw new Error('Invalid screenshot captured - please try again');
            }
            
            notifyProgress('backend:extract');
            const { job } = await apiExtract({
              url: tab.url, html: '', jsonld: [], metas: {}, readable: {}, xhrLogs: [], quick: {},
              screenshot: dataUrl
            });
            notifyProgress('backend:save');
            const saved = await apiSaveJob(job);
            notifyProgress('flow:done', { savedId: saved?.id });
            sendResponse({ ok: true, saved });
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
          await ensureAccessToken();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('No active tab');

          const url = tab.url;
          if (classifyPage(url) !== 'allowed') {
            sendResponse({ ok: false, error: 'Auto-save is disabled on this site. Use selection, paste, or screenshot.' });
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
              notifyProgress('capture:cache_hit', { url });
              const { job } = await apiExtract({ url, ...cached.capture, quick: {} });
              notifyProgress('backend:save');
              const saved = await apiSaveJob(job);
              notifyProgress('flow:done', { savedId: saved?.id });
              sendResponse({ ok: true, saved });
              break;
            }

            notifyProgress('capture:run');
            const capture = await getRenderedCapture(tab.id);
            CAPTURE_CACHE.set(url, { ts: Date.now(), capture });

            notifyProgress('backend:extract');
            const { job } = await apiExtract({ url, ...capture, quick: {} });

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