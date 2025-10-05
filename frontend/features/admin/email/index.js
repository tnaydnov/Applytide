// frontend/features/admin/email/index.js
import { useEffect } from 'react';
import { useEmailStats, useEmailLogs, useEmailActions } from './hooks/useEmail';
import EmailLogsTable from './components/EmailLogsTable';
import TestEmailPanel from './components/TestEmailPanel';
import StatsCard from '../shared/components/StatsCard';

export default function EmailPage() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useEmailStats();
  const { logs, total, loading: logsLoading, filters, updateFilters, refresh: refreshLogs } = useEmailLogs();
  const { actionLoading, sendTestEmail } = useEmailActions();

  useEffect(() => {
    refreshStats();
    refreshLogs();
  }, []);

  const handleSendTest = async (to, subject, body) => {
    const success = await sendTestEmail(to, subject, body);
    if (success) {
      refreshLogs();
      refreshStats();
    }
  };

  const currentPage = filters.page + 1;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            📧 Email Monitoring
          </h1>
          <p className="text-gray-400 mt-2">
            Monitor email delivery, view logs, and test email functionality
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
              title="Total Sent"
              value={stats.total_sent?.toLocaleString() || '0'}
              icon="✓"
              color="green"
            />
            <StatsCard
              title="Failed"
              value={stats.total_failed?.toLocaleString() || '0'}
              icon="✗"
              color="red"
            />
            <StatsCard
              title="Pending"
              value={stats.total_pending?.toLocaleString() || '0'}
              icon="⏳"
              color="yellow"
            />
            <StatsCard
              title="Success Rate"
              value={`${((stats.total_sent / (stats.total_sent + stats.total_failed || 1)) * 100).toFixed(1)}%`}
              icon="📊"
              color="violet"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Email Logs</h2>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <EmailLogsTable logs={logs} loading={logsLoading} />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-gray-400 text-sm">
                  Showing {(currentPage - 1) * filters.limit + 1} to {Math.min(currentPage * filters.limit, total)} of {total} logs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFilters({ page: filters.page - 1 })}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-gray-800 text-white rounded">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => updateFilters({ page: filters.page + 1 })}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">🧪 Test Email</h2>
            <TestEmailPanel onSend={handleSendTest} loading={actionLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
