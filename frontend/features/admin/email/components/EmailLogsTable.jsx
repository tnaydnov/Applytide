// frontend/features/admin/email/components/EmailLogsTable.jsx
export default function EmailLogsTable({ logs, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading email logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">📧 No email logs found</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'green';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return '✓';
      case 'failed': return '✗';
      case 'pending': return '⏳';
      default: return '?';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="p-3 text-left text-gray-300 font-medium">ID</th>
            <th className="p-3 text-left text-gray-300 font-medium">To</th>
            <th className="p-3 text-left text-gray-300 font-medium">Subject</th>
            <th className="p-3 text-left text-gray-300 font-medium">Status</th>
            <th className="p-3 text-left text-gray-300 font-medium">Sent At</th>
            <th className="p-3 text-left text-gray-300 font-medium">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {logs.map((log) => {
            const statusColor = getStatusColor(log.status);
            const statusIcon = getStatusIcon(log.status);
            
            return (
              <tr key={log.id} className="hover:bg-gray-800/30">
                <td className="p-3 text-gray-400 font-mono text-sm">{log.id}</td>
                <td className="p-3 text-white">{log.to_email}</td>
                <td className="p-3 text-gray-300 truncate max-w-xs" title={log.subject}>
                  {log.subject}
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-${statusColor}-500/20 text-${statusColor}-400`}>
                    {statusIcon} {log.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-sm">
                  {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                </td>
                <td className="p-3 text-red-400 text-sm truncate max-w-xs" title={log.error_message}>
                  {log.error_message || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
