// frontend/pages/admin/security-events.js
import { useState, useEffect } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Select, Badge, Modal } from '../../components/ui';
import { 
  getSecurityEventsRecent,
  getSecurityEventsStats,
  getSecurityEventDetail,
  resolveSecurityEvent
} from '../../services/admin';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../../lib/toast';

export default function SecurityEventsPage() {
  const [timeRange, setTimeRange] = useState('24');
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hours = parseInt(timeRange);
      
      const [eventsData, statsData] = await Promise.all([
        getSecurityEventsRecent({
          hours,
          event_type: eventType || null,
          severity: severity || null,
          resolved: showResolved ? null : false
        }),
        getSecurityEventsStats(hours)
      ]);

      setEvents(eventsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange, eventType, severity, showResolved]);

  const handleResolve = async () => {
    if (!selectedEvent) return;
    
    try {
      await resolveSecurityEvent(selectedEvent.id, resolveNotes);
      showToast('Security event resolved', 'success');
      setSelectedEvent(null);
      setResolveNotes('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'failed_login': return 'Failed Login';
      case 'rate_limit_exceeded': return 'Rate Limit';
      case 'suspicious_activity': return 'Suspicious Activity';
      default: return type;
    }
  };

  if (loading && !events.length) {
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
          title="🔒 Security Events"
          subtitle="Monitor failed logins, rate limits, and security incidents"
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
                <div className="text-sm font-medium text-slate-300 mb-1">Total Events</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.total_events?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                  {stats.unresolved_count} unresolved
                </div>
              </div>

              <div className="glass-card glass-amber p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Failed Logins</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.events_by_type?.failed_login || 0}
                </div>
                <div className="text-xs text-slate-400">
                  Authentication failures
                </div>
              </div>

              <div className="glass-card glass-cyan p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Rate Limits</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.events_by_type?.rate_limit_exceeded || 0}
                </div>
                <div className="text-xs text-slate-400">
                  Throttled requests
                </div>
              </div>

              <div className="glass-card glass-violet p-6">
                <div className="text-sm font-medium text-slate-300 mb-1">Critical Events</div>
                <div className="text-3xl font-bold text-slate-100 mb-2">
                  {stats.unresolved_critical || 0}
                </div>
                <div className="text-xs text-slate-400">
                  Require attention
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
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-48"
              >
                <option value="">All Event Types</option>
                <option value="failed_login">Failed Login</option>
                <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
              </Select>

              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-40"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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

          {/* Top Offending IPs */}
          {stats?.top_offending_ips && stats.top_offending_ips.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">🚨 Top Offending IPs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.top_offending_ips.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-mono text-slate-100">{item.ip_address}</div>
                        <div className="text-xs text-slate-400">
                          {item.event_count} events
                        </div>
                      </div>
                      <Badge variant="danger" size="sm">
                        {item.severity || 'medium'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Security Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Time</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Severity</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">User/Email</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">IP Address</th>
                    <th className="text-left text-xs font-medium text-slate-400 pb-3">Endpoint</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Status</th>
                    <th className="text-center text-xs font-medium text-slate-400 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 text-xs text-slate-300">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {getEventTypeLabel(event.event_type)}
                      </td>
                      <td className="py-3">
                        <Badge variant={getSeverityColor(event.severity)} size="sm">
                          {event.severity}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-300">
                        {event.email || event.user_id || 'N/A'}
                      </td>
                      <td className="py-3 text-xs text-slate-300 font-mono">
                        {event.ip_address}
                      </td>
                      <td className="py-3 text-xs text-slate-300 font-mono">
                        {event.endpoint}
                      </td>
                      <td className="py-3 text-center">
                        {event.resolved ? (
                          <Badge variant="success" size="sm">Resolved</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Open</Badge>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEvent(event)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  {showResolved ? 'No security events found' : 'No unresolved security events'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <Modal
            isOpen={!!selectedEvent}
            onClose={() => {
              setSelectedEvent(null);
              setResolveNotes('');
            }}
            title="Security Event Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Event Type</div>
                  <div className="text-slate-100">{getEventTypeLabel(selectedEvent.event_type)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Severity</div>
                  <Badge variant={getSeverityColor(selectedEvent.severity)}>
                    {selectedEvent.severity}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">IP Address</div>
                  <div className="text-slate-100 font-mono">{selectedEvent.ip_address}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">User Agent</div>
                  <div className="text-slate-100 text-xs truncate">{selectedEvent.user_agent}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Endpoint</div>
                  <div className="text-slate-100 font-mono text-sm">
                    {selectedEvent.http_method} {selectedEvent.endpoint}
                  </div>
                </div>
                {selectedEvent.details && (
                  <div className="col-span-2">
                    <div className="text-xs text-slate-400 mb-1">Details</div>
                    <pre className="text-xs text-slate-100 bg-black/20 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Timestamp</div>
                  <div className="text-slate-100 text-sm">
                    {new Date(selectedEvent.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!selectedEvent.resolved && (
                <div className="border-t border-white/10 pt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Add notes about how this was resolved..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={3}
                  />
                  <div className="mt-3 flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedEvent(null);
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

              {selectedEvent.resolved && (
                <div className="border-t border-white/10 pt-4">
                  <div className="text-sm text-green-400 mb-2">✓ Resolved</div>
                  {selectedEvent.resolved_notes && (
                    <div className="text-sm text-slate-300 bg-green-900/20 p-3 rounded">
                      {selectedEvent.resolved_notes}
                    </div>
                  )}
                  {selectedEvent.resolved_at && (
                    <div className="text-xs text-slate-400 mt-2">
                      Resolved {formatDistanceToNow(new Date(selectedEvent.resolved_at), { addSuffix: true })}
                      {selectedEvent.resolved_by_email && ` by ${selectedEvent.resolved_by_email}`}
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
