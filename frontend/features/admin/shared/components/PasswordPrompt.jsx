// frontend/features/admin/shared/components/PasswordPrompt.jsx
import { useState } from 'react';
import { Button } from '../../../../components/ui';

export default function PasswordPrompt({ 
  title = "Confirm Action",
  message = "Please enter your password to confirm this action.",
  requireJustification = true,
  minJustificationLength = 20,
  onConfirm, 
  onCancel,
  loading = false 
}) {
  const [password, setPassword] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
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
      <div className="glass-card p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requireJustification && (
            <div>
              <label htmlFor="justification" className="block text-sm font-medium text-slate-300 mb-2">
                Justification *
              </label>
              <textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={`Explain why you're taking this action (min ${minJustificationLength} characters)...`}
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500"
                disabled={loading}
              />
              <div className="text-xs text-slate-400 mt-1">
                {justification.length}/{minJustificationLength} characters
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Your Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500"
              disabled={loading}
            />
          </div>

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
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
