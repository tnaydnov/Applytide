import { createContext, useContext, useState, useEffect } from 'react';
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
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const router = useRouter();

  // Add this code in AuthProvider function after defining the states
    useEffect(() => {
    if (typeof window !== 'undefined') {
        // Store the original fetch to restore it later
        const originalFetch = window.fetch;
        
        // Replace with our intercepting version
        window.fetch = async function(resource, init = {}) {
        const response = await originalFetch(resource, init);
        
        // If response is 401 and it's not a refresh/login request
        if (response.status === 401 && 
            !resource.includes('/auth/refresh') && 
            !resource.includes('/auth/login')) {
            
            console.log('401 detected, attempting token refresh');
            
            try {
            // Call our own silentRefresh function
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (refreshResponse.ok) {
                console.log('Token refresh successful, retrying request');
                const userData = await refreshResponse.json();
                setUser(userData.user);
                setTokenExpiry(Date.now() + (userData.expires_in * 1000 || 15 * 60 * 1000));
                
                // Retry the original request with the new token
                return originalFetch(resource, init);
            } else {
                console.log('Token refresh failed, redirecting to login');
                setUser(null);
                if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
                }
            }
            } catch (refreshError) {
            console.error('Token refresh error:', refreshError);
            }
        }
        
        return response;
        };
        
        // Cleanup function
        return () => {
        window.fetch = originalFetch;
        };
    }
    }, []);
  
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

  useEffect(() => {
    if (!tokenExpiry || !user) return;
    
    // Calculate when to refresh (2 minutes before expiry)
    const refreshTime = tokenExpiry - (2 * 60 * 1000);
    const now = Date.now();
    const timeUntilRefresh = Math.max(0, refreshTime - now);
    
    console.log(`Token will refresh in ${Math.round(timeUntilRefresh/1000)} seconds`);
    
    const refreshTimer = setTimeout(() => {
      console.log('Refreshing token proactively...');
      silentRefresh();
    }, timeUntilRefresh);
    
    return () => clearTimeout(refreshTimer);
  }, [tokenExpiry, user]);

  async function silentRefresh() {
    try {
        console.log('Performing silent refresh...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
        });
        
        if (response.ok) {
        const data = await response.json();
        console.log('Silent refresh successful:', data);
        setUser(data.user);
        // Set new expiry time (15 minutes from now or from server)
        setTokenExpiry(Date.now() + (data.expires_in * 1000 || 15 * 60 * 1000));
        return true;
        } else {
        console.error('Failed to refresh token');
        return false;
        }
    } catch (err) {
        console.error('Token refresh error:', err);
        return false;
    }
    }
  
    async function checkAuthStatus() {
        try {
        setLoading(true);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            // Set token expiry time (15 minutes from now as a safe default)
            setTokenExpiry(Date.now() + (15 * 60 * 1000));
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
        setTokenExpiry(Date.now() + (response.expires_in * 1000 || 15 * 60 * 1000));
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
        // Call backend to invalidate the current session
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
        });
        
        // Then clear user data locally
        setUser(null);
        setTokenExpiry(null);
        
        // Redirect to login
        window.location.href = '/login';
    } catch (err) {
        console.error("Logout error:", err);
        // Even if server logout fails, clear local data
        setUser(null);
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
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}