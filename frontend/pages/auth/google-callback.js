import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../../components/ui';
import LegalAgreements from '../../components/auth/LegalAgreements';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [isNewUser, setIsNewUser] = useState(false);
  const [legalAgreements, setLegalAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    dataProcessing: false,
  });
  const [allAgreed, setAllAgreed] = useState(false);

  useEffect(() => {
    // Check if this is a new user
    const { new_user } = router.query;
    
    if (new_user === 'true') {
      // New user - show legal agreements
      setIsNewUser(true);
      setStatus('awaiting_agreements');
    } else if (router.isReady) {
      // Existing user - redirect immediately
      window.location.href = '/dashboard';
    }
  }, [router.query, router.isReady]);

  const handleAgreementsChange = (allChecked, agreements) => {
    setAllAgreed(allChecked);
    setLegalAgreements(agreements);
  };

  const submitAgreements = async () => {
    if (!allAgreed) return;

    setStatus('processing');
    
    try {
      // Send agreements to backend
      const response = await fetch('/api/auth/google/store-agreements', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terms_accepted: legalAgreements.terms,
          privacy_accepted: legalAgreements.privacy,
          age_verified: legalAgreements.age,
          data_processing_consent: legalAgreements.dataProcessing,
        }),
      });

      if (response.ok) {
        setStatus('success');
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit legal agreements:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center max-w-2xl w-full px-4">
        {status === 'awaiting_agreements' && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-slate-200 mb-2">Welcome to Applytide! 🎉</h2>
            <p className="text-slate-400 mb-8">
              Before you get started, please review and accept our terms
            </p>
            
            <div className="text-left mb-8">
              <LegalAgreements
                onAgreementsChange={handleAgreementsChange}
                disabled={status === 'processing'}
              />
            </div>
            
            <Button
              onClick={submitAgreements}
              disabled={!allAgreed || status === 'processing'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'processing' ? 'Completing Registration...' : 'Accept & Continue'}
            </Button>
          </div>
        )}
        
        {status === 'processing' && !isNewUser && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Completing your sign-in...</p>
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
            <Button
              onClick={() => window.location.href = '/login'}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Back to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
