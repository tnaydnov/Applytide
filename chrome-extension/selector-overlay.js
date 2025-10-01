(() => {
  if (window.__APPLYTIDE_OVERLAY__) return;
  window.__APPLYTIDE_OVERLAY__ = true;

  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;' +
    'background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);' +
    'border-radius:10px;padding:8px 10px;font:13px system-ui;display:flex;gap:8px;align-items:center;';
  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <span>📋 Select ALL job details (title, company, location, description, requirements)</span>
      <div style="font-size:11px; opacity:0.8;">
        ✓ Include company name ✓ Job title ✓ Location ✓ Full description
      </div>
    </div>
  `;
  const btn = document.createElement('button');
  btn.textContent = 'Done';
  btn.style.cssText = 'background:#4f46e5;border:0;color:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;';
  bar.appendChild(btn);
  document.documentElement.appendChild(bar);

  btn.onclick = async () => {
    const text = String(window.getSelection()?.toString() || '').trim();
    bar.remove();
    window.__APPLYTIDE_OVERLAY__ = false;

    try {
      await chrome.runtime.sendMessage({
        type: 'APPLYTIDE_SELECTION_DONE',
        origin: 'applytide_selector',   // <— NEW: robust marker
        text,
        url: location.href
      });
    } catch (e) {
      const errorBar = document.createElement('div');
      errorBar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;' +
        'background:#dc2626;color:#fff;border-radius:8px;padding:8px 12px;font:13px system-ui;';
      errorBar.textContent = 'Failed to send selection. Please try again.';
      document.documentElement.appendChild(errorBar);
      setTimeout(() => errorBar.remove(), 3000);
    }
  };
})();
