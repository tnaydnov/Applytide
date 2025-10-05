// frontend/features/admin/gdpr/components/DataRequestsTable.jsx
export default function DataRequestsTable({ requests, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading data requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">📋 No GDPR data requests</p>
      </div>
    );
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'export': return 'blue';
      case 'delete': return 'red';
      default: return 'gray';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="p-3 text-left text-gray-300 font-medium">ID</th>
            <th className="p-3 text-left text-gray-300 font-medium">User</th>
            <th className="p-3 text-left text-gray-300 font-medium">Type</th>
            <th className="p-3 text-left text-gray-300 font-medium">Status</th>
            <th className="p-3 text-left text-gray-300 font-medium">Requested</th>
            <th className="p-3 text-left text-gray-300 font-medium">Completed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {requests.map((req) => {
            const typeColor = getTypeColor(req.request_type);
            const statusColor = getStatusColor(req.status);
            
            return (
              <tr key={req.id} className="hover:bg-gray-800/30">
                <td className="p-3 text-gray-400 font-mono text-sm">{req.id}</td>
                <td className="p-3 text-white">{req.user_email}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${typeColor}-500/20 text-${typeColor}-400`}>
                    {req.request_type}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${statusColor}-500/20 text-${statusColor}-400`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-sm">
                  {new Date(req.requested_at).toLocaleString()}
                </td>
                <td className="p-3 text-gray-400 text-sm">
                  {req.completed_at ? new Date(req.completed_at).toLocaleString() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
