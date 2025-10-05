// frontend/features/admin/security/index.js
import { useState, useEffect } from 'react';
import { useFailedLogins, useIPBlacklist, useActiveSessions, useSecurityActions } from './hooks/useSecurity';
import FailedLoginsTable from './components/FailedLoginsTable';
import IPBlacklistPanel from './components/IPBlacklistPanel';
import ActiveSessionsPanel from './components/ActiveSessionsPanel';
import PasswordPrompt from '../shared/components/PasswordPrompt';

export default function SecurityPage() {
  const { logs, loading: logsLoading, loadLogs } = useFailedLogins(100);
  const { ips, loading: ipsLoading, loadIPs } = useIPBlacklist();
  const { sessions, loading: sessionsLoading, loadSessions } = useActiveSessions();
  const { actionLoading, blockIPAddress, unblockIPAddress, revokeUserSession } = useSecurityActions();

  const [blockIPPrompt, setBlockIPPrompt] = useState(null);
  const [unblockIPPrompt, setUnblockIPPrompt] = useState(null);
  const [revokeSessionPrompt, setRevokeSessionPrompt] = useState(null);

  useEffect(() => {
    loadLogs();
    loadIPs();
    loadSessions();
  }, []);

  const handleBlockIP = async (justification, password) => {
    if (!blockIPPrompt) return;
    
    const success = await blockIPAddress(blockIPPrompt, `Failed login attempts`, justification, password);
    if (success) {
      setBlockIPPrompt(null);
      loadIPs();
    }
  };

  const handleUnblockIP = async (justification, password) => {
    if (!unblockIPPrompt) return;
    
    const success = await unblockIPAddress(unblockIPPrompt, justification, password);
    if (success) {
      setUnblockIPPrompt(null);
      loadIPs();
    }
  };

  const handleRevokeSession = async (justification, password) => {
    if (!revokeSessionPrompt) return;
    
    const success = await revokeUserSession(revokeSessionPrompt, justification, password);
    if (success) {
      setRevokeSessionPrompt(null);
      loadSessions();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            🔒 Security Monitoring
          </h1>
          <p className="text-gray-400 mt-2">
            Monitor failed logins, manage IP blacklist, and control active sessions
          </p>
        </div>

        {/* Failed Logins */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">⚠️ Failed Login Attempts</h2>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <FailedLoginsTable 
              logs={logs} 
              loading={logsLoading} 
              onBlockIP={(ip) => setBlockIPPrompt(ip)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IP Blacklist */}
          <IPBlacklistPanel 
            ips={ips} 
            loading={ipsLoading} 
            onUnblock={(ip) => setUnblockIPPrompt(ip)}
          />

          {/* Active Sessions */}
          <ActiveSessionsPanel 
            sessions={sessions} 
            loading={sessionsLoading} 
            onRevoke={(sessionId) => setRevokeSessionPrompt(sessionId)}
          />
        </div>

        {/* Block IP Prompt */}
        {blockIPPrompt && (
          <PasswordPrompt
            title="Block IP Address"
            message={`Block IP address ${blockIPPrompt}? This will prevent all requests from this IP.`}
            onConfirm={handleBlockIP}
            onCancel={() => setBlockIPPrompt(null)}
            requireJustification={true}
            loading={actionLoading}
          />
        )}

        {/* Unblock IP Prompt */}
        {unblockIPPrompt && (
          <PasswordPrompt
            title="Unblock IP Address"
            message={`Unblock IP address ${unblockIPPrompt}? This will restore access from this IP.`}
            onConfirm={handleUnblockIP}
            onCancel={() => setUnblockIPPrompt(null)}
            requireJustification={true}
            loading={actionLoading}
          />
        )}

        {/* Revoke Session Prompt */}
        {revokeSessionPrompt && (
          <PasswordPrompt
            title="Revoke User Session"
            message="Revoke this user session? The user will be logged out immediately."
            onConfirm={handleRevokeSession}
            onCancel={() => setRevokeSessionPrompt(null)}
            requireJustification={true}
            loading={actionLoading}
            dangerMode={true}
          />
        )}
      </div>
    </div>
  );
}
