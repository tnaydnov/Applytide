// site-bridge.js (replace the whole file)

// Where to call (dev vs prod)
const API_BASE = location.hostname === "applytide.com"
  ? "https://applytide.com/api"
  : "http://localhost/api";

let sent = false;

// Check if we're on an authentication page where the user wouldn't be logged in yet
function isAuthPage() {
  const authPaths = ['/login', '/auth/', '/reset-password'];
  return authPaths.some(path => location.pathname.startsWith(path));
}

async function tryExchangeOnce() {
  try {
    // Helpful console signal so we can see this in the OAuth window
    console.log("[Applytide bridge] trying /auth/extension-token @", API_BASE);

    const res = await fetch(`${API_BASE}/auth/extension-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      console.log("[Applytide bridge] non-200:", res.status);
      return false;
    }

    const data = await res.json().catch(() => null);
    if (!data?.access_token) {
      console.log("[Applytide bridge] no access_token in response");
      return false;
    }

    // Success: hand it to the background
    if (!sent) {
      sent = true;
      console.log("[Applytide bridge] got token, sending to extension");
      chrome.runtime.sendMessage({
        type: "APPLYTIDE_BRIDGE_AUTH",
        access_token: data.access_token
      });
    }
    return true;
  } catch (e) {
    console.log("[Applytide bridge] error:", e);
    return false;
  }
}

// Run immediately + retry for ~30s (handles SPA load/cookie timing)
// But only if we're not on an authentication page
(async () => {
  if (isAuthPage()) {
    console.log("[Applytide bridge] skipping auth token exchange on auth page:", location.pathname);
    return;
  }

  const started = Date.now();
  while (Date.now() - started < 30000 && !sent) {
    const ok = await tryExchangeOnce();
    if (ok) break;
    await new Promise(r => setTimeout(r, 1500));
  }
})();