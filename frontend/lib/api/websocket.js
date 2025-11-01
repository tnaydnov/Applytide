/**
 * @fileoverview WebSocket connection for real-time updates
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch } from './core';

/**
 * Connect to WebSocket for real-time updates
 * @param {Function} onMsg - Callback for incoming messages
 * @returns {Object} WebSocket controller with close(), send(), and readyState
 */
export function connectWS(onMsg) {
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = `${wsProto}//${window.location.host}`;

  let socket;
  let isIntentionallyClosed = false;
  let connectionTimeout;
  let heartbeatTimer;
  let retryCount = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3; // Stop retrying after 3 consecutive failures

  const getRetryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000);

  const clearHeartbeat = () => { if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; } };
  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
      try { socket?.readyState === WebSocket.OPEN && socket.send('ping'); } catch {}
    }, 25000);
  };

  const tryConnect = async () => {
    if (isIntentionallyClosed) return;

    // Stop retrying if we've had too many consecutive failures (backend likely down)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WebSocket] Backend appears to be down. Stopped retrying.');
      }
      return;
    }

    // 1) Get a short-lived WS ticket. apiFetch will auto-refresh cookies if needed.
    let ticket = null;
    try {
      const resp = await apiFetch("/auth/ws-ticket", { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        ticket = data?.token || null;
      }
    } catch (err) {
      // If this fails we fall back to cookie-only auth; WS may still succeed in dev.
      // Silently fail - don't spam console when backend is down
      if (process.env.NODE_ENV === 'development' && consecutiveFailures === 0) {
        console.warn('[WebSocket] Failed to get WS ticket, backend may be down');
      }
    }

    // 2) Build URL (prefer explicit token)
    const url = new URL(`${host}/api/ws/updates`);
    if (ticket) url.searchParams.set("token", ticket);

    const ws = new WebSocket(url.toString());

    // connection timeout (10s)
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) ws.close();
    }, 10000);

    ws.onopen = () => { 
      clearTimeout(connectionTimeout); 
      retryCount = 0; 
      consecutiveFailures = 0; // Reset on successful connection
      startHeartbeat(); 
    };
    ws.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch {} };
    ws.onerror = () => { 
      clearTimeout(connectionTimeout); 
      consecutiveFailures++;
    };
    ws.onclose = (evt) => {
      clearTimeout(connectionTimeout);
      clearHeartbeat();
      if (isIntentionallyClosed) return;

      consecutiveFailures++;

      // Stop spamming retries if backend is clearly down
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        return;
      }

      // If policy/auth (1008) or transient close, just backoff & retry (we'll fetch a fresh ticket next time)
      const delay = getRetryDelay(retryCount++);
      setTimeout(tryConnect, delay);
    };

    socket = ws;
  };

  tryConnect();

  return {
    close: () => {
      isIntentionallyClosed = true;
      clearTimeout(connectionTimeout);
      clearHeartbeat();
      try { socket?.close(1000, 'Client initiated close'); } catch {}
    },
    send: (data) => socket?.send(data),
    get readyState() { return socket?.readyState || WebSocket.CLOSED; }
  };
}
