// lib/clientId.js
export function getClientId() {
  if (typeof window === 'undefined') return null;

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
  }
}