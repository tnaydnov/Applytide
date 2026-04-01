/**
 * @fileoverview Public routes and resource definitions
 * Defines which routes are accessible without authentication
 */

export const PUBLIC_ROUTES = new Set([
  '/',
  '/signin',
  '/login', // Keep for backward compatibility
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/about',
  '/contact',
  '/accessibility',
  '/cookie-policy',
  '/copyright',
  '/pricing',
  '/how-it-works',
  '/auth/google-callback'
]);

/**
 * Check if a pathname is a public route
 * @param pathname - The pathname to check
 * @returns True if the route is public
 */
export function isPublicRoute(pathname: string): boolean {
  try {
    // Normalize optional trailing slash
    const p = (pathname || '/').replace(/\/+$/, '') || '/';
    return PUBLIC_ROUTES.has(p);
  } catch {
    return false;
  }
}

const PUBLIC_API_PREFIXES = [
  '/api/v1/auth/google/login',
  '/api/v1/auth/google/callback',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/extension-token',
  '/api/v1/auth/password_reset_request',
  '/api/v1/auth/password_reset',
];

/**
 * Check if a resource is publicly accessible
 * @param resource - URL string or Request object
 * @returns True if the resource is public
 */
export function isPublicResource(resource: string | Request | URL): boolean {
  try {
    const urlStr = typeof resource === 'string'
      ? resource
      : resource instanceof Request
      ? resource.url
      : resource.toString();
    const u = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const path = u.pathname;
    return PUBLIC_API_PREFIXES.some(prefix => path.startsWith(prefix));
  } catch {
    return false;
  }
}
