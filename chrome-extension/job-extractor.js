// chrome-extension/job-extractor.js
(() => {
  if (window.top !== window) return;

  // --- Safe runtime wrapper
  const runtime = (() => {
    try { if (typeof chrome !== "undefined" && chrome?.runtime?.id) return chrome.runtime; } catch {}
    try { if (typeof browser !== "undefined" && browser?.runtime) return browser.runtime; } catch {}
    return null;
  })();

  // --- Token capture (unchanged)
  const APPLYTIDE_APP_HOSTS = ["localhost:3000", "app.applytide.com"];
  if (APPLYTIDE_APP_HOSTS.includes(location.host) && runtime) {
    const checkTokens = () => {
      try {
        const raw =
          localStorage.getItem("token") ||
          localStorage.getItem("tokens") ||
          localStorage.getItem("auth") ||
          localStorage.getItem("access_token");
        let access = null, refresh = null;
        if (raw) {
          try {
            const o = JSON.parse(raw);
            access = o.access_token || o.access || null;
            refresh = o.refresh_token || o.refresh || null;
          } catch {
            access = raw;
          }
        }
        if (access) {
          runtime.sendMessage({ type: "APPLYTIDE_SET_TOKEN", token: access, refresh_token: refresh || "" });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };
    checkTokens();
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (k, v) {
      originalSetItem.apply(this, arguments);
      if (k === "token" || k === "tokens" || k === "auth") setTimeout(checkTokens, 80);
    };
  }

  // --- Utils
  const clean = (s) => (s || "").replace(/\u00A0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\s+/g, " ").trim();
  const text  = (el) => clean(el?.textContent || "");
  const sel   = (q, r=document) => r.querySelector(q);

  // --- best effort quick reads only (not used to populate final fields)
  function quickGuess() {
    const title = text(sel('h1')) || clean(document.title.replace(/\s*\|\s*.+$/, ""));
    const company = text(sel('[data-company], .company, a[href*="/company/"]')) || "";
    const location = text(sel('.location, [data-location], [itemprop="addressLocality"]')) || "";
    return { title, company_name: company, location };
  }

  // --- Show the floating button and open the panel
  function ensureButton() {
    if (document.getElementById("applytide-button")) return;
    const btn = document.createElement("button");
    btn.id = "applytide-button";
    btn.className = "applytide-save-button";
    btn.textContent = "Save to Applytide";
    btn.addEventListener("mouseenter", () => btn.classList.add("applytide-button-hover"));
    btn.addEventListener("mouseleave", () => btn.classList.remove("applytide-button-hover"));
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "APPLYTIDE_OPEN_PANEL" });
    });
    document.documentElement.appendChild(btn);
  }

  // --- SPA observer
  let lastHref = location.href;
  const mo = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      document.getElementById("applytide-button")?.remove();
    }
    ensureButton();
  });
  mo.observe(document.documentElement, { subtree: true, childList: true });
  if (document.readyState === "complete" || document.readyState === "interactive") ensureButton();
  else window.addEventListener("DOMContentLoaded", ensureButton, { once: true });

})();
