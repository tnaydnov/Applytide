import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';

const ProfileGuard = ({ children, redirectTo = '/ai-setup' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getProfileCompleteness(); // returns JSON no matter what
        const isComplete = !!res?.is_complete;
        if (!isComplete) {
          router.replace(redirectTo);
          return;
        }
        if (!cancelled) setIsComplete(true);
      } catch (e) {
        console.error('❌ Failed to check profile completeness:', e);
        // If the API route is protected and we got blocked server-side, send to login
        router.replace('/login');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking profile status...</p>
        </div>
      </div>
    );
  }

  if (!isComplete) {
    return null; // Component will handle redirect
  }

  return children;
};

export default ProfileGuard;
