const bg = chrome.runtime;

// DOM Elements
const statusEl = document.getElementById('status');
const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const screenshotSection = document.getElementById('screenshotSection');
const pasteSection = document.getElementById('pasteSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');

const quickSaveCard = document.getElementById('quickSaveCard');
const manualCard = document.getElementById('manualCard');
const userInfo = document.getElementById('userInfo');

const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const saveJobBtn = document.getElementById('saveJobBtn');
const logoutBtn = document.getElementById('logoutBtn');

const methodCards = document.querySelectorAll('.method-card');
const continueBtn = document.getElementById('continueBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const pasteBox = document.getElementById('pasteBox');
const usePastedBtn = document.getElementById('usePastedBtn');

const backFromScreenshot = document.getElementById('backFromScreenshot');
const backFromPaste = document.getElementById('backFromPaste');
const extractAnotherBtn = document.getElementById('extractAnotherBtn');

const processingStatus = document.getElementById('processingStatus');
const progressBar = document.getElementById('progressBar');
const resultContent = document.getElementById('resultContent');

// State
let selectedMethod = null;
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

// Method selection
methodCards.forEach(card => {
  card.addEventListener('click', () => {
    methodCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMethod = card.dataset.method;
    continueBtn.disabled = false;
  });
});

// Navigation handlers
continueBtn.addEventListener('click', () => {
  if (selectedMethod === 'screenshot') {
    showSection('screenshot');
  } else if (selectedMethod === 'paste') {
    showSection('paste');
  }
});

backFromScreenshot.addEventListener('click', () => {
  showSection('main');
});

backFromPaste.addEventListener('click', () => {
  showSection('main');
});

extractAnotherBtn.addEventListener('click', () => {
  // Reset state
  selectedMethod = null;
  methodCards.forEach(c => c.classList.remove('selected'));
  continueBtn.disabled = true;
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
    const response = await bg.sendMessage({ type: 'APPLYTIDE_CHECK_AUTH' });
    
    if (response.success && response.user) {
      currentUser = response.user;
      setStatus('success', `Signed in as ${response.user.email}`);
      showSection('main');
      checkModeAndShow();
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
      type: 'APPLYTIDE_LOGIN',
      email,
      password
    });
    
    if (response.success) {
      currentUser = response.user;
      setStatus('success', `Signed in as ${response.user.email}`);
      showSection('main');
      checkModeAndShow();
    } else {
      setStatus('error', response.error || 'Login failed');
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
    
    const response = await bg.sendMessage({ type: 'APPLYTIDE_GOOGLE_LOGIN' });
    
    if (response.success) {
      currentUser = response.user;
      setStatus('success', `Signed in as ${response.user.email}`);
      showSection('main');
      checkModeAndShow();
    } else {
      setStatus('error', response.error || 'Google login failed');
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
    await bg.sendMessage({ type: 'APPLYTIDE_LOGOUT' });
    currentUser = null;
    setStatus('error', 'Signed out');
    showSection('auth');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Mode detection and UI setup
async function checkModeAndShow() {
  try {
    const response = await bg.sendMessage({ type: 'APPLYTIDE_CHECK_MODE' });
    
    if (response.mode === 'auto') {
      // Show quick save option
      quickSaveCard.style.display = 'block';
      manualCard.style.display = 'none';
      userInfo.style.display = 'block';
    } else {
      // Show manual extraction options
      quickSaveCard.style.display = 'none';
      manualCard.style.display = 'block';
      userInfo.style.display = 'block';
    }
  } catch (error) {
    console.error('Mode check failed:', error);
    // Default to manual mode
    quickSaveCard.style.display = 'none';
    manualCard.style.display = 'block';
    userInfo.style.display = 'block';
  }
}

// Job extraction methods
async function saveCurrentJob() {
  try {
    showSection('processing');
    setProgress('flow:begin', 'Starting job extraction...');
    resetProgressBar();
    
    const response = await bg.sendMessage({ type: 'APPLYTIDE_SAVE_JOB' });
    
    if (response.success) {
      setProgress('flow:done', 'Job saved successfully!');
      showResult(true, 'Job saved successfully!', response.job);
    } else {
      showResult(false, response.error || 'Failed to save job');
    }
  } catch (error) {
    console.error('Save job failed:', error);
    showResult(false, 'Failed to save job');
  }
}

async function takeScreenshot() {
  try {
    showSection('processing');
    setProgress('flow:begin', 'Preparing screenshot...');
    resetProgressBar();
    
    screenshotBtn.disabled = true;
    
    const response = await bg.sendMessage({ type: 'APPLYTIDE_SCREENSHOT' });
    
    if (response.success) {
      setProgress('flow:done', 'Job extracted successfully!');
      showResult(true, 'Job extracted from screenshot!', response.job);
    } else {
      showResult(false, response.error || 'Screenshot extraction failed');
    }
  } catch (error) {
    console.error('Screenshot failed:', error);
    showResult(false, 'Screenshot extraction failed');
  } finally {
    screenshotBtn.disabled = false;
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
    
    const response = await bg.sendMessage({
      type: 'APPLYTIDE_PASTE',
      text: text
    });
    
    if (response.success) {
      setProgress('flow:done', 'Job extracted successfully!');
      showResult(true, 'Job extracted from text!', response.job);
    } else {
      showResult(false, response.error || 'Text extraction failed');
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
        <strong>Title:</strong> ${jobData.title || 'N/A'}<br>
        <strong>Company:</strong> ${jobData.company_name || 'N/A'}<br>
        <strong>Location:</strong> ${jobData.location || 'N/A'}<br>
        <strong>Type:</strong> ${jobData.job_type || 'N/A'}
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

// Event listeners
loginBtn.addEventListener('click', login);
googleBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);
saveJobBtn.addEventListener('click', saveCurrentJob);
screenshotBtn.addEventListener('click', takeScreenshot);
usePastedBtn.addEventListener('click', extractFromText);

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    login();
  }
});

// Initialize
checkAuth();