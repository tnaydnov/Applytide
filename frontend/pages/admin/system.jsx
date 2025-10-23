import { useState, useEffect } from 'react';
import { FiDatabase, FiHardDrive, FiActivity, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import AdminGuard from '@/components/guards/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminApi } from '@/features/admin/api';
import { useToast } from '@/lib/toast';

export default function SystemHealthPage() {
  const toast = useToast();
  const [dbHealth, setDbHealth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [db, stor, api] = await Promise.all([
        adminApi.getDatabaseHealth(),
        adminApi.getStorageUsage(),
        adminApi.getApiHealth()
      ]);
      
      setDbHealth(db);
      setStorage(stor);
      setApiHealth(api);
    } catch (error) {
      console.error('Error loading system health:', error);
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-600" size={24} />;
      case 'degraded': return <FiAlertCircle className="text-yellow-600" size={24} />;
      case 'down': return <FiAlertCircle className="text-red-600" size={24} />;
      default: return <FiActivity className="text-gray-600" size={24} />;
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !dbHealth) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg shadow p-6 h-64"></div>
              ))}
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
            <p className="mt-2 text-gray-600">Monitor system resources and performance</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* API Health Status */}
        {apiHealth && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(apiHealth.status)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">API Status</h2>
                  <p className={`text-lg font-medium capitalize ${getStatusColor(apiHealth.status)}`}>
                    {apiHealth.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{formatUptime(apiHealth.uptime_seconds)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Database Health */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center gap-3">
              <FiDatabase className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">Database</h2>
            </div>
            {dbHealth && (
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold text-gray-900">{dbHealth.total_size_mb.toFixed(2)} MB</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tables</p>
                  <p className="text-2xl font-bold text-gray-900">{dbHealth.table_count}</p>
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Users</span>
                    <span className="font-medium text-gray-900">{dbHealth.users_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Applications</span>
                    <span className="font-medium text-gray-900">{dbHealth.applications_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Jobs</span>
                    <span className="font-medium text-gray-900">{dbHealth.jobs_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Logs</span>
                    <span className="font-medium text-gray-900">{dbHealth.logs_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sessions</span>
                    <span className="font-medium text-gray-900">{dbHealth.sessions_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Storage */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center gap-3">
              <FiHardDrive className="text-green-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">Storage</h2>
            </div>
            {storage && (
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{storage.total_documents.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold text-gray-900">{storage.total_size_mb.toFixed(2)} MB</p>
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Users with Documents</span>
                    <span className="font-medium text-gray-900">{storage.documents_by_user}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avatars</span>
                    <span className="font-medium text-gray-900">{storage.avatars_count}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* API Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center gap-3">
              <FiActivity className="text-purple-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">API Metrics</h2>
            </div>
            {apiHealth && (
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Requests (Last Hour)</p>
                  <p className="text-2xl font-bold text-gray-900">{apiHealth.requests_last_hour.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Errors (Last Hour)</p>
                  <p className="text-2xl font-bold text-red-600">{apiHealth.errors_last_hour}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">{apiHealth.avg_response_time_ms.toFixed(0)} ms</p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Error Rate</span>
                    <span className="font-medium text-gray-900">
                      {apiHealth.requests_last_hour > 0 
                        ? ((apiHealth.errors_last_hour / apiHealth.requests_last_hour) * 100).toFixed(2)
                        : 0
                      }%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
