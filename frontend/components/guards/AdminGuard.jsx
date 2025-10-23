import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Admin Guard - Protects admin-only routes
 * Redirects to dashboard if user is not an admin
 */
export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not logged in - redirect to login
      if (!user) {
        router.push('/login?redirect=' + encodeURIComponent(router.asPath));
        return;
      }

      // Not admin - redirect to dashboard
      if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in or not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  // User is admin - render children
  return <>{children}</>;
}
