// lib/clientId.js

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getClientId() {
  if (typeof window === 'undefined') return null;

  // 1) Prefer server-set cookie (created at login)
  const cookieId = readCookie('client_id');
  if (cookieId) {
    // Keep localStorage in sync so FE can read it too
    localStorage.setItem('client_id', cookieId);
    return cookieId;
  }

  // 2) Fallback to localStorage; create if missing
  let id = localStorage.getItem('client_id');
  if (!id) {
    const uuid = globalThis.crypto?.randomUUID?.();
    id = uuid ?? ('client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11));
    localStorage.setItem('client_id', id);
  }
  return id;
}

export function clearClientId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('client_id');
    // cookie clearing is handled server-side on logout
  }
}
