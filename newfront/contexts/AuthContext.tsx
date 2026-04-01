/**
 * @fileoverview Authentication Context
 * Manages user authentication state and provides auth methods
 * Includes automatic token refresh and fetch interceptor
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin } from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { isPublicRoute } from '../lib/routes';
import { safeGetItem, safeRemoveItem } from '../lib/storage';
import { logger } from '../lib/logger';

export interface User {
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
  is_banned?: boolean;
  subscription_tier?: string;
  created_at?: string;
  last_login?: string;
  total_applications?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  silentRefresh: () => Promise<boolean>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<boolean>; // Alias for backward compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe fallback for HMR race conditions where AuthLayout renders before AuthProvider mounts
const AUTH_FALLBACK: AuthContextType = {
  user: null,
  loading: true,
  error: null,
  login: async () => false,
  logout: async () => {},
  checkAuthStatus: async () => false,
  silentRefresh: async () => false,
  isAuthenticated: false,
  refreshUser: async () => false,
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // During Vite HMR, AuthLayout can render before AuthProvider mounts.
    // Return a safe loading fallback instead of crashing.
    if (import.meta.env.DEV) {
      return AUTH_FALLBACK;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check auth on mount only (no periodic polling)
  // Token refresh is handled by apiFetch (single-flight guard in lib/api/core.ts)
  useEffect(() => {
    // Skip auth check on public routes (login, signup, etc.)
    if (isPublicRoute(location.pathname)) {
      setLoading(false);
      return;
    }
    
    // Check auth status on initial mount for protected routes
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally mount-only: checkAuthStatus uses only stable setters

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

  async function silentRefresh(): Promise<boolean> {
    try {
      const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!r.ok) return false;
      const data = await r.json();
      setUser(data.user);
      setTokenExpiry(Date.now() + (data.expires_in * 1000 || 15 * 60 * 1000));
      return true;
    } catch (err) {
      logger.error('Token refresh error:', err);
      return false;
    }
  }

  async function checkAuthStatus(): Promise<boolean> {
    try {
      setLoading(true);
      
      const r = await fetch('/api/v1/auth/me', { credentials: 'include' });
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
      logger.error('Auth check error:', err);
      setUser(null);
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string, remember = false): Promise<boolean> {
    try {
      setLoading(true);
      
      const response = await apiLogin(email, password, remember);
      if (response && response.user) {
        response.user.isOAuthUser = !!response.user.google_id;
        response.user.googleConnected = !!response.user.google_id;
        setUser(response.user);
        setTokenExpiry(Date.now() + ((response.expires_in ?? 900) * 1000));
        setError(null);
        return true;
      } else {
        setError('Login failed');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      // Clear demo mode
      if (safeGetItem('demo_mode') === 'true') {
        safeRemoveItem('demo_mode');
      }

      // Only call logout API if not in demo mode
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Logout API failure is non-critical
    } finally {
      setUser(null);
      setTokenExpiry(null);
      navigate('/signin');
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    silentRefresh,
    isAuthenticated: !!user,
    refreshUser: checkAuthStatus, // Alias for backward compatibility
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
