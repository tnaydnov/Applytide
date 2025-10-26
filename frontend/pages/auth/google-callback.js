import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const submitAgreements = async () => {
      try {
        // Get legal agreements from sessionStorage
        const agreementsStr = sessionStorage.getItem('oauth_legal_agreements');
        
        if (agreementsStr) {
          const agreements = JSON.parse(agreementsStr);
          
          // Send agreements to backend
          const response = await fetch('/api/auth/google/store-agreements', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(agreements),
          });

          if (response.ok) {
            setStatus('success');
            // Clear the stored agreements
            sessionStorage.removeItem('oauth_legal_agreements');
            // Redirect to dashboard
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          } else {
            setStatus('error');
          }
        } else {
          // No agreements stored, just redirect (existing user)
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Failed to submit legal agreements:', error);
        setStatus('error');
      }
    };

    submitAgreements();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Completing your registration...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-slate-300 text-lg">Success! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-slate-300 text-lg">Something went wrong</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
