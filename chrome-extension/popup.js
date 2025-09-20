const bg = chrome.runtime;

const statusEl   = document.getElementById('status');
const signedOut  = document.getElementById('signedOut');
const signedIn   = document.getElementById('signedIn');
const loginBtn   = document.getElementById('loginBtn');
const googleBtn  = document.getElementById('googleBtn');
const saveJobBtn = document.getElementById('saveJobBtn');
const logoutBtn  = document.getElementById('logoutBtn');
const resultEl   = document.getElementById('result');

function setStatus(text, cls) {
  statusEl.textContent = text || '';
  statusEl.className = cls ? cls : 'muted';
}

async function refreshSessionState() {
  setStatus('Checking session…', 'muted');
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_GET_STATUS' });
  if (resp?.ok && resp?.authenticated) {
    signedOut.style.display = 'none';
    signedIn.style.display  = '';
    setStatus('Ready.');
  } else {
    signedOut.style.display = '';
    signedIn.style.display  = 'none';
    setStatus('Not signed in.');
  }
}

loginBtn.onclick = async () => {
  setStatus('Signing in…');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_LOGIN_EMAIL', email, password, remember: true });
  if (resp?.ok) {
    setStatus('Signed in.', 'ok');
    await refreshSessionState();
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
  setStatus('Saving job…');
  resultEl.textContent = '';
  const resp = await chrome.runtime.sendMessage({ type: 'APPLYTIDE_RUN_FLOW1' });
  if (resp?.ok) {
    setStatus('Saved!', 'ok');
    resultEl.textContent = `Job saved (id: ${resp?.saved?.id || 'unknown'})`;
  } else {
    setStatus('Save failed.', 'err');
    resultEl.textContent = resp?.error || 'Something went wrong.';
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
