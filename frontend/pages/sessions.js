import { useEffect, useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import { Card, Button } from '../components/ui';
import api from '../lib/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    setError('');
    try {
      const resp = await apiFetch('/auth/sessions', { method: 'GET' });
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();
      setSessions(data);
    } catch (e) {
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
        body: JSON.stringify({ jti })
      });
      if (!resp.ok) throw new Error('Failed to revoke');
      fetchSessions();
    } catch (e) {
      setError('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Active Sessions & Devices</h1>
        <Card className="p-4">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : sessions.length === 0 ? (
            <div>No active sessions found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>IP</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.jti} className="border-b">
                    <td>{s.user_agent || 'Unknown'}</td>
                    <td>{s.ip_address || 'Unknown'}</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>{new Date(s.expires_at).toLocaleString()}</td>
                    <td>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={revoking === s.jti}
                        onClick={() => revokeSession(s.jti)}
                      >
                        {revoking === s.jti ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AuthGuard>
  );
}
