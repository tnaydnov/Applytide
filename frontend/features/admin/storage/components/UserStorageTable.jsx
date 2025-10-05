// frontend/features/admin/storage/components/UserStorageTable.jsx
import { formatFileSize } from '../../documents/utils/helpers';

export default function UserStorageTable({ users, loading }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="mt-2 text-gray-400">Loading user storage...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-xl">👤 No user storage data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="p-3 text-left text-gray-300 font-medium">Rank</th>
            <th className="p-3 text-left text-gray-300 font-medium">User</th>
            <th className="p-3 text-left text-gray-300 font-medium">Documents</th>
            <th className="p-3 text-left text-gray-300 font-medium">Total Size</th>
            <th className="p-3 text-left text-gray-300 font-medium">Avg Size</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {users.map((user, index) => (
            <tr key={user.user_id} className="hover:bg-gray-800/30">
              <td className="p-3 text-gray-400 font-mono">#{index + 1}</td>
              <td className="p-3">
                <div className="text-white">{user.user_email}</div>
                {user.user_name && <div className="text-sm text-gray-400">{user.user_name}</div>}
              </td>
              <td className="p-3 text-gray-300">{user.document_count}</td>
              <td className="p-3 text-white font-semibold">{formatFileSize(user.total_size)}</td>
              <td className="p-3 text-gray-400">{formatFileSize(user.avg_size)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
