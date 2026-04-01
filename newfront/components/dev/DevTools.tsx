/**
 * Developer Tools Component
 * Press Ctrl+Shift+D to open
 * Quick access to reset onboarding and test features
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, RotateCcw, PlayCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { resetOnboarding } from '../../utils/onboarding';
import { toast } from 'sonner';
import { safeRemoveItem, safeSetItem } from '../../lib/storage';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success('Onboarding reset! Redirecting to dashboard...');
    setIsOpen(false);
    
    // Navigate to dashboard and force a full page reload
    setTimeout(() => {
      // Use window.location.href for guaranteed navigation
      window.location.href = '/dashboard';
    }, 1000);
  };

  // Check URL parameter for auto-show
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('devtools') === 'true') {
      setIsOpen(true);
    }
    if (params.get('resetOnboarding') === 'true') {
      handleResetOnboarding();
    }
  }, []);

  return (
    <>
      {/* Floating Dev Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[999] w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #383e4e 0%, #9F5F80 100%)',
          border: '2px solid rgba(159, 95, 128, 0.3)',
        }}
        title="Dev Tools (Ctrl+Shift+D)"
      >
        <Settings className="w-5 h-5 text-white" />
      </motion.button>

      {/* Dev Tools Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-full max-w-md"
            >
              <div
                className="rounded-2xl shadow-2xl p-6 relative"
                style={{
                  background: 'linear-gradient(135deg, #383e4e 0%, #2a2f3d 100%)',
                  border: '2px solid rgba(159, 95, 128, 0.3)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                      }}
                    >
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl text-white">Dev Tools</h2>
                      <p className="text-xs text-[#b6bac5]">Quick testing utilities</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#b6bac5] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleResetOnboarding}
                    className="w-full justify-start gap-3 h-auto py-4 px-4"
                    style={{
                      background: 'rgba(159, 95, 128, 0.2)',
                      border: '1px solid rgba(159, 95, 128, 0.3)',
                    }}
                  >
                    <RotateCcw className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">Reset Onboarding</div>
                      <div className="text-xs text-[#b6bac5]">
                        Clear all tutorial progress and show welcome modal
                      </div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => {
                      safeRemoveItem('welcomeShown');
                      safeSetItem('tutorialSkipped', 'true');
                      toast.success('Welcome modal will show after reload');
                      setIsOpen(false);
                      
                      // Navigate and reload
                      setTimeout(() => {
                        window.location.href = '/dashboard';
                      }, 1000);
                    }}
                    className="w-full justify-start gap-3 h-auto py-4 px-4"
                    style={{
                      background: 'rgba(159, 95, 128, 0.2)',
                      border: '1px solid rgba(159, 95, 128, 0.3)',
                    }}
                  >
                    <PlayCircle className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">Test Welcome Modal</div>
                      <div className="text-xs text-[#b6bac5]">
                        Show welcome modal only (skip tutorial)
                      </div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => {
                      resetOnboarding();
                      toast.info('Onboarding reset! Click the refresh button to reload.');
                      setIsOpen(false);
                    }}
                    className="w-full justify-start gap-3 h-auto py-4 px-4"
                    style={{
                      background: 'rgba(182, 186, 197, 0.1)',
                      border: '1px solid rgba(182, 186, 197, 0.2)',
                    }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">Reset Without Reload</div>
                      <div className="text-xs text-[#b6bac5]">
                        Clear onboarding, but don't auto-reload
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Keyboard Shortcut Info */}
                <div
                  className="mt-6 p-3 rounded-lg"
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <p className="text-xs text-[#b6bac5] text-center">
                    Press <kbd className="px-2 py-1 rounded bg-white/10 text-white">Ctrl</kbd> +{' '}
                    <kbd className="px-2 py-1 rounded bg-white/10 text-white">Shift</kbd> +{' '}
                    <kbd className="px-2 py-1 rounded bg-white/10 text-white">D</kbd> to toggle
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
