import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useRouter } from 'next/router';
import { isPublicRoute, isPublicResource } from '../lib/routes';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const router = useRouter();

  // single-flight refresh control
  const refreshInFlightRef = useRef(null);
  const originalFetchRef = useRef(null);

  // Global fetch interceptor
  useEffect(() => {
    if (typeof window === 'undefined' || window.__APPLYTIDE_FETCH_INTERCEPTOR__) return;

    window.__APPLYTIDE_FETCH_INTERCEPTOR__ = true;
    const originalFetch = window.fetch;
    originalFetchRef.current = originalFetch;

    window.fetch = async function (resource, init = {}) {
      // Always ensure cookies go with the request (callers can override)
      const mergedInit = {
        credentials: 'include',
        ...init,
      };

      // Get URL string for checks
      const urlStr = typeof resource === 'string' ? resource : (resource?.url || '');

      // Do the request
      const resp = await originalFetch(resource, mergedInit);

      // If 401 and NOT an auth endpoint and NOT public resource -> try refresh
      if (
        resp.status === 401 &&
        !isPublicResource(urlStr) &&
        !urlStr.includes('/api/auth/login') &&
        !urlStr.includes('/api/auth/refresh')
      ) {
        try {
          // single-flight refresh
          if (!refreshInFlightRef.current) {
            refreshInFlightRef.current = (async () => {
              const r = await originalFetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
              if (!r.ok) throw new Error('refresh failed');
              const data = await r.json();
              setUser(data.user);
              setTokenExpiry(Date.now() + (data.expires_in * 1000 || 15 * 60 * 1000));
              return true;
            })().finally(() => {
              refreshInFlightRef.current = null;
            });
          }
          const ok = await refreshInFlightRef.current;
          if (ok) {
            // retry original request once
            return await originalFetch(resource, mergedInit);
          }
        } catch (e) {
          // refresh failed: drop auth + redirect if on a private page
          setUser(null);
          if (!isPublicRoute(window.location.pathname)) window.location.href = '/login';
        }
      }

      return resp;
    };

    // Cleanup: restore original fetch
    return () => {
      if (originalFetchRef.current) window.fetch = originalFetchRef.current;
      originalFetchRef.current = null;
      window.__APPLYTIDE_FETCH_INTERCEPTOR__ = false;
    };
  }, []);

  // Check auth on mount + every 5 min on non-public (and home) pages
  useEffect(() => {
    checkAuthStatus();

    if (!isPublicRoute(router.pathname) || router.pathname === '/') {
      const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [router.pathname]);

  // Proactive refresh 2 min before expiry
  useEffect(() => {
    if (!tokenExpiry || !user) return;

    const refreshTime = tokenExpiry - 2 * 60 * 1000;
    const now = Date.now();
    const timeUntilRefresh = Math.max(0, refreshTime - now);

    const timer = setTimeout(() => {
      silentRefresh();
    }, timeUntilRefresh);

    return () => clearTimeout(timer);
  }, [tokenExpiry, user]);

  async function silentRefresh() {
    try {
      const ofetch = originalFetchRef.current || fetch;
      const r = await ofetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!r.ok) return false;
      const data = await r.json();
      setUser(data.user);
      setTokenExpiry(Date.now() + (data.expires_in * 1000 || 15 * 60 * 1000));
      return true;
    } catch (err) {
      console.error('Token refresh error:', err);
      return false;
    }
  }

  async function checkAuthStatus() {
    try {
      setLoading(true);
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      if (r.ok) {
        const userData = await r.json();
        userData.isOAuthUser = !!userData.google_id;
        userData.googleConnected = !!userData.google_id;
        setUser(userData);
        // We don't know exact exp from /me, so set a conservative default (15m)
        setTokenExpiry(Date.now() + 15 * 60 * 1000);
        setError(null);
        return true;
      } else {
        setUser(null);
        setError('Not authenticated');
        return false;
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, remember = false) {
    try {
      setLoading(true);
      const response = await api.login(email, password, remember);
      if (response && response.user) {
        response.user.isOAuthUser = !!response.user.google_id;
        response.user.googleConnected = !!response.user.google_id;
        setUser(response.user);
        setTokenExpiry(Date.now() + (response.expires_in * 1000 || 15 * 60 * 1000));
        setError(null);
        return true;
      } else {
        setError('Login failed');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout error:', err);
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
    silentRefresh,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
