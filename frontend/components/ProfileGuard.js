import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

const ProfileGuard = ({ children, redirectTo = '/ai-setup' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkProfileCompleteness();
  }, []);

  const checkProfileCompleteness = async () => {
    try {
      const completeness = await api.getProfileCompleteness();
      
      if (!completeness.is_complete) {
        router.push(redirectTo);
        return;
      }
      
      setIsComplete(true);
    } catch (error) {
      console.error('❌ Failed to check profile completeness:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // If user is not authenticated, redirect to login
      if (error.message.includes('401') || error.message.includes('Not authenticated')) {
        router.push('/login');
      } else {
        router.push(redirectTo);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
