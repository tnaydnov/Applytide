import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';

export default function AuthGuard({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if we have tokens
      const tokens = typeof window !== 'undefined' ? localStorage.getItem('tokens') : null;
      if (!tokens) {
        throw new Error('No tokens found');
      }

      // Verify tokens by making a request to a protected endpoint
      const response = await apiFetch('/auth/me');
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        throw new Error('Token invalid');
      }
    } catch (error) {
      // Clear any invalid tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tokens');
      }
      setIsAuthenticated(false);
      // Redirect to login page
      router.push('/login');
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
