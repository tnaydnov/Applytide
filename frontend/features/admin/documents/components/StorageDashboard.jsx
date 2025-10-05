// frontend/features/admin/documents/components/StorageDashboard.jsx
import { formatFileSize, getDocumentTypeConfig } from '../utils/helpers';
import StatsCard from '../../shared/components/StatsCard';

export default function StorageDashboard({ analytics, loading }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No storage analytics available</p>
      </div>
    );
  }

  const totalStorageGB = (analytics.total_storage / (1024 * 1024 * 1024)).toFixed(2);
  const avgSizeKB = (analytics.avg_file_size / 1024).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Documents"
          value={analytics.total_documents.toLocaleString()}
          icon="📄"
          color="violet"
        />
        <StatsCard
          title="Total Storage"
          value={`${totalStorageGB} GB`}
          icon="💾"
          color="blue"
        />
        <StatsCard
          title="Active Users"
          value={analytics.users_with_documents.toLocaleString()}
          icon="👥"
          color="green"
        />
        <StatsCard
          title="Avg File Size"
          value={`${avgSizeKB} KB`}
          icon="📊"
          color="yellow"
        />
      </div>

      {/* Storage by Type */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📂 Storage by Document Type</h3>
        <div className="space-y-3">
          {analytics.by_type.map((item) => {
            const typeConfig = getDocumentTypeConfig(item.document_type);
            const percentage = (item.total_size / analytics.total_storage) * 100;
            
            return (
              <div key={item.document_type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-2">
                    {typeConfig.icon} {typeConfig.label}
                  </span>
                  <span className="text-gray-400">
                    {item.count} files · {formatFileSize(item.total_size)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-${typeConfig.color}-500 h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Users by Storage */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">👤 Top Users by Storage</h3>
        <div className="space-y-3">
          {analytics.top_users.slice(0, 10).map((user, index) => {
            const percentage = (user.total_size / analytics.total_storage) * 100;
            
            return (
              <div key={user.user_id} className="flex items-center gap-3">
                <div className="text-gray-500 font-mono text-sm w-6">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white truncate">{user.user_email}</span>
                    <span className="text-gray-400">
                      {user.document_count} files · {formatFileSize(user.total_size)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
