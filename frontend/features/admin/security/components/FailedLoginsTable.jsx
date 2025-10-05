// frontend/features/admin/security/components/FailedLoginsTable.jsx
export default function FailedLoginsTable({ logs, loading, onBlockIP }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading failed logins...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">✓ No failed login attempts</p>
        <p className="text-sm mt-2 text-green-400">System security looking good!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="p-3 text-left text-gray-300 font-medium">Email</th>
            <th className="p-3 text-left text-gray-300 font-medium">IP Address</th>
            <th className="p-3 text-left text-gray-300 font-medium">Reason</th>
            <th className="p-3 text-left text-gray-300 font-medium">Timestamp</th>
            <th className="p-3 text-left text-gray-300 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {logs.map((log, index) => (
            <tr key={index} className="hover:bg-gray-800/30">
              <td className="p-3 text-white">{log.email}</td>
              <td className="p-3 text-gray-300 font-mono text-sm">{log.ip_address}</td>
              <td className="p-3 text-red-400 text-sm">{log.reason}</td>
              <td className="p-3 text-gray-400 text-sm">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="p-3">
                <button
                  onClick={() => onBlockIP(log.ip_address)}
                  className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  🚫 Block IP
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
