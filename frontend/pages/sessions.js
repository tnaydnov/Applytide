// pages/sessions.tsx
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import { Card, Button } from '../components/ui';
import { apiFetch, getTokens, logout } from '../lib/api';

function getCurrentRefreshJti() {
  try {
    const { refresh_token } = getTokens();
    if (!refresh_token) return null;
    const payload = JSON.parse(
      atob((refresh_token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload?.jti || null;
  } catch {
    return null;
  }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState('');

  const currentJti = useMemo(getCurrentRefreshJti, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    setError('');
    try {
      const resp = await apiFetch('/auth/sessions', { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      setSessions(await resp.json());
    } catch (e) {
      console.error('fetchSessions failed:', e);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(jti) {
    setRevoking(jti);
    setError('');
    try {
      const resp = await apiFetch('/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      logout(); // force logout on any revoke
    } catch (e) {
      console.error('revokeSession failed:', e);
      setError('Failed to revoke session');
      setRevoking(null);
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Active Sessions & Devices</h1>

        <Card className="p-4">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : sessions.length === 0 ? (
            <div>No active sessions found.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const isCurrent = s.jti === currentJti;

                return (
                  <div
                    key={s.jti}
                    className="rounded-xl border border-gray-200 bg-white/80 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Left icon */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                        <span className="text-lg">🖥️</span>
                      </div>

                      {/* Middle content */}
                      <div className="min-w-0 flex-1">
                        {/* Title line */}
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {s.user_agent || 'Unknown device'}
                          </p>
                          {isCurrent && (
                            <span className="inline-block rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                              This device
                            </span>
                          )}
                        </div>

                        {/* Meta line */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-60">🔎 IP</span>
                            {s.ip_address || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-60">📅 Created</span>
                            {new Date(s.created_at).toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-60">⏳ Expires</span>
                            {new Date(s.expires_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Right action */}
                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className={
                            isCurrent
                              ? 'border-red-500 text-red-600 hover:bg-red-50'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }
                          disabled={revoking === s.jti}
                          onClick={() => revokeSession(s.jti)}
                        >
                          {revoking === s.jti
                            ? 'Revoking…'
                            : isCurrent
                            ? 'Revoke this device'
                            : 'Revoke'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AuthGuard>
  );
}
