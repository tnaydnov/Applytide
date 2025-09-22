import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useRouter } from 'next/router';
import { isPublicRoute, isPublicResource } from '../lib/routes';
import { getClientId } from '../lib/clientId';

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromiseRef = useRef(null);
  const clientIdRef = useRef(null);
  const router = useRouter();

  // Compute a stable client id once in the browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      clientIdRef.current = getClientId(); // persists in localStorage
    }
  }, []);

  // ---- Global fetch interceptor (browser-only) ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;

    window.fetch = async function(resource, init = {}) {
      const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
      const urlObj = (() => {
        try { return new URL(urlStr, window.location.origin); } catch { return null; }
      })();
      const path = urlObj?.pathname || '';

      // 1) Never intercept public auth endpoints (avoid loops during login/refresh)
      if (isPublicResource(resource)) {
        return originalFetch(resource, init);
      }

      // 2) Perform the request
      let response = await originalFetch(resource, init);

      // 3) If 401 on a private endpoint, try to refresh (queue if already refreshing)
      if (response.status === 401) {
        // Prevent recursive retry loops
        const alreadyRetried = init?.headers?.['x-no-retry'] || init?.headers?.['X-No-Retry'];
        if (alreadyRetried) return response;

        // Wait for any in-flight refresh, or start one
        await ensureFresh();

        // Retry original request with cookies included
        const retryInit = {
          ...init,
          credentials: 'include',
          headers: {
            ...(init?.headers || {}),
            'X-No-Retry': '1',         // guard: retry only once
          }
        };
        response = await originalFetch(resource, retryInit);
      }

      return response;
    };

    async function ensureFresh() {
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }
      refreshPromiseRef.current = (async () => {
        try {
          await silentRefresh();
        } finally {
          refreshPromiseRef.current = null;
        }
      })();
      return refreshPromiseRef.current;
    }

    return () => { window.fetch = originalFetch; };
  }, [/* no deps */]);

  // ---- Initial + periodic auth checks ----
  useEffect(() => {
    checkAuthStatus();

    const handleVisibilityChange = () => {
      if (!document.hidden && !isPublicRoute(router.pathname)) {
        const now = Date.now();
        if (tokenExpiry && now > tokenExpiry - (2 * 60 * 1000)) {
          checkAuthStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let interval;
    if (!isPublicRoute(router.pathname) || router.pathname === '/') {
      interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [router.pathname, tokenExpiry]);

  // Proactive timer-based refresh (2 min before expiry)
  useEffect(() => {
    if (!tokenExpiry || !user) return;
    const refreshTime = tokenExpiry - (2 * 60 * 1000);
    const now = Date.now();
    const delay = Math.max(0, refreshTime - now);

    if (delay < 30_000) {
      silentRefresh(); // soon expiring — refresh now
      return;
    }

    const t = setTimeout(() => { silentRefresh(); }, delay);
    return () => clearTimeout(t);
  }, [tokenExpiry, user]);

  async function silentRefresh() {
    if (isRefreshing) return true;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: clientIdRef.current ? { 'X-Client-Id': clientIdRef.current } : {}
      });

      if (!res.ok) {
        setUser(null);
        return false;
      }

      const data = await res.json();
      if (data?.user) {
        const u = { ...data.user };
        u.isOAuthUser = !!u.google_id;
        u.googleConnected = !!u.google_id;
        setUser(u);
      }
      setTokenExpiry(Date.now() + ((data?.expires_in || 15 * 60) * 1000));
      setError(null);
      return true;
    } catch (e) {
      console.error('Token refresh error:', e);
      setUser(null);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }

  async function checkAuthStatus() {
    try {
      setLoading(true);

      // If a refresh is already happening, wait for it
      if (refreshPromiseRef.current) {
        await refreshPromiseRef.current;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/auth/me`, { credentials: 'include', signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const u = await res.json();
        u.isOAuthUser = !!u.google_id;
        u.googleConnected = !!u.google_id;
        setUser(u);
        setTokenExpiry(Date.now() + (15 * 60 * 1000)); // safe default unless server provides
        setError(null);
        return true;
      }

      if (res.status === 401) {
        const ok = await silentRefresh();
        if (!ok) {
          setUser(null);
          setError('Not authenticated');
          return false;
        }
        // Try once more
        const res2 = await fetch(`/api/auth/me`, { credentials: 'include' });
        if (res2.ok) {
          const u2 = await res2.json();
          u2.isOAuthUser = !!u2.google_id;
          u2.googleConnected = !!u2.google_id;
          setUser(u2);
          setTokenExpiry(Date.now() + (15 * 60 * 1000));
          setError(null);
          return true;
        }
        setUser(null);
        setError('Authentication failed');
        return false;
      }

      setUser(null);
      setError('Not authenticated');
      return false;
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Authentication timeout');
      } else {
        console.error('Auth check error:', err);
        setError(err.message || 'Auth error');
      }
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, remember = false) {
    try {
      setLoading(true);
      const response = await api.login(email, password, remember);
      if (response?.user) {
        const u = { ...response.user };
        u.isOAuthUser = !!u.google_id;
        u.googleConnected = !!u.google_id;
        setUser(u);
        setTokenExpiry(Date.now() + ((response.expires_in || 15 * 60) * 1000));
        setError(null);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Logout error (continuing):', e);
    } finally {
      setUser(null);
      setTokenExpiry(null);
      window.location.href = '/login';
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    refreshUser: checkAuthStatus,
    silentRefresh,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
