const bg = chrome.runtime;

// DOM Elements
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
const logoutBtn = document.getElementById('logoutBtn');

const pasteBox = document.getElementById('pasteBox');
const usePastedBtn = document.getElementById('usePastedBtn');
const extractAnotherBtn = document.getElementById('extractAnotherBtn');

const processingStatus = document.getElementById('processingStatus');
const progressBar = document.getElementById('progressBar');
const resultContent = document.getElementById('resultContent');

// State
let currentUser = null;

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

// UI Navigation
function showSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionName + 'Section').classList.add('active');
}

function setStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = type === 'loading' ?
    `<span class="spinner"></span> ${message}` : message;

  // Only show status for errors, hide for success/loading
  statusEl.style.display = type === 'error' ? 'block' : 'none';
}

function setProgress(phase, message = null) {
  const pct = Math.max(0, Math.min(100, progressSteps[phase] ?? 0));
  progressBar.style.width = pct + '%';

  if (message) {
    processingStatus.textContent = message;
  }

  if (pct >= 100) {
    setTimeout(() => {
      progressBar.style.width = '0%';
    }, 1000);
  }
}

function resetProgressBar() {
  progressBar.classList.remove('error');
  progressBar.style.width = '0%';
}

// Navigation handlers
extractAnotherBtn.addEventListener('click', () => {
  // Reset state
  pasteBox.value = '';
  resetProgressBar();

  // Check mode and show appropriate section
  checkModeAndShow();
});

// Progress updates from background
if (!window.__APPLYTIDE_PROGRESS_BOUND__) {
  window.__APPLYTIDE_PROGRESS_BOUND__ = true;

  bg.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'APPLYTIDE_PROGRESS') {
      const { phase, status } = message;
      console.log(`[popup] Progress update: ${phase} - ${status}`);
      setProgress(phase, status);
    }
  });
}

// Authentication
async function checkAuth() {
  try {
    setStatus('loading', 'Checking session...');
    const response = await bg.sendMessage({ type: 'APPLYTIDE_GET_STATUS' });

    if (response?.ok && response?.authenticated) {
      currentUser = { email: response.email || 'User' };
      setStatus('success', 'Ready');
      
      // Handle accessibility issues immediately
      if (response.mode === 'allowed' && response?.accessibilityIssues && response.accessibilityIssues.length > 0) {
        console.log('[POPUP] Accessibility issues detected:', response.accessibilityIssues);
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

// Handle all types of accessibility issues
function handleAccessibilityIssues(issues) {
  // Priority order: iframe > pdf > canvas > auth-wall > shadow-dom
  
  // 1. Iframe - highest priority, requires redirect
  const iframeIssue = issues.find(i => i.type === 'iframe');
  if (iframeIssue && iframeIssue.url) {
    showIframeWarning(iframeIssue.url, iframeIssue.subtype || 'generic');
    return;
  }
  
  // 2. PDF - cannot extract, must paste
  const pdfIssue = issues.find(i => i.type === 'pdf');
  if (pdfIssue) {
    showPDFWarning(pdfIssue.url);
    return;
  }
  
  // 3. Canvas - cannot extract text from pixels
  const canvasIssue = issues.find(i => i.type === 'canvas');
  if (canvasIssue) {
    showCanvasWarning();
    return;
  }
  
  // 4. Auth wall - content behind login
  const authIssue = issues.find(i => i.type === 'auth-wall');
  if (authIssue) {
    showAuthWallWarning();
    return;
  }
  
  // 5. Shadow DOM - we can auto-extract open shadow roots
  const shadowIssue = issues.find(i => i.type === 'shadow-dom');
  if (shadowIssue && shadowIssue.hasClosed) {
    showShadowDOMWarning();
    return;
  }
  
  // 6. Other issues - show generic warning
  showGenericWarning(issues);
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

// Mode detection and UI setup
function checkModeAndShow(mode) {
  // Use the mode passed from the status check, or default to 'restricted'
  const currentMode = mode || 'restricted';

  if (currentMode === 'allowed') {
    // Show quick save option
    quickSaveCard.style.display = 'block';
    manualCard.style.display = 'none';
    userInfo.style.display = 'block';
  } else {
    // Show manual extraction (paste only)
    quickSaveCard.style.display = 'none';
    manualCard.style.display = 'block';
    userInfo.style.display = 'block';
  }
}

// Job extraction methods
async function saveCurrentJob() {
  try {
    console.log('========================================');
    console.log('[POPUP] Step 1: User clicked Save Current Job');
    console.log('[POPUP] Timestamp:', new Date().toISOString());
    console.log('========================================');
    
    showSection('processing');
    setProgress('flow:begin', 'Starting job extraction...');
    resetProgressBar();

    console.log('[POPUP] Step 2: Sending APPLYTIDE_RUN_FLOW1 message to background...');
    const response = await bg.sendMessage({ type: 'APPLYTIDE_RUN_FLOW1' });
    console.log('[POPUP] Step 3: Received response from background:', {
      ok: response?.ok,
      hasJob: !!response?.saved,
      jobTitle: response?.saved?.title,
      jobCompany: response?.saved?.company_name,
      error: response?.error
    });

    if (response?.ok) {
      console.log('[POPUP] Step 4: SUCCESS - Job extracted and saved!');
      console.log('[POPUP] Saved job details:', {
        id: response.saved?.id,
        title: response.saved?.title,
        company: response.saved?.company_name,
        location: response.saved?.location,
        descriptionLength: response.saved?.description?.length
      });
      setProgress('flow:done', 'Job saved successfully!');
      showResult(true, 'Job saved successfully!', response.saved);
    } else {
      console.error('[POPUP] Step 4: FAILED - Job extraction failed');
      console.error('[POPUP] Error message:', response?.error);
      showResult(false, response?.error || 'Failed to save job');
    }
  } catch (error) {
    console.error('[POPUP] Step 4: EXCEPTION caught:', error);
    console.error('[POPUP] Error stack:', error.stack);
    showResult(false, 'Failed to save job');
  }
}

async function extractFromText() {
  const text = pasteBox.value.trim();

  if (!text) {
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

    usePastedBtn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';

    const response = await bg.sendMessage({
      type: 'APPLYTIDE_USE_PASTED',
      text: text,
      url: url
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
  } finally {
    usePastedBtn.disabled = false;
  }
}

// Result display
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

// Iframe warning handlers
function showIframeWarning(url, type) {
  document.getElementById('iframeUrl').textContent = url;
  const typeText = type.charAt(0).toUpperCase() + type.slice(1);
  document.getElementById('iframeType')?.textContent = typeText;
  showSection('iframeWarning');
  
  // Store for button handlers
  window.__iframeUrl = url;
  window.__iframeType = type;
}

// PDF warning
function showPDFWarning(url) {
  document.getElementById('pdfUrl')?.textContent = url || 'PDF document detected';
  showSection('pdfWarning');
}

// Canvas warning  
function showCanvasWarning() {
  showSection('canvasWarning');
}

// Auth wall warning
function showAuthWallWarning() {
  showSection('authWallWarning');
}

// Shadow DOM warning
function showShadowDOMWarning() {
  showSection('shadowDOMWarning');
}

// Generic unsupported warning
function showGenericWarning(issues) {
  const issueTypes = issues.map(i => i.type).join(', ');
  document.getElementById('genericWarningText')?.textContent = 
    `Detected: ${issueTypes}. Automatic extraction may not work properly.`;
  showSection('genericWarning');
}

document.getElementById('openDirectLinkBtn')?.addEventListener('click', async () => {
  if (window.__iframeUrl) {
    console.log('[POPUP] Redirecting to direct URL:', window.__iframeUrl);
    
    try {
      // Update current tab to the iframe URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.update(tab.id, { url: window.__iframeUrl });
      
      // Wait for page to load, then auto-retry extraction
      console.log('[POPUP] Waiting for page to load...');
      showSection('processing');
      setProgress('flow:begin', 'Navigating to direct link...');
      
      // Listen for tab update
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log('[POPUP] Page loaded, starting extraction...');
          
          // Wait a bit for JS to load, then retry
          setTimeout(() => {
            saveCurrentJob(); // Now on direct page, no iframe
          }, 2000);
        }
      };
      
      chrome.tabs.onUpdated.addListener(listener);
      
      // Timeout fallback (if page doesn't load in 15s)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
      }, 15000);
      
    } catch (error) {
      console.error('[POPUP] Error redirecting:', error);
      showResult(false, 'Failed to open direct link');
    }
  }
});

// Event listeners
loginBtn.addEventListener('click', login);
googleBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);
saveJobBtn.addEventListener('click', saveCurrentJob);
usePastedBtn.addEventListener('click', extractFromText);

// Paste button handlers for all warning screens
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
  saveCurrentJob(); // Try extraction despite warnings
});

// Unified paste extraction function
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
      text: text,
      url: url
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

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    login();
  }
});

// Initialize
checkAuth();
