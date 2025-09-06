// background.js (MV3 service worker)
const APPLYTIDE_API_BASE = "http://localhost:8000"; // <-- set to your backend origin
const SAVE_ENDPOINT = "/jobs/manual";               // POST endpoint to create/save a job with parsed fields

console.log('🔧 Applytide Extension: Background script loaded');
console.log('🔧 API Base:', APPLYTIDE_API_BASE);

// Messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('🔧 Background: Received message:', msg.type, 'from tab:', sender.tab?.id);

  if (msg?.type === "APPLYTIDE_SAVE_JOB") {
    (async () => {
      try {
        let { applytide_token, applytide_refresh } =
          await chrome.storage.local.get(["applytide_token", "applytide_refresh"]);

        console.log('🔧 Background: Token check - has access token:', !!applytide_token);
        console.log('🔧 Background: Token check - has refresh token:', !!applytide_refresh);

        if (!applytide_token) {
          console.error('🔧 Background: No access token found');
          sendResponse({ 
            success: false, 
            error: "Not authenticated. Please set your token using Alt+Shift+A or visit the Applytide app.",
            status: 401
          });
          return;
        }

        const url = new URL(SAVE_ENDPOINT, APPLYTIDE_API_BASE).toString();
        console.log('🔧 Background: Making request to:', url);

        const doPost = async (token) => fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(msg.payload),
        });

        // 1st attempt
        let response = await doPost(applytide_token);

        // If unauthorized and we have a refresh token, try to refresh then retry once
        if (response.status === 401 && applytide_refresh) {
          const refUrl = new URL("/auth/refresh", APPLYTIDE_API_BASE).toString();
          const refRes = await fetch(refUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: applytide_refresh }),
          });

          if (refRes.ok) {
            const pair = await refRes.json(); // { access_token, refresh_token }
            applytide_token = pair.access_token;
            applytide_refresh = pair.refresh_token;
            await chrome.storage.local.set({
              applytide_token,
              applytide_refresh,
            });
            response = await doPost(applytide_token); // retry with fresh access token
          }
        }

        let data = null;
        try { data = await response.json(); } catch {}

        sendResponse({
          success: response.ok,
          data,
          error: response.ok ? null : (data?.detail || data?.message || response.statusText),
          status: response.status
        });
      } catch (error) {
        console.error('🔧 Background: Network error:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();
    return true;
  }

  if (msg?.type === "APPLYTIDE_SET_TOKEN") {
    console.log('🔧 Background: Setting token - access:', !!msg.token, 'refresh:', !!msg.refresh_token);
    const update = {};
    if ("token" in msg) update.applytide_token = msg.token || "";
    if ("refresh_token" in msg) update.applytide_refresh = msg.refresh_token || "";
    chrome.storage.local.set(update).then(() => {
      console.log('🔧 Background: Token stored successfully');
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg?.type === "APPLYTIDE_GET_TOKEN") {
    chrome.storage.local.get(["applytide_token", "applytide_refresh"])
      .then(v => sendResponse({ token: v.applytide_token || "", refresh: v.applytide_refresh || "" }));
    return true;
  }
});


// Keyboard command to set token quickly (Alt+Shift+A by default)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "applytide:set-token") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const t = window.prompt("Paste your Applytide API token:");
      if (t != null) chrome.runtime.sendMessage({ type: "APPLYTIDE_SET_TOKEN", token: t });
    }
  });
});