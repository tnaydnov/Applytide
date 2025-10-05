// frontend/features/admin/security/components/IPBlacklistPanel.jsx
export default function IPBlacklistPanel({ ips, loading, onUnblock }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">🚫 Blocked IP Addresses</h3>
      
      {ips.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No IPs currently blocked</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {ips.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700"
            >
              <div className="flex-1">
                <p className="text-white font-mono">{item.ip}</p>
                {item.reason && <p className="text-sm text-gray-400 mt-1">{item.reason}</p>}
                {item.blocked_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Blocked: {new Date(item.blocked_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => onUnblock(item.ip)}
                className="ml-3 px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
              >
                ✓ Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
