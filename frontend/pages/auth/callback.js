import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    async function completeAuth() {
      try {
        console.log('OAuth callback: checking authentication...');
        
        // Simply refresh the auth context to pick up the cookies
        const success = await checkAuthStatus();
        
        if (success) {
          console.log('OAuth callback: authentication successful, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.log('OAuth callback: authentication failed');
          setError("Failed to complete authentication");
          setTimeout(() => {
            router.push('/login?error=auth_failed');
          }, 3000);
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("Failed to complete authentication");
        setTimeout(() => {
          router.push('/login?error=auth_failed');
        }, 3000);
      } finally {
        setLoading(false);
      }
    }
    
    if (router.isReady) {
      completeAuth();
    }
  }, [router.isReady]);

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="glass-card glass-cyan w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-slate-200">
          {loading ? "Completing Login..." : error ? "Login Error" : "Login Successful"}
        </h2>
        
        {loading && (
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
          </div>
        )}
        
        {error && (
          <p className="text-red-400 text-center">{error}</p>
        )}
        
        <p className="text-center text-slate-400 mt-2">
          {loading ? "Please wait while we log you in..." : 
           error ? "Redirecting to login page..." : 
           "Redirecting to dashboard..."}
        </p>
      </div>
    </div>
  );
}