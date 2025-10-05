// frontend/features/admin/security/components/ActiveSessionsPanel.jsx
export default function ActiveSessionsPanel({ sessions, loading, onRevoke }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">👥 Active Sessions ({sessions.length})</h3>
      
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No active sessions</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessions.map((session) => (
            <div 
              key={session.session_id} 
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700"
            >
              <div className="flex-1">
                <p className="text-white">{session.user_email}</p>
                <p className="text-sm text-gray-400 mt-1">
                  IP: {session.ip_address} · Last active: {new Date(session.last_activity).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Session ID: {session.session_id}
                </p>
              </div>
              <button
                onClick={() => onRevoke(session.session_id)}
                className="ml-3 px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                🚪 Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
