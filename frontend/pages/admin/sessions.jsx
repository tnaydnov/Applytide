import { useState, useEffect } from 'react';
import { FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import AdminGuard from '../../components/guards/AdminGuard';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../features/admin/api';
import { useToast } from '../../lib/toast';
import { formatDistanceToNow, format } from 'date-fns';

export default function SessionsPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });

  useEffect(() => {
    loadData();
  }, [pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, statsData] = await Promise.all([
        adminApi.getSessions({ page: pagination.page, page_size: pagination.page_size }),
        adminApi.getSessionStats()
      ]);
      
      setSessions(sessionsData.items);
      setPagination({
        page: sessionsData.page,
        page_size: sessionsData.page_size,
        total: sessionsData.total,
        total_pages: sessionsData.total_pages
      });
      setStats(statsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId, userEmail) => {
    if (!confirm(`Revoke session for ${userEmail}?`)) return;

    try {
      await adminApi.revokeSession(sessionId);
      toast.success('Session revoked successfully');
      loadData();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Active Sessions</h1>
          <p className="mt-2 text-gray-600">Monitor and manage user sessions</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Active</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_active}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.expiring_soon}</p>
              <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Need Cleanup</p>
              <p className="text-3xl font-bold text-red-600">{stats.expired_uncleaned}</p>
              <p className="text-xs text-gray-500 mt-1">Expired but active</p>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No active sessions</td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{session.user_email}</div>
                        <div className="text-sm text-gray-500">ID: {session.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(session.expires_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.device_info || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRevokeSession(session.id, session.user_email)}
                          className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <FiLogOut size={14} />
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && sessions.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                {pagination.total} sessions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiChevronLeft />
                </button>
                <span className="px-4 py-1">Page {pagination.page} of {pagination.total_pages}</span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
