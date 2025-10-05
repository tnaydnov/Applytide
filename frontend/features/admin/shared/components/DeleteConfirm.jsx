// frontend/features/admin/shared/components/DeleteConfirm.jsx
import { useState } from 'react';
import { Button } from '../../../../components/ui';

export default function DeleteConfirm({
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  requireJustification = true,
  minJustificationLength = 20,
  requirePassword = true,
  onConfirm,
  onCancel,
  loading = false
}) {
  const [password, setPassword] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = (e) => {
    e.preventDefault();
    setError('');

    if (requirePassword && !password) {
      setError('Password is required');
      return;
    }

    if (requireJustification && justification.length < minJustificationLength) {
      setError(`Justification must be at least ${minJustificationLength} characters`);
      return;
    }

    onConfirm(password, justification);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-md w-full mx-4 border-2 border-red-500/20">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">{message}</p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {requireJustification && (
            <div>
              <label htmlFor="justification" className="block text-sm font-medium text-slate-300 mb-2">
                Justification for Deletion *
              </label>
              <textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={`Explain why this deletion is necessary (min ${minJustificationLength} characters)...`}
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
                disabled={loading}
              />
              <div className="text-xs text-slate-400 mt-1">
                {justification.length}/{minJustificationLength} characters
              </div>
            </div>
          )}

          {requirePassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm with Password *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your admin password"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
