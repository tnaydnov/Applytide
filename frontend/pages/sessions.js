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
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gradient mb-2">Active Sessions</h1>
            <p className="text-gray-300">Manage your active login sessions across devices</p>
          </div>

          <Card className="p-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/20 border-t-indigo-500 mx-auto"></div>
                  <p className="text-gray-300">Loading sessions...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-400 text-lg mb-4">⚠️ {error}</div>
                <Button onClick={fetchSessions} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">No active sessions found</div>
                <p className="text-gray-500">Your sessions will appear here when you log in from different devices.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((s) => {
                  const isCurrent = s.jti === currentJti;

                  return (
                    <div
                      key={s.jti}
                      className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-6">
                        {/* Device Icon */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 min-w-0 mb-2">
                            <p className="font-semibold text-white truncate">
                              {s.user_agent || 'Unknown device'}
                            </p>
                            {isCurrent && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                Current device
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {s.ip_address || 'Unknown IP'}
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(s.created_at).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Expires {new Date(s.expires_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0">
                          <Button
                            size="sm"
                            variant={isCurrent ? "danger" : "outline"}
                            className={
                              isCurrent
                                ? 'border-red-500/50 text-red-300 hover:bg-red-500/10'
                                : 'border-white/20 text-gray-300 hover:bg-white/5'
                            }
                            disabled={revoking === s.jti}
                            onClick={() => revokeSession(s.jti)}
                          >
                            {revoking === s.jti ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                Revoking...
                              </>
                            ) : isCurrent ? (
                              <>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Revoke this device
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Revoke
                              </>
                            )}
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
      </div>
    </AuthGuard>
  );
}
