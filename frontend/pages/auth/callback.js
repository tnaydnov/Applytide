// /frontend/pages/auth/callback.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function OAuthCallback() {
  const router = useRouter();
  const { checkAuthStatus } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          setError('Missing authorization code');
          return;
        }

        // Exchange code -> server sets cookies/session
        const res = await fetch(`/api/auth/google/callback?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          // Do NOT add client id here; server should link this new session to cookies
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Callback failed (${res.status}): ${txt || res.statusText}`);
        }

        // Now the cookies are set; verify client-side state
        await checkAuthStatus();

        // Optional: if your backend gives a redirect, use it; else pick default
        router.replace('/jobs');
      } catch (e) {
        console.error(e);
        setError(e.message || 'Authentication failed');
      }
    };
    run();
  }, [checkAuthStatus, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600">
          {error ? `Error: ${error}` : 'Finalizing sign-in…'}
        </p>
      </div>
    </div>
  );
}
