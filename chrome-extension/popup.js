// Production-safe console wrapper - disable logs in production
(function () {
  try {
    const m = chrome.runtime.getManifest();
    const DEV = (m.version_name && m.version_name.includes('dev')) || (m.name || '').includes('(Dev)');
    if (!DEV) {
      // keep warn/error for visibility in prod
      const originalLog = console.log;
      console.log = function () { /* Production: logs disabled */ };
    }
  } catch {
    // If manifest isn't available for any reason, disable logs to be safe
    console.log = function () { /* Production: logs disabled */ };
  }
})();

const bg = chrome.runtime;

// ---------- DOM ----------
const statusEl = document.getElementById('status');
const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');

const quickSaveCard = document.getElementById('quickSaveCard');
const manualCard = document.getElementById('manualCard');
const userInfo = document.getElementById('userInfo');

const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const saveJobBtn = document.getElementById('saveJobBtn');
const useManualInsteadBtn = document.getElementById('useManualInsteadBtn');
const backToAutoBtn = document.getElementById('backToAutoBtn');
const logoutBtn = document.getElementById('logoutBtn');

const pasteBox = document.getElementById('pasteBox');
const usePastedBtn = document.getElementById('usePastedBtn');
const extractAnotherBtn = document.getElementById('extractAnotherBtn');

const processingStatus = document.getElementById('processingStatus');
const progressBar = document.getElementById('progressBar');
const resultContent = document.getElementById('resultContent');

// ---------- State ----------
let currentUser = null;
let currentProgress = 0; // Track current progress to prevent backwards movement

// Progress tracking
const progressSteps = {
  'flow:begin': 10,
  'capture:start': 20,
  'capture:run': 40,
  'capture:done': 60,
  'backend:extract': 80,
  'backend:save': 95,
  'flow:done': 100
};

// ---------- UI helpers ----------
function showSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(sectionName + 'Section');
  if (el) el.classList.add('active');
}

function setStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = type === 'loading'
    ? `<span class="spinner"></span> ${message}`
    : message;

  // Only show for errors; hide for success/loading to keep UI clean
  statusEl.style.display = type === 'error' ? 'block' : 'none';
}

function setProgress(phase, message = null) {
  const targetPct = Math.max(0, Math.min(100, progressSteps[phase] ?? 0));
  
  // Only move forward, never backwards
  if (targetPct > currentProgress) {
    currentProgress = targetPct;
    progressBar.style.width = currentProgress + '%';
  }
  
  if (message) processingStatus.textContent = message;
  if (currentProgress >= 100) {
    setTimeout(() => { progressBar.style.width = '0%'; }, 1000);
  }
}

function resetProgressBar() {
  currentProgress = 0; // Reset tracking variable
  progressBar.classList.remove('error');
  progressBar.style.width = '0%';
}

// ---------- Navigation ----------
extractAnotherBtn.addEventListener('click', () => {
  pasteBox.value = '';
  resetProgressBar();
  checkModeAndShow(); // re-evaluate for current tab
});

// ---------- Progress updates from background ----------
if (!window.__APPLYTIDE_PROGRESS_BOUND__) {
  window.__APPLYTIDE_PROGRESS_BOUND__ = true;
  bg.onMessage.addListener((message) => {
    if (message?.type === 'APPLYTIDE_PROGRESS') {
      const { phase, status } = message;
      setProgress(phase, status || null);
    }
  });
}

// ---------- Auth ----------
async function checkAuth() {
  try {
    setStatus('loading', 'Checking session...');
    const response = await bg.sendMessage({ type: 'APPLYTIDE_GET_STATUS' });

    if (response?.ok && response?.authenticated) {
      currentUser = { email: response.email || 'User' };
      setStatus('success', 'Ready');

      // If we already know about accessibility issues, steer the user now
      if (response.mode === 'allowed' && Array.isArray(response.accessibilityIssues) && response.accessibilityIssues.length > 0) {
        handleAccessibilityIssues(response.accessibilityIssues);
        userInfo.style.display = 'block';
        return;
      }

      showSection('main');
      checkModeAndShow(response.mode);
    } else {
      setStatus('error', 'Not signed in');
      showSection('auth');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    setStatus('error', 'Connection failed');
    showSection('auth');
  }
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    setStatus('error', 'Please enter email and password');
    return;
  }

  try {
    setStatus('loading', 'Signing in...');
    loginBtn.disabled = true;

    const response = await bg.sendMessage({
      type: 'APPLYTIDE_LOGIN_EMAIL',
      email,
      password
    });

    if (response?.ok) {
      currentUser = { email };
      setStatus('success', 'Ready');
      showSection('main');
      checkModeAndShow(response.mode);
    } else {
      setStatus('error', response?.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login failed:', error);
    setStatus('error', 'Login failed');
  } finally {
    loginBtn.disabled = false;
  }
}

async function loginWithGoogle() {
  try {
    setStatus('loading', 'Signing in with Google...');
    googleBtn.disabled = true;

    const response = await bg.sendMessage({ type: 'APPLYTIDE_LOGIN_GOOGLE' });

    if (response?.ok) {
      currentUser = { email: response.email || 'User' };
      setStatus('success', 'Ready');
      showSection('main');
      checkModeAndShow(response.mode);
    } else {
      setStatus('error', response?.error || 'Google login failed');
    }
  } catch (error) {
    console.error('Google login failed:', error);
    setStatus('error', 'Google login failed');
  } finally {
    googleBtn.disabled = false;
  }
}

async function logout() {
  try {
    const response = await bg.sendMessage({ type: 'APPLYTIDE_LOGOUT' });
    if (response?.ok) {
      currentUser = null;
      setStatus('error', 'Signed out');
      showSection('auth');
    } else {
      setStatus('error', response?.error || 'Sign-out failed');
    }
  } catch (error) {
    console.error('Logout failed:', error);
    setStatus('error', 'Logout failed');
  }
}

// ---------- Mode detection ----------
function checkModeAndShow(mode) {
  const currentMode = mode || 'restricted';
  if (currentMode === 'allowed') {
    quickSaveCard.style.display = 'block';
    manualCard.style.display = 'none';
    userInfo.style.display = 'block';
  } else {
    quickSaveCard.style.display = 'none';
    manualCard.style.display = 'block';
    userInfo.style.display = 'block';
  }
}

// ---------- Actions (auto-extract) ----------
async function saveCurrentJob() {
  try {
    showSection('processing');
    setProgress('flow:begin', 'Starting job extraction...');
    resetProgressBar();

    const response = await bg.sendMessage({ type: 'APPLYTIDE_RUN_FLOW1' });

    if (response?.ok) {
      setProgress('flow:done', 'Job saved successfully!');
      showResult(true, 'Job saved successfully!', response.saved);
    } else {
      showResult(false, response?.error || 'Failed to save job');
    }
  } catch (error) {
    console.error('saveCurrentJob failed:', error);
    showResult(false, 'Failed to save job');
  }
}

// ---------- Actions (paste) ----------
async function extractFromText() {
  const text = pasteBox.value.trim();
  await extractFromPastedText(text);
}

async function extractFromPastedText(text) {
  if (!text || !text.trim()) {
    setStatus('error', 'Please paste some job text first');
    return;
  }
  if (text.length < 100) {
    setStatus('error', 'Please paste more job details');
    return;
  }

  try {
    showSection('processing');
    setProgress('flow:begin', 'Processing pasted text...');
    resetProgressBar();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';

    const response = await bg.sendMessage({
      type: 'APPLYTIDE_USE_PASTED',
      text,
      url
    });

    if (response?.ok) {
      setProgress('flow:done', 'Job extracted successfully!');
      showResult(true, 'Job extracted from text!', response.saved);
    } else {
      showResult(false, response?.error || 'Text extraction failed');
    }
  } catch (error) {
    console.error('Text extraction failed:', error);
    showResult(false, 'Text extraction failed');
  }
}

// ---------- Result ----------
function showResult(success, message, jobData = null) {
  showSection('result');

  let html = '';
  if (success) {
    html += `<div class="result-success">
      <div style="font-size: 24px; margin-bottom: 12px;">✅</div>
      <div style="font-weight: 600; margin-bottom: 8px;">${message}</div>
    </div>`;
    if (jobData) {
      html += `<div class="result-details">
        <strong>ID:</strong> ${jobData.id || 'N/A'}<br>
        <strong>Title:</strong> ${jobData.title || 'N/A'}<br>
        <strong>Company:</strong> ${jobData.company_name || 'N/A'}<br>
        <strong>Location:</strong> ${jobData.location || 'N/A'}
      </div>`;
    }
  } else {
    html += `<div class="result-error">
      <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
      <div style="font-weight: 600; margin-bottom: 8px;">Extraction Failed</div>
      <div class="result-details">${message}</div>
    </div>`;
  }

  resultContent.innerHTML = html;
}

// ---------- Accessibility warnings ----------
function handleAccessibilityIssues(issues) {
  // priority: iframe > pdf > canvas > auth-wall > shadow-dom > generic
  const iframeIssue = issues.find(i => i.type === 'iframe');
  if (iframeIssue?.url) { showIframeWarning(iframeIssue.url, iframeIssue.subtype || 'generic'); return; }

  const pdfIssue = issues.find(i => i.type === 'pdf');
  if (pdfIssue) { showPDFWarning(pdfIssue.url); return; }

  const canvasIssue = issues.find(i => i.type === 'canvas');
  if (canvasIssue) { showCanvasWarning(); return; }

  const authIssue = issues.find(i => i.type === 'auth-wall');
  if (authIssue) { showAuthWallWarning(); return; }

  const shadowIssue = issues.find(i => i.type === 'shadow-dom');
  if (shadowIssue?.hasClosed) { showShadowDOMWarning(); return; }

  showGenericWarning(issues);
}

function showIframeWarning(url, type) {
  document.getElementById('iframeUrl').textContent = url;
  const el = document.getElementById('iframeType');
  if (el) el.textContent = (type[0]?.toUpperCase() || '') + type.slice(1);
  showSection('iframeWarning');

  window.__iframeUrl = url;
  window.__iframeType = type;
}

function showPDFWarning(url) {
  const el = document.getElementById('pdfUrl');
  if (el) el.textContent = url || 'PDF document detected';
  showSection('pdfWarning');
}

function showCanvasWarning() { showSection('canvasWarning'); }
function showAuthWallWarning() { showSection('authWallWarning'); }
function showShadowDOMWarning() { showSection('shadowDOMWarning'); }

function showGenericWarning(issues) {
  const issueTypes = issues.map(i => i.type).join(', ');
  const genericTextEl = document.getElementById('genericWarningText');
  if (genericTextEl) {
    genericTextEl.textContent = `Detected: ${issueTypes}. Automatic extraction may not work properly.`;
  }
  showSection('genericWarning');
}

// ---------- Events ----------
document.getElementById('openDirectLinkBtn')?.addEventListener('click', async () => {
  if (!window.__iframeUrl) return;

  const normalize = (u) => {
    try {
      // decode a couple of times, strip hash/query, drop trailing slash
      let s = u;
      for (let i = 0; i < 2; i++) { try { s = decodeURIComponent(s); } catch { break; } }
      const url = new URL(s);
      return (url.origin + url.pathname).replace(/\/+$/, '');
    } catch {
      return (u || '').replace(/[#?].*$/, '').replace(/\/+$/, '');
    }
  };

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || '';
    const targetUrl = window.__iframeUrl;

    if (normalize(currentUrl) === normalize(targetUrl)) {
      // We're already on the canonical page - just extract.
      showSection('processing');
      setProgress('flow:begin', 'Starting job extraction...');
      resetProgressBar();
      const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_RUN_FLOW1' });
      if (resp?.ok) {
        setProgress('flow:done', 'Job saved successfully!');
        showResult(true, 'Job saved successfully!', resp.saved);
      } else {
        showResult(false, resp?.error || 'Failed to save job');
      }
      return;
    }

    await chrome.tabs.update(tab.id, { url: targetUrl });
    window.close();
  } catch (error) {
    console.error('[POPUP] Error redirecting:', error);
    showResult(false, 'Failed to open direct link');
  }
});


loginBtn.addEventListener('click', login);
googleBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);
saveJobBtn.addEventListener('click', saveCurrentJob);
usePastedBtn.addEventListener('click', extractFromText);

// Manual override buttons
useManualInsteadBtn.addEventListener('click', () => {
  quickSaveCard.style.display = 'none';
  manualCard.style.display = 'block';
  backToAutoBtn.style.display = 'block'; // Show back button
  pasteBox.value = ''; // Clear textarea
  pasteBox.focus();
});

backToAutoBtn.addEventListener('click', () => {
  manualCard.style.display = 'none';
  quickSaveCard.style.display = 'block';
  backToAutoBtn.style.display = 'none';
});

document.getElementById('usePastedPDFBtn')?.addEventListener('click', () => {
  const text = document.getElementById('pasteBoxPDF').value;
  extractFromPastedText(text);
});
document.getElementById('usePastedCanvasBtn')?.addEventListener('click', () => {
  const text = document.getElementById('pasteBoxCanvas').value;
  extractFromPastedText(text);
});
document.getElementById('usePastedAuthBtn')?.addEventListener('click', () => {
  const text = document.getElementById('pasteBoxAuth').value;
  extractFromPastedText(text);
});
document.getElementById('usePastedShadowBtn')?.addEventListener('click', () => {
  const text = document.getElementById('pasteBoxShadow').value;
  extractFromPastedText(text);
});
document.getElementById('usePastedGenericBtn')?.addEventListener('click', () => {
  const text = document.getElementById('pasteBoxGeneric').value;
  extractFromPastedText(text);
});

document.getElementById('tryExtractAnywayBtn')?.addEventListener('click', () => {
  saveCurrentJob(); // Try despite warnings
});

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

// ---------- Init ----------
checkAuth();
