import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AuthGuard({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // Listen for storage changes (when login/logout happens)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  async function checkAuth() {
    try {
      // Check if we have tokens
      const tokens = typeof window !== 'undefined' ? localStorage.getItem('tokens') : null;
      if (!tokens) {
        throw new Error('No tokens found');
      }

      // Parse and validate token structure
      const tokenData = JSON.parse(tokens);
      if (!tokenData.access_token || !tokenData.refresh_token) {
        throw new Error('Invalid token structure');
      }

      // Check if session is still valid (30 days from login)
      const loginTime = tokenData.loginTime || Date.now();
      const sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const sessionExpired = Date.now() - loginTime > sessionDuration;

      if (sessionExpired) {
        throw new Error('Session expired');
      }

      // If we have valid tokens and session not expired, consider user authenticated
      setIsAuthenticated(true);
    } catch (error) {
      // Clear any invalid tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tokens');
      }
      setIsAuthenticated(false);
      // Only redirect to landing page if we're not already there or on login
      if (router.pathname !== '/' && router.pathname !== '/login') {
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return null; // The redirect will handle showing login
  }

  // Show protected content if authenticated
  return children;
}