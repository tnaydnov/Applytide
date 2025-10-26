import { useState } from 'react';
import { Button } from './ui';
import LegalAgreements from './auth/LegalAgreements';

const GoogleLoginButton = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalAgreements, setLegalAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    dataProcessing: false,
  });
  const [allAgreed, setAllAgreed] = useState(false);

  const handleGoogleLogin = () => {
    // Show legal agreements modal first
    setShowLegalModal(true);
  };

  const handleAgreementsChange = (allChecked, agreements) => {
    setAllAgreed(allChecked);
    setLegalAgreements(agreements);
  };

  const handleContinueToGoogle = () => {
    if (!allAgreed) return;
    
    // Store agreements in sessionStorage for OAuth callback
    sessionStorage.setItem('oauth_legal_agreements', JSON.stringify({
      terms_accepted: legalAgreements.terms,
      privacy_accepted: legalAgreements.privacy,
      age_verified: legalAgreements.age,
      data_processing_consent: legalAgreements.dataProcessing,
    }));
    
    setLoading(true);
    window.location.href = '/api/auth/google/login';
  };

  const handleCloseModal = () => {
    setShowLegalModal(false);
    setLegalAgreements({
      terms: false,
      privacy: false,
      age: false,
      dataProcessing: false,
    });
    setAllAgreed(false);
  };

  return (
    <>
      <Button
        onClick={handleGoogleLogin}
        type="button"
        disabled={loading}
        className={`flex items-center justify-center gap-2 ${className}`}
      >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        className="w-5 h-5"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </Button>

    {/* Legal Agreements Modal */}
    {showLegalModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-200">
                Legal Agreements Required
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Please review and accept our terms before continuing with Google
              </p>
            </div>
            <button
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <LegalAgreements
              onAgreementsChange={handleAgreementsChange}
              disabled={loading}
            />

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <Button
                onClick={handleContinueToGoogle}
                disabled={!allAgreed || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Redirecting...' : 'Continue with Google'}
              </Button>
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="px-6 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default GoogleLoginButton;
