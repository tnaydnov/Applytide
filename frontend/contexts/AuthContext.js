import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useRouter } from 'next/router';


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Check auth status on mount
  useEffect(() => {
    // Skip auth checks on public pages
    if (router.pathname === '/login' || router.pathname === '/register' || 
        router.pathname === '/auth/reset' || router.pathname === '/auth/verify') {
      setLoading(false);
      return;
    }
    
    checkAuthStatus();
    
    // Only set up polling if we're not on login page
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router.pathname]);
  
    async function checkAuthStatus() {
        try {
            setLoading(true);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/me`, {
            credentials: 'include', // This is critical!
            headers: {
                'Accept': 'application/json'
            }
            });
            
            if (response.ok) {
            const userData = await response.json();
            setUser(userData);
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
      const response = await api.login({ email, password, remember_me: remember });
      
      if (response && response.user) {
        setUser(response.user);
        setError(null);
        return true;
      } else {
        setError("Login failed");
        return false;
      }
    } catch (err) {
      setError(err.message || "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  }
  
  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }
  
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}