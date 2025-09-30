const bg = chrome.runtime;

const statusEl = document.getElementById('status');
const signedOut = document.getElementById('signedOut');
const signedIn = document.getElementById('signedIn');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const saveJobBtn = document.getElementById('saveJobBtn');
const logoutBtn = document.getElementById('logoutBtn');
const resultEl = document.getElementById('result');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const modeNotice = document.getElementById('modeNotice');
const assistedCard = document.getElementById('assistedCard');
const useSelectionBtn = document.getElementById('useSelectionBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const pasteBox = document.getElementById('pasteBox');
const usePastedBtn = document.getElementById('usePastedBtn');

const progressSteps = {
  'flow:begin': 10,
  'capture:start': 15,
  'capture:run': 30,
  'capture:pass': 45,      // multiple passes will keep nudging this
  'capture:done': 60,
  'backend:extract': 75,
  'backend:save': 90,
  'flow:done': 100
};

function setProgress(phase, meta = {}) {
  const pct = Math.max(0, Math.min(100, progressSteps[phase] ?? 0));
  progressWrap.style.display = 'block';
  progressBar.style.width = pct + '%';
  if (pct >= 100) {
    // let the user see "done" before hiding
    setTimeout(() => { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; }, 900);
  }
}

function resetProgressBar() {
  progressBar.classList.remove('error');
  progressBar.style.width = '0%';
  progressBar.style.background = ''
}

// Listen for streaming progress from background
if (!window.__APPLYTIDE_PROGRESS_BOUND__) {
  window.__APPLYTIDE_PROGRESS_BOUND__ = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== 'APPLYTIDE_PROGRESS') return;
    const { phase, meta } = msg;

    // progress %
    if (typeof setProgress === 'function') setProgress(phase, meta);

    // error coloring
    if (phase === 'flow:error' || phase === 'backend:error' || phase === 'capture:error') {
      progressWrap.style.display = 'block';
      progressBar.classList.add('error');
      progressBar.style.width = '100%';
    }
    if (phase === 'screenshot:failed') {
      progressBar.style.background = '#f59e0b'; // Warning orange
      statusEl.textContent = 'Screenshot failed. Try text selection instead.';
    }
    if (phase === 'flow:done') {
      setTimeout(() => {
        progressWrap.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.classList.remove('error');
      }, 900);
    }

    const pretty = {
      'flow:begin': () => `Preparing…`,
      'capture:start': () => `Starting capture…`,
      'capture:run': () => `Capturing page…`,
      'capture:pass': () => `Scanning… text=${meta?.textLen ?? 0}${meta?.jsonld ? `, JSON-LD=${meta.jsonld}` : ''}`,
      'capture:cache_hit': () => `Using recent capture`,
      'capture:done': () => `Capture done (${meta?.textLen ?? 0} chars)`,
      'backend:extract': () => `Extracting job with AI…`,
      'backend:save': () => `Saving…`,
      'flow:ready_for_confirm': () => `Extracted: ${(meta?.title || 'Untitled')} @ ${(meta?.company || 'Unknown')}`,
      'flow:done': () => `Saved! id=${meta?.savedId || '—'}`
    }[phase];

    if (pretty) setStatus(pretty(), 'muted');
  });

}

async function showDomainHint() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || 'https://');
    const host = url.hostname.replace(/^www\./, '');
    const risky = ['linkedin.com', 'glassdoor.com'];
    if (risky.some(d => host.endsWith(d))) {
      modeNotice.innerHTML = `
        <div style="color:#ef4444; font-weight:600;">⚠️ Compliance Mode Active</div>
        <div class="muted">This site's ToS restricts automated scraping. Using assisted methods only.</div>
      `;
    }
  } catch { }
}


function setStatus(text, cls) {
  statusEl.textContent = text || '';
  statusEl.className = cls ? cls : 'muted';
}

async function refreshSessionState() {
  setStatus('Checking session…', 'muted');
  
  try {
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_GET_STATUS' });
    } catch (error) {
      console.error('Failed to get session status:', error);
      setStatus('Extension connection lost', 'err');
      signedOut.style.display = '';
      signedIn.style.display = 'none';
      return;
    }
    
    if (resp?.ok && resp?.authenticated) {
      signedOut.style.display = 'none';
      signedIn.style.display = '';
      setStatus('Ready.');
      const mode = resp.mode || 'restricted';
      if (mode === 'allowed') {
        saveJobBtn.style.display = '';
        assistedCard.style.display = 'none';
        modeNotice.textContent = 'Auto-save is available on this page.';
      } else {
        saveJobBtn.style.display = 'none';
        assistedCard.style.display = '';
        modeNotice.textContent = 'Auto-save is disabled on this site. Use assisted options instead.';
      }
    } else {
      signedOut.style.display = '';
      signedIn.style.display = 'none';
      setStatus('Not signed in.');
    }
  } catch (error) {
    console.error('Session refresh failed:', error);
    setStatus('Connection error', 'err');
    signedOut.style.display = '';
    signedIn.style.display = 'none';
  }
  
  await showDomainHint();
}

loginBtn.onclick = async () => {
  setStatus('Signing in…');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_LOGIN_EMAIL', email, password, remember: true });
  if (resp?.ok) {
    setStatus('Signed in.', 'ok');
    await refreshSessionState();
    await showDomainHint();
  } else {
    setStatus(resp?.error || 'Sign-in failed.', 'err');
  }
};

googleBtn.onclick = async () => {
  setStatus('Opening Google sign-in…');
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_LOGIN_GOOGLE' });
  if (resp?.ok) {
    setStatus('Signed in.', 'ok');
    await refreshSessionState();
  } else {
    setStatus(resp?.error || 'Google sign-in failed.', 'err');
  }
};

saveJobBtn.onclick = async () => {
  resetProgressBar()
  setStatus('Saving job…');
  progressWrap.style.display = 'block';
  progressBar.style.width = '10%';
  resultEl.textContent = '';
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_RUN_FLOW1' });
  if (resp?.ok) {
    setStatus('Saved!', 'ok');
    resultEl.textContent = `Job saved (id: ${resp?.saved?.id || 'unknown'})`;
  } else {
    setStatus('Save failed.', 'err');
    resultEl.textContent = resp?.error || 'Something went wrong.';
    // show error state on bar
    progressWrap.style.display = 'block';
    progressBar.classList.add('error');
    progressBar.style.width = '100%';
  }
};

useSelectionBtn.onclick = async () => {
  resetProgressBar()
  setStatus('Starting selection…');
  progressWrap.style.display = 'block'; progressBar.style.width = '10%';
  
  try {
    // Clear any previous selection state
    await chrome.storage.local.remove(['selectionState']);
    
    // Try to send message to background script
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_USE_SELECTION' });
    } catch (error) {
      console.error('Background script message failed:', error);
      setStatus('Extension connection lost', 'err');
      resultEl.textContent = 'Extension context became invalid. Please reload the extension.';
      return;
    }
    
    if (resp?.ok) { 
      setStatus('Saved!', 'ok'); 
      resultEl.textContent = `Job saved (id: ${resp?.saved?.id || 'unknown'})`; 
    } else { 
      setStatus('Failed.', 'err'); 
      resultEl.textContent = resp?.error || 'Something went wrong.'; 
    }
  } catch (error) {
    console.error('Selection process failed:', error);
    setStatus('Selection failed.', 'err');
    resultEl.textContent = error.message || 'Unexpected error occurred';
  }
};

screenshotBtn.onclick = async () => {
  resetProgressBar()
  setStatus('Capturing screenshot…');
  progressWrap.style.display = 'block'; progressBar.style.width = '10%';
  
  try {
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_USE_SCREENSHOT' });
    } catch (error) {
      console.error('Background script message failed:', error);
      setStatus('Extension connection lost', 'err');
      resultEl.textContent = 'Extension context became invalid. Please reload the extension.';
      return;
    }
    
    if (resp?.ok) { 
      setStatus('Saved!', 'ok'); 
      resultEl.textContent = `Job saved (id: ${resp?.saved?.id || 'unknown'})`; 
    } else { 
      setStatus('Failed.', 'err'); 
      resultEl.textContent = resp?.error || 'Something went wrong.'; 
    }
  } catch (error) {
    console.error('Screenshot process failed:', error);
    setStatus('Screenshot failed.', 'err');
    resultEl.textContent = error.message || 'Unexpected error occurred';
  }
};

usePastedBtn.onclick = async () => {
  resetProgressBar()
  const text = pasteBox.value;
  if (!text.trim()) { setStatus('Paste some text first', 'err'); return; }
  setStatus('Processing pasted text…');
  progressWrap.style.display = 'block'; progressBar.style.width = '10%';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_USE_PASTED', text, url });
    } catch (error) {
      console.error('Background script message failed:', error);
      setStatus('Extension connection lost', 'err');
      resultEl.textContent = 'Extension context became invalid. Please reload the extension.';
      return;
    }
    
    if (resp?.ok) { 
      setStatus('Saved!', 'ok'); 
      resultEl.textContent = `Job saved (id: ${resp?.saved?.id || 'unknown'})`; 
    } else { 
      setStatus('Failed.', 'err'); 
      resultEl.textContent = resp?.error || 'Something went wrong.'; 
    }
  } catch (error) {
    console.error('Paste process failed:', error);
    setStatus('Paste failed.', 'err');
    resultEl.textContent = error.message || 'Unexpected error occurred';
  }
};


logoutBtn.onclick = async () => {
  setStatus('Signing out…');
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_LOGOUT' });
  if (resp?.ok) {
    await refreshSessionState();
  } else {
    setStatus(resp?.error || 'Sign-out failed', 'err');
  }
};

refreshSessionState();
