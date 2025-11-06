/**
 * Ban User Modal Component
 * 
 * Allows admins to ban users with:
 * - Ban reason (required)
 * - IP ban option
 * - Duration selection (permanent, 7 days, 30 days, custom)
 */

import { useState } from 'react';
import { FiBan, FiX, FiAlertTriangle } from 'react-icons/fi';

export default function BanUserModal({ user, isOpen, onClose, onBan }) {
  const [reason, setReason] = useState('');
  const [banIP, setBanIP] = useState(true);
  const [durationType, setDurationType] = useState('permanent');
  const [customDays, setCustomDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!reason.trim()) {
      setError('Please provide a reason for the ban');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    if (durationType === 'custom' && (!customDays || customDays < 1)) {
      setError('Please enter a valid number of days');
      return;
    }

    // Calculate duration
    let ban_duration_days = null;
    if (durationType === '7days') {
      ban_duration_days = 7;
    } else if (durationType === '30days') {
      ban_duration_days = 30;
    } else if (durationType === 'custom') {
      ban_duration_days = parseInt(customDays);
    }

    setIsSubmitting(true);

    try {
      await onBan({
        reason: reason.trim(),
        ban_ip: banIP,
        ban_duration_days
      });
      
      // Reset form
      setReason('');
      setBanIP(true);
      setDurationType('permanent');
      setCustomDays('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to ban user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setBanIP(true);
      setDurationType('permanent');
      setCustomDays('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-lg w-full border border-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-900/30 text-red-400">
                <FiBan size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Ban User</h3>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="flex gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <FiAlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-200">
                  <p className="font-medium mb-1">This action will prevent the user from:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-300">
                    <li>Logging in to their account</li>
                    <li>Registering with the same email</li>
                    {banIP && <li>Registering from the same IP address</li>}
                  </ul>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* Ban Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Reason for Ban <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Violated terms of service - spam activity"
                  rows={4}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {reason.length}/2000 characters (minimum 10)
                </p>
              </div>

              {/* Ban IP Option */}
              <div className="flex items-start gap-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="banIP"
                  checked={banIP}
                  onChange={(e) => setBanIP(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 w-4 h-4 text-red-600 bg-slate-800 border-slate-600 rounded focus:ring-red-500 focus:ring-2 disabled:opacity-50"
                />
                <label htmlFor="banIP" className="flex-1 cursor-pointer">
                  <span className="block text-sm font-medium text-white">
                    Also ban IP address
                  </span>
                  <span className="block text-xs text-slate-400 mt-1">
                    Prevents the user from creating new accounts from the same IP address
                  </span>
                </label>
              </div>

              {/* Ban Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ban Duration
                </label>
                <div className="space-y-2">
                  {/* Permanent */}
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                      type="radio"
                      name="duration"
                      value="permanent"
                      checked={durationType === 'permanent'}
                      onChange={(e) => setDurationType(e.target.value)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-red-600 bg-slate-800 border-slate-600 focus:ring-red-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-white">Permanent</span>
                      <span className="block text-xs text-slate-400">Ban will not expire</span>
                    </div>
                  </label>

                  {/* 7 Days */}
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                      type="radio"
                      name="duration"
                      value="7days"
                      checked={durationType === '7days'}
                      onChange={(e) => setDurationType(e.target.value)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-red-600 bg-slate-800 border-slate-600 focus:ring-red-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-white">7 Days</span>
                      <span className="block text-xs text-slate-400">Temporary ban for minor violations</span>
                    </div>
                  </label>

                  {/* 30 Days */}
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                      type="radio"
                      name="duration"
                      value="30days"
                      checked={durationType === '30days'}
                      onChange={(e) => setDurationType(e.target.value)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-red-600 bg-slate-800 border-slate-600 focus:ring-red-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-white">30 Days</span>
                      <span className="block text-xs text-slate-400">One month suspension</span>
                    </div>
                  </label>

                  {/* Custom */}
                  <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                      type="radio"
                      name="duration"
                      value="custom"
                      checked={durationType === 'custom'}
                      onChange={(e) => setDurationType(e.target.value)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-red-600 bg-slate-800 border-slate-600 focus:ring-red-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-white mb-2">Custom Duration</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDays}
                        onChange={(e) => {
                          setCustomDays(e.target.value);
                          setDurationType('custom');
                        }}
                        onClick={() => setDurationType('custom')}
                        placeholder="Enter days"
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim() || reason.trim().length < 10}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Banning...
                  </>
                ) : (
                  <>
                    <FiBan size={16} />
                    Ban User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
