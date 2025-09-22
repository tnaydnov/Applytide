// lib/clientId.js
export function getClientId() {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }
  
  let id = localStorage.getItem('client_id');
  if (!id) {
    // Generate a new client ID using crypto.randomUUID if available
    if (crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Fallback for older browsers
      id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    localStorage.setItem('client_id', id);
  }
  return id;
}

export function clearClientId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('client_id');
  }
}