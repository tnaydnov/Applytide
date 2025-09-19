import { useState, useEffect } from 'react';
import { createPortal } from "react-dom";


// Premium Badge Component
export const PremiumBadge = ({ size = 'sm' }) => {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md shadow-sm border border-white/20`}>
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      PRO
    </span>
  );
};

// Premium Lock Overlay
export const PremiumLock = ({ onClick, feature = "feature" }) => (
  <div 
    className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer z-10 rounded-lg border border-purple-200 transition-all hover:bg-white/90"
    onClick={onClick}
  >
    <div className="text-center p-4">
      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Premium Feature</h3>
      <p className="text-xs text-gray-600 mb-3">Upgrade to Pro to unlock {feature}</p>
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm">
        Upgrade to Pro
      </div>
    </div>
  </div>
);

// Premium Modal
export default function PremiumModal({
  isOpen,
  onClose,
  feature = "this feature",
}) {
  // Don’t render at all if closed (avoids SSR/DOM work)
  if (!isOpen) return null;

  // Lock body scroll while open + handle <Esc>
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="premium-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Centered container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-md overflow-y-auto max-h-[85vh] rounded-xl border border-slate-600 bg-slate-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rounded-t-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h2 id="premium-modal-title" className="text-xl font-bold">
                  Upgrade to Premium
                </h2>
              </div>
              <button
                onClick={onClose}
                className="transition-colors text-white/80 hover:text-white"
                aria-label="Close dialog"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-100">
                Premium Feature Required
              </h3>
              <p className="text-slate-300">
                To use {feature}, you need to upgrade to our Premium plan.
              </p>
            </div>

            {/* Features */}
            <ul className="mb-6 space-y-3">
              {[
                "Advanced Analytics Dashboard",
                "AI Cover Letter Generation",
                "AI Resume Generation",
                "Smart Email Management",
                "Unlimited Applications",
              ].map((text) => (
                <li key={text} className="flex items-center">
                  <svg className="mr-3 h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-200">{text}</span>
                </li>
              ))}
            </ul>

            {/* Pricing */}
            <div className="mb-6 rounded-lg border border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-4 text-center">
              <div className="text-3xl font-bold text-slate-100">$19</div>
              <div className="text-slate-300">per month</div>
              <div className="mt-1 text-sm font-medium text-green-400">🎉 7 days free trial</div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700"
              >
                Maybe Later
              </button>
              <button
                disabled
                className="flex-1 cursor-not-allowed rounded-lg bg-slate-600 px-4 py-2 font-medium text-slate-400 opacity-70"
                title="Coming soon"
              >
                🚧 Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // SSR-safe portal
  if (typeof window === "undefined") return modal;
  return createPortal(modal, document.body);
}

// Hook for premium features
export const usePremiumFeature = () => {
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const checkPremium = (callback, featureName = "this feature") => {
    // TODO: Replace with actual premium check from user data
    const isPremium = false; // This should come from user context/API

    if (isPremium) {
      callback();
    } else {
      setShowPremiumModal(true);
    }
  };

  return {
    checkPremium,
    showPremiumModal,
    setShowPremiumModal,
    PremiumModal: (props) => (
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        {...props}
      />
    )
  };
};
