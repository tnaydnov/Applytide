/**
 * @fileoverview Core API infrastructure - fetch wrapper, auth, token management
 * Provides base API functionality with automatic token refresh and caching
 */

import { logger } from '../logger';

const API_BASE = '/api/v1';

/**
 * Structured API error with status code and optional detail payload.
 * Thrown by apiFetch (and helpers) so callers can discriminate by status.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

// Simple cache for GET requests (5 minute TTL, bounded size)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

/**
 * Get cached response if available and not expired
 * @param key - Cache key
 * @returns Cached data or null
 */
function getCached(key: string): unknown | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Store response in cache with LRU-style eviction when full.
 * @param key - Cache key
 * @param data - Data to cache
 */
function setCache(key: string, data: unknown): void {
  // Evict oldest entries when exceeding max size
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear cache for specific key or all cache
 * @param key - Optional specific key to clear
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Logout from all devices
 * Clears all sessions and redirects to login
 */
export async function logoutAll(): Promise<void> {
  try {
    await apiFetch("/auth/logout_all", { method: "POST" });
  } catch {
    // ignore errors
  } finally {
    // No need to manually remove items from localStorage
    // The cookies will be cleared by the server response
    window.location.href = "/signin";
  }
}

/**
 * Logout from current device
 * @returns Success status
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await apiFetch('/auth/logout', { method: 'POST' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Core fetch wrapper with automatic token refresh on 401 and caching for GET requests
 * @param endpoint - API endpoint (relative to /api)
 * @param options - Fetch options
 * @param useCache - Whether to use cache for GET requests (default: true)
 * @returns Fetch response
 */
// Single-flight guard: only one token refresh at a time
let refreshPromise: Promise<Response | null> | null = null;

export async function apiFetch(endpoint: string, options: RequestInit = {}, useCache = true): Promise<Response> {
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

    const isFormData = options?.body instanceof FormData;
    const existingCT = options.headers
      ? (options.headers as Record<string, string>)['Content-Type']
      : undefined;
    const headers: HeadersInit = {
      ...(options.headers || {}),
      ...(isFormData ? {} : { 'Content-Type': existingCT || 'application/json' }),
    };

    const fetchOptions: RequestInit = {
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

    if (response.status === 401 &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')) {
      try {
        // Single-flight: reuse in-progress refresh or start a new one
        if (!refreshPromise) {
          refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          }).finally(() => { refreshPromise = null; });
        }
        const refreshResponse = await refreshPromise;
        if (refreshResponse && refreshResponse.ok) {
          return await fetch(`${API_BASE}${endpoint}`, fetchOptions);
        }
      } catch (refreshError) {
        refreshPromise = null;
        logger.error('Token refresh failed', refreshError);
      }
    }

    return response;
  } catch (error) {
    // Silence WebSocket ticket errors when backend is down (development only)
    const isWsTicket = endpoint.includes('/auth/ws-ticket');
    const isConnectionError = (error as Error).message?.includes('Failed to fetch');
    
    if (isWsTicket && isConnectionError && import.meta.env.DEV) {
      // Silently fail for WS ticket requests when backend is down
      // This prevents console spam in development
      throw error;
    }
    
    logger.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

interface LoginUserResponse {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  google_id?: string;
  isOAuthUser?: boolean;
  googleConnected?: boolean;
  is_admin?: boolean;
  is_premium?: boolean;
  subscription_tier?: string;
}

interface LoginResponse {
  user: LoginUserResponse;
  expires_in?: number;
}

/**
 * Login with email and password
 * @param email - User email
 * @param password - User password
 * @param remember - Remember me option
 * @returns Login response data
 * @throws {ApiError} on non-OK response
 */
export async function login(email: string, password: string, remember = false): Promise<LoginResponse> {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember_me: remember }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new ApiError(response.status, body.detail || 'Login failed', body);
  }

  return response.json();
}

// Re-export API_BASE for use in feature-specific API files
export { API_BASE };
