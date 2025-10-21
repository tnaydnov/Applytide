// frontend/pages/admin/sessions.js
import { useState, useEffect } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Badge, Modal } from '../../components/ui';
import { 
  getActiveSessions,
  getSessionStats,
  terminateSession,
  terminateUserSessions
} from '../../services/admin';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../../lib/toast';

export default function ActiveSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [confirmTerminate, setConfirmTerminate] = useState(null);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, statsData] = await Promise.all([
        getActiveSessions(200),
        getSessionStats()
      ]);

      setSessions(sessionsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateSession = async (sessionId) => {
    try {
      await terminateSession(sessionId);
      showToast('Session terminated', 'success');
      setConfirmTerminate(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTerminateUserSessions = async (userId) => {
    try {
      await terminateUserSessions(userId);
      showToast('All user sessions terminated', 'success');
      setConfirmTerminate(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return '📱';
      case 'tablet': return '💻';
      case 'desktop': return '🖥️';
      default: return '💻';
    }
  };

  const getBrowserIcon = (browser) => {
    if (!browser) return '🌐';
    const b = browser.toLowerCase();
    if (b.includes('chrome')) return '🔵';
    if (b.includes('firefox')) return '🦊';
    if (b.includes('safari')) return '🧭';
    if (b.includes('edge')) return '🔷';
    return '🌐';
  };

  if (loading && !sessions.length) {
    return (
      <AdminGuard>
        <PageContainer>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        </PageContainer>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="👥 Active Sessions"
          subtitle="Monitor user sessions and connected devices"
          actions={
            <Button onClick={loadData} variant="outline">
              Refresh
            </Button>
          }
        />

        <div className="space-y-6">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card glass-violet p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Active Sessions</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.total_active?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                  Currently online
                </div>
              </div>

              <div className="glass-card glass-cyan p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Unique Users</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.unique_users?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                  Different accounts
                </div>
              </div>

              <div className="glass-card glass-amber p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Mobile Devices</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.by_device?.mobile || 0}
                </div>
                <div className="text-xs text-slate-400">
                  📱 {stats.total_active > 0 
                    ? ((stats.by_device?.mobile || 0) / stats.total_active * 100).toFixed(0)
                    : 0}% of sessions
                </div>
              </div>

              <div className="glass-card glass-rose p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Desktop</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.by_device?.desktop || 0}
                </div>
                <div className="text-xs text-slate-400">
                  🖥️ {stats.total_active > 0 
                    ? ((stats.by_device?.desktop || 0) / stats.total_active * 100).toFixed(0)
                    : 0}% of sessions
                </div>
              </div>
            </div>
          )}

          {/* Device Breakdown */}
          {stats?.by_browser && Object.keys(stats.by_browser).length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">🌐 Browser Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_browser).map(([browser, count]) => (
                  <div key={browser} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span>{getBrowserIcon(browser)}</span>
                      <div>
                        <div className="text-slate-100 font-medium">{browser}</div>
                        <div className="text-2xl font-bold text-slate-100">{count}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Table */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Active Sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Device</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Browser</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">OS</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">IP Address</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Location</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Login Time</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Last Activity</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 text-xs text-slate-300">
                        <div>{session.user_email}</div>
                        <div className="text-[10px] text-slate-500">ID: {session.user_id}</div>
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <span>{getDeviceIcon(session.device_type)}</span>
                          <span>{session.device_type || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <span>{getBrowserIcon(session.browser)}</span>
                          <span>{session.browser || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {session.os || 'Unknown'}
                      </td>
                      <td className="py-3 text-xs text-slate-300 font-mono">
                        {session.ip_address}
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {session.location || 'Unknown'}
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {formatDistanceToNow(new Date(session.login_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedSession(session)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setConfirmTerminate({ type: 'session', id: session.id })}
                          >
                            Terminate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessions.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  No active sessions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Detail Modal */}
        {selectedSession && (
          <Modal
            isOpen={!!selectedSession}
            onClose={() => setSelectedSession(null)}
            title="Session Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">User</div>
                  <div className="text-slate-100 font-medium">{selectedSession.user_email}</div>
                  <div className="text-xs text-slate-400">User ID: {selectedSession.user_id}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Device Type</div>
                  <div className="text-slate-100">
                    {getDeviceIcon(selectedSession.device_type)} {selectedSession.device_type || 'Unknown'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Browser</div>
                  <div className="text-slate-100">
                    {getBrowserIcon(selectedSession.browser)} {selectedSession.browser || 'Unknown'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Operating System</div>
                  <div className="text-slate-100">{selectedSession.os || 'Unknown'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">IP Address</div>
                  <div className="text-slate-100 font-mono">{selectedSession.ip_address}</div>
                </div>
                
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Location</div>
                  <div className="text-slate-100">{selectedSession.location || 'Unknown'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Login Time</div>
                  <div className="text-slate-100">{new Date(selectedSession.login_at).toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Last Activity</div>
                  <div className="text-slate-100">{new Date(selectedSession.last_activity_at).toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Expires At</div>
                  <div className="text-slate-100">{new Date(selectedSession.expires_at).toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Session Age</div>
                  <div className="text-slate-100">
                    {formatDistanceToNow(new Date(selectedSession.login_at))}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">User Agent</div>
                  <div className="text-slate-100 text-xs break-all">{selectedSession.user_agent}</div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setSelectedSession(null)}>
                  Close
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmTerminate({ type: 'session', id: selectedSession.id });
                    setSelectedSession(null);
                  }}
                >
                  Terminate Session
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmTerminate({ type: 'user', id: selectedSession.user_id });
                    setSelectedSession(null);
                  }}
                >
                  Terminate All User Sessions
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Terminate Confirmation Modal */}
        {confirmTerminate && (
          <Modal
            isOpen={!!confirmTerminate}
            onClose={() => setConfirmTerminate(null)}
            title="Confirm Termination"
          >
            <div className="space-y-4">
              <p className="text-slate-300">
                Are you sure you want to terminate{' '}
                {confirmTerminate.type === 'user' ? 'all sessions for this user' : 'this session'}?
              </p>
              <p className="text-sm text-slate-400">
                The user will be logged out immediately and will need to sign in again.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmTerminate(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirmTerminate.type === 'user') {
                      handleTerminateUserSessions(confirmTerminate.id);
                    } else {
                      handleTerminateSession(confirmTerminate.id);
                    }
                  }}
                >
                  Terminate
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </PageContainer>
    </AdminGuard>
  );
}
