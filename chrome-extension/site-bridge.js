// site-bridge.js (replace the whole file)

// Where to call (dev vs prod)
const API_BASE = "http://localhost/api";

let sent = false;

// Check if we're on an authentication page where the user wouldn't be logged in yet
function isAuthPage() {
  const authPaths = ['/login', '/auth/', '/reset-password'];
  return authPaths.some(path => location.pathname.startsWith(path));
}

async function tryExchangeOnce() {
  try {

    const res = await fetch(`${API_BASE}/auth/extension-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json().catch(() => null);
    if (!data?.access_token) {
      return false;
    }

    // Success: hand it to the background
    if (!sent) {
      sent = true;
      chrome.runtime.sendMessage({
        type: "APPLYTIDE_BRIDGE_AUTH",
        access_token: data.access_token
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Run immediately + retry for ~30s (handles SPA load/cookie timing)
// But only if we're not on an authentication page
(async () => {
  if (isAuthPage()) {
    return;
  }

  const started = Date.now();
  while (Date.now() - started < 30000 && !sent) {
    const ok = await tryExchangeOnce();
    if (ok) break;
    await new Promise(r => setTimeout(r, 1500));
  }
})();