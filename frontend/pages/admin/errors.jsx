import { useState, useEffect } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import AdminGuard from '@/components/guards/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminApi } from '@/features/admin/api';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [levelFilter, setLevelFilter] = useState('');
  const [hoursFilter, setHoursFilter] = useState('24');

  useEffect(() => {
    loadData();
  }, [pagination.page, levelFilter, hoursFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [errorsData, summaryData] = await Promise.all([
        adminApi.getErrors({
          page: pagination.page,
          page_size: pagination.page_size,
          ...(levelFilter && { level: levelFilter }),
          ...(hoursFilter && { hours: parseInt(hoursFilter) })
        }),
        adminApi.getErrorSummary()
      ]);
      
      setErrors(errorsData.items);
      setPagination({
        page: errorsData.page,
        page_size: errorsData.page_size,
        total: errorsData.total,
        total_pages: errorsData.total_pages
      });
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading errors:', error);
      toast.error('Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'CRITICAL': return <FiAlertCircle className="text-red-600" />;
      case 'ERROR': return <FiAlertCircle className="text-red-500" />;
      case 'WARNING': return <FiAlertTriangle className="text-yellow-500" />;
      default: return <FiInfo className="text-blue-500" />;
    }
  };

  const getLevelBadge = (level) => {
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800',
      'ERROR': 'bg-red-50 text-red-700',
      'WARNING': 'bg-yellow-100 text-yellow-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Error Monitoring</h1>
          <p className="mt-2 text-gray-600">Track and analyze application errors</p>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Errors</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_errors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{summary.critical_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-500">{summary.error_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary.errors_today}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{summary.errors_this_week}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="ERROR">Error</option>
                <option value="WARNING">Warning</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={hoursFilter}
                onChange={(e) => setHoursFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Time</option>
                <option value="1">Last Hour</option>
                <option value="24">Last 24 Hours</option>
                <option value="168">Last Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Errors List */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-64"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    </tr>
                  ))
                ) : errors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No errors found</td>
                  </tr>
                ) : (
                  errors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelBadge(error.level)}`}>
                          {error.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 line-clamp-2">{error.message}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {error.user_email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {error.endpoint || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && errors.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                {pagination.total} errors
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
