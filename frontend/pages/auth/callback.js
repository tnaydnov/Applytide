// /frontend/pages/auth/callback.js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function OAuthCallback() {
  const router = useRouter();
  const { checkAuthStatus } = useAuth();
  const [error, setError] = useState(null);

  // keep track of retries and unmount
  const attempts = useRef(0);
  const cancelled = useRef(false);

  useEffect(() => {
    const verify = async () => {
      attempts.current += 1;

      try {
        // Ask the backend if we are signed in (cookie-based)
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (res.ok) {
          // Sync client auth state (if your context uses it)
          try {
            await checkAuthStatus?.();
          } catch { /* ignore */ }

          // Go to your app (adjust if you prefer '/')
          router.replace('/jobs');
          return;
        }
      } catch (e) {
        // Network hiccup; we'll retry below
      }

      // Gentle backoff retries, then restart login
      if (!cancelled.current && attempts.current < 8) {
        const delay = Math.min(500 * attempts.current, 2000); // 0.5s -> 2s
        setTimeout(verify, delay);
      } else if (!cancelled.current) {
        setError('Could not confirm sign-in. Redirecting to Google…');
        // Kick off login again; server will redirect back here and set cookies
        window.location.href = '/api/auth/google/login';
      }
    };

    verify();
    return () => {
      cancelled.current = true;
    };
  }, [router, checkAuthStatus]);

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

/**
 * Optional: server-side short-circuit.
 * If the request already has a valid session cookie, redirect immediately to avoid flicker.
 */
export async function getServerSideProps(ctx) {
  try {
    const host = ctx.req?.headers?.host;
    const base = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
    const r = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: ctx.req?.headers?.cookie || '' },
    });
    if (r.ok) {
      return { redirect: { destination: '/jobs', permanent: false } };
    }
  } catch {
    // ignore; we'll handle on the client
  }
  return { props: {} };
}
