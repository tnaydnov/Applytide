import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthGuard({ children }) {
  const { loading, isAuthenticated, checkAuthStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      // one last silent check
      checkAuthStatus().then((ok) => {
        if (!ok) {
          const returnTo = encodeURIComponent(router.asPath || '/');
          router.replace(`/login?next=${returnTo}`);
        }
      });
    }
  }, [loading, isAuthenticated, checkAuthStatus, router]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
}
