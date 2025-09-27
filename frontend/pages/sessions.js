import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, Badge, Button, ResponsiveContainer } from "../components/ui";
import { format } from "date-fns";
import { useRouter } from 'next/router';
import { apiFetch } from "../lib/api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  async function fetchSessions() {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch("/auth/sessions");
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(sessionId) {
    if (!confirm("Are you sure you want to revoke this session?")) return;

    try {
      setRevoking(sessionId);

      const response = await apiFetch("/auth/sessions/revoke", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });

      // The API always returns JSON
      const data = await response.json().catch(() => ({}));

      // If we revoked our own session, backend also cleared cookies
      if (data.current_session_revoked === true || data.message === "Your current session has been revoked") {
        // Update global auth state + redirect
        if (typeof logout === 'function') await logout();
        router.push('/login');
        return;
      }

      // Otherwise refresh list
      fetchSessions();
    } catch (err) {
      console.error("Error revoking session:", err);
      setError("Failed to revoke session. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  const fmt = (iso, pattern) => {
    if (!iso) return '—';
    try { return format(new Date(iso), pattern); } catch { return '—'; }
  };

  return (
    <ResponsiveContainer>
      <div className="px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-purple-500 mb-2">Active Sessions</h1>
        <p className="text-center text-gray-300 mb-8">Manage your active login sessions across devices</p>

        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
              </svg>
              <span>{error}</span>
            </div>
            <Button onClick={() => fetchSessions()} variant="danger">
              Try Again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No active sessions found</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessions.map(session => (
                  <tr key={session.id} className={session.is_current ? "bg-purple-900 bg-opacity-20" : ""}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-gray-300">{session.user_agent || 'Unknown device'}</span>
                        {session.is_current && (
                          <Badge className="ml-2" color="purple">Current</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{session.ip_address || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-300">{fmt(session.last_seen_at, 'MMM d, yyyy h:mm a')}</td>
                    <td className="px-6 py-4 text-gray-300">{fmt(session.created_at, 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4">
                      <Button
                        onClick={() => handleRevoke(session.id)}
                        disabled={revoking === session.id}
                        variant="danger"
                        size="sm"
                      >
                        {revoking === session.id ? "Revoking..." : "Revoke"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </ResponsiveContainer>
  );
}
