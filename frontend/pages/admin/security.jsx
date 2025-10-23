import { useState, useEffect } from 'react';
import { FiShield, FiAlertTriangle, FiUserX, FiKey, FiRefreshCw, FiFilter } from 'react-icons/fi';
import AdminGuard from '../../components/guards/AdminGuard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import { adminApi } from '../../features/admin/api';
import { useToast } from '../../lib/toast';

export default function SecurityPage() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [timeWindow, setTimeWindow] = useState(24); // hours
  const [eventTypeFilter, setEventTypeFilter] = useState('all'); // 'all', 'failed_login', 'rate_limit', 'token_revocation'
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, [timeWindow, eventTypeFilter, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Build event params - only include event_type if not 'all'
      const eventParams = {
        hours: timeWindow,
        page,
        page_size: pageSize
      };
      if (eventTypeFilter !== 'all') {
        eventParams.event_type = eventTypeFilter;
      }
      
      // Load security stats and events
      const [statsData, eventsData] = await Promise.all([
        adminApi.getSecurityStats(timeWindow),
        adminApi.getSecurityEvents(eventParams)
      ]);

      setStats(statsData);
      setSecurityEvents(eventsData);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'failed_login':
        return <FiUserX className="text-red-400" />;
      case 'rate_limit_exceeded':
        return <FiAlertTriangle className="text-yellow-400" />;
      case 'token_revoked':
        return <FiKey className="text-orange-400" />;
      case 'suspicious_activity':
        return <FiShield className="text-red-500" />;
      default:
        return <FiShield className="text-slate-400" />;
    }
  };

  const getEventBadgeColor = (eventType) => {
    switch (eventType) {
      case 'failed_login':
        return 'bg-red-900/30 text-red-400 border-red-700';
      case 'rate_limit_exceeded':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'token_revoked':
        return 'bg-orange-900/30 text-orange-400 border-orange-700';
      case 'suspicious_activity':
        return 'bg-red-900/50 text-red-300 border-red-600';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-900/50 text-red-300 border-red-600',
      high: 'bg-orange-900/30 text-orange-400 border-orange-700',
      medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      low: 'bg-blue-900/30 text-blue-400 border-blue-700',
      info: 'bg-slate-700 text-slate-300 border-slate-600'
    };
    return colors[severity] || colors.info;
  };

  // Group events by IP to detect suspicious patterns
  const getSuspiciousIPs = () => {
    if (!securityEvents) return [];
    
    const ipCounts = {};
    securityEvents.forEach(event => {
      if (event.ip_address) {
        ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
      }
    });
    
    return Object.entries(ipCounts)
      .filter(([ip, count]) => count >= 5) // 5+ events from same IP
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const suspiciousIPs = getSuspiciousIPs();

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FiShield className="text-red-400" />
                Security Monitoring
              </h1>
              <p className="text-slate-400 mt-1">Monitor authentication failures, rate limits, and suspicious activity</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center gap-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-medium">Time Window:</span>
            <div className="flex gap-2">
              {[
                { label: '24 Hours', hours: 24 },
                { label: '7 Days', hours: 168 },
                { label: '30 Days', hours: 720 }
              ].map(option => (
                <button
                  key={option.label}
                  onClick={() => {
                    setTimeWindow(option.hours);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeWindow === option.hours
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading && !stats ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading security data...</p>
            </div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Failed Logins"
                  value={stats.failed_logins || 0}
                  icon={FiUserX}
                  subtitle={`${stats.unique_failed_ips || 0} unique IPs`}
                  trend={stats.failed_logins > 10 ? 'High activity' : stats.failed_logins > 0 ? 'Normal' : 'No issues'}
                  trendColor={stats.failed_logins > 10 ? 'text-red-400' : 'text-green-400'}
                />
                <StatCard
                  title="Rate Limit Violations"
                  value={stats.rate_limit_violations || 0}
                  icon={FiAlertTriangle}
                  subtitle={`${stats.unique_rate_limit_ips || 0} unique IPs`}
                  trend={stats.rate_limit_violations > 20 ? 'High activity' : 'Normal'}
                  trendColor={stats.rate_limit_violations > 20 ? 'text-yellow-400' : 'text-green-400'}
                />
                <StatCard
                  title="Token Revocations"
                  value={stats.token_revocations || 0}
                  icon={FiKey}
                  subtitle="Manual session terminations"
                />
                <StatCard
                  title="Suspicious IPs"
                  value={suspiciousIPs.length}
                  icon={FiShield}
                  subtitle="5+ security events"
                  trend={suspiciousIPs.length > 0 ? 'Requires attention' : 'All clear'}
                  trendColor={suspiciousIPs.length > 0 ? 'text-red-400' : 'text-green-400'}
                />
              </div>

              {/* Suspicious IPs Warning */}
              {suspiciousIPs.length > 0 && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-red-400 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-red-300 font-semibold mb-2">Suspicious IP Addresses Detected</h3>
                      <p className="text-sm text-red-200/80 mb-3">
                        The following IP addresses have generated 5 or more security events in the selected time window:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {suspiciousIPs.map(([ip, count]) => (
                          <div key={ip} className="bg-red-900/30 border border-red-700 rounded px-3 py-2 flex items-center justify-between">
                            <code className="text-red-300 text-sm font-mono">{ip}</code>
                            <span className="text-red-400 text-xs font-semibold">{count} events</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-red-200/60 mt-3">
                        Consider blocking these IPs if the pattern continues.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Events Table */}
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                {/* Filter Bar */}
                <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FiFilter className="text-slate-400" />
                    <span className="text-slate-400 font-medium">Event Type:</span>
                  </div>
                  
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => {
                      setEventTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All Events</option>
                    <option value="failed_login">Failed Logins</option>
                    <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
                    <option value="token_revoked">Token Revocations</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                  </select>
                </div>

                {/* Events Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Event Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User/Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {securityEvents && securityEvents.length > 0 ? (
                        securityEvents.map((event, idx) => (
                          <tr key={event.id || idx} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                              {new Date(event.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getEventIcon(event.event_type)}
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventBadgeColor(event.event_type)}`}>
                                  {event.event_type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityBadge(event.severity)}`}>
                                {(event.severity || 'info').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {event.user_email || event.username || <span className="text-slate-500">Unknown</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              <code className="bg-slate-900 px-2 py-1 rounded text-xs">
                                {event.ip_address || 'N/A'}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 max-w-md truncate">
                              {event.message || event.details || 'No details'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-12 text-center">
                            <FiShield className="text-green-400 text-4xl mx-auto mb-3" />
                            <p className="text-slate-400 text-lg font-medium">No Security Events</p>
                            <p className="text-slate-500 text-sm mt-1">All systems are secure in the selected time window</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {securityEvents && securityEvents.length === pageSize && (
                  <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Page {page}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Tips */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h3 className="text-blue-300 font-semibold mb-2">Security Best Practices</h3>
                <ul className="text-sm text-blue-200/80 space-y-1 list-disc list-inside">
                  <li>Monitor failed login attempts from the same IP address (potential brute force attack)</li>
                  <li>Rate limit violations may indicate automated bot activity or scraping attempts</li>
                  <li>Multiple suspicious activities from the same IP should be investigated and potentially blocked</li>
                  <li>Token revocations are normal when users log out, but mass revocations may indicate a security incident</li>
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
