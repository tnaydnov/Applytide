// /frontend/lib/routes.js
export const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/auth/reset',
  '/auth/verify',
  '/auth/callback',
  '/privacy',
  '/terms',
  '/about',
  '/contact',
  '/accessibility',
  '/cookie-policy',
  '/copyright-policy',
  '/pricing'
]);

export function isPublicRoute(pathname) {
  try {
    // Normalize optional trailing slash
    const p = (pathname || '/').replace(/\/+$/, '') || '/';
    return PUBLIC_ROUTES.has(p);
  } catch {
    return false;
  }
}

const PUBLIC_API_PREFIXES = [
  '/api/auth/google/login',
  '/api/auth/google/callback',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/extension-token',
];

export function isPublicResource(resource) {
  try {
    const urlStr = typeof resource === 'string'
      ? resource
      : (resource?.url || '');
    const u = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const path = u.pathname;
    return PUBLIC_API_PREFIXES.some(prefix => path.startsWith(prefix));
  } catch {
    return false;
  }
}
