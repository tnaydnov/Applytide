import { useState } from 'react';
import { Button, Input } from '../ui';

export default function DeleteAccountModal({ isOpen, onClose, isOAuthUser }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    // Validate confirmation text
    if (confirmation !== 'DELETE') {
      setError('You must type DELETE exactly to confirm');
      return;
    }

    // Require password for non-OAuth users
    if (!isOAuthUser && !password) {
      setError('Password is required for security verification');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/profile/account', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: !isOAuthUser ? password : undefined,
          confirmation,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete account');
      }

      const data = await response.json();

      // Show success message
      alert('Account deleted successfully. Goodbye! 👋');
      
      // Force full page reload to clear auth state
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-red-900/50 rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="border-b border-red-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-500">Delete Account</h2>
              <p className="text-sm text-slate-400">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-red-400 mb-2">⚠️ Permanent Account Deletion</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>All your resumes and documents will be <strong>permanently deleted</strong></li>
                  <li>Your job applications and analytics will be <strong>permanently removed</strong></li>
                  <li>Your profile and preferences will be <strong>permanently lost</strong></li>
                  <li>You will be logged out immediately</li>
                  <li><strong className="text-red-400">This action CANNOT be undone!</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Password Input (for non-OAuth users) */}
          {!isOAuthUser && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password for verification"
                required
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
              <p className="text-xs text-slate-400 mt-1">
                For security, you must enter your password to delete your account
              </p>
            </div>
          )}

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm
            </label>
            <Input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              required
              disabled={loading}
              className="font-mono"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading || confirmation !== 'DELETE' || (!isOAuthUser && !password)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}
