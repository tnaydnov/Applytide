import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './ui';
import { api } from '../lib/api';

export default function WelcomeModal({ isOpen, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = async () => {
    if (dontShowAgain) {
      // Mark as seen in backend
      try {
        await api.post('/profile/welcome-modal-seen');
        // Clear localStorage to ensure backend is source of truth
        localStorage.removeItem('welcomeModalDismissed');
      } catch (error) {
        console.error('Failed to update welcome modal status:', error);
      }
    }
    onClose();
  };

  const handleShowGuide = async () => {
    // Always mark as seen when user clicks "Show Me How It Works"
    try {
      await api.post('/profile/welcome-modal-seen');
      // Clear localStorage to ensure backend is source of truth
      localStorage.removeItem('welcomeModalDismissed');
    } catch (error) {
      console.error('Failed to update welcome modal status:', error);
    }
    // The Link component will handle navigation
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 max-w-2xl w-full p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce-slow">🎉</div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to Applytide!
          </h2>
          <p className="text-xl text-slate-300 mb-2">
            You're all set to organize your job search like a pro!
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-6 mb-6 border border-indigo-500/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">📚</div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                New here? We've created a complete guide to help you get started.
              </h3>
              <p className="text-slate-300 text-sm">
                Learn everything you need to know in just a few minutes.
              </p>
            </div>
          </div>

          {/* Feature List */}
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-3 text-slate-200">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Save jobs with Chrome extension</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Track applications in pipeline</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Optimize resumes with AI</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Never miss a follow-up</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link href="/how-it-works" className="flex-1" onClick={handleShowGuide}>
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              🚀 Show Me How It Works
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 py-3"
          >
            Skip for now
          </Button>
        </div>

        {/* Don't show again checkbox */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <input
            type="checkbox"
            id="dontShowAgain"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="dontShowAgain" className="text-slate-400 cursor-pointer">
            Don't show this again
          </label>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-slate-500 mt-4">
          You can always access the guide from the "How It Works" link in the navigation
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
