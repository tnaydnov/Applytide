// frontend/pages/admin/system.js
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { useAdminLogs } from '../../features/admin/hooks/useAdminData';
import { useState } from 'react';
import { Button } from '../../components/ui';

export default function AdminSystem() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const { logs, totalCount, loading, error, refresh } = useAdminLogs(page, limit);

  const totalPages = Math.ceil((totalCount || 0) / limit);

  const getActionColor = (action) => {
    if (action.includes('update')) return 'text-amber-300';
    if (action.includes('delete')) return 'text-rose-300';
    if (action.includes('create')) return 'text-emerald-300';
    return 'text-cyan-300';
  };

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="System Logs"
          subtitle="Admin action audit trail"
          actions={
            <Button onClick={refresh} variant="outline">
              Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center text-red-300">
            Error: {error}
          </div>
        ) : (
          <div className="glass-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Admin</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Target</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Details</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">IP Address</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs && logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-slate-200">{log.admin_email}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {log.target_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {log.details ? JSON.stringify(log.details).slice(0, 50) + '...' : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{log.ip_address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                        No logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <div className="text-sm text-slate-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </AdminGuard>
  );
}
