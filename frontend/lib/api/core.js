/**
 * @fileoverview Core API infrastructure - fetch wrapper, auth, token management
 * Extracted from lib/api.js during refactoring
 */

const API_BASE = '/api';

// Simple cache for GET requests (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached response if available and not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Store response in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear cache for specific key or all cache
 * @param {string} [key] - Optional specific key to clear
 */
export function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Refresh the access token using refresh token cookie
 * @returns {Promise<boolean>} Success status
 */
async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });

    return response.ok;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Logout from all devices
 * Clears all sessions and redirects to login
 */
export async function logoutAll() {
  try {
    await apiFetch("/auth/logout_all", { method: "POST" });
  } catch {
    // ignore errors
  } finally {
    // No need to manually remove items from localStorage
    // The cookies will be cleared by the server response
    window.location.href = "/login";
  }
}

/**
 * Logout from current device
 * @returns {Promise<boolean>} Success status
 */
export async function logout() {
  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    // Clear any client-side state if needed
    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  } finally {
    // Always trigger a redirect in the calling code
    // (the actual redirect happens in AuthContext.js)
  }
}

/**
 * Core fetch wrapper with automatic token refresh on 401 and caching for GET requests
 * @param {string} endpoint - API endpoint (relative to /api)
 * @param {RequestInit} options - Fetch options
 * @param {boolean} useCache - Whether to use cache for GET requests (default: true)
 * @returns {Promise<Response>} Fetch response
 */
export async function apiFetch(endpoint, options = {}, useCache = true) {
  try {
    const method = options?.method?.toUpperCase() || 'GET';
    const cacheKey = `${method}:${endpoint}`;

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
      const cached = getCached(cacheKey);
      if (cached) {
        // Return a Response-like object from cache
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const interceptorActive = typeof window !== 'undefined' && window.__APPLYTIDE_FETCH_INTERCEPTOR__;
    const isFormData = options?.body instanceof FormData;
    const headers = {
      ...(options.headers || {}),
      ...(isFormData ? {} : { 'Content-Type': options.headers?.['Content-Type'] || 'application/json' }),
    };

    const fetchOptions = {
      credentials: 'include', // ensure cookies are sent
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

    // Cache successful GET responses
    if (method === 'GET' && useCache && response.ok) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        setCache(cacheKey, data);
      } catch {
        // Not JSON, skip caching
      }
    }

    // Clear cache on mutations (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Clear related cache entries
      const basePath = endpoint.split('?')[0].split('/').slice(0, -1).join('/');
      cache.forEach((_, key) => {
        if (key.includes(basePath)) {
          cache.delete(key);
        }
      });
    }

    if (!interceptorActive && response.status === 401 &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        if (refreshResponse.ok) {
          return await fetch(`${API_BASE}${endpoint}`, fetchOptions);
        }
      } catch (refreshError) {
        console.error('Token refresh failed', refreshError);
      }
    }

    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} remember - Remember me option
 * @returns {Promise<Object>} Login response data
 */
export async function login(email, password, remember = false) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        remember_me: remember
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    // Return the actual response data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Re-export API_BASE for use in feature-specific API files
export { API_BASE };
