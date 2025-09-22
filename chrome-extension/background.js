// background.js

const m = chrome.runtime.getManifest();
const DEV = (m.version_name && m.version_name.includes('dev')) || m.name.includes('(Dev)');
const API_HOST = DEV ? "http://localhost/api" : "https://applytide.com/api";


let ACCESS = null;   // short-lived extension access token (Authorization: Bearer …)

// ---------------- Utilities ----------------
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (ACCESS) h["Authorization"] = `Bearer ${ACCESS}`;
  return h;
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
  } catch (e) {}
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
  } catch {}
  return fetchExtensionToken();
}

// -------- API calls needed for Flow 1 --------
async function apiExtract({ url, html, quick }) {
  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/ai/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, html, quick })
  });
  if (!res.ok) throw new Error(`AI extract failed: ${res.status}`);
  return res.json(); // { job: {...} }
}

async function apiSaveJob(jobPayload) {
  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/jobs/extension`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(jobPayload)
  });
  if (!res.ok) throw new Error(`Save job failed: ${res.status}`);
  return res.json();
}

// -------- HTML capture from the active tab --------
async function getRenderedHTML(tabId, { timeoutMs = 4000, minTextLen = 1200 } = {}) {
  const start = Date.now();

  async function preparePageForExtraction() {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 1) Expand ALL "show more" controls with multiple strategies
        const expandSelectors = [
          // Text-based buttons
          'button, a[role="button"], div[role="button"]',
          // LinkedIn-specific
          '[aria-expanded="false"]',
          // Indeed-specific
          '#jobDescriptionText .css-fy8yim, #viewJobButtonLinkContainer',
          // Glassdoor-specific
          '.css-t3xrds, .empReview .v2__EIReviewDetailsV2__fullContent'
        ];
        
        // Try to expand everything that might contain job details
        expandSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            // For text-based matching
            const text = (el.innerText || el.textContent || "").toLowerCase().trim();
            const isExpander = /show more|read more|expand|see more|view more|show all|see details|view job/i.test(text);
            
            // Try multiple expansion strategies
            if (isExpander || el.getAttribute("aria-expanded") === "false") {
              try { 
                // First try clicking
                el.click(); 
                // Then try setting aria-expanded
                if (el.hasAttribute("aria-expanded")) {
                  el.setAttribute("aria-expanded", "true");
                  // Force triggering events
                  const event = new Event('change', { bubbles: true });
                  el.dispatchEvent(event);
                }
              } catch(e) { 
                console.warn("Failed to expand:", e);
              }
            }
          });
        });

        // 2) Merge same-origin iframes
        const serialize = (doc) => doc.documentElement.outerHTML;
        let html = serialize(document);
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (const f of iframes) {
          try {
            if (f.contentDocument) {
              html += "\n<!-- IFRAME MERGE -->\n" + serialize(f.contentDocument);
            }
          } catch {}
        }

        const textLen = (document.body?.innerText || "").length;
        return { html, textLen };
      }
    });
    return result;
  }

  // Poll until SPA renders or timeout - with two expansion attempts
  await preparePageForExtraction(); // First expansion pass
  await new Promise(r => setTimeout(r, 1000)); // Wait for content to load
  
  while (Date.now() - start < timeoutMs) {
    const { html, textLen } = await preparePageForExtraction(); // Second expansion pass
    if (textLen >= minTextLen) return html;
    await new Promise(r => setTimeout(r, 750)); // Wait longer between attempts
  }
  
  // Final attempt
  const { html } = await preparePageForExtraction();
  return html;
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
  } catch {}

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

  if (popup?.id) try { chrome.windows.remove(popup.id); } catch {}
  if (!bridged) return { ok: false, error: "Login timed out" };
  ACCESS = null; // force fresh pull
  await fetchExtensionToken();
  return { ok: true };
}


// -------- Auth: Google OAuth via small window + polling --------
async function loginWithGoogle() {
  const backendBase = API_HOST.replace(/\/api$/, "");   // -> http://localhost  or  https://applytide.com
  const loginUrl   = `${backendBase}/api/auth/google/login?ext=1`; // go through NGINX
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
    try { if (winId) chrome.windows.remove(winId); } catch {}
    return { ok: false, error: "Timed out waiting for Google sign-in" };
  }

  // Store the short-lived extension access token
  ACCESS = access;
  try { if (winId) chrome.windows.remove(winId); } catch {}
  return { ok: true };
}


async function logoutEverywhere() {
  try {
    await fetch(`${API_HOST}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {}
  ACCESS = null;
  return { ok: true };
}

// -------- Message bus for popup --------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'APPLYTIDE_GET_STATUS': {
          const ok = await ensureAccessToken();
          sendResponse({ ok: true, authenticated: !!ok });
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
          const html = await getRenderedHTML(tab.id);
          const { job } = await apiExtract({ url, html, quick: {} });
          const saved = await apiSaveJob(job);
          sendResponse({ ok: true, saved });
          break;
        }

        // Flow 1 with confirmation: Extract job but don't save yet
        case 'APPLYTIDE_RUN_FLOW1_WITH_CONFIRMATION': {
          await ensureAccessToken();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('No active tab');
          const url = tab.url;
          const html = await getRenderedHTML(tab.id);
          const { job } = await apiExtract({ url, html, quick: {} });
          sendResponse({ ok: true, job });
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
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});

// -------- Periodic token maintenance --------
chrome.alarms.create('applytide_refresh', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'applytide_refresh') {
    try { await ensureAccessToken(); } catch {}
  }
});
