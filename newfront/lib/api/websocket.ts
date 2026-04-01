/**
 * @fileoverview WebSocket connection for real-time updates
 * Manages WebSocket connection with automatic reconnection
 */

import { apiFetch } from './core';
import { logger } from '../logger';

/** All WebSocket event types sent by the backend */
export type WSEventType =
  | 'stage_changed'
  | 'stage_added'
  | 'stage_updated'
  | 'stage_deleted'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'attachment_added'
  | 'attachment_deleted'
  | 'application_archived'
  | 'application_deleted'
  | 'system_maintenance';

/** Typed WebSocket message from the backend */
export interface WSMessage {
  type: WSEventType;
  application_id?: string;
  status?: string;
  is_archived?: boolean;
  message?: string;
  [key: string]: unknown;
}

interface WebSocketController {
  close: () => void;
  send: (data: string) => void;
  readyState: number;
}

/**
 * Connect to WebSocket for real-time updates
 * @param onMsg - Callback for incoming messages
 * @returns WebSocket controller with close(), send(), and readyState
 */
export function connectWS(onMsg: (data: WSMessage) => void): WebSocketController {
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = `${wsProto}//${window.location.host}`;

  let socket: WebSocket | null = null;
  let isIntentionallyClosed = false;
  let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let retryCount = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3; // Stop retrying after 3 consecutive failures

  const getRetryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

  const clearHeartbeat = () => { 
    if (heartbeatTimer) { 
      clearInterval(heartbeatTimer); 
      heartbeatTimer = null; 
    } 
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
      try { 
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send('ping'); 
        }
      } catch {
        // Heartbeat failure is non-critical; connection will be cleaned up on close
      }
    }, 25000);
  };

  const tryConnect = async () => {
    if (isIntentionallyClosed) return;

    // Stop retrying if we've had too many consecutive failures (backend likely down)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      if (import.meta.env.DEV) {
        logger.warn('[WebSocket] Backend appears to be down. Stopped retrying.');
      }
      return;
    }

    // 1) Get a short-lived WS ticket. apiFetch will auto-refresh cookies if needed.
    let ticket: string | null = null;
    try {
      const resp = await apiFetch("/auth/ws-ticket", { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        ticket = data?.token || null;
      }
    } catch (err) {
      // If this fails we fall back to cookie-only auth; WS may still succeed in dev.
      // Silently fail - don't spam console when backend is down
      if (import.meta.env.DEV && consecutiveFailures === 0) {
        logger.warn('[WebSocket] Failed to get WS ticket, backend may be down');
      }
    }

    // 2) Build URL (prefer explicit token)
    const url = new URL(`${host}/api/v1/ws/updates`);
    if (ticket) url.searchParams.set("token", ticket);

    const ws = new WebSocket(url.toString());

    // connection timeout (10s)
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) ws.close();
    }, 10000);

    ws.onopen = () => { 
      if (connectionTimeout) clearTimeout(connectionTimeout); 
      retryCount = 0; 
      consecutiveFailures = 0; // Reset on successful connection
      startHeartbeat(); 
    };

    ws.onmessage = (e) => { 
      try { 
        onMsg(JSON.parse(e.data) as WSMessage); 
      } catch {
        // Malformed JSON from server; skip silently
      }
    };

    ws.onerror = () => { 
      if (connectionTimeout) clearTimeout(connectionTimeout); 
      consecutiveFailures++;
    };

    ws.onclose = () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
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
      if (connectionTimeout) clearTimeout(connectionTimeout);
      clearHeartbeat();
      try { 
        socket?.close(1000, 'Client initiated close'); 
      } catch {}
    },
    send: (data: string) => socket?.send(data),
    get readyState() { 
      return socket?.readyState || WebSocket.CLOSED; 
    }
  };
}
