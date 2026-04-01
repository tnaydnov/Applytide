/**
 * Google OAuth Callback Page
 * 
 * After Google OAuth, the backend redirects here with cookies already set.
 * This page loads the user state and redirects to the dashboard.
 * If ?new_user=true, the welcome wizard will show on dashboard.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function handleCallback() {
      try {
        // Cookies are already set by backend redirect
        const ok = await checkAuthStatus();

        if (cancelled) return;

        if (ok) {
          navigate('/dashboard', { replace: true });
        } else {
          setError('Authentication failed. Please try again.');
          timers.push(setTimeout(() => navigate('/signin', { replace: true }), 3000));
        }
      } catch {
        if (cancelled) return;
        setError('Something went wrong. Redirecting to sign in...');
        timers.push(setTimeout(() => navigate('/signin', { replace: true }), 3000));
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1f2e] to-[#2a2f3d]">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-400 text-lg mb-2">{error}</p>
            <p className="text-[#b6bac5] text-sm">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-[#9F5F80] mx-auto mb-4" />
            <p className="text-[#b6bac5] text-lg">Signing you in with Google...</p>
          </>
        )}
      </div>
    </div>
  );
}
