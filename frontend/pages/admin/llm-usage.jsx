import { useState, useEffect } from 'react';
import { FiCpu, FiDollarSign, FiActivity, FiClock, FiDownload, FiFilter, FiRefreshCw } from 'react-icons/fi';
import AdminGuard from '../../components/guards/AdminGuard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import { adminApi } from '../../features/admin/api';
import { useToast } from '../../lib/toast';

export default function LLMUsagePage() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [usageList, setUsageList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [timeWindow, setTimeWindow] = useState(24); // hours
  const [page, setPage] = useState(1);
  const [endpointFilter, setEndpointFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('all'); // 'all', 'success', 'failure'
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, [timeWindow, page, endpointFilter, successFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats and usage list
      const filters = {
        page,
        page_size: pageSize,
        hours: timeWindow
      };
      
      // Only add filters if they have values
      if (endpointFilter) filters.endpoint = endpointFilter;
      if (successFilter === 'success') filters.success_only = true;
      if (successFilter === 'failure') filters.success_only = false;
      
      const [statsData, listData] = await Promise.all([
        adminApi.getLLMUsageStats(timeWindow),
        adminApi.getLLMUsageList(filters)
      ]);

      setStats(statsData);
      setUsageList(listData.items);
      setTotalPages(listData.total_pages);
    } catch (error) {
      console.error('Error loading LLM usage:', error);
      toast.error('Failed to load LLM usage data');
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

  const exportToCSV = () => {
    try {
      // CSV headers
      const headers = ['Timestamp', 'User', 'Endpoint', 'Model', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost (USD)', 'Latency (ms)', 'Status', 'Error'];
      
      // CSV rows
      const rows = usageList.map(item => [
        new Date(item.timestamp).toISOString(),
        item.user_email || 'N/A',
        item.endpoint,
        item.model,
        item.prompt_tokens,
        item.completion_tokens,
        item.total_tokens,
        item.estimated_cost.toFixed(6),
        item.response_time_ms,
        item.success ? 'Success' : 'Failed',
        item.error_message || ''
      ]);
      
      // Combine
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `llm-usage-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Exported to CSV');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // Get unique endpoints for filter dropdown
  const uniqueEndpoints = stats?.breakdown_by_endpoint 
    ? [...new Set(stats.breakdown_by_endpoint.map(e => e.endpoint))]
    : [];

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">LLM Usage & Costs</h1>
              <p className="text-slate-400 mt-1">Monitor OpenAI API usage, costs, and performance</p>
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
                { label: '30 Days', hours: 720 },
                { label: 'All Time', hours: null }
              ].map(option => (
                <button
                  key={option.label}
                  onClick={() => {
                    setTimeWindow(option.hours);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeWindow === option.hours
                      ? 'bg-blue-600 text-white'
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading LLM usage data...</p>
            </div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total API Calls"
                  value={stats.total_calls.toLocaleString()}
                  icon={FiActivity}
                  subtitle={`${stats.successful_calls} successful, ${stats.failed_calls} failed`}
                  trend={stats.successful_calls > 0 ? `${((stats.successful_calls / stats.total_calls) * 100).toFixed(1)}% success rate` : null}
                />
                <StatCard
                  title="Total Cost"
                  value={`$${stats.total_cost.toFixed(4)}`}
                  icon={FiDollarSign}
                  subtitle={`${stats.total_tokens.toLocaleString()} tokens used`}
                  trend={stats.total_calls > 0 ? `$${(stats.total_cost / stats.total_calls).toFixed(6)} per call` : null}
                />
                <StatCard
                  title="Total Tokens"
                  value={stats.total_tokens.toLocaleString()}
                  icon={FiCpu}
                  subtitle={`${stats.total_calls > 0 ? Math.round(stats.total_tokens / stats.total_calls).toLocaleString() : 0} avg per call`}
                />
                <StatCard
                  title="Avg Response Time"
                  value={`${stats.avg_response_time_ms}ms`}
                  icon={FiClock}
                  subtitle="API latency"
                />
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost by Endpoint */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiDollarSign className="text-green-400" />
                    Cost by Endpoint
                  </h3>
                  {stats.breakdown_by_endpoint && stats.breakdown_by_endpoint.length > 0 ? (
                    <div className="space-y-3">
                      {stats.breakdown_by_endpoint
                        .sort((a, b) => b.total_cost - a.total_cost)
                        .map(item => (
                          <div key={item.endpoint} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">{item.endpoint}</span>
                              <span className="text-white font-medium">${item.total_cost.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{item.calls} calls</span>
                              <span>{item.total_tokens.toLocaleString()} tokens</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${(item.total_cost / stats.total_cost) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No data available</p>
                  )}
                </div>

                {/* Calls by Model */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiCpu className="text-blue-400" />
                    Usage by Model
                  </h3>
                  {stats.breakdown_by_model && stats.breakdown_by_model.length > 0 ? (
                    <div className="space-y-3">
                      {stats.breakdown_by_model
                        .sort((a, b) => b.calls - a.calls)
                        .map(item => (
                          <div key={item.model} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">{item.model}</span>
                              <span className="text-white font-medium">{item.calls} calls</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>${item.total_cost.toFixed(4)}</span>
                              <span>${(item.total_cost / item.calls).toFixed(6)} per call</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(item.calls / stats.total_calls) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No data available</p>
                  )}
                </div>
              </div>

              {/* Filters & Table */}
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                {/* Filter Bar */}
                <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FiFilter className="text-slate-400" />
                    <span className="text-slate-400 font-medium">Filters:</span>
                  </div>
                  
                  {/* Endpoint Filter */}
                  <select
                    value={endpointFilter}
                    onChange={(e) => {
                      setEndpointFilter(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Endpoints</option>
                    {uniqueEndpoints.map(endpoint => (
                      <option key={endpoint} value={endpoint}>{endpoint}</option>
                    ))}
                  </select>

                  {/* Success Filter */}
                  <select
                    value={successFilter}
                    onChange={(e) => {
                      setSuccessFilter(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success Only</option>
                    <option value="failure">Failures Only</option>
                  </select>

                  {/* Export Button */}
                  <button
                    onClick={exportToCSV}
                    disabled={usageList.length === 0}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiDownload />
                    Export CSV
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Endpoint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Model</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Tokens</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Latency</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {usageList.length > 0 ? (
                        usageList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {new Date(item.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {item.user_email || <span className="text-slate-500">System</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                                {item.endpoint}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {item.model}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-medium">{item.total_tokens.toLocaleString()}</span>
                                <span className="text-xs text-slate-500">
                                  {item.prompt_tokens}→{item.completion_tokens}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-green-400 text-right font-medium">
                              ${item.estimated_cost.toFixed(6)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300 text-right">
                              {item.response_time_ms}ms
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.success ? (
                                <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">
                                  Success
                                </span>
                              ) : (
                                <span 
                                  className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium cursor-help"
                                  title={item.error_message || 'Unknown error'}
                                >
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                            No LLM usage data found for the selected filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Page {page} of {totalPages}
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
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Accuracy Note */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Cost estimates are calculated using OpenAI's published pricing and are typically accurate within 1-2%. 
                  For exact billing details, please check your OpenAI dashboard. Costs may vary due to pricing updates, enterprise discounts, or prompt caching.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
