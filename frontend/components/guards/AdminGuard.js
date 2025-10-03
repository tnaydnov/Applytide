// frontend/components/guards/AdminGuard.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user && !user.is_admin) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <div className="text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  // Show nothing if not admin (will redirect)
  if (!user || !user.is_admin) {
    return null;
  }

  // User is admin, render children
  return <>{children}</>;
}
