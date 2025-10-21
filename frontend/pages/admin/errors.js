// frontend/pages/admin/errors.js
import { useState, useEffect } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Select, Badge, Modal } from '../../components/ui';
import { 
  getErrorLogsRecent,
  getErrorStats,
  getErrorDetail,
  resolveError
} from '../../services/admin';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../../lib/toast';

export default function ErrorLogsPage() {
  const [timeRange, setTimeRange] = useState('24');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedError, setSelectedError] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hours = parseInt(timeRange);
      
      const [errorsData, statsData] = await Promise.all([
        getErrorLogsRecent({
          hours,
          severity: severity || null,
          resolved: showResolved ? null : false
        }),
        getErrorStats(hours)
      ]);

      setErrors(errorsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange, severity, showResolved]);

  const handleResolve = async () => {
    if (!selectedError) return;
    
    try {
      await resolveError(selectedError.id, resolveNotes);
      showToast('Error resolved', 'success');
      setSelectedError(null);
      setResolveNotes('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'critical': return 'danger';
      case 'error': return 'warning';
      case 'warning': return 'info';
      default: return 'default';
    }
  };

  if (loading && !errors.length) {
    return (
      <AdminGuard>
        <PageContainer>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        </PageContainer>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="⚠️ Error Logs"
          subtitle="Monitor application errors and exceptions"
          actions={
            <Button onClick={loadData} variant="outline">
              Refresh
            </Button>
          }
        />

        <div className="space-y-6">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card glass-rose p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Total Errors</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.total_errors?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                  {stats.unresolved_count} unresolved
                </div>
              </div>

              <div className="glass-card glass-amber p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Critical</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.by_severity?.critical || 0}
                </div>
                <div className="text-xs text-slate-400">
                  Requires immediate attention
                </div>
              </div>

              <div className="glass-card glass-cyan p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Errors</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.by_severity?.error || 0}
                </div>
                <div className="text-xs text-slate-400">
                  Standard errors
                </div>
              </div>

              <div className="glass-card glass-violet p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Most Common</div>
                <div className="text-sm font-bold text-slate-100 mb-1 truncate">
                  {stats.most_common_error_type || 'N/A'}
                </div>
                <div className="text-xs text-slate-400">
                  {stats.most_common_count || 0} occurrences
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-32"
              >
                <option value="1">Last Hour</option>
                <option value="24">Last 24h</option>
                <option value="168">Last 7d</option>
                <option value="720">Last 30d</option>
              </Select>

              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-40"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </Select>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Resolved</span>
              </label>
            </div>
          </div>

          {/* Errors by Service */}
          {stats?.by_service && Object.keys(stats.by_service).length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">📊 Errors by Service</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_service).map(([service, count]) => (
                  <div key={service} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-slate-100 font-medium">{service}</div>
                    <div className="text-2xl font-bold text-slate-100">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Table */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Error Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Time</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Severity</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Message</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Service</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Endpoint</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Status</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err) => (
                    <tr key={err.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 text-xs text-slate-300">
                        {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                      </td>
                      <td className="py-3">
                        <Badge variant={getSeverityColor(err.severity)} size="sm">
                          {err.severity}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-300 font-mono">
                        {err.error_type}
                      </td>
                      <td className="py-3 text-xs text-slate-300 max-w-xs truncate">
                        {err.error_message}
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {err.service || 'N/A'}
                      </td>
                      <td className="py-3 text-xs text-slate-300 font-mono">
                        {err.endpoint || 'N/A'}
                      </td>
                      <td className="py-3 text-center">
                        {err.resolved ? (
                          <Badge variant="success" size="sm">Resolved</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Open</Badge>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedError(err)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  {showResolved ? 'No errors found' : 'No unresolved errors'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Detail Modal */}
        {selectedError && (
          <Modal
            isOpen={!!selectedError}
            onClose={() => {
              setSelectedError(null);
              setResolveNotes('');
            }}
            title="Error Details"
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Error Type</div>
                  <div className="text-slate-100 font-mono">{selectedError.error_type}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Severity</div>
                  <Badge variant={getSeverityColor(selectedError.severity)}>
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Service</div>
                  <div className="text-slate-100">{selectedError.service || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Status Code</div>
                  <div className="text-slate-100">{selectedError.status_code || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Endpoint</div>
                  <div className="text-slate-100 font-mono text-sm">
                    {selectedError.http_method} {selectedError.endpoint}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Error Message</div>
                  <div className="text-slate-100 bg-red-900/20 p-3 rounded">
                    {selectedError.error_message}
                  </div>
                </div>
                {selectedError.stack_trace && (
                  <div className="col-span-2">
                    <div className="text-xs text-slate-400 mb-1">Stack Trace</div>
                    <pre className="text-xs text-slate-100 bg-black/40 p-3 rounded overflow-auto max-h-60">
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Timestamp</div>
                  <div className="text-slate-100 text-sm">
                    {new Date(selectedError.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!selectedError.resolved && (
                <div className="border-t border-white/10 pt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Describe how this error was fixed..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={3}
                  />
                  <div className="mt-3 flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedError(null);
                        setResolveNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="success" onClick={handleResolve}>
                      Mark as Resolved
                    </Button>
                  </div>
                </div>
              )}

              {selectedError.resolved && (
                <div className="border-t border-white/10 pt-4">
                  <div className="text-sm text-green-400 mb-2">✓ Resolved</div>
                  {selectedError.resolved_notes && (
                    <div className="text-sm text-slate-300 bg-green-900/20 p-3 rounded">
                      {selectedError.resolved_notes}
                    </div>
                  )}
                  {selectedError.resolved_at && (
                    <div className="text-xs text-slate-400 mt-2">
                      Resolved {formatDistanceToNow(new Date(selectedError.resolved_at), { addSuffix: true })}
                      {selectedError.resolved_by_email && ` by ${selectedError.resolved_by_email}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}
      </PageContainer>
    </AdminGuard>
  );
}
