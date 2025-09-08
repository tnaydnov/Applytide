import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, Badge, Button, ResponsiveContainer } from "../components/ui";
import NavBar from "../components/NavBar";
import { format } from "date-fns";
import { useRouter } from 'next/router';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const { isAuthenticated } = useAuth();

  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);
  
  async function fetchSessions() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/sessions`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRevoke(sessionId) {
    if (confirm("Are you sure you want to revoke this session?")) {
      try {
        setRevoking(sessionId);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/sessions/revoke`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await response.json();
        
        // Check if we revoked our own session
        if (data.message === "Your current session has been revoked") {
          // Use the auth context to update global state
          if (auth && auth.logout) {
            auth.logout();
          }
          
          // Redirect to login page
          router.push('/login');
          return;
        }
        
        // Refresh sessions list for other sessions
        fetchSessions();
      } catch (err) {
        console.error("Error revoking session:", err);
        setError("Failed to revoke session. Please try again.");
      } finally {
        setRevoking(null);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ResponsiveContainer>
        <div className="px-4 py-8">
          <h1 className="text-3xl font-bold text-center text-purple-500 mb-2">Active Sessions</h1>
          <p className="text-center text-gray-300 mb-8">Manage your active login sessions across devices</p>
          
          {error && (
            <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
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
                      <td className="px-6 py-4 text-gray-300">{format(new Date(session.last_seen_at), 'MMM d, yyyy h:mm a')}</td>
                      <td className="px-6 py-4 text-gray-300">{format(new Date(session.created_at), 'MMM d, yyyy')}</td>
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
    </div>
  );
}
