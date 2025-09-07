// chrome-extension/panel.js
(() => {
  if (window.top !== window) return;

  const bus = {
    on(messageType, cb) {
      chrome.runtime.onMessage.addListener((msg, _sender, _send) => {
        if (msg?.type === messageType) cb(msg);
      });
    },
    send(type, payload) {
      chrome.runtime.sendMessage({ type, ...payload });
    }
  };

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'applytide-overlay';
  overlay.innerHTML = `
    <div id="applytide-card">
      <div id="applytide-close">✕</div>
      <h2>Applytide</h2>
      <div class="muted">Choose what you want to do:</div>
      <div class="row">
        <button id="applytide-flow1">1) Save job only</button>
        <button id="applytide-flow2" class="primary">2) Adapt resume & auto-apply</button>
      </div>
      <div id="applytide-steps" style="display:none; margin-top:12px;">
        <div class="muted">Review resume suggestions below, then continue.</div>
        <div id="applytide-suggestions" class="list"></div>
        <div class="row">
          <button id="applytide-back">Back</button>
          <button id="applytide-continue" class="primary">Continue</button>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(overlay);

  const show = () => overlay.classList.add('show');
  const hide = () => overlay.classList.remove('show');

  const btnFlow1 = overlay.querySelector('#applytide-flow1');
  const btnFlow2 = overlay.querySelector('#applytide-flow2');
  const closeBtn = overlay.querySelector('#applytide-close');
  const steps = overlay.querySelector('#applytide-steps');
  const suggestionsEl = overlay.querySelector('#applytide-suggestions');
  const backBtn = overlay.querySelector('#applytide-back');
  const continueBtn = overlay.querySelector('#applytide-continue');

  closeBtn.onclick = hide;

  // Entry point: show panel when extractor button is clicked
  bus.on('APPLYTIDE_OPEN_PANEL', () => {
    steps.style.display = 'none';
    suggestionsEl.innerHTML = '';
    show();
  });

  // Flow 1 -> background does AI extract + save
  btnFlow1.onclick = () => {
    hide();
    bus.send('APPLYTIDE_RUN_FLOW1', {});
  };

  // Flow 2 -> ask backend for resume suggestions first, then show checklist
  btnFlow2.onclick = async () => {
    suggestionsEl.innerHTML = '<div class="muted">Fetching suggestions…</div>';
    steps.style.display = 'block';

    const html = document.documentElement.outerHTML;
    const url = location.href;

    chrome.runtime.sendMessage(
      { type: 'APPLYTIDE_FETCH_SUGGESTIONS', url, html },
      (resp) => {
        suggestionsEl.innerHTML = '';
        (resp?.suggestions || []).forEach((sugg, i) => {
          const id = `sugg_${i}`;
          const row = document.createElement('label');
          row.innerHTML = `
            <input type="checkbox" id="${id}" checked />
            <div>
              <div><strong>${sugg.title || 'Suggestion'}</strong></div>
              <div class="muted">${sugg.reason || ''}</div>
              ${sugg.preview ? `<pre style="white-space:pre-wrap;margin:.5em 0 0;">${sugg.preview}</pre>` : ''}
            </div>
          `;
          suggestionsEl.appendChild(row);
        });
      }
    );
  };

  // Back to flow choice
  backBtn.onclick = () => {
    steps.style.display = 'none';
  };

  // Continue with chosen suggestions
  continueBtn.onclick = () => {
    const checks = suggestionsEl.querySelectorAll('input[type="checkbox"]');
    const accepted = [];
    checks.forEach((c, idx) => c.checked && accepted.push(idx));

    // Apply chosen resume changes first, then kick off the auto-apply flow
    chrome.runtime.sendMessage(
        { type: 'APPLYTIDE_ACCEPT_SUGGESTIONS', suggestion_indexes: accepted },
        (resp) => {
        if (resp?.error) {
            suggestionsEl.insertAdjacentHTML('beforeend', `<div class="muted">❌ ${resp.error}</div>`);
            return;
        }
        // Proceed to the automation (background will check docs, extract, fill, etc.)
        chrome.runtime.sendMessage({ type: 'APPLYTIDE_RUN_FLOW2' });
        // UI can hide now; background will raise alerts if needed.
        hide();
        }
    );
    };

    // Utility: show a modal-style inline warning in the overlay (background can call this)
    chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'APPLYTIDE_PANEL_WARNING') {
        show();
        steps.style.display = 'block';
        suggestionsEl.innerHTML = `
        <div class="muted" style="color:#fca5a5">
            ⚠️ ${msg.message}
        </div>
        ${Array.isArray(msg.missing) && msg.missing.length
            ? `<div style="margin-top:8px">Missing: <strong>${msg.missing.join(', ')}</strong></div>`
            : ''
        }
        `;
        backBtn.style.display = 'none';
        continueBtn.style.display = 'none';
    }
    });
})();
