// chrome-extension/background.js
const API_HOST = chrome.runtime.getManifest().version.includes('dev') 
  ? "http://localhost:8000" 
  : "https://applytide.com/api";

let TOKEN = null;
let REFRESH = null;

// ---------------- Token helpers ----------------
function setToken(token, refresh_token) { TOKEN = token; REFRESH = refresh_token || null; }
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

async function getExtensionToken() {
  try {
    const response = await fetch(`${API_HOST}/auth/extension-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get extension token');
    }
    
    const data = await response.json();
    if (data.access_token) {
      setToken(data.access_token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Extension token error:', error);
    return false;
  }
}

// Try to read tokens from your web app tab (dev or prod)
async function getTokenFromWebsite() {
  try {
    // Try getting a specific extension token from your backend
    const success = await getExtensionToken();
    if (success) {
      console.log("[Applytide bg] token loaded from extension endpoint");
      return true;
    }
  } catch (e) {
    console.log("[Applytide bg] token lookup failed:", e);
  }
  return false;
}

// ---------------- API calls ----------------


async function apiExtract({ url, html, quick }) {
  const res = await fetch(`${API_HOST}/api/ai/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, html, quick })
  });
  if (!res.ok) throw new Error(`AI extract failed: ${res.status}`);
  return res.json(); // { job: {...} }
}

async function apiSuggest({ url, html }) {
  const res = await fetch(`${API_HOST}/api/ai/resume/suggest`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, html })
  });
  if (!res.ok) throw new Error(`AI suggest failed: ${res.status}`);
  return res.json();
}

async function apiApplyResumeChanges({ suggestion_indexes }) {
  const res = await fetch(`${API_HOST}/api/ai/resume/apply`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ suggestion_indexes })
  });
  if (!res.ok) throw new Error(`AI apply resume failed: ${res.status}`);
  return res.json();
}

async function apiSaveJob(jobPayload) {
  const res = await fetch(`${API_HOST}/jobs/extension`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(jobPayload)
  });
  if (!res.ok) throw new Error(`Save job failed: ${res.status}`);
  return res.json();
}

async function apiSaveApplication({ job_id, resume_id }) {
  const res = await fetch(`${API_HOST}/api/extension/applications`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ job_id, resume_id })
  });
  if (!res.ok) throw new Error(`Save application failed: ${res.status}`);
  return res.json();
}

async function apiListRequiredDocs() {
  const res = await fetch(`${API_HOST}/api/extension/documents/required`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Req docs failed: ${res.status}`);
  return res.json(); // { ok: true, required: ['resume', 'transcript'], have: ['resume'], missing: ['transcript'] }
}

async function apiListResumes() {
  const res = await fetch(`${API_HOST}/api/extension/resumes`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Resumes failed: ${res.status}`);
  return res.json(); // { items: [{id,name,url,...}] }
}

async function apiDownloadResumeBlob(resume_id) {
  const res = await fetch(`${API_HOST}/api/extension/resumes/${resume_id}/download`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Resume download failed: ${res.status}`);
  const blob = await res.blob();
  const name = /filename="?([^"]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'resume.pdf';
  return { blob, name };
}

// ---- passive request: suggestions for Flow 2 step 1
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'APPLYTIDE_FETCH_SUGGESTIONS') {
      try {
        // Ensure token if possible
        await getTokenFromWebsite().catch(() => {});
        const html = msg.html || (sender?.tab?.id ? await getRenderedHTML(sender.tab.id) : '');
        const resp = await apiSuggest({ url: msg.url, html });
        sendResponse({ suggestions: resp?.suggestions || [] });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    }
  })();
  return true;
});

// ---- apply selected resume changes
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  (async () => {
    if (msg?.type === 'APPLYTIDE_ACCEPT_SUGGESTIONS') {
      try {
        await getTokenFromWebsite().catch(() => {});
        const resp = await apiApplyResumeChanges({ suggestion_indexes: msg.suggestion_indexes || [] });
        // backend should return the chosen/updated resume id
        sendResponse({ ok: true, resume_id: resp?.resume_id });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    }
  })();
  return true;
});

// ---- main orchestrator
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'APPLYTIDE_RUN_FLOW2') {
    (async () => {
      const tabId = sender?.tab?.id || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
      try {
        // 1) Ensure auth
        await getTokenFromWebsite();

        // 2) Check user has required documents
        const req = await apiListRequiredDocs(); // { required, have, missing }
        if (req?.missing?.length) {
          chrome.tabs.sendMessage(tabId, {
            type: 'APPLYTIDE_PANEL_WARNING',
            message: `Can't continue without required documents.`,
            missing: req.missing
          });
          return;
        }

        // 3) Capture page & extract job (robust expand already inside getRenderedHTML)
        const html = await getRenderedHTML(tabId, { timeoutMs: 5000, minTextLen: 1000 });
        const url = (await chrome.tabs.get(tabId)).url;
        const { job } = await apiExtract({ url, html, quick: false });

        // 4) Persist job in your DB
        const saved = await apiSaveJob(job); // returns {id, ...}
        const job_id = saved?.id;

        // 5) Figure out which resume to use (use last-updated or the one user just edited)
        let resume_id = null;
        try {
          // If the last call to APPLYTIDE_ACCEPT_SUGGESTIONS returned a resume id,
          // you could store it in memory; here we just pick active/most-recent:
          const resumes = await apiListResumes();
          resume_id = resumes?.items?.[0]?.id || null;
        } catch {}

        if (!resume_id) {
          chrome.tabs.sendMessage(tabId, {
            type: 'APPLYTIDE_PANEL_WARNING',
            message: `No resume found. Please upload a resume and try again.`,
            missing: ['resume']
          });
          return;
        }

        // 6) Download the chosen resume as a Blob for file inputs
        const { blob: resumeBlob, name: resumeName } = await apiDownloadResumeBlob(resume_id);

        // 7) Run the in-page autofill agent
        await runAutofillInTab(tabId, {
          source_url: url,
          job,
          files: [{ kind: 'resume', name: resumeName, blobUrl: URL.createObjectURL(resumeBlob) }],
          prefs: { pauseOnAmbiguity: true, maxSteps: 40 }
        });

        // 8) Save application in your app
        await apiSaveApplication({ job_id, resume_id });

        // (Optional) notify success via panel toast
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLYTIDE_PANEL_WARNING',
          message: '✅ Application completed and saved as status: Applied.'
        });
      } catch (e) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLYTIDE_PANEL_WARNING',
          message: `❌ Flow failed: ${e.message}`
        });
      }
    })();
  }
});

// -------------------------------------------------------
// Autofill Agent injected into the page
function runAutofillInTab(tabId, data) {
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (payload) => {
      // ---- Simple label/placeholder/aria matcher
      const qAll = (sel, root=document) => Array.from(root.querySelectorAll(sel));
      const norm = s => (s || '').toLowerCase().replace(/\s+/g,' ').trim();

      const formData = {
        // Map canonical job fields to human text
        title: payload?.job?.title,
        company: payload?.job?.company_name,
        location: payload?.job?.location,
        email: payload?.user?.email || '',
        phone: payload?.user?.phone || '',
        first_name: payload?.user?.first_name || '',
        last_name: payload?.user?.last_name || '',
        linkedin: payload?.user?.linkedin || '',
        website: payload?.user?.website || '',
        // add more if you keep user profile in your app
      };

      const candidates = (el) => {
        const lblFor = el.id ? qAll(`label[for="${el.id}"]`) : [];
        const lblWrap = el.closest('label') ? [el.closest('label')] : [];
        const aria = el.getAttribute('aria-label') || '';
        const ph = el.getAttribute('placeholder') || '';
        const name = el.getAttribute('name') || '';
        return norm([lblFor.map(x=>x.textContent).join(' '), lblWrap.map(x=>x.textContent).join(' '), aria, ph, name].join(' '));
      };

      const fillText = (el, val) => {
        if (!val) return false;
        try {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        } catch { return false; }
      };

      const click = (el) => { try { el.click(); return true; } catch { return false; } };

      // ---- Fill text-like inputs
      const map = [
        { key: 'first_name', hints: ['first name','given name','forename'] },
        { key: 'last_name',  hints: ['last name','surname','family name'] },
        { key: 'email',      hints: ['email'] },
        { key: 'phone',      hints: ['phone','mobile','telephone'] },
        { key: 'linkedin',   hints: ['linkedin','linkedin profile','linkedin url'] },
        { key: 'website',    hints: ['website','portfolio','personal site','github'] },
        { key: 'title',      hints: ['position','job title','role you are applying','desired position'] },
        { key: 'company',    hints: ['company','employer'] },
        { key: 'location',   hints: ['location','city','country'] },
      ];

      const inputs = qAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea');
      for (const el of inputs) {
        const label = candidates(el);
        for (const m of map) {
          if (!formData[m.key]) continue;
          if (m.hints.some(h => label.includes(h))) { fillText(el, formData[m.key]); break; }
        }
      }

      // ---- Selects (very generic heuristic)
      qAll('select').forEach(sel => {
        const txt = candidates(sel);
        if (/work authorization|visa/.test(txt)) {
          // naive example: pick first non-empty
          const opt = Array.from(sel.options).find(o => o.value && !/select/i.test(o.textContent));
          if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      });

      // ---- Resume upload
      const resume = (payload.files || []).find(f => f.kind === 'resume');
      if (resume) {
        const fileInputs = qAll('input[type="file"]');
        for (const fi of fileInputs) {
          const label = candidates(fi);
          if (/resume|cv/i.test(label) || fileInputs.length === 1) {
            // Attach via DataTransfer (works on most sites)
            try {
              const resp = await fetch(resume.blobUrl);
              const blob = await resp.blob();
              const file = new File([blob], resume.name || 'resume.pdf', { type: blob.type || 'application/pdf' });
              const dt = new DataTransfer();
              dt.items.add(file);
              fi.files = dt.files;
              fi.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
              console.warn('Resume attach failed', e);
            }
          }
        }
      }

      // ---- Click common next/submit buttons; loop a few steps
      const nextSelectors = [
        'button[type="submit"]',
        'button[aria-label*="next"]',
        'button:has(span:matches("Next","Continue","Review","Apply"))',
        'button:matches("Next","Continue","Apply")',
        'input[type="submit"]',
        'a[role="button"]'
      ];
      const tryNext = () => {
        for (const sel of nextSelectors) {
          const btns = qAll(sel);
          for (const b of btns) {
            const txt = norm(b.textContent || b.getAttribute('aria-label') || '');
            if (/(next|continue|apply|review|submit)/.test(txt)) {
              if (click(b)) return true;
            }
          }
        }
        return false;
      };

      // walk through up to N steps (site-dependent)
      for (let i=0; i< (payload?.prefs?.maxSteps || 30); i++) {
        // small delay to let UI re-render
        await new Promise(r => setTimeout(r, 600));
        // If we detect unknown mandatory fields, surface a banner for the user to help
        const requiredUnfilled = qAll('[required]').filter(el => !el.value);
        if (requiredUnfilled.length && payload?.prefs?.pauseOnAmbiguity) {
          // inject a sticky helper banner
          if (!document.getElementById('applytide-helper')) {
            const div = document.createElement('div');
            div.id = 'applytide-helper';
            div.style.cssText = 'position:fixed;bottom:10px;left:10px;padding:10px 12px;background:#111827;color:#e5e7eb;border:1px solid #334155;border-radius:10px;z-index:2147483647;font-family:system-ui';
            div.textContent = 'Applytide: I could not infer some required fields. Please fill what you can and click the next button; I will resume.';
            document.body.appendChild(div);
          }
          // wait for the user to act
          await new Promise(r => setTimeout(r, 4000));
        }
        if (!tryNext()) break;
      }
    },
    args: [data]
  });
}

// ---------------- DOM capture with expansion ----------------
async function getRenderedHTML(tabId, { timeoutMs = 4000, minTextLen = 1200 } = {}) {
  const start = Date.now();

  async function expandAndSnapshot() {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 1) Expand common "show more" controls before snapshot
        const clickers = [
          ...document.querySelectorAll('button, a[role="button"]')
        ].filter((el) => {
          const txt = (el.innerText || el.textContent || "").toLowerCase().trim();
          return /show more|read more|expand|see more|view more|show all/.test(txt);
        });
        for (const c of clickers) { try { c.click(); } catch {} }

        // LinkedIn-specific aria-expanded toggles (generic attribute approach, not hardcoded selectors)
        document.querySelectorAll("[aria-expanded='false']").forEach(el => {
          try { el.setAttribute("aria-expanded", "true"); el.click(); } catch {}
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

  // Poll until SPA renders or timeout
  while (Date.now() - start < timeoutMs) {
    const { html, textLen } = await expandAndSnapshot();
    if (textLen >= minTextLen) return html;
    await new Promise(r => setTimeout(r, 250));
  }
  const { html } = await expandAndSnapshot();
  return html;
}

// ---------------- Autofill helper (unchanged) ----------------
function runAutofillInTab(tabId, data) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (payload) => {
      const entries = Object.entries(payload || {});
      const getLabelFor = (input) => {
        if (input.id) {
          const lbl = document.querySelector(`label[for="${input.id}"]`);
          if (lbl) return lbl.textContent.toLowerCase();
        }
        let p = input.closest('label');
        if (p) return p.textContent.toLowerCase();
        return '';
      };
      const fields = document.querySelectorAll('input, textarea, select');
      for (const el of fields) {
        const keyText = [el.name, el.placeholder, getLabelFor(el)]
          .filter(Boolean).map(s => s.toLowerCase()).join(' | ');
        for (const [k, v] of entries) {
          if (!v) continue;
          if (new RegExp(k.replace(/_/g,'\\s*'), 'i').test(keyText)) {
            try {
              if (el.tagName === 'SELECT') {
                const opt = [...el.options].find(o =>
                  (o.textContent||'').toLowerCase().includes(String(v).toLowerCase()) ||
                  String(o.value).toLowerCase()===String(v).toLowerCase()
                );
                if (opt) el.value = opt.value;
              } else {
                el.value = v;
              }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            } catch {}
          }
        }
      }
    },
    args: [data]
  });
}

// ---------------- Message bus ----------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "APPLYTIDE_SET_TOKEN":
          setToken(message.token, message.refresh_token);
          sendResponse({ ok: true });
          break;

        case "APPLYTIDE_OPEN_PANEL":
          chrome.tabs.sendMessage(sender.tab.id, { type: "APPLYTIDE_OPEN_PANEL" });
          sendResponse({ ok: true });
          break;

        // Flow 1: Save job only
        case "APPLYTIDE_RUN_FLOW1": {
          await getTokenFromWebsite();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const url = tab.url;
          const html = await getRenderedHTML(tab.id);

          const quick = {}; // reserved for any cheap hints later
          const { job } = await apiExtract({ url, html, quick });
          const saved = await apiSaveJob(job);
          sendResponse({ ok: true, saved });
          break;
        }

        // Flow 2a: fetch resume suggestions for panel
        case "APPLYTIDE_FETCH_SUGGESTIONS": {
          await getTokenFromWebsite();
          const { url, html } = message;
          const data = await apiSuggest({ url, html });
          sendResponse(data);
          break;
        }

        // Flow 2b: apply suggestions + autofill + save application
        case "APPLYTIDE_RUN_FLOW2": {
          await getTokenFromWebsite();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const url = tab.url;
          const html = await getRenderedHTML(tab.id);

          const { job } = await apiExtract({ url, html, quick: {} });
          const savedJob = await apiSaveJob(job);

          const { accepted } = message;
          const { resume_id } = await apiApplyResumeChanges({ suggestion_indexes: accepted || [] });

          runAutofillInTab(tab.id, {
            job_title: job.title,
            company: job.company_name,
            location: job.location
          });

          await apiSaveApplication({ job_id: savedJob.id, resume_id });
          sendResponse({ ok: true, job_id: savedJob.id, resume_id });
          break;
        }

        default:
          sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (e) {
      console.error("[Applytide bg] error:", e);
      sendResponse({ ok: false, error: String(e) });
    }
  })();

  return true;
});
