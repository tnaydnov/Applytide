// frontend/features/admin/storage/index.js
import { useEffect } from 'react';
import { useStorageStats, useStorageByUser } from './hooks/useStorage';
import UserStorageTable from './components/UserStorageTable';
import OrphanedFilesPanel from '../documents/components/OrphanedFilesPanel';
import StatsCard from '../shared/components/StatsCard';
import { formatFileSize } from '../documents/utils/helpers';

export default function StoragePage() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useStorageStats();
  const { users, loading: usersLoading, loadUsers } = useStorageByUser();

  useEffect(() => {
    refreshStats();
    loadUsers(50);
  }, []);

  const totalStorageGB = stats ? (stats.total_storage / (1024 * 1024 * 1024)).toFixed(2) : '0';
  const avgSizeKB = stats ? (stats.avg_file_size / 1024).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            💾 Storage Management
          </h1>
          <p className="text-gray-400 mt-2">
            Monitor disk usage, manage user storage, and cleanup orphaned files
          </p>
        </div>

        {/* Statistics */}
        {statsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Storage"
              value={`${totalStorageGB} GB`}
              icon="💾"
              color="violet"
            />
            <StatsCard
              title="Total Documents"
              value={stats.total_documents.toLocaleString()}
              icon="📄"
              color="blue"
            />
            <StatsCard
              title="Active Users"
              value={stats.users_with_documents.toLocaleString()}
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
        ) : null}

        {/* User Storage Table */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">👤 User Storage Breakdown</h2>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <UserStorageTable users={users} loading={usersLoading} />
          </div>
        </div>

        {/* Orphaned Files */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">🗑️ Orphaned Files Cleanup</h2>
          <OrphanedFilesPanel />
        </div>
      </div>
    </div>
  );
}
